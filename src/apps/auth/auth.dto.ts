import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserDTO } from '../user/user.dto';

export class RegisterDTO {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Пароль должен содержать заглавную букву, строчную, цифру и спецсимвол',
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  username: string;
}

export class LoginUserDTO {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RefreshDTO {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

export class ForgorPasswordDTO {
  @IsEmail()
  email: string;
}

export class ResetPasswordDTO {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterResponseDTO {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: UserDTO;
}

export class LoginResponseDTO extends RegisterResponseDTO {}
