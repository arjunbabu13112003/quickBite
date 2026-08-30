import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelNotification } from './hotel-notification.entity';
import { DeliveryPartnerNotification } from './delivery-partner-notification.entity';
import { CustomerNotification } from './customer-notification.entity';
import { Order } from '../orders/order.entity';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { DevicePushToken, AppType } from '../users/device-push-token.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(HotelNotification)
    private readonly notificationRepository: Repository<HotelNotification>,
    @InjectRepository(DeliveryPartnerNotification)
    private readonly partnerNotificationRepository: Repository<DeliveryPartnerNotification>,
    @InjectRepository(CustomerNotification)
    private readonly customerNotificationRepository: Repository<CustomerNotification>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryPartner)
    private readonly partnerRepository: Repository<DeliveryPartner>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(DevicePushToken)
    private readonly devicePushTokenRepository: Repository<DevicePushToken>,
  ) {}

  async notifyRestaurant(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['hotel'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.orderStatus !== OrderStatus.READY_FOR_PICKUP) {
      throw new ConflictException(`Order must be in READY_FOR_PICKUP status`);
    }

    // Check for existing unread notification for the same order to prevent spam
    const existingNotification = await this.notificationRepository.findOne({
      where: {
        orderId: order.id,
        isRead: false,
        title: 'Delivery Partner Delay',
      },
    });

    if (existingNotification) {
      throw new ConflictException('A notification has already been sent to the restaurant for this order');
    }

    const notification = this.notificationRepository.create({
      hotelId: order.hotel.id,
      orderId: order.id,
      title: 'Delivery Partner Delay',
      message: `No delivery partner is currently available for Order #${order.orderNumber}. Your order is ready and waiting for delivery partner assignment.`,
    });

    await this.notificationRepository.save(notification);

    return { message: 'Restaurant notified successfully' };
  }

  async getHotelNotifications(hotelId: number) {
    return await this.notificationRepository.find({
      where: { hotelId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: number, hotelId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, hotelId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  async deleteNotification(notificationId: number, hotelId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, hotelId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
    return { success: true, message: 'Notification cleared' };
  }

  async clearAllNotifications(hotelId: number) {
    await this.notificationRepository.delete({ hotelId });
    return { success: true, message: 'All notifications cleared' };
  }

  // --- DELIVERY PARTNER NOTIFICATIONS ---

  async createPartnerNotification(
    deliveryPartnerId: number,
    title: string,
    message: string,
    type: string,
    orderId?: number,
    assignmentId?: number,
  ): Promise<DeliveryPartnerNotification> {
    // Spam/duplication guard for same order & notification type
    if (orderId && type) {
      const existing = await this.partnerNotificationRepository.findOne({
        where: { deliveryPartnerId, orderId, type },
      });
      if (existing) {
        return existing;
      }
    }

    const notification = this.partnerNotificationRepository.create({
      deliveryPartnerId,
      title,
      message,
      type,
      orderId,
      assignmentId,
    });

    const saved = await this.partnerNotificationRepository.save(notification);

    // Automatically trigger push notification to partner device
    this.sendPartnerPush(deliveryPartnerId, title, message, { orderId, type }).catch(err => {
      console.error(`[PUSH] Failed to send partner push during notification creation:`, err);
    });

    return saved;
  }

  async getPartnerNotifications(userId: number): Promise<DeliveryPartnerNotification[]> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    return await this.partnerNotificationRepository.find({
      where: { deliveryPartnerId: partner.id },
      order: { createdAt: 'DESC' },
    });
  }

  async markPartnerAsRead(notificationId: number, userId: number): Promise<DeliveryPartnerNotification> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    const notification = await this.partnerNotificationRepository.findOne({
      where: { id: notificationId, deliveryPartnerId: partner.id },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return await this.partnerNotificationRepository.save(notification);
  }

  async markAllPartnerAsRead(userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    await this.partnerNotificationRepository.update(
      { deliveryPartnerId: partner.id, isRead: false },
      { isRead: true }
    );
    return { success: true, message: 'All notifications marked as read' };
  }

  async deletePartnerNotification(notificationId: number, userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    const notification = await this.partnerNotificationRepository.findOne({
      where: { id: notificationId, deliveryPartnerId: partner.id },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    await this.partnerNotificationRepository.remove(notification);
    return { success: true, message: 'Notification deleted' };
  }

  async clearAllPartnerNotifications(userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    await this.partnerNotificationRepository.delete({ deliveryPartnerId: partner.id });
    return { success: true, message: 'All notifications cleared' };
  }

  async sendCustomerPush(userId: number, title: string, body: string, data?: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.warn(`[PUSH] sendCustomerPush failed: User #${userId} not found`);
      return;
    }
    const tokenRecord = await this.devicePushTokenRepository.findOne({
      where: { userId: user.id, appType: AppType.CUSTOMER, isActive: true },
    });
    if (!tokenRecord) {
      console.log(`[PUSH] sendCustomerPush skipped: User #${userId} has no registered CUSTOMER push token`);
      return;
    }
    this.sendExpoPush(tokenRecord.token, user.id, title, body, data);
  }

  async broadcastCustomerPush(title: string, body: string, data?: any) {
    try {
      const tokens = await this.devicePushTokenRepository.find({
        where: { appType: AppType.CUSTOMER, isActive: true },
      });

      const uniqueTokens = new Set<string>();
      const recipients: { id: number; token: string }[] = [];

      for (const t of tokens) {
        const token = t.token.trim();
        if (!uniqueTokens.has(token)) {
          uniqueTokens.add(token);
          recipients.push({ id: t.userId, token });
        }
      }

      console.log(`[PUSH BROADCAST] Broadcasting to ${recipients.length} unique customer devices.`);

      for (const recipient of recipients) {
        try {
          this.sendExpoPush(recipient.token, recipient.id, title, body, data);
        } catch (err: any) {
          console.error(`[PUSH BROADCAST ERROR] Failed to send push to User #${recipient.id}:`, err.message || err);
        }
      }
    } catch (error: any) {
      console.error('[PUSH BROADCAST ERROR] Failed in broadcastCustomerPush:', error.message || error);
    }
  }

  async sendPartnerPush(partnerId: number, title: string, body: string, data?: any) {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
      relations: ['user'],
    });
    if (!partner) {
      console.warn(`[PUSH] sendPartnerPush failed: Partner #${partnerId} not found`);
      return;
    }
    if (!partner.user) {
      console.warn(`[PUSH] sendPartnerPush failed: Partner #${partnerId} has no linked User record`);
      return;
    }
    const tokenRecord = await this.devicePushTokenRepository.findOne({
      where: { userId: partner.user.id, appType: AppType.DELIVERY_PARTNER, isActive: true },
    });
    if (!tokenRecord) {
      console.log(`[PUSH] sendPartnerPush skipped: Partner #${partnerId} (User #${partner.user.id}) has no registered DELIVERY_PARTNER push token`);
      return;
    }
    this.sendExpoPush(tokenRecord.token, partner.user.id, title, body, data);
  }

  async createHotelNotification(
    hotelId: number,
    title: string,
    message: string,
    orderId?: number,
  ): Promise<HotelNotification> {
    const notification = this.notificationRepository.create({
      hotelId,
      orderId,
      title,
      message,
    });
    return await this.notificationRepository.save(notification);
  }

  private sendExpoPush(pushToken: string, userId: number, title: string, body: string, data?: any) {
    (async () => {
      try {
        const payload = {
          to: pushToken,
          title,
          body,
          sound: "quickbite_alert.wav",
          priority: "high",
          channelId: "quickbite-alerts-v5",
          data: data || {},
        };
        console.log(`[PUSH SEND] recipient: User #${userId}`);
        console.log(`[PUSH SEND] token: ${pushToken}`);
        console.log(`[PUSH SEND] payload: ${JSON.stringify(payload)}`);

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.warn(`[PUSH SEND] Expo push API returned status ${response.status} for User #${userId}`);
          return;
        }

        const resBody = await response.json();
        console.log(`[PUSH SEND] Expo response: ${JSON.stringify(resBody)}`);
        const ticket = Array.isArray(resBody?.data) ? resBody.data[0] : resBody?.data;

        if (ticket) {
          if (ticket.status === 'error') {
            console.error(`[PUSH TICKET ERROR] Recipient: User #${userId}`);
            console.error(`[PUSH TICKET ERROR] Error message: ${ticket.message}`);
            if (ticket.details?.error) {
              const errCode = ticket.details.error;
              console.error(`[PUSH TICKET ERROR] Error code: ${errCode}`);
              
              if (errCode === 'InvalidCredentials') {
                console.error(`[PUSH ERROR: FCM CONFIG] InvalidCredentials: The FCM credentials uploaded to EAS for this project are invalid or not configured.`);
              } else if (errCode === 'MismatchSenderId') {
                console.error(`[PUSH ERROR: FCM CONFIG] MismatchSenderId: The sender ID in the push token does not match the FCM credentials on EAS. Verify google-services.json matches EAS credentials.`);
              } else if (errCode === 'DeviceNotRegistered') {
                console.error(`[PUSH ERROR: FCM CONFIG] DeviceNotRegistered: The device token is invalid or expired. Nullifying the token.`);
                const user = await this.userRepository.findOne({ where: { id: userId } });
                if (user && user.pushToken === pushToken) {
                  console.log(`[PUSH] Nullifying invalid token: ${pushToken}`);
                  await this.userRepository.update(userId, { pushToken: null });
                }
                await this.devicePushTokenRepository.delete({ token: pushToken });
              } else if (errCode === 'MessageTooBig') {
                console.error(`[PUSH ERROR: PAYLOAD] MessageTooBig: The message payload is too large.`);
              } else if (errCode === 'MessageRateExceeded') {
                console.error(`[PUSH ERROR: RATE] MessageRateExceeded: The push sending rate limit has been exceeded.`);
              }
            }
          } else if (ticket.status === 'ok' && ticket.id) {
            console.log(`[PUSH] Expo ticket generated: ${ticket.id}. Scheduling receipt check in 15 seconds...`);
            setTimeout(() => {
              this.checkExpoReceipt(ticket.id, userId, pushToken, 0);
            }, 15000);
          }
        }
      } catch (err: any) {
        console.warn(`[PUSH] Failed to send push to User #${userId}:`, err.message || err);
      }
    })();
  }

  private checkExpoReceipt(ticketId: string, userId: number, pushToken: string, retryCount = 0) {
    (async () => {
      try {
        console.log(`[PUSH] Checking receipt for ticket ${ticketId} (User #${userId}), try #${retryCount + 1}...`);
        const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: [ticketId],
          }),
        });

        if (!response.ok) {
          console.warn(`[PUSH] Expo receipts API returned status ${response.status} for User #${userId}`);
          return;
        }

        const resBody = await response.json();
        console.log(`[PUSH RECEIPT] Expo response: ${JSON.stringify(resBody)}`);
        const receipt = resBody?.data && resBody.data[ticketId];

        if (receipt) {
          if (receipt.status === 'error') {
            console.error(`[PUSH RECEIPT ERROR] Recipient: User #${userId}`);
            console.error(`[PUSH RECEIPT ERROR] Error message: ${receipt.message}`);
            if (receipt.details?.error) {
              const errCode = receipt.details.error;
              console.error(`[PUSH RECEIPT ERROR] Error code: ${errCode}`);
              
              if (errCode === 'InvalidCredentials') {
                console.error(`[PUSH ERROR: FCM CONFIG] InvalidCredentials: The FCM credentials uploaded to EAS for this project are invalid or not configured.`);
              } else if (errCode === 'MismatchSenderId') {
                console.error(`[PUSH ERROR: FCM CONFIG] MismatchSenderId: The sender ID in the push token does not match the FCM credentials on EAS. Verify google-services.json matches EAS credentials.`);
              } else if (errCode === 'DeviceNotRegistered') {
                console.error(`[PUSH ERROR: FCM CONFIG] DeviceNotRegistered: The device token is invalid or expired. Nullifying the token.`);
                const user = await this.userRepository.findOne({ where: { id: userId } });
                if (user && user.pushToken === pushToken) {
                  console.log(`[PUSH] Nullifying invalid token: ${pushToken}`);
                  await this.userRepository.update(userId, { pushToken: null });
                }
                await this.devicePushTokenRepository.delete({ token: pushToken });
              } else if (errCode === 'MessageTooBig') {
                console.error(`[PUSH ERROR: PAYLOAD] MessageTooBig: The message payload is too large.`);
              } else if (errCode === 'MessageRateExceeded') {
                console.error(`[PUSH ERROR: RATE] MessageRateExceeded: The push sending rate limit has been exceeded.`);
              }
            }
          } else if (receipt.status === 'ok') {
            console.log(`[PUSH RECEIPT] Success for User #${userId}`);
          }
        } else {
          // Receipt not available yet - schedule retry
          if (retryCount < 3) {
            const delay = retryCount === 0 ? 60000 : 300000; // 1 minute for 2nd try, 5 minutes for subsequent
            console.log(`[PUSH RECEIPT] Receipt not available yet for ticket ${ticketId}. Retrying in ${delay / 1000}s...`);
            setTimeout(() => {
              this.checkExpoReceipt(ticketId, userId, pushToken, retryCount + 1);
            }, delay);
          } else {
            console.log(`[PUSH RECEIPT] Reached max retries for ticket ${ticketId}. Giving up.`);
          }
        }
      } catch (err: any) {
        console.warn(`[PUSH] Failed to check receipt for User #${userId}:`, err.message || err);
      }
    })();
  }

  // --- CUSTOMER NOTIFICATIONS INBOX METHODS ---

  async getCustomerNotifications(userId: number): Promise<CustomerNotification[]> {
    return await this.customerNotificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markCustomerAsRead(id: number, userId: number): Promise<CustomerNotification> {
    const notification = await this.customerNotificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification #${id} not found for this customer`);
    }
    notification.isRead = true;
    return await this.customerNotificationRepository.save(notification);
  }

  async markAllCustomerAsRead(userId: number): Promise<void> {
    await this.customerNotificationRepository.update(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  async clearAllCustomerNotifications(userId: number): Promise<void> {
    await this.customerNotificationRepository.delete({ userId });
  }

  async createCustomerNotification(
    userId: number,
    campaignId: number | undefined,
    runId: number | undefined,
    title: string,
    body: string,
    type = 'promotion',
    data?: any,
  ): Promise<CustomerNotification> {
    try {
      // Check uniqueness: promotions are now unique by runId, not campaignId
      if (runId) {
        const existing = await this.customerNotificationRepository.findOne({
          where: { userId, runId },
        });
        if (existing) {
          return existing; // idempotent return
        }
      } else if (campaignId) {
        // Fallback for any legacy or other campaign notifications without runId
        const existing = await this.customerNotificationRepository.findOne({
          where: { userId, campaignId },
        });
        if (existing) {
          return existing;
        }
      }

      const notification = this.customerNotificationRepository.create({
        userId,
        campaignId,
        runId,
        title,
        body,
        type,
        data,
      });
      return await this.customerNotificationRepository.save(notification);
    } catch (err: any) {
      if (err.code === '23505') {
        if (runId) {
          const existing = await this.customerNotificationRepository.findOne({
            where: { userId, runId },
          });
          if (existing) return existing;
        } else if (campaignId) {
          const existing = await this.customerNotificationRepository.findOne({
            where: { userId, campaignId },
          });
          if (existing) return existing;
        }
      }
      throw err;
    }
  }
}
