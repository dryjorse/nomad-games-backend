import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NotificationType } from 'prisma/generated/prisma/enums';

export class CreateNotificationDTO {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  gameId?: string;
}

export class ReadNotificationsDTO {
  @IsArray()
  @IsUUID('all', { each: true })
  notifications: string[];
}

export class NotificationDTO {
  @ApiProperty({
    enum: ['GAME_INVITATION', 'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED'],
  })
  type: 'GAME_INVITATION' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_ACCEPTED';

  userId: string;
  gameId: string | null;
  id: string;
  isRead: boolean;
  relatedUserId: string;
  createdAt: Date;
}

export class NotificationWithRelatedUserDTO extends NotificationDTO {
  relatedUser: {
    username: string;
  };
}

export class GetNotificationsResponseDTO {
  count: number;
  notifications: NotificationDTO[];
}
