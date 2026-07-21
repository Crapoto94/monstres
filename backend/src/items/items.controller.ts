import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateItemDto } from './dto/create-item.dto';
import { FindItemsQueryDto } from './dto/find-items-query.dto';
import { ItemsService } from './items.service';

// Plafond technique du transport (multer) ; la limite métier réelle
// (`max_photos_per_item`, défaut 3) est vérifiée dans ItemsService via
// SettingsService — jamais en dur ici. 5 Mo/photo autorisés en entrée ;
// ImageService redimensionne ensuite à 1200×1200 max avant stockage
// (voir MAX_DIMENSION dans image.service.ts).
const MAX_UPLOAD_FILES = 10;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('photos', MAX_UPLOAD_FILES, {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateItemDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.itemsService.create(user.id, dto, files);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: FindItemsQueryDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.itemsService.findMany(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.itemsService.findById(id, user);
  }

  @Post(':id/collect')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  collect(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.itemsService.collect(id, user, file);
  }
}
