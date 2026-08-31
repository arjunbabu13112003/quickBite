import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerCodRemittancesTable1788220000000 implements MigrationInterface {
  name = 'CreatePartnerCodRemittancesTable1788220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partner_cod_remittances" (
        "id" SERIAL PRIMARY KEY,
        "deliveryPartnerId" INT NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "amount" NUMERIC(12,2) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'RECORDED',
        "paymentMethod" VARCHAR(50) NOT NULL,
        "reference" VARCHAR(255) NULL,
        "notes" TEXT NULL,
        "recordedByUserId" INT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_cod_remittances_partner" ON "partner_cod_remittances" ("deliveryPartnerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partner_cod_remittances_partner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_cod_remittances"`);
  }
}
