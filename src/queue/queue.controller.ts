import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { QueueService } from './queue.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { IRequest } from 'src/common/types';

@Controller('queue')
export class QueueController {
  constructor(
    private readonly queueGateway: QueueGateway,
    private readonly queueService: QueueService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('notify')
  sendMessage(@Req() req: Request) {
    this.queueGateway.server.emit('message', (req as any).user);
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Post('join')
  async joinQueue(@Req() req: IRequest) {
    const result = await this.queueService.joinQueue(req.user.sub);

    if (!result) {
      return { status: 'waiting', message: 'Ожидаем соперника' };
    }

    this.queueGateway.sendToUsers(
      [result.firstPlayerId, result.secondPlayerId!],
      'game_found',
      result.id,
    );

    return { status: 'found', game: result };
  }
}
