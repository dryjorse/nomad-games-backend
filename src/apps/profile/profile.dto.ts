// profile.dto.ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDTO {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

export class ChangeAvatarResponseDTO {
  username: string;
  id: string;
  ava: string | null;
}
