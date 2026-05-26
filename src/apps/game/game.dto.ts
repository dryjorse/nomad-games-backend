import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { GameRole, GameVisibility } from 'prisma/generated/prisma/enums';

export class OpenGameDTO {
  @IsOptional()
  @IsEnum(GameVisibility)
  visibility?: GameVisibility;

  @IsOptional()
  @IsEnum(GameRole)
  role?: GameRole;
}

export class EditGameDTO extends OpenGameDTO {}

import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserDTO, UserForAuthorizedDTO } from '../user/user.dto';

export class MoveDTO {
  @IsInt()
  @Min(1)
  @Max(9)
  cell: number;
}

export class RespondDrawDTO {
  @IsBoolean()
  accept: boolean;
}

export class GameDTO {
  @ApiProperty({ enum: ['WAITING', 'ACTIVE', 'FINISHED'] })
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';

  id: string;

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE'] })
  visibility: 'PUBLIC' | 'PRIVATE';

  board: number[];
  firstAce: number | null;
  secondAce: number | null;

  @ApiProperty({ enum: ['BLACK', 'WHITE'] })
  firstPlayerRole: 'BLACK' | 'WHITE';

  @ApiProperty({ enum: ['BLACK', 'WHITE'] })
  currentTurn: 'BLACK' | 'WHITE';

  firstPlayerScore: number;
  secondPlayerScore: number;
  winnerId: string | null;
  firstPlayerDrawRequest: boolean;
  secondPlayerDrawRequest: boolean;
  createdAt: Date;
  updatedAt: Date;
  firstPlayerId: string;
  secondPlayerId: string | null;
}

export class GamesResponseDTO {
  count: number;
  results: GameDTO[];
}

export class JoinGameResponseDTO extends GameDTO {
  secondPlayer: UserDTO;
}

export class MyGamesResponseDTO {
  count: number;
  results: {
    id: string;
    winnerId: string | null;
    rival: UserForAuthorizedDTO;
  }[];
}
