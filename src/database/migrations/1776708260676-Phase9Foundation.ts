import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9Foundation1776708260676 implements MigrationInterface {
  name = 'Phase9Foundation1776708260676';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "receipt_parse" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receipt_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "model" character varying,
        "attempts" integer NOT NULL DEFAULT 0,
        "duration_ms" integer,
        "prompt_tokens" integer,
        "completion_tokens" integer,
        "total_tokens" integer,
        "raw_response" jsonb,
        "error_code" character varying,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "started_at" TIMESTAMP WITH TIME ZONE,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_receipt_parse" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_parse"
         ADD CONSTRAINT "fk_receipt_parse_receipt_id"
         FOREIGN KEY ("receipt_id") REFERENCES "receipt"("id")
         ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_parse"
         ADD CONSTRAINT "fk_receipt_parse_user_id"
         FOREIGN KEY ("user_id") REFERENCES "user"("id")
         ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_receipt_parse_receipt_id_created_at"
         ON "receipt_parse" ("receipt_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_receipt_parse_status_created_at"
         ON "receipt_parse" ("status", "created_at")`,
    );
    // Functional unique index — cannot be expressed via @Index decorator.
    // Will raise 23505 if existing (user_id, LOWER(name)) duplicates exist in dev data.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_merchant_user_id_lower_name"
         ON "merchant" ("user_id", (LOWER("name")))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_merchant_user_id_lower_name"`);
    await queryRunner.query(`DROP INDEX "idx_receipt_parse_status_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_receipt_parse_receipt_id_created_at"`);
    await queryRunner.query(
      `ALTER TABLE "receipt_parse" DROP CONSTRAINT "fk_receipt_parse_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_parse" DROP CONSTRAINT "fk_receipt_parse_receipt_id"`,
    );
    await queryRunner.query(`DROP TABLE "receipt_parse"`);
  }
}
