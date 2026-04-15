import { MigrationInterface, QueryRunner } from "typeorm";
import { hashSync } from "bcrypt";

export class Migration1776090088537 implements MigrationInterface {
    name = 'Migration1776090088537'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" (
            "id" SERIAL NOT NULL, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "userId" integer NOT NULL, 
            "username" character varying(255) NOT NULL, 
            "name" character varying(255) NOT NULL, 
            "email" character varying(255), -- Thêm dòng này
            "state" character varying(50) NOT NULL DEFAULT 'active', 
            "password" character varying(255) NOT NULL, 
            CONSTRAINT "UQ_8bf09ba754322ab9c22a215c919" UNIQUE ("userId"), 
            CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
        )`);

        const password77 = hashSync("nguyen.nguyen", 10);
        const password76 = hashSync("dai.nguyen", 10);
        const password25 = hashSync("duongnt", 10);

        await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into("users")
            .values([
                { userId: 77, username: "nguyen.nguyen", name: "Nguyen Nguyen", state: "active", password: password77 },
                { userId: 69, username: "trung", name: "trung", state: "active", password: "" },
                { userId: 57, username: "thaophan", name: "Thao Phan", state: "active", password: "" },
                { userId: 87, username: "thanh.doan", name: "thanh.doan", state: "active", password: "" },
                { userId: 76, username: "dai.nguyen", name: "Dai Nguyen", state: "active", password: password76 },
                { userId: 81, username: "anhnp", name: "Nguyen Phuong Anh", state: "active", password: "" },
                { userId: 71, username: "chien.giap", name: "chien", state: "active", password: "" },
                { userId: 80, username: "hai.phan", name: "Phan Hai", state: "active", password: "" },
                { userId: 91, username: "ha.nguyen", name: "ha.nguyen", state: "active", password: "" },
                { userId: 92, username: "quynh.anh", name: "quynh.anh", state: "active", password: "" },
                { userId: 90, username: "kien.nguyen", name: "kien.nguyen", state: "active", password: "" },
                { userId: 25, username: "duongnt", name: "Tùng Dương", state: "active", password: password25, email: 'duongnt@netko-solution.com' },
            ])
            .execute();
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
