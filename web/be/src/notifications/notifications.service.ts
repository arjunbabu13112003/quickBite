import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelNotification } from './hotel-notification.entity';
import { Order } from '../orders/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(HotelNotification)
    private readonly notificationRepository: Repository<HotelNotification>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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
}
