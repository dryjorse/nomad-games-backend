import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class GetFriendsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;
}
