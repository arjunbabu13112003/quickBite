import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerPaymentTables1788158400000 implements MigrationInterface {
  name = 'CreatePartnerPaymentTables1788158400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. partner_earnings
    await queryRunner.query(`
      CREATE TABLE "partner_earnings" (
        "id" SERIAL PRIMARY KEY,
        "deliveryPartnerId" INT NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "orderId" INT NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
        "baseDeliveryFee" NUMERIC(12,2) NOT NULL,
        "distanceFee" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "incentiveAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "tipAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "adjustmentAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "grossEarning" NUMERIC(12,2) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "availableAt" TIMESTAMP NOT NULL,
        "activeSettlementId" INT NULL,
        "earnedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_earnings_partner_status" ON "partner_earnings" ("deliveryPartnerId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_earnings_status_available" ON "partner_earnings" ("status", "availableAt")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_order_partner_earning" ON "partner_earnings" ("orderId", "deliveryPartnerId")`);

    // 2. partner_wallet_adjustments
    await queryRunner.query(`
      CREATE TABLE "partner_wallet_adjustments" (
        "id" SERIAL PRIMARY KEY,
        "deliveryPartnerId" INT NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "amount" NUMERIC(12,2) NOT NULL CHECK ("amount" > 0),
        "direction" VARCHAR(20) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        "activeSettlementId" INT NULL,
        "reason" TEXT NOT NULL,
        "createdByAdminUserId" INT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_wallet_adjustments_partner_status" ON "partner_wallet_adjustments" ("deliveryPartnerId", "status")`);

    // 3. partner_settlements
    await queryRunner.query(`
      CREATE TABLE "partner_settlements" (
        "id" SERIAL PRIMARY KEY,
        "deliveryPartnerId" INT NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "grossEarningsAmount" NUMERIC(12,2) NOT NULL,
        "creditAdjustmentsAmount" NUMERIC(12,2) NOT NULL,
        "debitAdjustmentsAmount" NUMERIC(12,2) NOT NULL,
        "netAmount" NUMERIC(12,2) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "paymentMethod" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
        "externalReference" VARCHAR(100) NULL,
        "failureReason" TEXT NULL,
        "requestedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP NULL,
        "paidAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_settlements_partner_status" ON "partner_settlements" ("deliveryPartnerId", "status")`);

    // 4. partner_settlement_items
    await queryRunner.query(`
      CREATE TABLE "partner_settlement_items" (
        "id" SERIAL PRIMARY KEY,
        "settlementId" INT NOT NULL REFERENCES "partner_settlements"("id") ON DELETE RESTRICT,
        "itemType" VARCHAR(50) NOT NULL,
        "partnerEarningId" INT NULL REFERENCES "partner_earnings"("id") ON DELETE RESTRICT,
        "walletAdjustmentId" INT NULL REFERENCES "partner_wallet_adjustments"("id") ON DELETE RESTRICT,
        "amountSnapshot" NUMERIC(12,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_partner_settlement_item_integrity" CHECK (
          ("itemType" = 'EARNING' AND "partnerEarningId" IS NOT NULL AND "walletAdjustmentId" IS NULL) OR
          ("itemType" = 'ADJUSTMENT' AND "walletAdjustmentId" IS NOT NULL AND "partnerEarningId" IS NULL)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_settlement_items_settlement" ON "partner_settlement_items" ("settlementId")`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_settlement_items_earning" ON "partner_settlement_items" ("partnerEarningId")`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_settlement_items_adjustment" ON "partner_settlement_items" ("walletAdjustmentId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_settlement_earning_item" ON "partner_settlement_items" ("settlementId", "partnerEarningId") WHERE "partnerEarningId" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_settlement_adjustment_item" ON "partner_settlement_items" ("settlementId", "walletAdjustmentId") WHERE "walletAdjustmentId" IS NOT NULL`);

    // 5. partner_cod_transactions
    await queryRunner.query(`
      CREATE TABLE "partner_cod_transactions" (
        "id" SERIAL PRIMARY KEY,
        "deliveryPartnerId" INT NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "orderId" INT NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
        "amount" NUMERIC(12,2) NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partner_cod_transactions_partner" ON "partner_cod_transactions" ("deliveryPartnerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_cod_transactions_order" ON "partner_cod_transactions" ("orderId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_cod_collected_order" ON "partner_cod_transactions" ("orderId", "type") WHERE "type" = 'COLLECTED'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "partner_cod_transactions"`);
    await queryRunner.query(`DROP TABLE "partner_settlement_items"`);
    await queryRunner.query(`DROP TABLE "partner_settlements"`);
    await queryRunner.query(`DROP TABLE "partner_wallet_adjustments"`);
    await queryRunner.query(`DROP TABLE "partner_earnings"`);
  }
}
