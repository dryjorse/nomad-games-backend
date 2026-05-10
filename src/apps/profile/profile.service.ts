import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';
import { UpdateProfileDto } from './profile.dto';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        ava: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existing && existing.id !== userId)
        throw new BadRequestException('Имя пользователя уже занято');
    }

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existing && existing.id !== userId)
        throw new BadRequestException('Email уже занят');
    }

    if (dto.newPassword) {
      if (!dto.currentPassword)
        throw new BadRequestException('Укажите текущий пароль');

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const isValid = await bcrypt.compare(dto.currentPassword, user!.password);

      if (!isValid) throw new BadRequestException('Неверный текущий пароль');

      dto.newPassword = await bcrypt.hash(dto.newPassword, 10);
    }

    const { currentPassword, newPassword, ...rest } = dto;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(newPassword && { password: newPassword }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        ava: true,
        createdAt: true,
      },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не загружен');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user?.ava && user.ava.includes('/uploads/avas/')) {
      const filename = user.ava.split('/uploads/avas/')[1];
      const oldPath = join(process.cwd(), 'uploads', 'avas', filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const filename = `${Date.now()}.webp`;
    const outputPath = join(process.cwd(), 'uploads', 'avas', filename);

    await sharp(file.path)
      .resize(800, 800, { fit: 'inside' })
      .webp({ quality: 100 })
      .toFile(outputPath);

    fs.unlinkSync(file.path);

    const avaUrl = `${this.config.get('BACKEND_URL')}/uploads/avas/${filename}`;

    return this.prisma.user.update({
      where: { id: userId },
      data: { ava: avaUrl },
      select: { id: true, username: true, ava: true },
    });
  }
}
