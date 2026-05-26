import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateNotificationDTO,
  ReadNotificationsDTO,
} from './notification.dto';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { paginate } from 'src/common/pagination/paginate';
import { AppGateway } from 'src/gateway/app.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private appGateway: AppGateway,
  ) {}

  async getNotifications(userId: string, dto: PaginationDTO) {
    return paginate(this.prisma.notification, dto, {
      where: { userId },
      includes: { user: true },
    });
  }

  async createNotification(
    userId: string,
    dto: CreateNotificationDTO,
    sendMessageToUserId: string = dto.userId,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        ...dto,
        relatedUserId: userId,
      },
      include: { relatedUser: { select: { username: true } } },
    });

    this.appGateway.notificationArrivedSocket(
      sendMessageToUserId,
      notification,
    );

    return notification;
  }

  async readNotifications(userId: string, dto: ReadNotificationsDTO) {
    return this.prisma.notification.updateMany({
      where: {
        id: { in: dto.notifications },
        userId,
      },
      data: { isRead: true },
    });
  }
}
