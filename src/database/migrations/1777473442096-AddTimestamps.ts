import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimestamps1777473442096 implements MigrationInterface {
  name = 'AddTimestamps1777473442096';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "receipt" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "expense" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "expense" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "merchant" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "merchant" DROP COLUMN "created_at"`);
  }
}
