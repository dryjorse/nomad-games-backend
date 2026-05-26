import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO } from './auth.dto';
import { MailerService } from '@nestjs-modules/mailer';
import crypto from 'crypto';
import { User } from 'prisma/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async register(registerDTO: RegisterDTO) {
    const { email, password, username } = registerDTO;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException(
          'Пользователь с таким email уже существует',
        );
      }
      throw new BadRequestException(
        'Пользователь с таким именем уже существует',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        ava: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
      },
      omit: { resetToken: true, resetTokenExpiresAt: true },
    });
    const { password: _, ...result } = user;

    return this.login(result);
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      omit: {
        password: false,
        resetToken: true,
        resetTokenExpiresAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Неверные учетные данные',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Неверные учетные данные',
      });
    }

    const { password: _, ...result } = user;

    return result;
  }
  login(user: Omit<User, 'password' | 'resetToken' | 'resetTokenExpiresAt'>) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      tokens: { accessToken, refreshToken },
      user,
    };
  }

  verifyToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Неверный токен');
    }
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('Пользователь не найден');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 час

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt: expiresAt },
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Восстановление пароля',
      text: `Ссылка для сброса пароля: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
    });

    return 'Письмо отправлено на ваш email';
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Токен недействителен или истёк');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return 'Пароль успешно изменён';
  }
}
