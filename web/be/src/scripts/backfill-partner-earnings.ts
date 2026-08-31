import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Order } from '../orders/order.entity';
import { OrderFinancialAllocation } from '../payments/entities/order-financial-allocation.entity';
import { PartnerEarning, PartnerEarningStatus } from '../payments/entities/partner-earning.entity';
import { PartnerCodTransaction, PartnerCodTransactionType } from '../payments/entities/partner-cod-transaction.entity';
import { rupeesStringToPaise, paiseToRupeesString, parseRateToBasisPoints } from '../payments/utils/money';

async function runBackfill() {
  const commit = process.argv.includes('--commit');
  console.log(`=== STARTING HISTORICAL PARTNER EARNINGS BACKFILL (Mode: ${commit ? 'COMMIT' : 'DRY RUN'}) ===\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const orderRepo = dataSource.getRepository(Order);
    const allocationRepo = dataSource.getRepository(OrderFinancialAllocation);
    const earningRepo = dataSource.getRepository(PartnerEarning);
    const codTxRepo = dataSource.getRepository(PartnerCodTransaction);

    // Get earning rate bps config
    const rateStr = process.env.DELIVERY_PARTNER_EARNING_RATE || '1.00';
    const rateBps = parseRateToBasisPoints(rateStr);

    // Find all completed deliveries with a partner assigned
    const completedOrders = await orderRepo.createQueryBuilder('order')
      .where('order.orderStatus = :status', { status: 'delivered' })
      .andWhere('order.deliveryPartnerId IS NOT NULL')
      .getMany();

    console.log(`Found ${completedOrders.length} completed orders with delivery partner assigned.`);

    let allocationFoundCount = 0;
    let allocationMissingCount = 0;
    let earningsAlreadyExistingCount = 0;
    let earningsToCreateCount = 0;
    let codTxsToCreateCount = 0;
    let totalEarningPaise = 0;

    for (const order of completedOrders) {
      // 1. Identify earning amount
      const allocation = await allocationRepo.findOne({ where: { orderId: order.id } });
      let earningPaise = 0;

      if (allocation) {
        allocationFoundCount++;
        const persistedEarning = allocation.deliveryPartnerEarning;
        const persistedPaise = rupeesStringToPaise(persistedEarning);
        
        if (persistedPaise > 0) {
          earningPaise = persistedPaise;
        } else {
          // Fallback calculation using allocation's rate (if present) or config rate
          const appRate = Number(allocation.appliedDeliveryPartnerEarningRate || 0);
          const bps = appRate > 0 ? Math.round(appRate * 10000) : rateBps;
          const feePaise = rupeesStringToPaise(order.deliveryFee);
          earningPaise = Math.round((feePaise * bps) / 10000);
        }
      } else {
        allocationMissingCount++;
        // Fallback to calculation using config rate
        const feePaise = rupeesStringToPaise(order.deliveryFee);
        earningPaise = Math.round((feePaise * rateBps) / 10000);
      }

      totalEarningPaise += earningPaise;

      // 2. Check if PartnerEarning already exists
      const existingEarning = await earningRepo.findOne({
        where: { orderId: order.id, deliveryPartnerId: order.deliveryPartnerId }
      });

      if (existingEarning) {
        earningsAlreadyExistingCount++;
      } else {
        earningsToCreateCount++;
        if (commit) {
          const newEarning = earningRepo.create({
            deliveryPartnerId: order.deliveryPartnerId,
            orderId: order.id,
            baseDeliveryFee: order.deliveryFee,
            distanceFee: 0,
            incentiveAmount: 0,
            tipAmount: 0,
            adjustmentAmount: 0,
            grossEarning: earningPaise / 100,
            status: PartnerEarningStatus.AVAILABLE,
            availableAt: order.deliveredAt || new Date(),
            activeSettlementId: null,
            earnedAt: order.deliveredAt || new Date(),
          });
          await earningRepo.save(newEarning);
        }
      }

      // 3. Check COD transaction
      if (order.paymentMethod?.toLowerCase() === 'cod') {
        const existingCodTx = await codTxRepo.findOne({
          where: { orderId: order.id, type: PartnerCodTransactionType.COLLECTED }
        });

        if (existingCodTx) {
          // already exists
        } else {
          codTxsToCreateCount++;
          if (commit) {
            const codTx = codTxRepo.create({
              deliveryPartnerId: order.deliveryPartnerId,
              orderId: order.id,
              amount: order.totalAmount,
              type: PartnerCodTransactionType.COLLECTED,
              status: 'COMPLETED',
              createdAt: order.deliveredAt || new Date(),
            });
            await codTxRepo.save(codTx);
          }
        }
      }
    }

    console.log('\n--- BACKFILL DRY RUN REPORT ---');
    console.log(`Delivered orders found:             ${completedOrders.length}`);
    console.log(`Historical allocation values found:  ${allocationFoundCount}`);
    console.log(`Missing allocation values:           ${allocationMissingCount}`);
    console.log(`Earnings already existing:           ${earningsAlreadyExistingCount}`);
    console.log(`Earnings to create:                 ${earningsToCreateCount}`);
    console.log(`COD records to create:              ${codTxsToCreateCount}`);
    console.log(`Total historical earning amount:    ₹${paiseToRupeesString(totalEarningPaise)}`);
    console.log('--------------------------------\n');

    if (commit) {
      console.log('Database changes committed successfully!');
    } else {
      console.log('Dry run complete. No database changes were made. Run with --commit to apply.');
    }

  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runBackfill().catch((err) => {
  console.error('Backfill boot failed:', err);
  process.exit(1);
});
