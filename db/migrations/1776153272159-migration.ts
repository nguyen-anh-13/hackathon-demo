import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776153272159 implements MigrationInterface {
    name = 'Migration1776153272159'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "projects" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" integer NOT NULL, "name" character varying(255) NOT NULL, "spreadsheet_id" character varying(255) NOT NULL, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "issues" ADD "project_id" integer`);
        await queryRunner.query(
            `ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" DROP CONSTRAINT "FK_issues_project_id"`);
        await queryRunner.query(`ALTER TABLE "issues" DROP COLUMN "project_id"`);
        await queryRunner.query(`DROP TABLE "projects"`);
    }

}
