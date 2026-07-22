import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const AVATAR_MAX_DIMENSION = 200;
const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly storagePath: string;

  constructor(private readonly config: ConfigService) {
    this.storagePath = this.config.get<string>('STORAGE_PATH', './storage');
  }

  validateFormat(mimetype: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new BadRequestException('Format de photo non supporté (JPEG, PNG ou WebP uniquement).');
    }
  }

  async process(buffer: Buffer, itemId: string): Promise<{ path: string; thumbnailPath: string }> {
    const dir = join(this.storagePath, 'items', itemId);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.webp`;
    const thumbnailFilename = `${randomUUID()}-thumb.webp`;

    const oriented = sharp(buffer).rotate();
    const [fullBuffer, thumbnailBuffer] = await Promise.all([
      oriented.clone().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      oriented.clone().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
    ]);

    await Promise.all([
      writeFile(join(dir, filename), fullBuffer),
      writeFile(join(dir, thumbnailFilename), thumbnailBuffer),
    ]);

    return { path: `items/${itemId}/${filename}`, thumbnailPath: `items/${itemId}/${thumbnailFilename}` };
  }

  async processAvatar(buffer: Buffer, userId: string): Promise<string> {
    if (buffer.byteLength > AVATAR_MAX_SIZE) {
      throw new BadRequestException(`L'image ne doit pas dépasser ${AVATAR_MAX_SIZE / 1024 / 1024} Mo.`);
    }

    const dir = join(this.storagePath, 'avatars', userId);
    await mkdir(dir, { recursive: true });

    // Supprimer l'ancien avatar s'il existe
    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(dir);
      await Promise.all(files.map((f) => rm(join(dir, f), { force: true })));
    } catch {}

    const filename = `${randomUUID()}.webp`;
    await sharp(buffer)
      .rotate()
      .resize({ width: AVATAR_MAX_DIMENSION, height: AVATAR_MAX_DIMENSION, fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(join(dir, filename));

    return `avatars/${userId}/${filename}`;
  }

  async deleteItemPhotos(itemId: string): Promise<void> {
    await rm(join(this.storagePath, 'items', itemId), { recursive: true, force: true });
  }
}
