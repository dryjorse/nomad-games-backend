import { Injectable } from '@nestjs/common';
import { paginate } from 'src/common/pagination/paginate';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getRating(dto: PaginationDTO, userId?: string) {
    const users = await paginate(this.prisma.user, dto, {
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

    return {
      ...users,
      results: users.results.map(({ friends, friendOf, ...user }: any) => ({
        ...user,
        ...(userId && {
          isFriend: (friends?.length ?? 0) > 0 || (friendOf?.length ?? 0) > 0,
        }),
      })),
    };
  }
}
