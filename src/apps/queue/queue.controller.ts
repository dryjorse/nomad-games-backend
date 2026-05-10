import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { IRequest } from 'src/common/types';
import { AuthGuard } from '../auth/auth.guard';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @UseGuards(AuthGuard)
  @Post('join')
  async joinQueue(@Req() req: IRequest) {
    const result = await this.queueService.joinQueue(req.user.sub);

    if (!result) return { status: 'waiting', message: 'Ожидаем соперника' };

    return { status: 'found', game: result };
  }
}
