import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from '../auth/auth.guard';
import { IRequest } from 'src/common/types';
import {
  FriendshipDTO,
  GetFriendsQueryDTO,
  GetFriendsResponseDTO,
} from './friendship.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { NotificationWithRelatedUserDTO } from '../notification/notification.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  @ApiOkResponse({ type: GetFriendsResponseDTO })
  async getFriends(@Req() req: IRequest, @Query() dto: GetFriendsQueryDTO) {
    return this.friendshipService.getFriends(req.user.sub, dto);
  }

  @Post('invite/:friendId')
  @ApiOkResponse({ type: NotificationWithRelatedUserDTO })
  async invite(@Req() req: IRequest, @Param('friendId') friendId: string) {
    return this.friendshipService.sendFriendRequest(req.user.sub, friendId);
  }

  @Post('accept/:inviteId')
  @ApiOkResponse({ type: FriendshipDTO })
  async accept(@Req() req: IRequest, @Param('inviteId') inviteId: string) {
    return this.friendshipService.acceptFriendRequest(req.user.sub, inviteId);
  }
}
