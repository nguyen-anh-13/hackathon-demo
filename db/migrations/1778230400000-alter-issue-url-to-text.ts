import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterIssueUrlToText1778230400000 implements MigrationInterface {
  name = 'AlterIssueUrlToText1778230400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "issues" ALTER COLUMN "url" TYPE TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issues" ALTER COLUMN "url" TYPE VARCHAR(255) USING url::VARCHAR(255)`,
    );
  }
}
