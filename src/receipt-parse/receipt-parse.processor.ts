import { Logger, Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ReceiptParse } from './receipt-parse.entity';
import { ReceiptParser, ParseResult } from '../receipt-parser/receipt-parser.interface';
import { StorageService } from '../storage/storage.service';
import { Category } from '../categories/category.entity';
import { FALLBACK_CATEGORY_NAME } from '../categories/categories.constants';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Expense } from '../expenses/expenses.entity';

/**
 * Internal error classes used ONLY so the `class=<err.name>` field in
 * `parse_err` log lines is grep-auditable and consistent with the `err.name`
 * discrimination pattern used for parser-thrown errors (SchemaValidationError,
 * OpenRouterError, ImageProcessingError — declared in src/receipt-parser/errors.ts).
 *
 * The worker does NOT throw instances of these; it throws UnrecoverableError
 * for is_receipt=false and plain Error for zero_line_items. These classes exist
 * purely so `className: 'NotAReceiptError'` / `'ZeroLineItemsError'` in the
 * writeTerminalFailure call sites corresponds to an actual class `.name` value
 * that grep can find in the source.
 */
class NotAReceiptError extends Error {
  constructor(message = 'image is not a receipt') {
    super(message);
    this.name = 'NotAReceiptError';
  }
}

class ZeroLineItemsError extends Error {
  constructor(message = 'parse succeeded but no line_items extracted') {
    super(message);
    this.name = 'ZeroLineItemsError';
  }
}

export interface ReceiptParseJobData {
  parse_id: string;
  receipt_id: string;
  user_id: string;
}

// Concurrency starts at 1 — the LLM call is I/O-bound but we bound DB pool
// consumption here. If raised, bump src/database/database.module.ts `extra.max`
// in lockstep (QUEUE-06: max >= concurrency + 2).
//
// JobId convention: `receipt-parse-${parse.id}` (HYPHEN — BullMQ throws on a
// 2-segment colon-separated custom id). Idempotency key at the queue level.
@Processor('receipt-parse', { concurrency: 1 })
export class ReceiptParseProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptParseProcessor.name);

  constructor(
    @InjectRepository(ReceiptParse)
    private readonly parseRepo: Repository<ReceiptParse>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(ReceiptParser)
    private readonly receiptParser: ReceiptParser,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<ReceiptParseJobData>): Promise<void> {
    const { parse_id, receipt_id, user_id } = job.data;

    // --- 1. Worker-first-action idempotency guard (FLOW-02, Pitfall #7) ---
    // Read the ReceiptParse row. If status != 'pending' (or row missing),
    // return success without touching S3, parser, merchant, or expenses.
    // This handles: BullMQ redelivery after a successful prior run, manual
    // re-enqueue after terminal failure, stale messages.
    const parse = await this.parseRepo.findOneBy({ id: parse_id });
    if (!parse || parse.status !== 'pending') {
      this.logger.log(
        `idempotency skip parse_id=${parse_id} status=${parse?.status ?? 'not_found'}`,
      );
      return;
    }

    // --- 2. Mark started_at (outside tx) ---
    // Low-cost diagnostic for stall detection — doesn't block the tx.
    await this.parseRepo.update(parse_id, { started_at: new Date() });

    // --- 3. Outside-tx prep: load Receipt (for photo_key), fetch photo, load categories ---
    // LLM call + S3 download MUST NOT hold a pool connection (Pitfall #3).
    const receipt = await this.receiptRepo.findOneBy({ id: receipt_id });
    if (!receipt) {
      // Receipt was deleted between enqueue and processing — extremely rare
      // (FK cascade would have removed the ReceiptParse row too). Defensive.
      this.logger.log(
        `idempotency skip parse_id=${parse_id} status=receipt_missing`,
      );
      return;
    }
    if (!receipt.photo_key) {
      // Photo was removed between enqueue and processing. Rethrow to retry —
      // plan 11-03 converts this into a terminal 'image_unreadable' once an
      // explicit classification exists. For now, treat as transient.
      throw new Error('receipt has no photo_key');
    }

    const startedAt = Date.now();

    // Fetch photo outside any tx.
    const photoBuffer = await this.storageService.download(receipt.photo_key);

    // Load global categories (Phase 10.1 — no user scoping).
    // ~12 rows; no caching per Claude's Discretion #2 in RESEARCH.md.
    const categories = await this.categoryRepo.find();

    // --- 4. Call parser (outside tx) — classify any thrown error ---
    let parseResult: ParseResult;
    try {
      parseResult = await this.receiptParser.parse(photoBuffer, categories);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const { errorCode, retryable } = this.classifyParserError(err);
      const errName = err instanceof Error ? err.name : 'UnknownError';
      const errMessage = err instanceof Error ? err.message : String(err);

      if (!retryable || this.isFinalAttempt(job)) {
        // Terminal: log + write status='failed' + error_code + error_message.
        // No parseResult — the parser threw, so token columns stay null per
        // OPS-03 wording ("every completed attempt where a response was received").
        // writeTerminalFailure emits the parse_err log line using errName as
        // the class field (which IS err.name for parser-thrown errors — the
        // `class=<err.name>` invariant holds automatically here).
        await this.writeTerminalFailure(
          parse_id,
          errorCode,
          errMessage,
          errName,
          job,
          durationMs,
        );
      } else {
        // Non-terminal retryable attempt — log only, no DB write. ReceiptParse
        // row stays status='pending' between retries (FLOW-02 state machine
        // stays clean). Log format is OWNED by the helper; here we inline it
        // rather than creating a second log-only helper.
        this.logger.error(
          `parse_err parse_id=${parse_id} error_code=${errorCode} class=${errName} message=${errMessage.slice(0, 120)}`,
        );
      }

      if (!retryable) {
        // Stop BullMQ redispatch for terminal-on-attempt-1 errors
        // (auth_failed, image_unreadable — classification returns retryable=false).
        throw new UnrecoverableError(errorCode);
      }
      // Retryable — rethrow original error so BullMQ applies exponential backoff
      // per defaultJobOptions (attempts=3, 5s exp).
      throw err;
    }

    // --- 5. Check is_receipt (EXTRACT-04) — terminal on attempt 1 ---
    if (!parseResult.data.is_receipt) {
      const durationMs = Date.now() - startedAt;
      // parseResult IS present — populate token columns (OPS-03).
      // className='NotAReceiptError' — the .name of the tiny error class
      // declared at top of file. Grep-auditable.
      await this.writeTerminalFailure(
        parse_id,
        'not_a_receipt',
        'image is not a receipt',
        'NotAReceiptError',
        job,
        durationMs,
        parseResult,
      );
      throw new UnrecoverableError('not_a_receipt');
    }

    // --- 6. Check zero line items (EXTRACT-05) — retry, terminal on final attempt ---
    const lineItems = parseResult.data.line_items ?? [];
    if (lineItems.length === 0) {
      const durationMs = Date.now() - startedAt;
      if (this.isFinalAttempt(job)) {
        // Final attempt — log + terminal failure write. BullMQ marks the job
        // failed naturally after this rethrow; no UnrecoverableError needed.
        await this.writeTerminalFailure(
          parse_id,
          'zero_line_items',
          'parse succeeded but no line_items extracted',
          'ZeroLineItemsError',
          job,
          durationMs,
          parseResult,
        );
      } else {
        // Non-final attempt — log only, no DB write. Stays status='pending'.
        this.logger.error(
          `parse_err parse_id=${parse_id} error_code=zero_line_items class=ZeroLineItemsError message=parse succeeded but no line_items extracted`,
        );
      }
      // Retry (or final-attempt: rethrow so BullMQ registers the failure).
      throw new Error('zero_line_items');
    }

    // --- 7. Resolve fallback category id (EXTRACT-03) ---
    // FALLBACK_CATEGORY_NAME = 'Other' (imported — no hardcoding).
    const fallbackCategory = categories.find(
      (c) => c.name === FALLBACK_CATEGORY_NAME,
    );
    if (!fallbackCategory) {
      // Seed drift: 'Other' row is missing from the DB. Plan 10.1 migration
      // seeds it; if this throws, the migration didn't land or was reverted.
      throw new Error(
        `fallback category '${FALLBACK_CATEGORY_NAME}' not found in DB`,
      );
    }

    // --- 8. Tx: merchant upsert → receipt update → expense reset → parse terminal update ---
    // durationMs is captured ONCE inside the tx (last step before terminal UPDATE)
    // and reused in the success log after the tx resolves. Info 4 — avoids the
    // two-read skew that would otherwise exist (tx-commit overhead between reads).
    let durationMs = 0;
    await this.dataSource.transaction(async (em) => {
      // 8a. Merchant upsert (race-safe, Pitfall #4) — raw SQL because TypeORM
      //     save() can't express ON CONFLICT with a functional index.
      const merchantId = await this.upsertMerchant(
        em,
        user_id,
        parseResult.data.merchant,
      );

      // 8b. Update receipt fields from the parse (merchant_id if resolved;
      //     purchased_at + payment_method always, allowing null).
      if (merchantId) {
        await em.query(
          `UPDATE receipt
             SET merchant_id = $1,
                 purchased_at = $2,
                 payment_method = $3
           WHERE id = $4`,
          [
            merchantId,
            parseResult.data.purchased_at
              ? new Date(parseResult.data.purchased_at)
              : null,
            parseResult.data.payment_method ?? null,
            receipt_id,
          ],
        );
      } else {
        // Edge: is_receipt=true but merchant is null — leave merchant_id untouched.
        await em.query(
          `UPDATE receipt
             SET purchased_at = $1,
                 payment_method = $2
           WHERE id = $3`,
          [
            parseResult.data.purchased_at
              ? new Date(parseResult.data.purchased_at)
              : null,
            parseResult.data.payment_method ?? null,
            receipt_id,
          ],
        );
      }

      // 8c. Delete existing expenses for this receipt (FLOW-05, Pitfall #2).
      //     Unconditional — every attempt resets expenses.
      await em.query(`DELETE FROM expense WHERE receipt_id = $1`, [receipt_id]);

      // 8d. Insert new expenses. category_id falls back to the 'Other' id when
      //     the parser didn't assign a category (EXTRACT-03).
      const expenseRepo = em.getRepository(Expense);
      for (const item of lineItems) {
        await expenseRepo.save(
          expenseRepo.create({
            receipt_id,
            category_id: item.category_id ?? fallbackCategory.id,
            name: item.name,
            // price is a decimal string from the parser (interface); convert to number at the ORM boundary
            price: parseFloat(item.price) as any,
            amount: (item.amount ?? null) as any,
            unit_type: (item.unit_type ?? null) as any,
          } as any),
        );
      }

      // 8e. Capture durationMs ONCE (last step before the terminal UPDATE) and
      //     reuse it in the success log below (Info 4 — single-capture).
      durationMs = Date.now() - startedAt;

      // 8f. Terminal ReceiptParse update — status=parsed + all success fields
      //     (OPS-03: all three token columns populated; FLOW-07: attempts =
      //     attemptsMade + 1).
      await em.getRepository(ReceiptParse).update(parse_id, {
        status: 'parsed',
        model: parseResult.model,
        duration_ms: durationMs,
        attempts: job.attemptsMade + 1,
        prompt_tokens: parseResult.usage.prompt_tokens,
        completion_tokens: parseResult.usage.completion_tokens,
        total_tokens: parseResult.usage.total_tokens,
        raw_response: parseResult.raw_response as object,
        finished_at: new Date(),
        // error_code + error_message intentionally left null (success path).
      });
    });

    // --- 9. Success log (OPS-01, Pitfall #6) ---
    // Fields: parse_id, receipt_id, model, attempt, duration_ms, total_tokens.
    // durationMs is the SAME value written to receipt_parse.duration_ms inside
    // the tx (single-capture — Info 4). NO payload, NO prompt, NO response body.
    // Leading `parse_ok` tag for grep.
    this.logger.log(
      `parse_ok parse_id=${parse_id} receipt_id=${receipt_id} model=${parseResult.model} attempt=${job.attemptsMade + 1} duration_ms=${durationMs} total_tokens=${parseResult.usage.total_tokens}`,
    );
  }

  /**
   * Race-safe merchant upsert for (user_id, LOWER(name)).
   *
   * Single SQL round-trip in the happy path (no existing merchant): INSERT with
   * ON CONFLICT DO NOTHING RETURNING id. On race (concurrent INSERT won),
   * RETURNING is empty, so we SELECT the winner's id by the same functional key.
   *
   * The functional unique index `uq_merchant_user_id_lower_name` was created in
   * Phase 9's migration; the ON CONFLICT target must match the index expression
   * exactly — `(user_id, (LOWER(name)))`.
   */
  private async upsertMerchant(
    em: EntityManager,
    userId: string,
    merchantData: { name: string; address?: string } | null,
  ): Promise<string | null> {
    if (!merchantData?.name) return null;

    const inserted: Array<{ id: string }> = await em.query(
      `INSERT INTO merchant (name, user_id, address)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, (LOWER(name))) DO NOTHING
       RETURNING id`,
      [merchantData.name, userId, merchantData.address ?? null],
    );

    if (inserted.length > 0) return inserted[0].id;

    // Race: a concurrent INSERT already committed; fetch that row's id.
    const existing: Array<{ id: string }> = await em.query(
      `SELECT id FROM merchant WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
      [userId, merchantData.name],
    );
    return existing[0]?.id ?? null;
  }

  /**
   * Final-attempt detection. BullMQ's attemptsMade is 0 on the first try.
   * opts.attempts comes from defaultJobOptions (3 — Phase 9). Returns true when
   * this is the last attempt before BullMQ marks the job terminally failed.
   */
  private isFinalAttempt(job: Job): boolean {
    const maxAttempts = job.opts.attempts ?? 1;
    return job.attemptsMade + 1 >= maxAttempts;
  }

  /**
   * Classifies a parser-thrown error by `err.name` (cross-module-safe —
   * `instanceof` would break under Nest's DI). Returns the error_code to
   * persist and whether BullMQ should retry.
   *
   * Locked Phase 10 mapping (see STATE.md "Decisions (10-03)"):
   *   SchemaValidationError              -> 'schema_invalid'  (retry)
   *   ImageProcessingError               -> 'image_unreadable' (no-retry)
   *   OpenRouterError (status 401/403)   -> 'auth_failed'     (no-retry)
   *   OpenRouterError (status 429)       -> 'rate_limited'    (retry)
   *   OpenRouterError (else, incl. 0)    -> 'provider_error'  (retry)
   *   unknown err.name                   -> 'provider_error'  (retry - safe default)
   */
  private classifyParserError(err: unknown): {
    errorCode: string;
    retryable: boolean;
  } {
    const name = err instanceof Error ? err.name : 'UnknownError';

    if (name === 'SchemaValidationError') {
      return { errorCode: 'schema_invalid', retryable: true };
    }
    if (name === 'ImageProcessingError') {
      return { errorCode: 'image_unreadable', retryable: false };
    }
    if (name === 'OpenRouterError') {
      // err.details.status exists on OpenRouterError per src/receipt-parser/errors.ts
      const status = (err as { details?: { status?: number } }).details?.status ?? 0;
      if (status === 401 || status === 403) {
        return { errorCode: 'auth_failed', retryable: false };
      }
      if (status === 429) {
        return { errorCode: 'rate_limited', retryable: true };
      }
      return { errorCode: 'provider_error', retryable: true };
    }
    // Defensive: unknown error class — treat as transient provider issue.
    return { errorCode: 'provider_error', retryable: true };
  }

  /**
   * Emits the `parse_err` log line AND writes a single-row UPDATE to
   * receipt_parse marking the row terminally failed. Called from multiple
   * terminal failure paths in process() — extracted to avoid duplicating the
   * UPDATE shape AND to ensure the `class=<className>` field in the log line
   * is enforced at a single site.
   *
   * `className` must match a real Error subclass `.name` value:
   *   - For parser-thrown errors: err.name (SchemaValidationError, OpenRouterError,
   *     ImageProcessingError).
   *   - For classifier-driven terminal failures: the `.name` of the tiny error
   *     subclass declared at top of file — 'NotAReceiptError' or 'ZeroLineItemsError'.
   * This makes `grep -n "class NotAReceiptError extends Error"` / equivalent
   * grep-auditable from source alone.
   *
   * Not inside a transaction: there are no sibling writes on the failure path
   * (no merchant, no expenses), so a plain repo.update() suffices. Cheaper than
   * opening a tx just to close it.
   *
   * When `parseResult` is provided, populates model/token columns/raw_response
   * per OPS-03 ("every completed attempt where a response was received").
   * When omitted (parser threw before returning), those columns stay null.
   */
  private async writeTerminalFailure(
    parseId: string,
    errorCode: string,
    errorMessage: string,
    className: string,
    job: Job,
    durationMs: number | null,
    parseResult?: ParseResult,
  ): Promise<void> {
    // Emit the parse_err log line. Format is OPS-02 locked:
    //   parse_err parse_id=<id> error_code=<code> class=<className> message=<msg.slice(0,120)>
    // className is the .name of a real Error subclass — grep-auditable.
    this.logger.error(
      `parse_err parse_id=${parseId} error_code=${errorCode} class=${className} message=${errorMessage.slice(0, 120)}`,
    );

    const update: Partial<ReceiptParse> = {
      status: 'failed',
      error_code: errorCode,
      error_message: errorMessage.slice(0, 500), // cap for column sanity
      attempts: job.attemptsMade + 1, // FLOW-07
      finished_at: new Date(),
    };
    if (durationMs !== null) {
      update.duration_ms = durationMs;
    }
    if (parseResult) {
      // OPS-03: token columns + raw_response populated when a response was received.
      update.model = parseResult.model;
      update.prompt_tokens = parseResult.usage.prompt_tokens;
      update.completion_tokens = parseResult.usage.completion_tokens;
      update.total_tokens = parseResult.usage.total_tokens;
      update.raw_response = parseResult.raw_response as object;
    }
    await this.parseRepo.update(parseId, update);
  }
}
