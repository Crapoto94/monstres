import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Entrée acceptée jusqu'à 5 Mo (voir MAX_FILE_SIZE_BYTES dans
// items.controller.ts) ; toujours redimensionnée à 1200×1200 max en sortie
// pour limiter l'espace disque, quelle que soit la taille/résolution d'origine.
const MAX_DIMENSION = 1200;
const THUMBNAIL_WIDTH = 400;

export interface ProcessedPhoto {
  path: string;
  thumbnailPath: string;
}

/**
 * Upload/compression/miniature des photos de Monstre (§7, §12.8). Ne jamais
 * manipuler les fichiers directement dans les contrôleurs — tout passe par
 * ce service.
 */
@Injectable()
export class ImageService {
  private readonly storagePath: string;

  constructor(private readonly config: ConfigService) {
    this.storagePath = this.config.get<string>('STORAGE_PATH', './storage');
  }

  validateFormat(mimetype: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new BadRequestException('Format de photo non supporté (JPEG, PNG ou WebP uniquement).');
    }
  }

  /**
   * Corrige l'orientation (EXIF), redimensionne, compresse en WebP et
   * génère une miniature. Les métadonnées EXIF (dont la position GPS
   * éventuelle) sont supprimées : sharp ne les conserve jamais sauf appel
   * explicite à `.withMetadata()`, qu'on n'utilise pas ici.
   */
  async process(buffer: Buffer, itemId: string): Promise<ProcessedPhoto> {
    const dir = join(this.storagePath, 'items', itemId);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.webp`;
    const thumbnailFilename = `${randomUUID()}-thumb.webp`;

    const oriented = sharp(buffer).rotate();

    const [fullBuffer, thumbnailBuffer] = await Promise.all([
      oriented
        .clone()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      oriented.clone().resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
    ]);

    await Promise.all([writeFile(join(dir, filename), fullBuffer), writeFile(join(dir, thumbnailFilename), thumbnailBuffer)]);

    return {
      path: `items/${itemId}/${filename}`,
      thumbnailPath: `items/${itemId}/${thumbnailFilename}`,
    };
  }
}
