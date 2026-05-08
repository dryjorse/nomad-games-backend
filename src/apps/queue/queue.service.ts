import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppGateway } from 'src/gateway/app.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private appGateway: AppGateway,
  ) {}

  async joinQueue(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        queue: true,
        gamesAsFirst: {
          where: { status: { in: ['ACTIVE', 'WAITING'] } },
          take: 1,
        },
        gamesAsSecond: {
          where: { status: { in: ['ACTIVE', 'WAITING'] } },
          take: 1,
        },
      },
    });

    if (user?.queue) throw new ConflictException('Вы уже находитесь в очереди');

    if (user?.gamesAsFirst?.length || user?.gamesAsSecond?.length)
      throw new ConflictException('Вы уже участвуете в игре');

    const firstQueue = await this.prisma.queue.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (firstQueue) {
      const game = await this.prisma.$transaction(async (tx) => {
        const game = await tx.game.create({
          data: {
            firstPlayerId: firstQueue.userId,
            secondPlayerId: userId,
            status: 'ACTIVE',
          },
        });
        await tx.queue.delete({ where: { id: firstQueue.id } });
        return game;
      });

      this.appGateway.gameFoundSocket(userId, game);
      this.appGateway.playerJoinedSocket(game.firstPlayerId, user!);
      return game;
    }

    const waitingGame = await this.prisma.game.findFirst({
      where: { secondPlayerId: null, status: 'WAITING', visibility: 'PUBLIC' },
      orderBy: { createdAt: 'asc' },
    });

    if (waitingGame) {
      const game = await this.prisma.game.update({
        where: { id: waitingGame.id },
        data: { secondPlayerId: userId },
      });

      this.appGateway.gameFoundSocket(userId, game);
      this.appGateway.playerJoinedSocket(game.firstPlayerId, user!);

      return game;
    }

    await this.prisma.queue.create({ data: { userId } });

    return null;
  }

  async leaveQueue(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { queue: true },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    if (!user.queue) throw new NotFoundException('Вы не находитесь в очереди');

    return this.prisma.queue.delete({ where: { id: user.queue.id } });
  }
}
