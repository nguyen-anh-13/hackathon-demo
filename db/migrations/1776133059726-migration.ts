import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776133059726 implements MigrationInterface {
    name = 'Migration1776133059726'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "issue_contents" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "spreadsheet_id" character varying(255) NOT NULL, "sheet_name" character varying(255) NOT NULL, "is_resolved" boolean NOT NULL DEFAULT false, "number" integer NOT NULL, "status" character varying(255) NOT NULL DEFAULT '', "priority" character varying(255) NOT NULL DEFAULT '', "type" character varying(255) NOT NULL DEFAULT '', "big_category" character varying(255) NOT NULL DEFAULT '', "small_category" character varying(255) NOT NULL DEFAULT '', "content" text NOT NULL DEFAULT '', CONSTRAINT "PK_fce38963e963572120ff0049ffd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "issue_contents"`);
    }

}
