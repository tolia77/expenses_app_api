import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ValidationFailedError } from '../../src/common/exceptions/domain.errors';
import { StorageService } from '../../src/storage/storage.service';
import { ReceiptParser } from '../../src/receipt-parser/receipt-parser.interface';
import { ReceiptParseWorkerProcessor } from '../../src/receipt-parse-worker/receipt-parse-worker.processor';
import { FakeStorage } from './fakes/fake-storage';
import { FakeQueue } from './fakes/fake-queue';
import { FakeReceiptParser } from './fakes/fake-parser';

export interface TestFakes {
  storage: FakeStorage;
  queue: FakeQueue;
  parser: FakeReceiptParser;
}

export interface TestAppHandle {
  app: INestApplication;
  dataSource: DataSource;
  fakes: TestFakes;
}

/**
 * Boot the full AppModule with the four overrides documented in the spec:
 * StorageService → FakeStorage, the receipt-parse Queue → FakeQueue,
 * ReceiptParser → FakeReceiptParser, and ReceiptParseWorkerProcessor → {}
 * (so WorkerHost.super() never constructs a real BullMQ Worker that would
 * connect to Redis).
 *
 * Mirrors main.ts exactly for the global ValidationPipe so 400 payloads in
 * tests match production shape (custom exceptionFactory → ValidationFailedError).
 *
 * The caller is responsible for app.close() in afterAll.
 */
export async function createTestApp(): Promise<TestAppHandle> {
  const storage = new FakeStorage();
  const queue = new FakeQueue();
  const parser = new FakeReceiptParser();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StorageService)
    .useValue(storage)
    .overrideProvider(getQueueToken('receipt-parse'))
    .useValue(queue)
    .overrideProvider(ReceiptParser)
    .useValue(parser)
    .overrideProvider(ReceiptParseWorkerProcessor)
    .useValue({})
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.flatMap((err) =>
          Object.entries(err.constraints ?? {}).map(([, message]) => ({
            field: err.property,
            message,
          })),
        );
        return new ValidationFailedError(details);
      },
    }),
  );
  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource, fakes: { storage, queue, parser } };
}
