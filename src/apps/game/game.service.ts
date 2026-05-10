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
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private appGateway: AppGateway,
    private notificationService: NotificationService,
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
      select: {
        id: true,
        firstPlayer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
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

  async editGame(userId: string, dto: EditGameDto) {
    const game = await this.prisma.game.findFirst({
      where: { firstPlayerId: userId, status: 'WAITING' },
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
      where: { id: game.id },
      data,
    });

    if (dto.visibility === 'PUBLIC' && !updatedGame.secondPlayerId)
      this.pullPlayerFromQueue(game.id);

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

      if (game.visibility === 'PUBLIC') this.pullPlayerFromQueue(game.id);
      this.appGateway.send(game.firstPlayerId, EnumSocketEvent.PLAYER_LEAVED);
    }

    return 'Вы успешно вышли с игры';
  }

  async inviteToGame(userId: string, friendId: string) {
    const [user, friend] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          gamesAsFirst: { where: { status: 'WAITING' }, take: 1 },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: friendId },
        include: {
          gamesAsFirst: {
            where: { status: { in: ['WAITING', 'ACTIVE'] } },
            take: 1,
          },
          gamesAsSecond: {
            where: { status: { in: ['WAITING', 'ACTIVE'] } },
            take: 1,
          },
          friends: { where: { friendId: userId }, take: 1 },
          friendOf: { where: { userId }, take: 1 },
        },
      }),
    ]);

    if (!user) throw new NotFoundException('Пользователь не найден');
    if (!friend) throw new NotFoundException('Друг не найден');

    if (!user.gamesAsFirst.length)
      throw new NotFoundException('Активная игра не найдена');
    if (user.gamesAsFirst[0].secondPlayerId)
      throw new ConflictException('Игра уже заполнена');

    if (!friend.friends.length && !friend.friendOf.length)
      throw new NotFoundException('Игрок не найден в вашем списке друзей');

    if (friend.gamesAsFirst.length || friend.gamesAsSecond.length)
      throw new ConflictException('Друг уже находится в игре');

    this.notificationService.createNotification(friendId, {
      type: 'GAME_INVITATION',
      userId,
      gameId: user.gamesAsFirst[0].id,
    });

    return 'Игрок успешно приглашён';
  }
}
