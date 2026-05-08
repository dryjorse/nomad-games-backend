import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [QueueController],
  providers: [QueueService],
  imports: [AuthModule],
  exports: [QueueService],
})
export class QueueModule {}
