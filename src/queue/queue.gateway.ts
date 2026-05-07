import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({ namespace: '/queue', cors: { origin: '*' } })
@Injectable()
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.token + '';

      if (!token) throw new UnauthorizedException('Токен не был предоставлен');

      const payload = this.jwtService.verify(token);

      client.data.user = payload;
      client.data.userId = payload.sub || payload.id;

      client.join(`user_${client.data.userId}`);
    } catch (err) {
      client.disconnect(true);
    }
  }

  handleDisconnect() {}

  sendToUsers(
    userIds: string | number | (string | number)[],
    event: string,
    payload: any,
  ) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    console.log(ids);
    if (ids.length === 0) return;

    const rooms = ids.map((id) => `user_${id}`);
    this.server.to(rooms).emit(event, payload);
  }
}
