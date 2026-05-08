import { IsEnum, IsOptional } from 'class-validator';
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
