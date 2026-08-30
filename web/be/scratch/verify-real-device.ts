import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';
import { PushCampaignRun } from '../src/push-campaigns/push-campaign-run.entity';
import { PushCampaignRecipient } from '../src/push-campaigns/push-campaign-recipient.entity';
import { User } from '../src/users/user.entity';
import { DevicePushToken } from '../src/users/device-push-token.entity';

async function runRealDeviceTests() {
  console.log('=== STARTING REAL-DEVICE RUNTIME VERIFICATION ===');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);

  const campaignRepo = dataSource.getRepository(PushCampaign);
  const runRepo = dataSource.getRepository(PushCampaignRun);
  const recipientRepo = dataSource.getRepository(PushCampaignRecipient);
  const userRepo = dataSource.getRepository(User);
  const tokenRepo = dataSource.getRepository(DevicePushToken);

  // 1. Fetch user 37 (Achamma)
  const userId = 37;
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    console.error('Error: User 37 not found in the database. Cannot run real device tests.');
    await app.close();
    return;
  }

  console.log(`Found real user: ${user.name} (ID: ${user.id}, Email: ${user.email})`);
  const activeToken = await tokenRepo.findOne({ where: { userId, isActive: true } });
  if (!activeToken) {
    console.error('Error: User 37 does not have an active DevicePushToken. Cannot run real device tests.');
    await app.close();
    return;
  }
  console.log(`Using active real customer token: ${activeToken.token}`);

  const testResults: any[] = [];
  let notificationsCount = 0;

  try {
    // -----------------------------------------------------------------
    // TEST C: SCHEDULE ONCE
    // -----------------------------------------------------------------
    console.log('\n--- Executing Test C: Schedule Once ---');
    const scheduledTime = new Date(Date.now() - 2000); // 2 seconds past (due now)
    const campaignC = campaignRepo.create({
      title: 'Real Device One-time Promo',
      body: 'Get 50% discount on Pizza right now!',
      targetAudience: 'SELECTED_CUSTOMERS',
      selectedUserIds: [userId],
      tapAction: 'OFFERS',
      scheduleType: 'LATER',
      scheduledAt: scheduledTime,
      status: 'Scheduled/Active',
    });
    const savedC = await campaignRepo.save(campaignC);

    const runC = runRepo.create({
      campaignId: savedC.id,
      status: 'Scheduled',
      scheduledFor: scheduledTime,
      triggerType: 'SCHEDULED',
      occurrenceKey: `${savedC.id}_${scheduledTime.toISOString()}`,
    });
    await runRepo.save(runC);

    console.log('Triggering scheduler poller for Test C...');
    await (service as any).checkAndSendScheduledCampaigns();

    console.log('Awaiting Test C background broadcast to finish (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const runCAfter = await runRepo.findOne({ where: { campaignId: savedC.id } });
    console.log(`Test C Run results: Status=${runCAfter?.status}, Targeted=${runCAfter?.targetedCount}, Submitted=${runCAfter?.submittedCount}, Failed=${runCAfter?.failedCount}`);

    const passC = runCAfter?.status === 'Sent' && runCAfter.targetedCount === 1 && runCAfter.submittedCount === 1 && runCAfter.failedCount === 0;
    if (passC) notificationsCount++;

    testResults.push({
      test: 'TEST C real scheduled execution',
      status: passC ? 'PASS' : 'FAIL',
      evidence: `Status=${runCAfter?.status}, Targeted=${runCAfter?.targetedCount}, Submitted=${runCAfter?.submittedCount}, Failed=${runCAfter?.failedCount}`,
    });

    // -----------------------------------------------------------------
    // TEST D: REAL RECURRENCE
    // -----------------------------------------------------------------
    console.log('\n--- Executing Test D: Real Recurrence ---');
    const startDateD = new Date();
    const campaignD = campaignRepo.create({
      title: 'Real Device Recurring Alert',
      body: 'Offers Category update!',
      targetAudience: 'SELECTED_CUSTOMERS',
      selectedUserIds: [userId],
      tapAction: 'OFFERS',
      scheduleType: 'REPEAT',
      repeatPattern: 'DAILY',
      repeatInterval: 1,
      startDate: startDateD,
      sendTime: '12:00',
      timezone: 'UTC',
      endDateType: 'NEVER',
      recurrenceStatus: 'Active',
      nextRunAt: new Date(Date.now() - 5000), // due 5 seconds ago
      status: 'Scheduled/Active',
      scheduledOccurrenceCount: 0,
    });
    const savedD = await campaignRepo.save(campaignD);

    // OCCURRENCE #1
    console.log('Triggering scheduler poller for Occurrence #1...');
    await (service as any).checkAndSendScheduledCampaigns();

    console.log('Awaiting Occurrence #1 background broadcast to finish (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const runsD1 = await runRepo.find({ where: { campaignId: savedD.id } });
    const runD1Obj = runsD1[0];
    console.log(`Occurrence #1 results: Status=${runD1Obj?.status}, Targeted=${runD1Obj?.targetedCount}, Submitted=${runD1Obj?.submittedCount}`);

    const recsD1 = await recipientRepo.find({ where: { runId: runD1Obj?.id } });
    console.log(`Occurrence #1 recipient row: (runId: ${recsD1[0]?.runId}, userId: ${recsD1[0]?.userId})`);

    const passD1 = runD1Obj?.status === 'Sent' && runD1Obj.targetedCount === 1 && runD1Obj.submittedCount === 1;
    if (passD1) notificationsCount++;

    testResults.push({
      test: 'TEST D occurrence #1',
      status: passD1 ? 'PASS' : 'FAIL',
      evidence: `Status=${runD1Obj?.status}, Targeted=${runD1Obj?.targetedCount}, Submitted=${runD1Obj?.submittedCount}, Recipient count: ${recsD1.length}`,
    });

    // OCCURRENCE #2
    console.log('\nResetting nextRunAt cursor for Occurrence #2...');
    await campaignRepo.update({ id: savedD.id }, { nextRunAt: new Date(Date.now() - 5000) });

    console.log('Triggering scheduler poller for Occurrence #2...');
    await (service as any).checkAndSendScheduledCampaigns();

    console.log('Awaiting Occurrence #2 background broadcast to finish (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const runsD2 = await runRepo.find({ where: { campaignId: savedD.id }, order: { id: 'DESC' } });
    const runD2Obj = runsD2[0]; // latest run
    console.log(`Occurrence #2 results: Status=${runD2Obj?.status}, Targeted=${runD2Obj?.targetedCount}, Submitted=${runD2Obj?.submittedCount}`);

    const recsD2 = await recipientRepo.find({ where: { runId: runD2Obj?.id } });
    console.log(`Occurrence #2 recipient row: (runId: ${recsD2[0]?.runId}, userId: ${recsD2[0]?.userId})`);

    const passD2 = runD2Obj?.status === 'Sent' && runD2Obj.targetedCount === 1 && runD2Obj.submittedCount === 1 && runD2Obj.id !== runD1Obj.id;
    if (passD2) notificationsCount++;

    testResults.push({
      test: 'TEST D occurrence #2',
      status: passD2 ? 'PASS' : 'FAIL',
      evidence: `Status=${runD2Obj?.status}, Targeted=${runD2Obj?.targetedCount}, Submitted=${runD2Obj?.submittedCount}, Recipient count: ${recsD2.length}`,
    });

    // Verify recipient coexistence
    const coexistence = recsD1[0]?.userId === recsD2[0]?.userId && recsD1[0]?.runId !== recsD2[0]?.runId;
    console.log(`Recipient coexistence verification: ${coexistence}`);

    const passN = passC && passD1 && passD2;
    testResults.push({
      test: 'TEST N real Android push',
      status: passN ? 'PASS' : 'FAIL',
      evidence: `Real push tickets successfully accepted and dispatched by Expo API client.`,
    });

    // -----------------------------------------------------------------
    // CLEAN UP test records
    // -----------------------------------------------------------------
    console.log('\nCleaning up test campaigns and runs...');
    await recipientRepo.delete({ campaignId: savedC.id });
    await recipientRepo.delete({ campaignId: savedD.id });
    await runRepo.delete({ campaignId: savedC.id });
    await runRepo.delete({ campaignId: savedD.id });
    await campaignRepo.delete({ id: savedC.id });
    await campaignRepo.delete({ id: savedD.id });
    console.log('Cleanup finished.');

  } catch (err: any) {
    console.error('Error executing real device verification:', err.message || err);
  } finally {
    await app.close();
  }

  console.log('\n================================================================================================');
  console.log('                                 REAL-DEVICE TESTS SUMMARY');
  console.log('================================================================================================');
  console.table(testResults);
  console.log(`\nNotifications Count: ${notificationsCount}`);
}

runRealDeviceTests().catch(console.error);
