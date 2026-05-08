import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NotificationType } from 'prisma/generated/prisma/enums';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  gameId?: string;
}
