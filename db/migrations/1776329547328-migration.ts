import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776329547328 implements MigrationInterface {
    name = 'Migration1776329547328'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" ADD "row" integer`);
        await queryRunner.query(`ALTER TABLE "issues" ADD "col" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" DROP COLUMN "col"`);
        await queryRunner.query(`ALTER TABLE "issues" DROP COLUMN "row"`);
    }

}
