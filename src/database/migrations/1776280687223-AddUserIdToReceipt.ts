import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToReceipt1776280687223 implements MigrationInterface {
  name = 'AddUserIdToReceipt1776280687223';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "receipt" ADD "userId" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "receipt" ADD CONSTRAINT "FK_e011d4704c491f4d821d7ebb6ca" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "receipt" DROP CONSTRAINT "FK_e011d4704c491f4d821d7ebb6ca"`,
    );
    await queryRunner.query(`ALTER TABLE "receipt" DROP COLUMN "userId"`);
  }
}
