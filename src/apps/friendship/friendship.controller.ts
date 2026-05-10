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
import { GetFriendsDto } from './friendship.dto';

@UseGuards(AuthGuard)
@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  async getFriends(@Req() req: IRequest, @Query() dto: GetFriendsDto) {
    return this.friendshipService.getFriends(req.user.sub, dto);
  }

  @Post('invite/:friendId')
  async invite(@Req() req: IRequest, @Param('friendId') friendId: string) {
    return this.friendshipService.sendFriendRequest(req.user.sub, friendId);
  }

  @Post('accept/:inviteId')
  async accept(@Req() req: IRequest, @Param('inviteId') inviteId: string) {
    return this.friendshipService.acceptFriendRequest(req.user.sub, inviteId);
  }
}
