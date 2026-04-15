import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776261766673 implements MigrationInterface {
    name = 'Migration1776261766673'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "receipt" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_method" character varying, "purchased_at" TIMESTAMP, "other_details" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "merchantId" uuid, CONSTRAINT "PK_b4b9ec7d164235fbba023da9832" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "receipt" ADD CONSTRAINT "FK_06468e110f5c25c0e2c4268ed0d" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "receipt" DROP CONSTRAINT "FK_06468e110f5c25c0e2c4268ed0d"`);
        await queryRunner.query(`DROP TABLE "receipt"`);
    }

}
