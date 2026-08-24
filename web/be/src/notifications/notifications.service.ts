import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelNotification } from './hotel-notification.entity';
import { DeliveryPartnerNotification } from './delivery-partner-notification.entity';
import { Order } from '../orders/order.entity';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(HotelNotification)
    private readonly notificationRepository: Repository<HotelNotification>,
    @InjectRepository(DeliveryPartnerNotification)
    private readonly partnerNotificationRepository: Repository<DeliveryPartnerNotification>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryPartner)
    private readonly partnerRepository: Repository<DeliveryPartner>,
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

    return await this.partnerNotificationRepository.save(notification);
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
}
