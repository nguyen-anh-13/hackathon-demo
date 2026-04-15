import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776228601209 implements MigrationInterface {
    name = 'Migration1776228601209'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" ADD "is_sent" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" DROP COLUMN "is_sent"`);
    }
}
