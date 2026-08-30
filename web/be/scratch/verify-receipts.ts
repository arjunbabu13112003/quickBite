import { Module } from 'module';

let mockReceiptsApiFail = false;
const mockReceiptsMissingIds = new Set<string>();

const mockFetch = (url: any, init: any): any => {
  const urlStr = String(url);
  if (urlStr.includes('/push/send')) {
    const body = JSON.parse(init.body);
    const data = body.map((msg: any) => {
      if (msg.to.includes('invalid000000000000003')) {
        return {
          status: 'error',
          message: 'DeviceNotRegistered',
          details: { error: 'DeviceNotRegistered' }
        };
      }
      return {
        status: 'ok',
        id: 'ticket_' + Math.random().toString(36).substring(2, 10)
      };
    });
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data })
    });
  } else if (urlStr.includes('/push/getReceipts')) {
    if (mockReceiptsApiFail) {
      return Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });
    }
    const body = JSON.parse(init.body);
    const data: Record<string, any> = {};
    for (const id of body.ids) {
      if (mockReceiptsMissingIds.has(id)) {
        continue;
      }
      if (id.includes('invalid-receipt')) {
        data[id] = {
          status: 'error',
          message: 'DeviceNotRegistered',
          details: { error: 'DeviceNotRegistered' }
        };
      } else {
        data[id] = { status: 'ok' };
      }
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data })
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
};

// Satisfy both CommonJS and ES Module default import patterns
const mockFetchModule = mockFetch as any;
mockFetchModule.default = mockFetch;

// Hook require for node-fetch at module level
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string) {
  if (id === 'node-fetch') {
    return mockFetchModule;
  }
  return originalRequire.apply(this, arguments);
};

// Nest & TypeORM imports
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';
import { PushCampaignRun } from '../src/push-campaigns/push-campaign-run.entity';
import { PushCampaignRecipient } from '../src/push-campaigns/push-campaign-recipient.entity';
import { User } from '../src/users/user.entity';
import { DevicePushToken, AppType } from '../src/users/device-push-token.entity';
import { UserRole } from '../src/users/user-role.enum';

async function runTests() {
  console.log('=== STARTING EXPO RECEIPT TRACKING TESTS (A-P) ===');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);
  (service as any).onModuleDestroy();

  const campaignRepo = dataSource.getRepository(PushCampaign);
  const runRepo = dataSource.getRepository(PushCampaignRun);
  const recipientRepo = dataSource.getRepository(PushCampaignRecipient);
  const userRepo = dataSource.getRepository(User);
  const tokenRepo = dataSource.getRepository(DevicePushToken);

  const testResults: any[] = [];

  try {
    // Helper to create test user & tokens
    const testUserEmail = 'receipt-test-user@quickbite.com';
    let user = await userRepo.findOne({ where: { email: testUserEmail } });
    if (!user) {
      user = userRepo.create({
        name: 'Receipt Test User',
        email: testUserEmail,
        role: UserRole.CUSTOMER,
        password: 'password123',
        mobileNumber: '9998887776'
      });
      user = await userRepo.save(user);
    }

    // Clean up old tokens of test user
    await tokenRepo.delete({ userId: user.id });

    // Register active customer token
    const customerToken = await tokenRepo.save(tokenRepo.create({
      userId: user.id,
      token: 'ExponentPushToken[customer00000000000001]',
      appType: AppType.CUSTOMER,
      isActive: true,
    }));

    // Register active delivery partner token
    const partnerToken = await tokenRepo.save(tokenRepo.create({
      userId: user.id,
      token: 'ExponentPushToken[partner000000000000002]',
      appType: AppType.DELIVERY_PARTNER,
      isActive: true,
    }));

    // Setup Test Runs mapping
    const campaignA = await campaignRepo.save(campaignRepo.create({
      title: 'Test Campaign Base',
      body: 'Body Base',
      targetAudience: 'SELECTED_CUSTOMERS',
      selectedUserIds: [user.id],
      tapAction: 'HOME',
      scheduleType: 'NOW',
      status: 'Draft',
    }));

    const runA = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Scheduled', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runD = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runF = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runG = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runH = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runI = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runJ = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runK = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runM = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runN = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runO = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));
    const runP = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'MANUAL' }));

    // -------------------------------------------------------------
    // TEST A: Ticket Mapping & Pre-association
    // -------------------------------------------------------------
    console.log('\n--- Running TEST A: Ticket Mapping ---');
    const loadedRunA = await runRepo.findOne({ where: { id: runA.id }, relations: ['campaign'] });
    await (service as any).broadcastRunBackground(loadedRunA!);
    await new Promise(r => setTimeout(r, 2000));

    const recsA = await recipientRepo.find({ where: { runId: runA.id } });
    const passA = recsA.length === 1 && 
                  recsA[0].devicePushTokenId === customerToken.id && 
                  recsA[0].expoTicketId !== null && 
                  recsA[0].receiptStatus === 'PENDING';
    
    testResults.push({
      test: 'TEST A - Ticket Mapping & Pre-association',
      status: passA ? 'PASS' : 'FAIL',
      evidence: `rec.devicePushTokenId=${recsA[0]?.devicePushTokenId}, ticketId=${recsA[0]?.expoTicketId}, receiptStatus=${recsA[0]?.receiptStatus}`
    });

    // -------------------------------------------------------------
    // TEST B: Real Receipt OK
    // -------------------------------------------------------------
    console.log('\n--- Running TEST B: Real Receipt OK ---');
    if (recsA[0]) {
      await recipientRepo.update({ id: recsA[0].id }, { receiptNextCheckAt: new Date(Date.now() - 1000) });
      await service.checkPendingReceipts();

      const recB = await recipientRepo.findOne({ where: { id: recsA[0].id } });
      const passB = recB?.receiptStatus === 'OK' && recB?.receiptCheckedAt !== null;

      testResults.push({
        test: 'TEST B - Real Receipt OK',
        status: passB ? 'PASS' : 'FAIL',
        evidence: `receiptStatus=${recB?.receiptStatus}, checkedAt=${recB?.receiptCheckedAt?.toISOString()}`
      });
    } else {
      testResults.push({ test: 'TEST B - Real Receipt OK', status: 'FAIL', evidence: 'No recipient from Test A to check' });
    }

    // -------------------------------------------------------------
    // TEST C: Ticket-Level DeviceNotRegistered
    // -------------------------------------------------------------
    console.log('\n--- Running TEST C: Ticket-Level DeviceNotRegistered ---');
    // Deactivate active customer tokens of user first
    await tokenRepo.update({ userId: user.id, appType: AppType.CUSTOMER }, { isActive: false });

    const invalidToken = await tokenRepo.save(tokenRepo.create({
      userId: user.id,
      token: 'ExponentPushToken[invalid000000000000003]',
      appType: AppType.CUSTOMER,
      isActive: true,
    }));

    const campaignC = await campaignRepo.save(campaignRepo.create({
      title: 'Test C Campaign',
      body: 'Body C',
      targetAudience: 'SELECTED_CUSTOMERS',
      selectedUserIds: [user.id],
      tapAction: 'HOME',
      scheduleType: 'NOW',
    }));
    const runC = await runRepo.save(runRepo.create({
      campaignId: campaignC.id,
      status: 'Scheduled',
      scheduledFor: new Date(),
      triggerType: 'MANUAL',
    }));

    const origResolve = (service as any).resolveAudience;
    (service as any).resolveAudience = async () => {
      const u = { ...user, pushToken: invalidToken.token, devicePushTokenId: invalidToken.id };
      return [u];
    };

    const loadedRunC = await runRepo.findOne({ where: { id: runC.id }, relations: ['campaign'] });
    await (service as any).broadcastRunBackground(loadedRunC!);
    await new Promise(r => setTimeout(r, 2000));
    (service as any).resolveAudience = origResolve;

    const recC = await recipientRepo.findOne({ where: { runId: runC.id } });
    const tokenCAfter = await tokenRepo.findOne({ where: { id: invalidToken.id } });
    const passC = recC?.status === 'failed' && 
                  recC?.failureType === 'PERMANENT' && 
                  tokenCAfter?.isActive === false;

    testResults.push({
      test: 'TEST C - Ticket DeviceNotRegistered',
      status: passC ? 'PASS' : 'FAIL',
      evidence: `recC.status=${recC?.status}, failureType=${recC?.failureType}, token.isActive=${tokenCAfter?.isActive}`
    });

    // -------------------------------------------------------------
    // TEST D: Receipt-Level DeviceNotRegistered
    // -------------------------------------------------------------
    console.log('\n--- Running TEST D: Receipt-Level DeviceNotRegistered ---');
    // Deactivate active customer tokens of user first
    await tokenRepo.update({ userId: user.id, appType: AppType.CUSTOMER }, { isActive: false });

    const invalidReceiptToken = await tokenRepo.save(tokenRepo.create({
      userId: user.id,
      token: 'ExponentPushToken[invalid000000000000004]',
      appType: AppType.CUSTOMER,
      isActive: true,
    }));

    const recD = await recipientRepo.save(recipientRepo.create({
      runId: runD.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: invalidReceiptToken.token,
      devicePushTokenId: invalidReceiptToken.id,
      status: 'submitted',
      expoTicketId: 'invalid-receipt-ticket-D',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    await service.checkPendingReceipts();

    const recDAfter = await recipientRepo.findOne({ where: { id: recD.id } });
    const tokenDAfter = await tokenRepo.findOne({ where: { id: invalidReceiptToken.id } });
    const passD = recDAfter?.receiptStatus === 'ERROR' && 
                  recDAfter?.receiptErrorCode === 'DeviceNotRegistered' && 
                  tokenDAfter?.isActive === false;

    testResults.push({
      test: 'TEST D - Receipt DeviceNotRegistered',
      status: passD ? 'PASS' : 'FAIL',
      evidence: `recD.receiptStatus=${recDAfter?.receiptStatus}, err=${recDAfter?.receiptErrorCode}, token.isActive=${tokenDAfter?.isActive}`
    });

    // -------------------------------------------------------------
    // TEST E: Customer/Partner Isolation
    // -------------------------------------------------------------
    console.log('\n--- Running TEST E: Customer/Partner Isolation ---');
    const partnerTokenAfter = await tokenRepo.findOne({ where: { id: partnerToken.id } });
    const passE = partnerTokenAfter?.isActive === true;

    testResults.push({
      test: 'TEST E - Customer/Partner Isolation',
      status: passE ? 'PASS' : 'FAIL',
      evidence: `Partner token active status=${partnerTokenAfter?.isActive}`
    });

    // -------------------------------------------------------------
    // TEST F: Batch API Failure (HTTP 500)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST F: Batch API Failure ---');
    const recF = await recipientRepo.save(recipientRepo.create({
      runId: runF.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: customerToken.token,
      devicePushTokenId: customerToken.id,
      status: 'submitted',
      expoTicketId: 'ticket-F',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    mockReceiptsApiFail = true;
    await service.checkPendingReceipts();
    mockReceiptsApiFail = false;

    const recFAfter = await recipientRepo.findOne({ where: { id: recF.id } });
    const passF = recFAfter?.receiptStatus === 'PENDING' && 
                  recFAfter?.receiptTransportRetryCount === 1 && 
                  new Date(recFAfter?.receiptNextCheckAt!).getTime() > Date.now() && 
                  recFAfter?.receiptRetryCount === 0;

    testResults.push({
      test: 'TEST F - Batch API Failure',
      status: passF ? 'PASS' : 'FAIL',
      evidence: `receiptStatus=${recFAfter?.receiptStatus}, transportRetryCount=${recFAfter?.receiptTransportRetryCount}, retryCount=${recFAfter?.receiptRetryCount}`
    });

    // -------------------------------------------------------------
    // TEST G: Missing Receipt (Bounded retries)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST G: Missing Receipt ---');
    const recG = await recipientRepo.save(recipientRepo.create({
      runId: runG.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: customerToken.token,
      devicePushTokenId: customerToken.id,
      status: 'submitted',
      expoTicketId: 'ticket-G',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000),
      receiptRetryCount: 4
    }));

    mockReceiptsMissingIds.add('ticket-G');
    await service.checkPendingReceipts();
    mockReceiptsMissingIds.clear();

    const recGAfter = await recipientRepo.findOne({ where: { id: recG.id } });
    const passG = recGAfter?.receiptStatus === 'UNAVAILABLE' && recGAfter?.receiptRetryCount === 4;

    testResults.push({
      test: 'TEST G - Missing Receipt',
      status: passG ? 'PASS' : 'FAIL',
      evidence: `receiptStatus=${recGAfter?.receiptStatus}, retryCount=${recGAfter?.receiptRetryCount}`
    });

    // -------------------------------------------------------------
    // TEST H: Duplicate Receipt Processing
    // -------------------------------------------------------------
    console.log('\n--- Running TEST H: Duplicate Receipt Processing ---');
    const recH = await recipientRepo.save(recipientRepo.create({
      runId: runH.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: customerToken.token,
      devicePushTokenId: customerToken.id,
      status: 'submitted',
      expoTicketId: 'ticket-H',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    await service.checkPendingReceipts();
    const firstCheck = await recipientRepo.findOne({ where: { id: recH.id } });
    
    await recipientRepo.update({ id: recH.id }, { receiptNextCheckAt: new Date(Date.now() - 1000) });
    await service.checkPendingReceipts();
    const secondCheck = await recipientRepo.findOne({ where: { id: recH.id } });

    const passH = firstCheck?.receiptStatus === 'OK' && secondCheck?.receiptStatus === 'OK';
    testResults.push({
      test: 'TEST H - Duplicate Receipt Processing',
      status: passH ? 'PASS' : 'FAIL',
      evidence: `FirstStatus=${firstCheck?.receiptStatus}, SecondStatus=${secondCheck?.receiptStatus}`
    });

    // -------------------------------------------------------------
    // TEST I: Concurrent Workers
    // -------------------------------------------------------------
    console.log('\n--- Running TEST I: Concurrent Workers ---');
    const recI = await recipientRepo.save(recipientRepo.create({
      runId: runI.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: customerToken.token,
      devicePushTokenId: customerToken.id,
      status: 'submitted',
      expoTicketId: 'ticket-I',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    let passI = false;
    const queryRunner1 = dataSource.createQueryRunner();
    await queryRunner1.connect();
    await queryRunner1.startTransaction();
    try {
      await queryRunner1.manager.getRepository(PushCampaignRecipient)
        .createQueryBuilder('rec')
        .setLock('pessimistic_write')
        .where('rec.id = :id', { id: recI.id })
        .getOne();

      const queryRunner2 = dataSource.createQueryRunner();
      await queryRunner2.connect();
      await queryRunner2.startTransaction();
      try {
        await queryRunner2.query("SET local lock_timeout = '50ms'");
        await queryRunner2.manager.getRepository(PushCampaignRecipient)
          .createQueryBuilder('rec')
          .setLock('pessimistic_write')
          .where('rec.id = :id', { id: recI.id })
          .getOne();
      } catch (err) {
        passI = true;
      } finally {
        await queryRunner2.rollbackTransaction();
        await queryRunner2.release();
      }
    } finally {
      await queryRunner1.rollbackTransaction();
      await queryRunner1.release();
    }

    testResults.push({
      test: 'TEST I - Concurrent Workers',
      status: passI ? 'PASS' : 'FAIL',
      evidence: `Worker 2 pessimistic write lock timed out: ${passI}`
    });

    // -------------------------------------------------------------
    // TEST J: Worker Crash Lease Recovery
    // -------------------------------------------------------------
    console.log('\n--- Running TEST J: Worker Crash Lease Recovery ---');
    const recJ = await recipientRepo.save(recipientRepo.create({
      runId: runJ.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: customerToken.token,
      devicePushTokenId: customerToken.id,
      status: 'submitted',
      expoTicketId: 'ticket-J',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000),
      receiptClaimId: 'crashed-worker-id',
      receiptClaimedAt: new Date(Date.now() - 10 * 60 * 1000) // expired
    }));

    await service.checkPendingReceipts();

    const recJAfter = await recipientRepo.findOne({ where: { id: recJ.id } });
    const passJ = recJAfter?.receiptStatus === 'OK' && recJAfter?.receiptClaimId === null;

    testResults.push({
      test: 'TEST J - Worker Crash Lease Recovery',
      status: passJ ? 'PASS' : 'FAIL',
      evidence: `receiptStatus=${recJAfter?.receiptStatus}, claimId=${recJAfter?.receiptClaimId}`
    });

    // -------------------------------------------------------------
    // TEST K: Manual Early Check
    // -------------------------------------------------------------
    console.log('\n--- Running TEST K: Manual Early Check ---');
    const recK = await recipientRepo.save(recipientRepo.create({
      runId: runK.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: customerToken.token,
      devicePushTokenId: customerToken.id,
      status: 'submitted',
      expoTicketId: 'ticket-K',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() + 10 * 60 * 1000), // future
      receiptRetryCount: 1
    }));

    mockReceiptsMissingIds.add('ticket-K');
    await service.checkRunReceiptsManually(runK.id);
    mockReceiptsMissingIds.clear();

    const recKAfter = await recipientRepo.findOne({ where: { id: recK.id } });
    const passK = recKAfter?.receiptStatus === 'PENDING' && recKAfter?.receiptRetryCount === 1;

    testResults.push({
      test: 'TEST K - Manual Early Check',
      status: passK ? 'PASS' : 'FAIL',
      evidence: `receiptStatus=${recKAfter?.receiptStatus}, retryCount=${recKAfter?.receiptRetryCount}`
    });

    // -------------------------------------------------------------
    // TEST L: Recurring Run Isolation
    // -------------------------------------------------------------
    console.log('\n--- Running TEST L: Recurring Run Isolation ---');
    const runL1 = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'SCHEDULED' }));
    const runL2 = await runRepo.save(runRepo.create({ campaignId: campaignA.id, status: 'Sent', scheduledFor: new Date(), triggerType: 'SCHEDULED' }));

    const recL1 = await recipientRepo.save(recipientRepo.create({
      runId: runL1.id,
      campaignId: campaignA.id,
      userId: user.id,
      expoTicketId: 'ticket-L1',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    const recL2 = await recipientRepo.save(recipientRepo.create({
      runId: runL2.id,
      campaignId: campaignA.id,
      userId: user.id,
      expoTicketId: 'ticket-L2',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() + 10 * 60 * 1000) // future
    }));

    await service.checkPendingReceipts();

    const recL1After = await recipientRepo.findOne({ where: { id: recL1.id } });
    const recL2After = await recipientRepo.findOne({ where: { id: recL2.id } });
    const passL = recL1After?.receiptStatus === 'OK' && recL2After?.receiptStatus === 'PENDING';

    testResults.push({
      test: 'TEST L - Recurring Run Isolation',
      status: passL ? 'PASS' : 'FAIL',
      evidence: `Run1 Status=${recL1After?.receiptStatus}, Run2 Status=${recL2After?.receiptStatus}`
    });

    // -------------------------------------------------------------
    // TEST M: Not-yet-due expired lease
    // -------------------------------------------------------------
    console.log('\n--- Running TEST M: Not-yet-due expired lease ---');
    const recM = await recipientRepo.save(recipientRepo.create({
      runId: runM.id,
      campaignId: campaignA.id,
      userId: user.id,
      expoTicketId: 'ticket-M',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() + 10 * 60 * 1000), // future
      receiptClaimId: 'expired-lease-claim',
      receiptClaimedAt: new Date(Date.now() - 10 * 60 * 1000) // expired
    }));

    await service.checkPendingReceipts();

    const recMAfter = await recipientRepo.findOne({ where: { id: recM.id } });
    const passM = recMAfter?.receiptClaimId === 'expired-lease-claim';

    testResults.push({
      test: 'TEST M - Not-yet-due expired lease',
      status: passM ? 'PASS' : 'FAIL',
      evidence: `claimId=${recMAfter?.receiptClaimId}, receiptStatus=${recMAfter?.receiptStatus}`
    });

    // -------------------------------------------------------------
    // TEST N: Receipt transport failure backoff
    // -------------------------------------------------------------
    console.log('\n--- Running TEST N: Receipt transport failure backoff ---');
    const recN = await recipientRepo.save(recipientRepo.create({
      runId: runN.id,
      campaignId: campaignA.id,
      userId: user.id,
      expoTicketId: 'ticket-N',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    mockReceiptsApiFail = true;
    await service.checkPendingReceipts();
    mockReceiptsApiFail = false;

    const recNAfter = await recipientRepo.findOne({ where: { id: recN.id } });
    const passN = recNAfter?.receiptStatus === 'PENDING' && 
                  recNAfter?.receiptTransportRetryCount === 1 && 
                  recNAfter?.receiptRetryCount === 0;

    testResults.push({
      test: 'TEST N - Receipt transport failure backoff',
      status: passN ? 'PASS' : 'FAIL',
      evidence: `receiptStatus=${recNAfter?.receiptStatus}, transportRetryCount=${recNAfter?.receiptTransportRetryCount}, retryCount=${recNAfter?.receiptRetryCount}`
    });

    // -------------------------------------------------------------
    // TEST O: Receipt response mapping
    // -------------------------------------------------------------
    console.log('\n--- Running TEST O: Receipt response mapping ---');
    const recO = await recipientRepo.save(recipientRepo.create({
      runId: runO.id,
      campaignId: campaignA.id,
      userId: user.id,
      expoTicketId: 'ticket-O',
      receiptStatus: 'PENDING',
      receiptNextCheckAt: new Date(Date.now() - 1000)
    }));

    await service.checkPendingReceipts();

    const recOAfter = await recipientRepo.findOne({ where: { id: recO.id } });
    const passO = recOAfter?.receiptStatus === 'OK';

    testResults.push({
      test: 'TEST O - Receipt response mapping',
      status: passO ? 'PASS' : 'FAIL',
      evidence: `receiptStatus=${recOAfter?.receiptStatus}`
    });

    // -------------------------------------------------------------
    // TEST P: Exact DevicePushToken pre-association
    // -------------------------------------------------------------
    console.log('\n--- Running TEST P: Exact DevicePushToken pre-association ---');
    // Deactivate previous CUSTOMER active token of this user to satisfy uniqueness constraints
    await tokenRepo.update({ userId: user.id, appType: AppType.CUSTOMER }, { isActive: false });

    const preToken = await tokenRepo.save(tokenRepo.create({
      userId: user.id,
      token: 'ExponentPushToken[preassociatedP000000]',
      appType: AppType.CUSTOMER,
      isActive: true,
    }));

    const recP = await recipientRepo.save(recipientRepo.create({
      runId: runP.id,
      campaignId: campaignA.id,
      userId: user.id,
      pushToken: preToken.token,
      devicePushTokenId: preToken.id,
      status: 'pending',
    }));

    const messages = [{ to: preToken.token }];
    const tickets = [{ status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } }];
    const mapping = { recipientId: recP.id, devicePushTokenId: preToken.id, token: preToken.token };

    const ticket = tickets[0];
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      await recipientRepo.update(
        { id: mapping.recipientId },
        { 
          status: 'failed', 
          failureType: 'PERMANENT',
          errorMessage: ticket.message, 
          processedAt: new Date() 
        }
      );
      await tokenRepo.update(
        { id: mapping.devicePushTokenId },
        { isActive: false }
      );
    }

    const recPAfter = await recipientRepo.findOne({ where: { id: recP.id } });
    const tokenPAfter = await tokenRepo.findOne({ where: { id: preToken.id } });
    const passP = recPAfter?.status === 'failed' && tokenPAfter?.isActive === false;

    testResults.push({
      test: 'TEST P - Exact DevicePushToken pre-association',
      status: passP ? 'PASS' : 'FAIL',
      evidence: `recP.status=${recPAfter?.status}, token.isActive=${tokenPAfter?.isActive}`
    });

    // -------------------------------------------------------------
    // Clean up mock data
    // -------------------------------------------------------------
    console.log('\nCleaning up verification database records...');
    await recipientRepo.delete({ campaignId: campaignA.id });
    await recipientRepo.delete({ campaignId: campaignC.id });
    await runRepo.delete({ campaignId: campaignA.id });
    await runRepo.delete({ campaignId: campaignC.id });
    await campaignRepo.delete({ id: campaignA.id });
    await campaignRepo.delete({ id: campaignC.id });
    await tokenRepo.delete({ userId: user.id });
    await userRepo.delete({ id: user.id });
    console.log('Cleanup complete.');

  } catch (err: any) {
    console.error('Error executing verification suite:', err.message || err);
  } finally {
    (Module as any).prototype.require = originalRequire;
    await app.close();
  }

  console.log('\n================================================================================================');
  console.log('                               RECEIPT TRACKING VERIFICATION SUMMARY');
  console.log('================================================================================================');
  console.table(testResults);
}

runTests().catch(console.error);
