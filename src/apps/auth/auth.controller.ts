import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ForgorPasswordDTO,
  LoginResponseDTO,
  LoginUserDTO,
  RefreshDTO,
  RegisterDTO,
  RegisterResponseDTO,
  ResetPasswordDTO,
} from './auth.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOkResponse({ type: RegisterResponseDTO })
  async register(@Body() registerDTO: RegisterDTO) {
    return this.authService.register(registerDTO);
  }

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDTO })
  async login(@Body() loginDTO: LoginUserDTO) {
    const user = await this.authService.validateUser(
      loginDTO.username,
      loginDTO.password,
    );

    if (user instanceof UnauthorizedException) {
      throw user;
    }

    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiOkResponse({ type: LoginResponseDTO })
  async refresh(@Body() { refreshToken }: RefreshDTO) {
    const payload = this.authService.verifyToken(refreshToken);
    if (payload instanceof UnauthorizedException) {
      throw payload;
    }

    const user = await this.authService.findUserById(payload.sub);
    if (user instanceof UnauthorizedException) {
      throw user;
    }

    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const { password: _, ...userInfo } = user;

    return this.authService.login(userInfo);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDTO: ForgorPasswordDTO) {
    return this.authService.forgotPassword(forgotPasswordDTO.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
