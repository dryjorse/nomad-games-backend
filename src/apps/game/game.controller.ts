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
import { EditGameDto, MoveDto, OpenGameDto, RespondDrawDto } from './game.dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
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
  @Patch()
  async editGame(@Req() req: IRequest, @Body() dto: EditGameDto) {
    return this.gameService.editGame(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('kick')
  async kickPlayer(@Req() req: IRequest) {
    return this.gameService.kickPlayer(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete('leave')
  async leaveGame(@Req() req: IRequest) {
    return this.gameService.leaveGame(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post('invite/:friendId')
  async ivniteToGame(
    @Req() req: IRequest,
    @Param('friendId') friendId: string,
  ) {
    return this.gameService.inviteToGame(req.user.sub, friendId);
  }

  @UseGuards(AuthGuard)
  @Patch('start')
  async startGame(@Req() req: IRequest) {
    return this.gameService.startGame(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('move')
  async move(@Req() req: IRequest, @Body() dto: MoveDto) {
    return this.gameService.move(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('draw/request')
  async requestDraw(@Req() req: IRequest) {
    return this.gameService.requestDraw(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('draw/respond')
  async respondDraw(@Req() req: IRequest, @Body() dto: RespondDrawDto) {
    return this.gameService.respondDraw(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Get('my')
  async getMyGames(@Req() req: IRequest) {
    return this.gameService.getMyGames(req.user.sub);
  }
}
