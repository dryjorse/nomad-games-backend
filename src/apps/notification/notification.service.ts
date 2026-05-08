import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './notification.dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { paginate } from 'src/common/pagination/paginate';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(dto: PaginationDto) {
    return paginate(this.prisma.notification, dto, {
      includes: { user: true },
    });
  }

  async createNotification(userId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        ...dto,
        relatedUserId: userId,
      },
    });
  }
}
