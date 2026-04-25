import { DataSource } from 'typeorm';
import { Category } from '../../src/categories/category.entity';

export const SEED_CATEGORY_NAMES = ['Groceries', 'Dining', 'Transport', 'Other'] as const;

export async function seedCategories(dataSource: DataSource): Promise<Record<string, string>> {
  const repo = dataSource.getRepository(Category);
  const saved = await repo.save(
    SEED_CATEGORY_NAMES.map((name) => ({ name })),
  );
  return Object.fromEntries(saved.map((c) => [c.name, c.id]));
}
