import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateFacebookImportDto } from './dto/create-facebook-import.dto';
import { ImportService } from './import.service';
import { ImportTokenGuard } from './import-token.guard';

// Plafond technique du transport (multer), aligné sur ItemsController.
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

@Controller('import')
@UseGuards(ImportTokenGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /** Identifiants des posts déjà importés — la routine s'en sert pour sauter tôt. */
  @Get('facebook/known')
  known() {
    return this.importService.knownExternalIds();
  }

  @Post('facebook')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  createFromFacebook(
    @Body() dto: CreateFacebookImportDto,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.importService.createFromFacebook(dto, photo);
  }

  /** Définit l'avatar du compte robot d'import (image en multipart `photo`). */
  @Post('bot-avatar')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  setBotAvatar(@UploadedFile() photo: Express.Multer.File) {
    return this.importService.setBotAvatar(photo);
  }
}
