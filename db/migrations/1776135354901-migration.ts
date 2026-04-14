import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776135354901 implements MigrationInterface {
    name = 'Migration1776135354901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "issues" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "spreadsheet_id" character varying(255) NOT NULL, "sheet_name" character varying(255) NOT NULL, "is_resolved" boolean NOT NULL DEFAULT false, "number" integer NOT NULL, "status" character varying(255) NOT NULL DEFAULT '', "priority" character varying(255) NOT NULL DEFAULT '', "type" character varying(255) NOT NULL DEFAULT '', "big_category" character varying(255) NOT NULL DEFAULT '', "small_category" character varying(255) NOT NULL DEFAULT '', "originalContent" text NOT NULL DEFAULT '', "translatedContent" text NOT NULL DEFAULT '', "url" character varying(255) NOT NULL DEFAULT '', "assigned_to" integer, CONSTRAINT "PK_9d8ecbbeff46229c700f0449257" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "issues" ADD CONSTRAINT "FK_a65c32956651e921049e38caf13" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" DROP CONSTRAINT "FK_a65c32956651e921049e38caf13"`);
        await queryRunner.query(`DROP TABLE "issues"`);
    }

}
