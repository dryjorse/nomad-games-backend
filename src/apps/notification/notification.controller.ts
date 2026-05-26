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
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { AuthGuard } from '../auth/auth.guard';
import { IRequest } from 'src/common/types';
import {
  GetNotificationsResponseDTO,
  ReadNotificationsDTO,
} from './notification.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @Get()
  @ApiOkResponse({ type: GetNotificationsResponseDTO })
  async getNotifications(@Req() req: IRequest, @Query() dto: PaginationDTO) {
    return this.notificationService.getNotifications(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Patch()
  async readNotifications(
    @Req() req: IRequest,
    @Body() dto: ReadNotificationsDTO,
  ) {
    return this.notificationService.readNotifications(req.user.sub, dto);
  }
}
