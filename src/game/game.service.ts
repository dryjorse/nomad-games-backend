import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async getOpenGames() {
    return await this.prisma.game.findMany({
      where: { status: 'WAITING', secondPlayerId: null },
    });
  }

  async openGame(userId: string) {
    let game = await this.prisma.game.create({
      data: { firstPlayerId: userId },
    });

    const firstPlayerInQueue = await this.prisma.queue.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (firstPlayerInQueue) {
      game = await this.prisma.game.update({
        where: { id: game.id },
        data: { secondPlayerId: firstPlayerInQueue.userId },
      });

      await this.prisma.queue.delete({ where: { id: game.id } });
    }

    return game;
  }

  async joinGame(userId: string, gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { secondPlayer: true },
    });

    if (!game) throw new NotFoundException('Игра не найдена');

    if (game.firstPlayerId === userId || game.secondPlayerId === userId)
      throw new ConflictException('Вы уже находитесь в игре');

    if (game.secondPlayer) throw new ConflictException('Игра заполнена');

    switch (game.status) {
      case 'ACTIVE':
        throw new ConflictException('Игра уже началась');
      case 'FINISHED':
        throw new ConflictException('Игра уже завершилась');
    }

    return this.prisma.game.update({
      where: { id: gameId },
      data: { secondPlayerId: userId },
    });
  }
}
