import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSnakeCaseFKs1776584293364 implements MigrationInterface {
  name = 'RenameSnakeCaseFKs1776584293364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "category" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt" RENAME COLUMN "merchantId" TO "merchant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" RENAME COLUMN "receiptId" TO "receipt_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" RENAME COLUMN "categoryId" TO "category_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" RENAME COLUMN "category_id" TO "categoryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" RENAME COLUMN "receipt_id" TO "receiptId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt" RENAME COLUMN "merchant_id" TO "merchantId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt" RENAME COLUMN "user_id" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" RENAME COLUMN "user_id" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" RENAME COLUMN "user_id" TO "userId"`,
    );
  }
}
