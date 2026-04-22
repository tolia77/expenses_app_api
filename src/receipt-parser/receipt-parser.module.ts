import { Module } from '@nestjs/common';
import { AppConfigModule } from 'src/config/config.module';
import { ReceiptParser } from './receipt-parser.interface';
import { ReceiptParserOpenRouter } from './receipt-parser.service';

/**
 * Receipt parser module.
 *
 * Provides the `ReceiptParser` abstract-class DI token, bound to the
 * `ReceiptParserOpenRouter` concrete implementation. Consumers (Phase 11's
 * worker) inject the abstract class and don't know which vendor is behind it.
 *
 * Deliberately separate from `src/receipt-parse-worker/` (Phase 9's queue +
 * entity module) per the user's orchestrator decision (2026-04-21) — the two
 * modules have distinct concerns: parse-worker = DB + queue lifecycle; parser
 * = LLM service boundary. Phase 11's worker imports BOTH modules.
 *
 * Imports AppConfigModule explicitly even though ConfigModule is registered as
 * global — this mirrors the pattern used elsewhere in the codebase for
 * explicit-is-better-than-implicit wiring of config-dependent providers.
 */
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: ReceiptParser,
      useClass: ReceiptParserOpenRouter,
    },
  ],
  exports: [ReceiptParser],
})
export class ReceiptParserModule {}
