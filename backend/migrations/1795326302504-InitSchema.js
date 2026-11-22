/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitSchema1795326302504 {
    name = 'InitSchema1795326302504'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(50) NOT NULL, "email" character varying(320) NOT NULL, "password" character varying(72) NOT NULL, "role" character varying(10) NOT NULL DEFAULT 'USER', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_1374dd65820e2f565d22e18fd4" CHECK ("role" IN ('USER', 'COACH')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "skill" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0f49a593960360f6f85b692aca8" UNIQUE ("name"), CONSTRAINT "PK_a0d33334424e64fb78dc3ce7196" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "credit_purchase" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "credit_package_id" uuid, "name" character varying(50) NOT NULL, "purchased_credits" integer NOT NULL, "price_paid" integer NOT NULL, "purchase_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_8c7d26e66273439337a32ffb09" CHECK ("purchased_credits" >= 0), CONSTRAINT "CHK_6db38354133f1f1bc7c14ca864" CHECK ("price_paid" >= 0), CONSTRAINT "PK_56aedfd232c8bb938fecdc99ce6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9846b66fdc65b2804ca8bd9bb" ON "credit_purchase" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "credit_package" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(50) NOT NULL, "credit_amount" integer NOT NULL, "price" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1b6687cf27a2fd80d7e1b4f526b" UNIQUE ("name"), CONSTRAINT "CHK_390ed4c025f82d5672e630c8bb" CHECK ("credit_amount" >= 0), CONSTRAINT "CHK_99ca5c6ca2322437183c4613fc" CHECK ("price" >= 0), CONSTRAINT "PK_07044d60296ffa58ab2a6e2460a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "course_booking" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "course_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_b432eb17504a7feb83d12abf0ac" UNIQUE ("user_id", "course_id"), CONSTRAINT "PK_824124d4bc145b4eb717c5dcbf3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_60e3dbf5dad521d21f1fbf7342" ON "course_booking" ("course_id") `);
        await queryRunner.query(`CREATE TABLE "course" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "skill_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" text NOT NULL, "start_at" TIMESTAMP WITH TIME ZONE NOT NULL, "end_at" TIMESTAMP WITH TIME ZONE NOT NULL, "max_participants" integer NOT NULL, "meeting_url" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_901d6d9d96eeae889122f48bdc" CHECK ("max_participants" >= 0), CONSTRAINT "PK_bf95180dd756fd204fb01ce4916" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coach" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "experience_years" integer NOT NULL, "description" text NOT NULL, "profile_image_url" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_1f2795aa1fb31dd9444f96aa80" UNIQUE ("user_id"), CONSTRAINT "CHK_444c193456bc9c1f68fabd4a98" CHECK ("experience_years" >= 0), CONSTRAINT "PK_c2ca0875fe0755b197d0147713d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coach_link_skill" ("coach_id" uuid NOT NULL, "skill_id" uuid NOT NULL, CONSTRAINT "PK_66a742b64e08be3a84c36cb7d1c" PRIMARY KEY ("coach_id", "skill_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d4b119e6be1c3c93cff70c464f" ON "coach_link_skill" ("coach_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_03c74fb9417eb9cc0305eea69a" ON "coach_link_skill" ("skill_id") `);
        await queryRunner.query(`ALTER TABLE "credit_purchase" ADD CONSTRAINT "FK_a9846b66fdc65b2804ca8bd9bb5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "credit_purchase" ADD CONSTRAINT "FK_656d904588512f9c94c97535459" FOREIGN KEY ("credit_package_id") REFERENCES "credit_package"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_booking" ADD CONSTRAINT "FK_d5700511e1f52e40ef698a68d1f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_booking" ADD CONSTRAINT "FK_60e3dbf5dad521d21f1fbf7342f" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "FK_bb2c8374d6f04bf9301895d1b33" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "FK_7ba289f3a9c0d9c2303de381f2d" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coach" ADD CONSTRAINT "FK_1f2795aa1fb31dd9444f96aa803" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coach_link_skill" ADD CONSTRAINT "FK_d4b119e6be1c3c93cff70c464f9" FOREIGN KEY ("coach_id") REFERENCES "coach"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coach_link_skill" ADD CONSTRAINT "FK_03c74fb9417eb9cc0305eea69ad" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "coach_link_skill" DROP CONSTRAINT "FK_03c74fb9417eb9cc0305eea69ad"`);
        await queryRunner.query(`ALTER TABLE "coach_link_skill" DROP CONSTRAINT "FK_d4b119e6be1c3c93cff70c464f9"`);
        await queryRunner.query(`ALTER TABLE "coach" DROP CONSTRAINT "FK_1f2795aa1fb31dd9444f96aa803"`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "FK_7ba289f3a9c0d9c2303de381f2d"`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "FK_bb2c8374d6f04bf9301895d1b33"`);
        await queryRunner.query(`ALTER TABLE "course_booking" DROP CONSTRAINT "FK_60e3dbf5dad521d21f1fbf7342f"`);
        await queryRunner.query(`ALTER TABLE "course_booking" DROP CONSTRAINT "FK_d5700511e1f52e40ef698a68d1f"`);
        await queryRunner.query(`ALTER TABLE "credit_purchase" DROP CONSTRAINT "FK_656d904588512f9c94c97535459"`);
        await queryRunner.query(`ALTER TABLE "credit_purchase" DROP CONSTRAINT "FK_a9846b66fdc65b2804ca8bd9bb5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_03c74fb9417eb9cc0305eea69a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d4b119e6be1c3c93cff70c464f"`);
        await queryRunner.query(`DROP TABLE "coach_link_skill"`);
        await queryRunner.query(`DROP TABLE "coach"`);
        await queryRunner.query(`DROP TABLE "course"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60e3dbf5dad521d21f1fbf7342"`);
        await queryRunner.query(`DROP TABLE "course_booking"`);
        await queryRunner.query(`DROP TABLE "credit_package"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9846b66fdc65b2804ca8bd9bb"`);
        await queryRunner.query(`DROP TABLE "credit_purchase"`);
        await queryRunner.query(`DROP TABLE "skill"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
