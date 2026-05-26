import { Controller, Get, Query, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { IRequest } from 'src/common/types';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import { UserRatingResponseDTO } from './user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('rating')
  @ApiOkResponse({ type: UserRatingResponseDTO })
  async getRating(@Req() req: IRequest, @Query() dto: PaginationDTO) {
    return this.userService.getRating(dto, req.user?.sub);
  }
}
