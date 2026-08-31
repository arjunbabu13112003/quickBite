import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerPayoutAccountPrimaryPartialIndex1788240000000 implements MigrationInterface {
  name = 'AddPartnerPayoutAccountPrimaryPartialIndex1788240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Preflight check for duplicate primary accounts per delivery partner
    const duplicates = await queryRunner.query(`
      SELECT "deliveryPartnerId", COUNT(*) as cnt
      FROM "partner_payout_accounts"
      WHERE "isPrimary" = TRUE
      GROUP BY "deliveryPartnerId"
      HAVING COUNT(*) > 1
    `);

    if (duplicates && duplicates.length > 0) {
      const duplicateDetails = duplicates
        .map((d: any) => `Partner ID ${d.deliveryPartnerId} has ${d.cnt} primary accounts`)
        .join(', ');
      throw new Error(
        `Migration aborted: Duplicate primary payout accounts detected! details: [${duplicateDetails}]. Please manually reconcile the duplicate primary accounts before applying this migration.`
      );
    }

    // 2. Create partial unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_partner_payout_accounts_primary"
      ON "partner_payout_accounts" ("deliveryPartnerId")
      WHERE "isPrimary" = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_partner_payout_accounts_primary"
    `);
  }
}
