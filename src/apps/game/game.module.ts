import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { QueueModule } from 'src/apps/queue/queue.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
  imports: [AuthModule, QueueModule],
})
export class GameModule {}
