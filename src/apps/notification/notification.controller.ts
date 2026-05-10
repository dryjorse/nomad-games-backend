import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AuthGuard } from '../auth/auth.guard';
import { IRequest } from 'src/common/types';
import { ReadNotificationsDto } from './notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getNotifications(@Req() req: IRequest, @Query() dto: PaginationDto) {
    return this.notificationService.getNotifications(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Patch()
  async readNotifications(
    @Req() req: IRequest,
    @Body() dto: ReadNotificationsDto,
  ) {
    return this.notificationService.readNotifications(req.user.sub, dto);
  }
}
