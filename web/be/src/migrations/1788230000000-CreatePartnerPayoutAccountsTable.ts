import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerPayoutAccountsTable1788230000000 implements MigrationInterface {
  name = 'CreatePartnerPayoutAccountsTable1788230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partner_payout_accounts" (
        "id" SERIAL PRIMARY KEY,
        "deliveryPartnerId" INT NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "accountType" VARCHAR(20) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
        "accountHolderName" VARCHAR(100) NULL,
        "accountNumberEncrypted" VARCHAR(255) NULL,
        "accountLast4" VARCHAR(10) NULL,
        "ifscCode" VARCHAR(50) NULL,
        "bankName" VARCHAR(100) NULL,
        "upiId" VARCHAR(255) NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
        "verificationNote" TEXT NULL,
        "verifiedByUserId" INT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "verifiedAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_payout_accounts_partner" ON "partner_payout_accounts" ("deliveryPartnerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partner_payout_accounts_partner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_payout_accounts"`);
  }
}
