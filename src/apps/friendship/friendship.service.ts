import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { paginate } from 'src/common/pagination/paginate';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { GetFriendsQueryDTO } from './friendship.dto';

@Injectable()
export class FriendshipService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async getFriends(userId: string, { q, ...dto }: GetFriendsQueryDTO) {
    const result = await paginate(
      this.prisma.friendship,
      dto as PaginationDTO,
      {
        where: {
          OR: [
            {
              userId,
              ...(q && {
                friend: { username: { contains: q, mode: 'insensitive' } },
              }),
            },
            {
              friendId: userId,
              ...(q && {
                user: { username: { contains: q, mode: 'insensitive' } },
              }),
            },
          ],
        },
        include: {
          friend: { select: { id: true, username: true } },
          user: { select: { id: true, username: true } },
        },
      },
    );

    return {
      ...result,
      results: (result.results as any[]).map((item) =>
        item.userId === userId ? item.friend : item.user,
      ),
    };
  }

  async sendFriendRequest(userId: string, friendId: string) {
    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: {
        friends: { where: { friendId: userId } },
        friendOf: { where: { userId: userId } },
        notifications: {
          where: {
            type: 'FRIEND_REQUEST',
            relatedUserId: userId,
          },
          take: 1,
        },
      },
    });

    if (userId === friendId)
      throw new BadRequestException(
        'Нельзя отправлять запрос на дружбу на самого себя',
      );

    if (!friend) throw new NotFoundException('Пользователь не найден');

    const alreadyFriends =
      friend.friends.length > 0 || friend.friendOf.length > 0;

    if (alreadyFriends) throw new ConflictException('Вы уже друзья');

    if (friend.notifications.length)
      throw new ConflictException('Запрос на дружбу уже отправлен');

    return this.notificationService.createNotification(userId, {
      type: 'FRIEND_REQUEST',
      userId: friendId,
    });
  }

  async acceptFriendRequest(userId: string, notificationId: string) {
    const friendRequest = await this.prisma.notification.findUnique({
      where: { id: notificationId, userId },
    });

    if (!friendRequest)
      throw new NotFoundException('Запрос на дружбу не был отправлен');

    const friendship = await this.prisma.friendship.create({
      data: { userId: friendRequest.relatedUserId, friendId: userId },
    });

    this.notificationService.createNotification(
      friendRequest.relatedUserId,
      {
        type: 'FRIEND_REQUEST_ACCEPTED',
        userId,
      },
      friendRequest.relatedUserId,
    );

    return friendship;
  }
}
