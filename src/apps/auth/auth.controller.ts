import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ForgorPasswordDto,
  LoginUserDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (user instanceof UnauthorizedException) {
      throw user;
    }

    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
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
  async forgotPassword(@Body() forgotPasswordDto: ForgorPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
