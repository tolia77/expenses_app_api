import { z } from 'zod';

/**
 * Zod schema for a parsed receipt.
 *
 * Design constraints (see .planning/phases/10-receipt-parser-service/10-CONTEXT.md):
 * - FLAT shape with nullable fields (NO z.discriminatedUnion) — when is_receipt=false
 *   merchant / payment_method / purchased_at / line_items are all nullable.
 * - line_items[] MIRRORS the Expense entity (name, price, amount?, unit_type?,
 *   category_id?) so Phase 11's delete-then-insert path is a near-1:1 mapping.
 * - price is a STRING with decimal regex — exact precision, no JS float rounding.
 *   Phase 11 converts to decimal(10,2) at the TypeORM boundary.
 * - purchased_at uses { offset: true } to accept any ISO 8601 with OR without
 *   timezone offset (Pitfall F in RESEARCH.md) — the model may emit local-time
 *   variants. The system prompt asks for UTC-Z, but the schema is permissive.
 * - category_id is typed as string|null in ParsedReceipt, but the LLM actually
 *   emits the category NAME in this field (per the names-only prompt design,
 *   deviation from REQ-AI-06). The service maps name→id locally before returning
 *   to callers — the Zod schema doesn't know about that remapping.
 *
 * .describe() hints are carried into the exported JSON Schema so OpenRouter's
 * strict mode gets field-level documentation without lengthening the prompt.
 */
export const receiptSchema = z.object({
  is_receipt: z
    .boolean()
    .describe(
      'True if the image is a receipt; false otherwise (all other fields nullable when false)',
    ),
  merchant: z
    .object({
      name: z.string().describe('Merchant/store name as printed'),
      address: z
        .string()
        .optional()
        .describe('Street address if printed; omit field if absent'),
    })
    .nullable()
    .describe('Merchant details; null when is_receipt is false'),
  payment_method: z
    .string()
    .nullable()
    .describe(
      'Payment method as printed on the receipt (e.g. "VISA ****1234", "Apple Pay", "Cash"); null if not visible',
    ),
  purchased_at: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe(
      'ISO 8601 datetime with "Z" UTC suffix preferred (e.g. 2024-01-15T14:30:00Z); null if not parseable',
    ),
  line_items: z
    .array(
      z.object({
        name: z.string().describe('Line item name as printed'),
        price: z
          .string()
          .regex(
            /^\d+(\.\d{1,2})?$/,
            'Decimal string with up to 2 fractional digits',
          )
          .describe(
            'Line item unit price as a decimal string (e.g. "12.99"); NOT a number',
          ),
        amount: z
          .number()
          .nullable()
          .describe('Quantity purchased; defaults to 1 when no qty is printed'),
        unit_type: z
          .string()
          .nullable()
          .describe(
            'Unit of measure (kg, lb, oz, etc.); null when no unit printed',
          ),
        category_id: z
          .string()
          .nullable()
          .describe(
            'Category NAME chosen from the list in the system prompt, or null if no category fits',
          ),
      }),
    )
    .nullable()
    .describe(
      'Array of purchased line items; excludes tax, tip, discount lines. Null when is_receipt is false.',
    ),
});

export type ReceiptSchema = z.infer<typeof receiptSchema>;

/**
 * Pre-computed JSON Schema for OpenRouter's response_format body.
 *
 * Computed ONCE at module load (z.toJSONSchema is deterministic).
 *
 * The outer OpenRouter shape is:
 *   { type: 'json_schema', json_schema: { name: 'receipt', strict: true, schema: <this object> } }
 * Note: REQ-AI-03's literal wording ("response_format: { type: 'json_schema', strict: true, schema }")
 * is WRONG — the correct shape is nested under a `json_schema` wrapper. Plan 10-03
 * assembles the nested shape at the call site; this module exports only the inner schema.
 *
 * target: 'draft-2020-12' is required by OpenAI's structured-outputs (and OpenRouter
 * providers that honor strict mode). See https://zod.dev/json-schema.
 */
export const receiptJsonSchema = z.toJSONSchema(receiptSchema, {
  target: 'draft-2020-12',
});
