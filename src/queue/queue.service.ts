import { ConflictException, Injectable } from '@nestjs/common';
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
      include: { queue: true, gamesAsFirst: true, gamesAsSecond: true },
    });

    if (user?.queue) throw new ConflictException('Вы уже находитесь в очереди');

    if (user?.gamesAsFirst?.length || user?.gamesAsSecond?.length)
      throw new ConflictException('Вы уже участвуете в игре');

    const firstPlayerInQueue = await this.prisma.queue.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (firstPlayerInQueue) {
      const game = await this.prisma.game.create({
        data: {
          firstPlayerId: firstPlayerInQueue.userId,
          secondPlayerId: userId,
          status: 'ACTIVE',
        },
      });

      await this.prisma.queue.deleteMany({
        where: {
          userId: { in: [firstPlayerInQueue.userId, userId] },
        },
      });

      return game;
    }

    const waitingGame = await this.prisma.game.findFirst({
      where: { secondPlayerId: null, status: 'WAITING' },
      orderBy: { createdAt: 'asc' },
    });

    if (waitingGame)
      return this.prisma.game.update({
        where: { id: waitingGame.id },
        data: { secondPlayerId: userId },
      });

    await this.prisma.queue.create({ data: { userId } });

    return null;
  }
}
