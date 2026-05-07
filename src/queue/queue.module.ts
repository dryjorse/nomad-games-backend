import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [QueueController],
  providers: [QueueService, QueueGateway],
  exports: [QueueGateway],
  imports: [PrismaModule, AuthModule],
})
export class QueueModule {}
