import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { GameRole, GameVisibility } from 'prisma/generated/prisma/enums';

export class OpenGameDto {
  @IsOptional()
  @IsEnum(GameVisibility)
  visibility?: GameVisibility;

  @IsOptional()
  @IsEnum(GameRole)
  role?: GameRole;
}

export class EditGameDto extends OpenGameDto {}

import { IsInt, Max, Min } from 'class-validator';

export class MoveDto {
  @IsInt()
  @Min(1)
  @Max(9)
  cell: number;
}

export class RespondDrawDto {
  @IsBoolean()
  accept: boolean;
}
