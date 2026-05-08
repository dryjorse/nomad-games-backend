import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from './apps/queue/queue.module';
import { GameModule } from './apps/game/game.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuthModule } from './apps/auth/auth.module';
import { NotificationModule } from './apps/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    GatewayModule,
    PrismaModule,
    AuthModule,
    QueueModule,
    GameModule,
    NotificationModule,
  ],
})
export class AppModule {}
