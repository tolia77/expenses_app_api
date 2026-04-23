import { Category } from 'src/categories/category.entity';

/**
 * Parsed receipt data (Zod-validated, category IDs already resolved from names).
 * Matches the shape the LLM returns (after the service maps category name → id).
 *
 * line_items[] mirrors the Expense entity (src/expenses/expenses.entity.ts):
 *   { name, price, amount?, unit_type?, category_id? }
 *
 * price is a STRING with decimal regex (/^\d+(\.\d{1,2})?$/) — exact precision.
 * Phase 11 converts to decimal(10,2) at the TypeORM boundary.
 *
 * When is_receipt is false, merchant / payment_method / purchased_at / line_items
 * are all nullable (flat schema; no discriminated union).
 */
export interface ParsedReceipt {
  is_receipt: boolean;
  merchant: {
    name: string;
    address?: string; // optional (frequently missing on receipts), NOT nullable
  } | null;
  payment_method: string | null;
  purchased_at: string | null; // ISO 8601 datetime, nullable
  line_items: Array<{
    name: string;
    price: string; // decimal string — NOT number
    amount: number | null; // defaults to 1 when the receipt doesn't print a qty
    unit_type: string | null; // null when no unit printed (kg, lb, oz, etc.)
    category_id: string | null; // UUID; null when no category fits (Phase 11 decides fallback)
  }> | null;
}

export interface ParseResult {
  data: ParsedReceipt;
  model: string; // completion.model — AI-09 (the actual model used)
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  raw_response: unknown; // full OpenRouter completion; Phase 11 persists to ReceiptParse.raw_response
}

/**
 * Abstract-class DI seam.
 *
 * NestJS cannot inject TypeScript interfaces (type erasure). The established
 * pattern is an abstract class that doubles as BOTH the DI token AND the type.
 *
 * Phase 10 provides a single implementation: ReceiptParserOpenRouter (plan 10-03).
 * The seam exists so Phase 12+ can swap in fallback providers (RESIL-03) or
 * test doubles without touching call sites.
 *
 * Implementations receive a photo buffer, the user's Category list (names used
 * in the prompt, ids returned in ParsedReceipt.line_items[].category_id), and
 * the model identifier to use for this attempt — caller-owned so the worker
 * can escalate model tier across BullMQ retries.
 */
export abstract class ReceiptParser {
  abstract parse(
    photo: Buffer,
    categories: Category[],
    model: string,
  ): Promise<ParseResult>;
}
