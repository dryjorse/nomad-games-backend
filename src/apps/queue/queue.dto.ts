import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../game/game.dto';

export class JoinQueueResponseDTO {
  @ApiProperty({ enum: ['waiting', 'found'] })
  status: 'waiting' | 'found';

  @ApiProperty({ type: () => GameDTO, nullable: true })
  game: GameDTO | null;
}
