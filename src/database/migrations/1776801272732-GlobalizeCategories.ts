import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalizeCategories1776801272732 implements MigrationInterface {
  name = 'GlobalizeCategories1776801272732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: drop NOT NULL on user_id so seed rows can be inserted with a NULL user_id.
    // Without this, the seed INSERT in step 3 fails with "null value in column user_id violates not-null constraint" (Pitfall 2).
    await queryRunner.query(
      `ALTER TABLE "category" ALTER COLUMN "user_id" DROP NOT NULL`,
    );

    // Step 2: add created_at / updated_at columns.
    // We add them BEFORE inserting seed rows so we can include values in the INSERT.
    // Nullable default now() lets us skip backfilling — existing rows get now() at column-add time.
    await queryRunner.query(
      `ALTER TABLE "category" ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    // Step 3: insert the 12 seed rows (user_id left NULL because we dropped NOT NULL in step 1).
    // 'Other' is first for locality with the sub-SELECT in step 4 but the order of INSERT rows
    // does not affect the API response order — that's handled by the Other-pinned-last query in CategoriesService.
    await queryRunner.query(`
      INSERT INTO "category" ("id", "name", "created_at", "updated_at") VALUES
        (uuid_generate_v4(), 'Other',         now(), now()),
        (uuid_generate_v4(), 'Groceries',     now(), now()),
        (uuid_generate_v4(), 'Dining',        now(), now()),
        (uuid_generate_v4(), 'Transport',     now(), now()),
        (uuid_generate_v4(), 'Health',        now(), now()),
        (uuid_generate_v4(), 'Household',     now(), now()),
        (uuid_generate_v4(), 'Electronics',   now(), now()),
        (uuid_generate_v4(), 'Clothing',      now(), now()),
        (uuid_generate_v4(), 'Entertainment', now(), now()),
        (uuid_generate_v4(), 'Travel',        now(), now()),
        (uuid_generate_v4(), 'Personal Care', now(), now()),
        (uuid_generate_v4(), 'Education',     now(), now())
    `);

    // Step 4: remap every existing expense.category_id to the Other row's id.
    // Uses a sub-SELECT filtered by `user_id IS NULL` to hit exactly the seed row we just inserted
    // (old per-user rows still exist at this point and also have name='Other' only coincidentally impossible —
    // but the filter makes the query robust even if a per-user 'Other' existed).
    // MUST run before step 5 (DELETE) because expense.category_id is NOT NULL with ON DELETE NO ACTION
    // (FK_42eea5debc63f4d1bf89881c10a) — otherwise DELETE fails (Pitfall 1).
    await queryRunner.query(`
      UPDATE "expense"
      SET "category_id" = (
        SELECT "id" FROM "category" WHERE "name" = 'Other' AND "user_id" IS NULL
      )
    `);

    // Step 5: delete old per-user category rows. FK is now satisfied because every expense points to the new Other.
    await queryRunner.query(
      `DELETE FROM "category" WHERE "user_id" IS NOT NULL`,
    );

    // Step 6: drop the category→user FK (constraint name preserved from 1776584293364-RenameSnakeCaseFKs.ts).
    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "FK_32b856438dffdc269fa84434d9f"`,
    );

    // Step 7: drop the user_id column.
    await queryRunner.query(
      `ALTER TABLE "category" DROP COLUMN "user_id"`,
    );

    // Step 8: add UNIQUE(name). Enables safe WHERE name='Other' lookup + idempotent reseeding.
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "uq_category_name" UNIQUE ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // LOSSY rollback: per-user categories that existed before up() ran are NOT restored.
    // up() DELETEd them after remapping expenses to 'Other'. down() only restores the schema shape:
    // user_id column + FK, no timestamps, no UNIQUE(name). Every pre-existing expense still points to
    // the old seed 'Other' row; after down() that row will be deleted too, leaving expense.category_id
    // pointing at a deleted row — but the FK won't be re-checked because expense→category FK is unchanged.
    // Callers rolling back MUST accept that expense.category_id values are broken post-rollback
    // and re-create categories + re-point expenses manually.

    // Step 1: drop UNIQUE(name)
    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "uq_category_name"`,
    );

    // Step 2: add user_id back as nullable uuid (cannot add NOT NULL without data — Pitfall 6).
    await queryRunner.query(
      `ALTER TABLE "category" ADD COLUMN "user_id" uuid`,
    );

    // Step 3: restore the FK (matches original from 1776278925895-AddUserIdToCategory.ts + 1776584293364 rename).
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "FK_32b856438dffdc269fa84434d9f" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Step 4: delete the 12 seed rows inserted in up().
    await queryRunner.query(`
      DELETE FROM "category" WHERE "name" IN (
        'Other','Groceries','Dining','Transport','Health','Household',
        'Electronics','Clothing','Entertainment','Travel','Personal Care','Education'
      )
    `);

    // Step 5: drop the created_at / updated_at columns added in up() (original table had neither).
    await queryRunner.query(
      `ALTER TABLE "category" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" DROP COLUMN "created_at"`,
    );
  }
}
