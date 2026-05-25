import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getRating(userId?: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        ava: true,
        wins: true,
        ...(userId && {
          friends: { where: { friendId: userId }, select: { id: true } },
          friendOf: { where: { userId }, select: { id: true } },
        }),
      },
      orderBy: { wins: 'desc' },
    });

    return users.map(({ friends, friendOf, ...user }: any) => ({
      ...user,
      ...(userId && {
        isFriend: (friends?.length ?? 0) > 0 || (friendOf?.length ?? 0) > 0,
      }),
    }));
  }
}
