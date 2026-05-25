import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { EnumSocketEvent } from 'src/common/types';
import { Game, Notification, User } from 'prisma/generated/prisma/client';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token || client.handshake.headers?.token;

    try {
      const payload = this.jwtService.verify(token + '');

      client.data.user = payload;
      client.data.userId = payload.sub || payload.id;
      client.join(`user_${client.data.userId}`);
    } catch (err) {
      console.log('Ошибка:', (err as any).message);
      client.disconnect(true);
    }
  }

  handleDisconnect() {}

  gameFoundSocket(user: string, game: Game) {
    this.send(user, EnumSocketEvent.GAME_FOUND, game);
  }

  playerJoinedSocket(user: string, player: User) {
    this.send(user, EnumSocketEvent.PLAYER_JOINED, player);
  }

  gameEditedSocket(user: string, game: Game) {
    this.send(user, EnumSocketEvent.GAME_EDITED, game);
  }

  notificationArrivedSocket(user: string, notification: Notification) {
    this.send(user, EnumSocketEvent.NOTIFICATION_ARRIVED, notification);
  }

  rivalMovedSocket(user: string, game: Game) {
    this.send(user, EnumSocketEvent.RIVAL_MOVED, game);
  }

  send(
    userIds: string | number | (string | number)[],
    event: EnumSocketEvent,
    payload?: any,
  ) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;
    const rooms = ids.map((id) => `user_${id}`);
    this.server.to(rooms).emit(event, payload || event);
  }
}
