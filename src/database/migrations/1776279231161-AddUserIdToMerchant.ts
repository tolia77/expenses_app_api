import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToMerchant1776279231161 implements MigrationInterface {
    name = 'AddUserIdToMerchant1776279231161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchant" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant" ADD CONSTRAINT "FK_4973a7acae8e2f6bfac7a781ceb" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchant" DROP CONSTRAINT "FK_4973a7acae8e2f6bfac7a781ceb"`);
        await queryRunner.query(`ALTER TABLE "merchant" DROP COLUMN "userId"`);
    }

}
