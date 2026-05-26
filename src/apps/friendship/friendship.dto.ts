import { IsOptional, IsString } from 'class-validator';
import { PaginationDTO } from 'src/common/pagination/pagination.dto';
import { UserDTO } from '../user/user.dto';

export class GetFriendsQueryDTO extends PaginationDTO {
  @IsOptional()
  @IsString()
  q?: string;
}

export class GetFriendsResponseDTO {
  count: number;
  results: UserDTO[];
}

export class FriendshipDTO {
  id: string;
  userId: string;
  friendId: string;
  createdAt: Date;
}
