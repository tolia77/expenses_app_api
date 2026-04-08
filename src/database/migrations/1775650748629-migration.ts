import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1775650748629 implements MigrationInterface {
    name = 'Migration1775650748629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "category" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "merchant" DROP CONSTRAINT "PK_9a3850e0537d869734fc9bff5d6"`);
        await queryRunner.query(`ALTER TABLE "merchant" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "merchant" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "merchant" ADD CONSTRAINT "PK_9a3850e0537d869734fc9bff5d6" PRIMARY KEY ("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchant" DROP CONSTRAINT "PK_9a3850e0537d869734fc9bff5d6"`);
        await queryRunner.query(`ALTER TABLE "merchant" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "merchant" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant" ADD CONSTRAINT "PK_9a3850e0537d869734fc9bff5d6" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "category" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id")`);
    }

}
