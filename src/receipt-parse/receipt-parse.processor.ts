import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export interface ReceiptParseJobData {
  parse_id: string;
  receipt_id: string;
  user_id: string;
}

// Concurrency starts at 1 — the LLM call in Phase 11 is I/O-bound but we bound
// DB pool consumption here. If raised, bump src/database/database.module.ts
// `extra.max` in lockstep (QUEUE-06: max >= concurrency + 2).
//
// JobId convention: `receipt-parse-${parse.id}` (HYPHEN — BullMQ throws on a
// 2-segment colon-separated custom id). Phase 11's idempotency guard keys on
// this jobId shape so re-enqueues dedupe at the queue level.
@Processor('receipt-parse', { concurrency: 1 })
export class ReceiptParseProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptParseProcessor.name);

  async process(job: Job<ReceiptParseJobData>): Promise<void> {
    // Phase 9: no-op — logs payload and returns. Phase 11 replaces the body.
    this.logger.log(
      `no-op receipt-parse job received id=${job.id} attempt=${job.attemptsMade + 1}/${job.opts.attempts ?? 1} data=${JSON.stringify(job.data)}`,
    );
  }
}
