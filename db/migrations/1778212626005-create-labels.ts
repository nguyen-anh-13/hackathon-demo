import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabels1778212626005 implements MigrationInterface {
  name = 'CreateLabels1778212626005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "labels" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name_jp" character varying(255) NOT NULL,
        "name_en" character varying(255) NOT NULL,
        CONSTRAINT "PK_labels" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "labels"`);
  }
}
