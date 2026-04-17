import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1775648216553 implements MigrationInterface {
  name = 'Migration1775648216553';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "merchant" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "address" character varying, "other_details" jsonb, CONSTRAINT "PK_9a3850e0537d869734fc9bff5d6" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "merchant"`);
  }
}
