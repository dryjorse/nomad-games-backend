import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { IRequest } from 'src/common/types';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @UseGuards(AuthGuard)
  @Post('join')
  async joinQueue(@Req() req: IRequest) {
    const result = await this.queueService.joinQueue(req.user.sub);

    if (!result) {
      return { status: 'waiting', message: 'Ожидаем соперника' };
    }

    return { status: 'found', game: result };
  }
}
