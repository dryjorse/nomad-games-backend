import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueModule } from './apps/queue/queue.module';
import { GameModule } from './apps/game/game.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuthModule } from './apps/auth/auth.module';
import { NotificationModule } from './apps/notification/notification.module';
import { FriendshipModule } from './apps/friendship/friendship.module';
import { ProfileModule } from './apps/profile/profile.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { UserModule } from './apps/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: config.get('MAIL_USER'),
        },
      }),
    }),
    GatewayModule,
    PrismaModule,
    AuthModule,
    QueueModule,
    GameModule,
    NotificationModule,
    FriendshipModule,
    ProfileModule,
    UserModule,
  ],
})
export class AppModule {}
