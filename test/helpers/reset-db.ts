import { DataSource } from 'typeorm';
import { seedCategories } from './seed-categories';

/**
 * Truncate every application table (leaving TypeORM's migrations table intact)
 * and re-seed reference data. Run in a top-level beforeEach in every spec.
 * Returns the seeded category id map for convenience.
 */
export async function resetDb(
  dataSource: DataSource,
): Promise<Record<string, string>> {
  const tables = dataSource.entityMetadatas
    .map((m) => `"${m.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  return seedCategories(dataSource);
}
