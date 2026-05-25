import { Controller, Get, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { IRequest } from 'src/common/types';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('rating')
  async getRating(@Req() req: IRequest) {
    return this.userService.getRating(req.user?.sub);
  }
}
