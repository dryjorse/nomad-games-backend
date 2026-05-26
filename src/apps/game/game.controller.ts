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
import {
  EditGameDTO,
  GameDTO,
  GamesResponseDTO,
  JoinGameResponseDTO,
  MoveDTO,
  MyGamesResponseDTO,
  OpenGameDTO,
  RespondDrawDTO,
} from './game.dto';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  @ApiOkResponse({ type: GamesResponseDTO })
  async getOpenGames(@Query() dto: PaginationDTO, @Query('q') q?: string) {
    return this.gameService.getOpenGames(dto, q);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('join/:id')
  @ApiOkResponse({ type: JoinGameResponseDTO })
  async joinGame(@Req() req: IRequest, @Param('id') gameId: string) {
    return this.gameService.joinGame(req.user.sub, gameId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('open')
  @ApiOkResponse({ type: GameDTO })
  async openGame(@Req() req: IRequest, @Body() openGameDTO: OpenGameDTO) {
    return this.gameService.openGame(req.user.sub, openGameDTO);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch()
  @ApiOkResponse({ type: GameDTO })
  async editGame(@Req() req: IRequest, @Body() dto: EditGameDTO) {
    return this.gameService.editGame(req.user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete('kick')
  @ApiOkResponse({ type: GameDTO })
  async kickPlayer(@Req() req: IRequest) {
    return this.gameService.kickPlayer(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete('leave')
  async leaveGame(@Req() req: IRequest) {
    return this.gameService.leaveGame(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('invite/:friendId')
  async ivniteToGame(
    @Req() req: IRequest,
    @Param('friendId') friendId: string,
  ) {
    return this.gameService.inviteToGame(req.user.sub, friendId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch('start')
  @ApiOkResponse({ type: GameDTO })
  async startGame(@Req() req: IRequest) {
    return this.gameService.startGame(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch('move')
  @ApiOkResponse({ type: GameDTO })
  async move(@Req() req: IRequest, @Body() dto: MoveDTO) {
    return this.gameService.move(req.user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch('draw/request')
  @ApiOkResponse({ type: GameDTO })
  async requestDraw(@Req() req: IRequest) {
    return this.gameService.requestDraw(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch('draw/respond')
  @ApiOkResponse({ type: GameDTO })
  async respondDraw(@Req() req: IRequest, @Body() dto: RespondDrawDTO) {
    return this.gameService.respondDraw(req.user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('my')
  @ApiOkResponse({ type: MyGamesResponseDTO })
  async getMyGames(@Req() req: IRequest, @Query() dto: PaginationDTO) {
    return this.gameService.getMyGames(req.user.sub, dto);
  }
}
