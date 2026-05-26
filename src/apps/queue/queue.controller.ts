import { Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { IRequest } from 'src/common/types';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JoinQueueResponseDTO } from './queue.dto';

@ApiBearerAuth()
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @UseGuards(AuthGuard)
  @Post('join')
  @ApiOkResponse({ type: JoinQueueResponseDTO })
  async joinQueue(@Req() req: IRequest) {
    const result = await this.queueService.joinQueue(req.user.sub);

    if (!result) return { status: 'waiting', game: null };

    return { status: 'found', game: result };
  }

  @UseGuards(AuthGuard)
  @Delete('leave')
  async leaveQueue(@Req() req: IRequest) {
    return this.queueService.leaveQueue(req.user.sub);
  }
}
