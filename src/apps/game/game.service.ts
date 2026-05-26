import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppGateway } from 'src/gateway/app.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditGameDTO, MoveDTO, OpenGameDTO, RespondDrawDTO } from './game.dto';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
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

  async getOpenGames(dto: PaginationDTO, q?: string) {
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
    const isGameExists = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: { in: ['WAITING', 'ACTIVE'] },
      },
    });

    if (isGameExists) throw new ConflictException('Вы уже участвуете в игре');

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

  async openGame(userId: string, openGameDTO: OpenGameDTO) {
    const isGameExists = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: { in: ['WAITING', 'ACTIVE'] },
      },
    });

    if (isGameExists) throw new ConflictException('Вы уже участвуете в игре');

    const game = await this.prisma.game.create({
      data: {
        firstPlayerId: userId,
        status: 'WAITING',
        visibility: openGameDTO.visibility,
        firstPlayerRole: openGameDTO.role,
      },
    });

    if (openGameDTO.visibility === 'PUBLIC') this.pullPlayerFromQueue(game.id);

    return game;
  }

  async editGame(userId: string, dto: EditGameDTO) {
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

  async startGame(userId: string) {
    const game = await this.prisma.game.findFirst({
      where: { firstPlayerId: userId, status: 'WAITING' },
    });

    if (!game) throw new NotFoundException('Комната не найдена');

    if (!game.secondPlayerId)
      throw new BadRequestException('Соперник отсутствует');

    const startedGame = await this.prisma.game.update({
      where: { id: game.id },
      data: { status: 'ACTIVE' },
    });

    this.appGateway.send(
      game.secondPlayerId,
      EnumSocketEvent.GAME_STARTED,
      game.id,
    );

    return startedGame;
  }

  async move(userId: string, { cell }: MoveDTO) {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: 'ACTIVE',
      },
    });

    if (!game) throw new NotFoundException('Игра не найдена');

    const isFirstPlayer = game.firstPlayerId === userId;
    const currentRole = isFirstPlayer
      ? game.firstPlayerRole
      : game.firstPlayerRole === 'WHITE'
        ? 'BLACK'
        : 'WHITE';

    if (game.currentTurn !== currentRole)
      throw new BadRequestException('Не ваш ход');

    const myAce = isFirstPlayer ? game.firstAce : game.secondAce;
    const rivalAce = isFirstPlayer ? game.secondAce : game.firstAce;

    if (myAce === cell)
      throw new BadRequestException('Нельзя выбрать ячейку с тузом');

    let myCells = isFirstPlayer
      ? [...game.board.slice(0, 9)]
      : [...game.board.slice(9)];
    let rivalCells = isFirstPlayer
      ? [...game.board.slice(9)]
      : [...game.board.slice(0, 9)];

    let myScore = game[`${isFirstPlayer ? 'first' : 'second'}PlayerScore`];
    let rivalScore = game[`${isFirstPlayer ? 'second' : 'first'}PlayerScore`];

    const figuresCount = myCells[cell - 1];

    if (!figuresCount)
      throw new BadRequestException('Нельзя выбрать пустую ячейку');

    myCells[cell - 1] = figuresCount === 1 ? 1 : 0;

    let pos = cell - 1;
    let inMyCells = true;

    if (figuresCount > 1) {
      for (let i = 0; i < figuresCount; i++) {
        (inMyCells ? myCells : rivalCells)[pos]++;

        if (inMyCells) {
          if (pos < 8) pos++;
          else {
            inMyCells = false;
          }
        } else {
          if (pos > 0) pos--;
          else {
            inMyCells = true;
          }
        }
      }
    } else {
      if (isFirstPlayer && cell === 9) {
        inMyCells = false;
        pos = 8;
        rivalCells[pos]++;
      } else if (!isFirstPlayer && cell === 1) {
        inMyCells = true;
        pos = 0;
        myCells[pos]++;
      } else {
        pos = isFirstPlayer ? cell : cell - 2;
        myCells[pos]++;
      }
    }

    const applyAce = (
      acePos: number | null,
      targetCells: number[],
      addToScore: (n: number) => void,
    ) => {
      if (acePos && targetCells[acePos - 1]) {
        addToScore(targetCells[acePos - 1]);
        targetCells[acePos - 1] = 0;
      }
    };

    applyAce(myAce, rivalCells, (n) => (myScore += n));
    applyAce(rivalAce, myCells, (n) => (rivalScore += n));

    let newMyAce: number | null = myAce ?? null;
    let newRivalAce: number | null = rivalAce ?? null;

    const landedCells = inMyCells ? myCells : rivalCells;
    const landedCount = landedCells[pos];
    const landedOnRival = inMyCells !== isFirstPlayer;

    if (landedOnRival && landedCount) {
      const isEven = landedCount % 2 === 0;
      const isThree = landedCount === 3;
      const notAcePos = rivalAce !== pos + 1;
      const notEdge = pos !== (isFirstPlayer ? 0 : 8);

      if (isEven || (isThree && notEdge && notAcePos)) {
        myScore += landedCount;
        landedCells[pos] = 0;

        if (isThree) {
          if (isFirstPlayer) newMyAce = pos + 1;
          else newRivalAce = pos + 1;
        }
      }
    }

    let winnerId: string | null = null;
    let isFinished = false;

    if (myScore >= 82) {
      winnerId = isFirstPlayer ? game.firstPlayerId : game.secondPlayerId;
      isFinished = true;
    }

    const rivalAllEmpty = rivalCells.every((f) => f === 0);

    if (rivalAllEmpty && !isFinished) {
      isFinished = true;
      if (rivalScore < 81) {
        winnerId = isFirstPlayer ? game.firstPlayerId : game.secondPlayerId;
      } else if (rivalScore > 81) {
        winnerId = isFirstPlayer ? game.secondPlayerId : game.firstPlayerId;
      } else {
        winnerId = null;
      }
    }

    const nextTurn = isFirstPlayer
      ? game.firstPlayerRole === 'WHITE'
        ? 'BLACK'
        : 'WHITE'
      : game.firstPlayerRole;

    const board = isFirstPlayer
      ? [...myCells, ...rivalCells]
      : [...rivalCells, ...myCells];

    const opponent = isFirstPlayer ? game.secondPlayerId : game.firstPlayerId;

    if (isFinished) {
      const [updatedGame] = await this.prisma.$transaction([
        this.prisma.game.update({
          where: { id: game.id },
          data: {
            board,
            firstPlayerScore: isFirstPlayer ? myScore : rivalScore,
            secondPlayerScore: isFirstPlayer ? rivalScore : myScore,
            firstAce: isFirstPlayer ? newMyAce : newRivalAce,
            secondAce: isFirstPlayer ? newRivalAce : newMyAce,
            currentTurn: nextTurn,
            winnerId,
            status: 'FINISHED',
          },
        }),
        ...(winnerId
          ? [
              this.prisma.user.update({
                where: { id: winnerId },
                data: { wins: { increment: 1 } },
              }),
            ]
          : []),
      ]);

      this.appGateway.rivalMovedSocket(opponent!, updatedGame);

      this.appGateway.send(
        [game.firstPlayerId, game.secondPlayerId!],
        EnumSocketEvent.GAME_FINISHED,
        winnerId,
      );

      return updatedGame;
    }

    const updatedGame = await this.prisma.game.update({
      where: { id: game.id },
      data: {
        board,
        firstPlayerScore: isFirstPlayer ? myScore : rivalScore,
        secondPlayerScore: isFirstPlayer ? rivalScore : myScore,
        firstAce: isFirstPlayer ? newMyAce : newRivalAce,
        secondAce: isFirstPlayer ? newRivalAce : newMyAce,
        currentTurn: nextTurn,
        winnerId,
        status: 'ACTIVE',
      },
    });

    this.appGateway.rivalMovedSocket(opponent!, updatedGame);

    return updatedGame;
  }

  async giveUp(userId: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: 'ACTIVE',
      },
    });

    if (!game) throw new NotFoundException('Активная игра не найдена');

    const isFirstPlayer = game.firstPlayerId === userId;
    const rival = isFirstPlayer ? game.secondPlayerId : game.firstPlayerId;

    const [updatedGame] = await this.prisma.$transaction([
      this.prisma.game.update({
        where: { id: game.id },
        data: { status: 'FINISHED', winnerId: rival },
      }),
      this.prisma.user.update({
        where: { id: rival! },
        data: { wins: { increment: 1 } },
      }),
    ]);

    this.appGateway.send(rival!, EnumSocketEvent.RIVAL_GIVED_UP);

    return updatedGame;
  }

  async requestDraw(userId: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: 'ACTIVE',
      },
    });

    if (!game) throw new NotFoundException('Игра не найдена');

    const isFirstPlayer = game.firstPlayerId === userId;
    const myDrawField = isFirstPlayer
      ? 'firstPlayerDrawRequest'
      : 'secondPlayerDrawRequest';
    const rivalDrawField = isFirstPlayer
      ? 'secondPlayerDrawRequest'
      : 'firstPlayerDrawRequest';
    const rivalId = isFirstPlayer ? game.secondPlayerId : game.firstPlayerId;

    if (game[myDrawField])
      throw new ConflictException('Вы уже отправили запрос на ничью');

    if (game[rivalDrawField]) {
      const finishedGame = await this.prisma.game.update({
        where: { id: game.id },
        data: { status: 'FINISHED', winnerId: null },
      });

      this.appGateway.send(
        [game.firstPlayerId, game.secondPlayerId!],
        EnumSocketEvent.GAME_FINISHED,
        { winnerId: null },
      );

      return finishedGame;
    }

    await this.prisma.game.update({
      where: { id: game.id },
      data: { [myDrawField]: true },
    });

    this.appGateway.send(rivalId!, EnumSocketEvent.DRAW_REQUESTED);

    return { message: 'Запрос на ничью отправлен' };
  }

  async respondDraw(userId: string, { accept }: RespondDrawDTO) {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: 'ACTIVE',
      },
    });

    if (!game) throw new NotFoundException('Игра не найдена');

    const isFirstPlayer = game.firstPlayerId === userId;
    const rivalDrawField = isFirstPlayer
      ? 'secondPlayerDrawRequest'
      : 'firstPlayerDrawRequest';
    const rivalId = isFirstPlayer ? game.secondPlayerId : game.firstPlayerId;

    if (!game[rivalDrawField])
      throw new BadRequestException('Соперник не запрашивал ничью');

    if (accept) {
      const finishedGame = await this.prisma.game.update({
        where: { id: game.id },
        data: {
          status: 'FINISHED',
          winnerId: null,
          firstPlayerDrawRequest: false,
          secondPlayerDrawRequest: false,
        },
      });

      this.appGateway.send(
        [game.firstPlayerId, game.secondPlayerId!],
        EnumSocketEvent.GAME_FINISHED,
        { winnerId: null },
      );

      return finishedGame;
    }

    await this.prisma.game.update({
      where: { id: game.id },
      data: { [rivalDrawField]: false },
    });

    this.appGateway.send(rivalId!, EnumSocketEvent.DRAW_DECLINED);

    return { message: 'Вы отклонили запрос на ничью' };
  }

  async getMyGames(userId: string, dto: PaginationDTO) {
    const games = await paginate(this.prisma.game, dto, {
      where: {
        OR: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
        status: 'FINISHED',
      },
      select: {
        id: true,
        winnerId: true,
        firstPlayer: {
          select: {
            id: true,
            username: true,
            ava: true,
            wins: true,
            friends: { where: { friendId: userId }, select: { id: true } },
            friendOf: { where: { userId }, select: { id: true } },
          },
        },
        secondPlayer: {
          select: {
            id: true,
            username: true,
            ava: true,
            wins: true,
            friends: { where: { friendId: userId }, select: { id: true } },
            friendOf: { where: { userId }, select: { id: true } },
          },
        },
      },
    });

    return {
      ...games,
      results: games.results.map((game) => {
        const rival =
          game.firstPlayerId === userId
            ? game.secondPlayerId
            : game.firstPlayerId;

        if (!rival) return { ...game, rival: null };

        const { friends, friendOf, ...rivalData } = rival as any;

        return {
          id: game.id,
          winnerId: game.winnerId,
          rival: {
            ...rivalData,
            isFriend: friends.length > 0 || friendOf.length > 0,
          },
        };
      }),
    };
  }
}
