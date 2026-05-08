import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppGateway } from 'src/gateway/app.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditGameDto, OpenGameDto } from './game.dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { paginate } from 'src/common/pagination/paginate';
import { EnumSocketEvent } from 'src/common/types';

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private appGateway: AppGateway,
  ) {}

  async getOpenGames(dto: PaginationDto, q?: string) {
    return paginate(this.prisma.game, dto, {
      where: {
        status: 'WAITING',
        secondPlayerId: null,
        ...(q && {
          firstPlayer: {
            username: { contains: q, mode: 'insensitive' },
          },
        }),
      },
      include: { firstPlayer: true },
    });
  }

  async pullPlayerFromQueue(gameId: string) {
    const firstQueue = await this.prisma.queue.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });

    if (!firstQueue)
      return new NotFoundException('Не найдено игроков в очереди');

    const game = await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.update({
        where: { id: gameId },
        data: { secondPlayerId: firstQueue?.userId },
      });

      await tx.queue.delete({ where: { id: firstQueue.id } });

      return game;
    });

    this.appGateway.gameFoundSocket(firstQueue.userId, game);
    this.appGateway.playerJoinedSocket(game.firstPlayerId, firstQueue.user);

    return game;
  }

  async joinGame(userId: string, gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) throw new NotFoundException('Игра не найдена');

    switch (game.status) {
      case 'ACTIVE':
        throw new ConflictException('Игра уже началась');
      case 'FINISHED':
        throw new ConflictException('Игра уже завершилась');
    }

    if (game.firstPlayerId === userId || game.secondPlayerId === userId)
      throw new ConflictException('Вы уже находитесь в игре');

    if (game.secondPlayerId) throw new ConflictException('Игра заполнена');

    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: { secondPlayerId: userId },
      include: { secondPlayer: true },
    });

    this.appGateway.playerJoinedSocket(
      game.firstPlayerId,
      updatedGame.secondPlayer!,
    );
    return updatedGame;
  }

  async openGame(userId: string, openGameDto: OpenGameDto) {
    const game = await this.prisma.game.create({
      data: {
        firstPlayerId: userId,
        status: 'WAITING',
        visibility: openGameDto.visibility,
        firstPlayerRole: openGameDto.role,
      },
    });

    if (openGameDto.visibility === 'PUBLIC') this.pullPlayerFromQueue(game.id);

    return game;
  }

  async editGame(userId: string, gameId: string, dto: EditGameDto) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) throw new NotFoundException('Игра не найдена');

    if (game.firstPlayerId !== userId)
      throw new ForbiddenException('Вы не являетесь создателем игры');

    if (game.status !== 'WAITING')
      throw new ConflictException('Игру нельзя редактировать после начала');

    const data = {
      visibility: dto.visibility,
      firstPlayerRole: dto.role,
    };

    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data,
    });

    if (dto.visibility === 'PUBLIC') this.pullPlayerFromQueue(gameId);

    if (updatedGame.secondPlayerId)
      this.appGateway.gameEditedSocket(updatedGame.secondPlayerId, updatedGame);

    return updatedGame;
  }

  async kickPlayer(userId: string) {
    const game = await this.prisma.game.findFirst({
      where: { firstPlayerId: userId, status: 'WAITING' },
    });

    if (!game) throw new NotFoundException('У вас нет открытой игры');
    if (!game.secondPlayerId)
      throw new ConflictException('Второй игрок отсутствует');

    const updatedGame = await this.prisma.game.update({
      where: { id: game.id },
      data: { secondPlayerId: null },
    });

    if (updatedGame.visibility === 'PUBLIC') this.pullPlayerFromQueue(game.id);

    this.appGateway.send(game.secondPlayerId, EnumSocketEvent.PLAYER_KICKED);

    return updatedGame;
  }

  async leaveGame(userId: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: 'WAITING',
      },
    });

    if (!game) throw new NotFoundException('Открытая игра не найдена');

    if (userId === game.firstPlayerId) {
      await this.prisma.game.delete({
        where: { id: game.id },
      });

      if (game.secondPlayerId)
        this.appGateway.send(game.secondPlayerId, EnumSocketEvent.GAME_CLOSED);
    } else if (userId === game.secondPlayerId) {
      await this.prisma.game.update({
        where: { id: game.id },
        data: { secondPlayerId: null },
      });

      this.pullPlayerFromQueue(game.id);
      this.appGateway.send(game.firstPlayerId, EnumSocketEvent.PLAYER_LEAVED);
    }

    return 'Вы успешно вышли с игры';
  }
}
