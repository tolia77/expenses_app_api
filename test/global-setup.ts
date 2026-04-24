import 'tsconfig-paths/register';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { Category } from '../src/categories/category.entity';
import { Expense } from '../src/expenses/expenses.entity';
import { Merchant } from '../src/merchants/entities/merchant.entity';
import { Receipt } from '../src/receipts/entities/receipt.entity';
import { ReceiptParse } from '../src/receipt-parse-worker/receipt-parse.entity';
import { User } from '../src/users/user.entity';

// Globals typed for access in globalTeardown via globalThis.
declare global {
  // eslint-disable-next-line no-var
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('expenses_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  globalThis.__PG_CONTAINER__ = container;

  // Export env vars so AppModule reads the container on boot.
  process.env.DATABASE_HOST = container.getHost();
  process.env.DATABASE_PORT = String(container.getMappedPort(5432));
  process.env.DATABASE_USERNAME = container.getUsername();
  process.env.DATABASE_PASSWORD = container.getPassword();
  process.env.DATABASE_NAME = container.getDatabase();

  // Defensive defaults for config factories that read env at AppModule boot.
  process.env.JWT_SECRET ??= 'test-secret-do-not-use-in-prod';
  process.env.JWT_EXPIRES_IN ??= '7d';
  process.env.REDIS_HOST ??= 'localhost';
  process.env.REDIS_PORT ??= '6379';
  process.env.AI_MODEL_CHAIN ??= 'mock/model-1';

  // Run migrations against the container using an explicit entity list.
  // We build a fresh DataSource here (rather than reusing AppDataSource) to
  // avoid the TS-glob entity discovery, which is fragile at test runtime.
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: false,
    entities: [Category, Expense, Merchant, Receipt, ReceiptParse, User],
    migrations: ['src/database/migrations/*.ts'],
    migrationsRun: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
