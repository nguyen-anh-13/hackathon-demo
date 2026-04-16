import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1776249600000 implements MigrationInterface {
  name = 'Migration1776249600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "assigned_to" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "team_url" character varying(1024)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_assigned_to_users" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_assigned_to_users"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "team_url"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "assigned_to"`);
  }
}
