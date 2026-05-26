import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/auth.guard';
import { IRequest } from 'src/common/types';
import { ChangeAvatarResponseDTO, UpdateProfileDTO } from './profile.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { UserDTO } from '../user/user.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOkResponse({ type: UserDTO })
  async getProfile(@Req() req: IRequest) {
    return this.profileService.getProfile(req.user.sub);
  }

  @Patch()
  @ApiOkResponse({ type: UserDTO })
  async updateProfile(@Req() req: IRequest, @Body() dto: UpdateProfileDTO) {
    return this.profileService.updateProfile(req.user.sub, dto);
  }

  @Patch('change-ava')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avas',
        filename: (_, file, cb) => {
          const uniqueName = `${Date.now()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          cb(new BadRequestException('Только изображения'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOkResponse({ type: ChangeAvatarResponseDTO })
  async updateAvatar(
    @Req() req: IRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.updateAvatar(req.user.sub, file);
  }
}
