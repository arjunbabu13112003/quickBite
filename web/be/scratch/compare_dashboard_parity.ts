import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { DeliveryPartner } from '../src/delivery-partners/delivery-partner.entity';
import { LedgerEntry } from '../src/payments/entities/ledger-entry.entity';
import { PartnerEarning } from '../src/payments/entities/partner-earning.entity';

function getISTDayRange(date: Date) {
  const dateStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const start = new Date(new Date(dateStr + ' 00:00:00 GMT+0530').getTime());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function getISTWeekRange(date: Date) {
  const { start: todayStart } = getISTDayRange(date);
  const day = todayStart.getDay(); // 0 is Sunday
  const diff = todayStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const start = new Date(todayStart.setDate(diff));
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function getISTMonthRange(date: Date) {
  const dateStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const start = new Date(new Date(dateStr + ' 00:00:00 GMT+0530').getTime());
  start.setDate(1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

async function runParity() {
  console.log('=== RUNNING DASHBOARD PARITY COMPARISON ===');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    const partnerId = 8; // Rider Vijay (userId 17)
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getISTDayRange(now);
    const { start: weekStart, end: weekEnd } = getISTWeekRange(now);
    const { start: monthStart, end: monthEnd } = getISTMonthRange(now);

    console.log(`IST Today Range: ${todayStart.toISOString()} -> ${todayEnd.toISOString()}`);
    console.log(`IST Week Range:  ${weekStart.toISOString()} -> ${weekEnd.toISOString()}`);
    console.log(`IST Month Range: ${monthStart.toISOString()} -> ${monthEnd.toISOString()}`);

    const ledgerRepo = dataSource.getRepository(LedgerEntry);
    const earningRepo = dataSource.getRepository(PartnerEarning);

    // Query OLD Ledger amounts
    const todayOldEntries = await ledgerRepo.createQueryBuilder('le')
      .where('le.deliveryPartnerId = :partnerId', { partnerId })
      .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
      .andWhere('le.direction = :direction', { direction: 'credit' })
      .andWhere('le.createdAt >= :todayStart AND le.createdAt < :todayEnd', { todayStart, todayEnd })
      .getMany();
    const todayOld = todayOldEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    const weekOldEntries = await ledgerRepo.createQueryBuilder('le')
      .where('le.deliveryPartnerId = :partnerId', { partnerId })
      .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
      .andWhere('le.direction = :direction', { direction: 'credit' })
      .andWhere('le.createdAt >= :weekStart AND le.createdAt < :weekEnd', { weekStart, weekEnd })
      .getMany();
    const weekOld = weekOldEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    const monthOldEntries = await ledgerRepo.createQueryBuilder('le')
      .where('le.deliveryPartnerId = :partnerId', { partnerId })
      .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
      .andWhere('le.direction = :direction', { direction: 'credit' })
      .andWhere('le.createdAt >= :monthStart AND le.createdAt < :monthEnd', { monthStart, monthEnd })
      .getMany();
    const monthOld = monthOldEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    // Query NEW PartnerEarning ledger amounts
    const todayNewEntries = await earningRepo.createQueryBuilder('pe')
      .where('pe.deliveryPartnerId = :partnerId', { partnerId })
      .andWhere('pe.earnedAt >= :todayStart AND pe.earnedAt < :todayEnd', { todayStart, todayEnd })
      .andWhere('pe.status != :status', { status: 'REVERSED' })
      .getMany();
    const todayLedger = todayNewEntries.reduce((sum, e) => sum + Number(e.grossEarning), 0);

    const weekNewEntries = await earningRepo.createQueryBuilder('pe')
      .where('pe.deliveryPartnerId = :partnerId', { partnerId })
      .andWhere('pe.earnedAt >= :weekStart AND pe.earnedAt < :weekEnd', { weekStart, weekEnd })
      .andWhere('pe.status != :status', { status: 'REVERSED' })
      .getMany();
    const weekLedger = weekNewEntries.reduce((sum, e) => sum + Number(e.grossEarning), 0);

    const monthNewEntries = await earningRepo.createQueryBuilder('pe')
      .where('pe.deliveryPartnerId = :partnerId', { partnerId })
      .andWhere('pe.earnedAt >= :monthStart AND pe.earnedAt < :monthEnd', { monthStart, monthEnd })
      .andWhere('pe.status != :status', { status: 'REVERSED' })
      .getMany();
    const monthLedger = monthNewEntries.reduce((sum, e) => sum + Number(e.grossEarning), 0);

    console.log('\n--- PARITY COMPARISON RESULTS (Rider ID: 8) ---');
    console.log(`Today old:    ₹${todayOld.toFixed(2)}`);
    console.log(`Today ledger: ₹${todayLedger.toFixed(2)}`);
    console.log(`Week old:     ₹${weekOld.toFixed(2)}`);
    console.log(`Week ledger:  ₹${weekLedger.toFixed(2)}`);
    console.log(`Month old:    ₹${monthOld.toFixed(2)}`);
    console.log(`Month ledger: ₹${monthLedger.toFixed(2)}`);
    console.log('--------------------------------------------\n');

  } catch (error) {
    console.error('Parity check failed:', error);
  } finally {
    await app.close();
  }
}

runParity().catch(console.error);
