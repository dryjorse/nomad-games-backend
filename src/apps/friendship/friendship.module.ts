import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [FriendshipController],
  providers: [FriendshipService],
  imports: [NotificationModule, AuthModule],
})
export class FriendshipModule {}
