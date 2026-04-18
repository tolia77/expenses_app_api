import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhotoKeyToReceipt1776519747689 implements MigrationInterface {
    name = 'AddPhotoKeyToReceipt1776519747689'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "receipt" ADD "photo_key" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "receipt" DROP COLUMN "photo_key"`);
    }

}
