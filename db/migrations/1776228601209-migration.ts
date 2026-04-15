import { hashSync } from "bcrypt";
import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776228601209 implements MigrationInterface {
    name = 'Migration1776228601209'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const password25 = hashSync("duongnt", 10);

        await queryRunner.query(`ALTER TABLE "issues" ADD "is_sent" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(
            `ALTER TABLE "users" ADD "email" character varying(255) NOT NULL DEFAULT ''`
        );

        await queryRunner.query(
            `INSERT INTO "users" ("created_at", "updated_at", "userId", username, name, state, password, "email")
             VALUES (NOW(), NOW(), $1, $2, $3, $4, $5, $6)`,
            [25, 'duongnt', 'Tùng Dương', 'active', password25, 'duongnt@netko-solution.com']
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "issues" DROP COLUMN "is_sent"`);

        await queryRunner.query(`DELETE FROM "users" WHERE "userId" = 25`);
    }

}
