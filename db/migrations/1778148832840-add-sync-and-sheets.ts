import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncAndSheets1778148832840 implements MigrationInterface {
  name = 'AddSyncAndSheets1778148832840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "sync_spreadsheet_id" character varying(255)`,
    );

    await queryRunner.query(`
      CREATE TABLE "spreadsheet_sheets" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sheet_name" character varying(255) NOT NULL,
        "sheet_id" integer NOT NULL,
        "project_id" integer,
        CONSTRAINT "PK_spreadsheet_sheets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "spreadsheet_sheets"
      ADD CONSTRAINT "FK_spreadsheet_sheets_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spreadsheet_sheets" DROP CONSTRAINT "FK_spreadsheet_sheets_project"`,
    );
    await queryRunner.query(`DROP TABLE "spreadsheet_sheets"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "sync_spreadsheet_id"`,
    );
  }
}
