import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserColumns1776584293363 implements MigrationInterface {
  name = 'RenameUserColumns1776584293363';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "passwordHash" TO "password_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "password_hash" TO "passwordHash"`,
    );
  }
}
