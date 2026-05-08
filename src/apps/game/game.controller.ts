import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GameService } from './game.service';
import { IRequest } from 'src/common/types';
import { EditGameDto, OpenGameDto } from './game.dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('open')
  async getOpenGames(@Query() dto: PaginationDto, @Query('q') q?: string) {
    return this.gameService.getOpenGames(dto, q);
  }

  @UseGuards(AuthGuard)
  @Post('join/:id')
  async joinGame(@Req() req: IRequest, @Param('id') gameId: string) {
    return this.gameService.joinGame(req.user.sub, gameId);
  }

  @UseGuards(AuthGuard)
  @Post('open')
  async openGame(@Req() req: IRequest, @Body() openGameDto: OpenGameDto) {
    return this.gameService.openGame(req.user.sub, openGameDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async editGame(
    @Req() req: IRequest,
    @Param('id') gameId: string,
    @Body() dto: EditGameDto,
  ) {
    return this.gameService.editGame(req.user.sub, gameId, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('kick')
  async kickPlayer(@Req() req: IRequest) {
    return this.gameService.kickPlayer(req.user.sub);
  }
}
