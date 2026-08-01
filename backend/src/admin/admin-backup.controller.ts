import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import { BackupService } from '../backup/backup.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';

/**
 * Sauvegardes de la base (SUPER_ADMIN uniquement, comme la console SQL).
 * Le téléchargement est protégé par le cookie JWT du super-admin : le lien
 * envoyé par email fonctionne donc dans le navigateur du super-admin
 * connecté (et via l'API avec un Bearer pour les futurs clients).
 */
@Controller('admin/backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminBackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  list() {
    return this.backupService.listBackups();
  }

  @Post()
  create() {
    return this.backupService.createBackup();
  }

  @Get(':name/download')
  download(@Param('name') name: string, @Res({ passthrough: true }) res: Response) {
    const file = this.backupService.downloadBackup(name);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
    });
    return file;
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.backupService.deleteBackup(name);
  }

  @Post('restore/local')
  restoreLocal(@Body() dto: RestoreBackupDto) {
    return this.backupService.restoreFromLocal(dto.name);
  }

  @Post('restore/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: resolve(process.cwd(), './tmp-backup-uploads'),
        filename: () => `backup-upload-${randomUUID()}.db`,
      }),
    }),
  )
  restoreUpload(@UploadedFile() file: Express.Multer.File) {
    return this.backupService.restoreFromUpload(file);
  }
}
