import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpense1776284404908 implements MigrationInterface {
  name = 'CreateExpense1776284404908';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "expense" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "receiptId" uuid NOT NULL, "categoryId" uuid NOT NULL, "name" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "unit_type" character varying, "amount" numeric(10,2), "other_details" jsonb, CONSTRAINT "PK_edd925b450e13ea36197c9590fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD CONSTRAINT "FK_621122ca513bd7e9cb712743c03" FOREIGN KEY ("receiptId") REFERENCES "receipt"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD CONSTRAINT "FK_42eea5debc63f4d1bf89881c10a" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" DROP CONSTRAINT "FK_42eea5debc63f4d1bf89881c10a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" DROP CONSTRAINT "FK_621122ca513bd7e9cb712743c03"`,
    );
    await queryRunner.query(`DROP TABLE "expense"`);
  }
}
