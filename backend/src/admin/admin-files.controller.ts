import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminFilesService } from './admin-files.service';
import { FileManagerPathDto } from './dto/file-manager-path.dto';

/**
 * Gestionnaire de fichiers de `frontend/public/media` — réservé SUPER_ADMIN.
 * Permet de lister, télécharger, uploader et supprimer des fichiers destinés
 * à être commités/poussés puis servis publiquement (ex. `/media/xxx.jpg`).
 */
@Controller('admin/files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminFilesController {
  constructor(private readonly adminFilesService: AdminFilesService) {}

  @Get()
  list(@Query() query: FileManagerPathDto) {
    return this.adminFilesService.list(query.path);
  }

  @Post('directory')
  createDirectory(@Body() dto: FileManagerPathDto) {
    return this.adminFilesService.createDirectory(dto.path ?? '');
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: resolve(process.cwd(), './tmp-file-uploads'),
        filename: () => `upload-${randomUUID()}`,
      }),
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FileManagerPathDto,
  ) {
    return this.adminFilesService.saveUpload(file, dto.path ?? '');
  }

  @Get('download')
  download(@Query() query: FileManagerPathDto, @Res({ passthrough: true }) res: Response) {
    const file = this.adminFilesService.download(query.path ?? '');
    const name = (query.path ?? 'fichier').split('/').pop() ?? 'fichier';
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
    });
    return file;
  }

  @Delete()
  remove(@Query() query: FileManagerPathDto) {
    return this.adminFilesService.remove(query.path ?? '');
  }
}
