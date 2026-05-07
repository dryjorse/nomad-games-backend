import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { GameModule } from './game/game.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    GatewayModule,
    PrismaModule,
    AuthModule,
    QueueModule,
    GameModule,
  ],
})
export class AppModule {}
