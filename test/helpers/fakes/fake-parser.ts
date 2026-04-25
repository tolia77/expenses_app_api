import { Category } from 'src/categories/category.entity';
import {
  ReceiptParser,
  ParseResult,
} from 'src/receipt-parser/receipt-parser.interface';

const DEFAULT_RESULT: ParseResult = {
  data: {
    is_receipt: true,
    merchant: { name: 'Fake Mart', address: null },
    payment_method: 'cash',
    purchased_at: '2026-04-24T12:00:00.000Z',
    line_items: [
      {
        name: 'Fake Item',
        price: '1.00',
        amount: 1,
        unit_type: null,
        category_id: null,
      },
    ],
  },
  model: 'mock/model-1',
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  raw_response: { mock: true },
};

/**
 * Test double for ReceiptParser. Returns a fixed successful ParseResult unless
 * a test calls setNextResult() to override the next call (useful for error paths).
 *
 * No @Injectable() — wired via .overrideProvider(...).useValue(new FakeReceiptParser()).
 * `extends ReceiptParser` already enforces the abstract-class contract at compile time,
 * so no separate structural check is needed.
 */
export class FakeReceiptParser extends ReceiptParser {
  calls: Array<{ photo: Buffer; categories: Category[]; model: string }> = [];
  private nextOverride: ParseResult | Error | null = null;

  setNextResult(result: ParseResult | Error): void {
    this.nextOverride = result;
  }

  async parse(
    photo: Buffer,
    categories: Category[],
    model: string,
  ): Promise<ParseResult> {
    this.calls.push({ photo, categories, model });
    if (this.nextOverride) {
      const override = this.nextOverride;
      this.nextOverride = null;
      if (override instanceof Error) throw override;
      return override;
    }
    return DEFAULT_RESULT;
  }

  reset(): void {
    this.calls = [];
    this.nextOverride = null;
  }
}
