import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  sizeBytes: number;
  modifiedAt: string;
}

export type FileRootId = 'media' | 'uploads';

export interface FileRootInfo {
  id: FileRootId;
  label: string;
  relativeLabel: string;
}

/**
 * Gestionnaire de fichiers de l'admin (SUPER_ADMIN).
 *
 * Deux racines sont exposées :
 * - `media` : les fichiers servis publiquement sous `/media/` (défaut dev :
 *   `../frontend/public/media` ; en Docker : `FILE_MANAGER_ROOT`, volume
 *   partagé avec le frontend). Vivant dans le repo pour être commités/poussés.
 * - `uploads` : les photos uploadées par les utilisateurs (avatars, items),
 *   servies sous `/uploads/` (défaut : `STORAGE_PATH`, volume partagé avec
 *   le conteneur `storage`).
 *
 * Sécurité : toutes les opérations sont bornées à la racine choisie — les
 * chemins traversants (`..`, absolus, séparateurs) sont refusés.
 */
@Injectable()
export class AdminFilesService {
  private readonly logger = new Logger(AdminFilesService.name);

  constructor(private readonly config: ConfigService) {}

  listRoots(): FileRootInfo[] {
    return [
      { id: 'media', label: 'Media du site', relativeLabel: '/media' },
      { id: 'uploads', label: 'Uploads (photos)', relativeLabel: '/uploads' },
    ];
  }

  private rootDir(root: FileRootId = 'media'): string {
    const isProd = process.env.NODE_ENV === 'production';
    const mediaDefault = isProd
      ? '/app/media' // volume site_media partagé avec le frontend (Docker)
      : '../frontend/public/media';
    let configured =
      root === 'uploads'
        ? this.config.get<string>('STORAGE_PATH', './storage')
        : this.config.get<string>('FILE_MANAGER_ROOT', mediaDefault);
    let resolved = resolve(process.cwd(), configured);

    // Robustesse prod : si une ancienne valeur FILE_MANAGER_ROOT pointe vers
    // un dossier qui n'existe pas (ex. /app/data/files), on retombe sur le
    // volume media partagé plutôt que d'exposer un dossier vide.
    if (isProd && root === 'media' && !existsSync(resolved)) {
      configured = '/app/media';
      resolved = resolve(process.cwd(), configured);
    }
    return resolved;
  }

  /** Normalise un chemin relatif et refuse toute sortie de la racine. */
  private safePath(root: FileRootId, relative: string | undefined): string {
    const cleaned = (relative ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
    const base = this.rootDir(root);
    const resolved = resolve(base, cleaned);
    if (resolved !== base && !resolved.startsWith(base + sep)) {
      throw new BadRequestException('Chemin hors du dossier de fichiers.');
    }
    return resolved;
  }

  private async ensureExists(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  async list(root: FileRootId, relative = ''): Promise<FileEntry[]> {
    const dir = this.safePath(root, relative);
    await this.ensureExists(dir);
    const entries = await readdir(dir);
    const files = await Promise.all(
      entries.map(async (name) => {
        const info = await stat(join(dir, name));
        return {
          name,
          type: info.isDirectory() ? ('directory' as const) : ('file' as const),
          sizeBytes: info.size,
          modifiedAt: info.mtime.toISOString(),
        };
      }),
    );
    return files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async createDirectory(root: FileRootId, relative: string): Promise<void> {
    const dir = this.safePath(root, relative);
    await mkdir(dir, { recursive: true });
    this.logger.log(`Dossier créé : ${root}/${relative}`);
  }

  async saveUpload(
    root: FileRootId,
    file: Express.Multer.File,
    relativePath: string,
  ): Promise<FileEntry> {
    if (!file || !file.path) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    const dir = this.safePath(root, relativePath);
    await this.ensureExists(dir);
    const dest = join(dir, basename(file.originalname || 'fichier'));
    const source = file.path;
    await copyFile(source, dest);
    await rm(source).catch(() => undefined);
    const info = await stat(dest);
    this.logger.log(`Fichier uploadé : ${root}/${relativePath}/${basename(dest)}`);
    return {
      name: basename(dest),
      type: 'file',
      sizeBytes: info.size,
      modifiedAt: info.mtime.toISOString(),
    };
  }

  download(root: FileRootId, relativePath: string): StreamableFile {
    const filePath = this.safePath(root, relativePath);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      throw new NotFoundException('Fichier introuvable.');
    }
    return new StreamableFile(createReadStream(filePath));
  }

  async remove(root: FileRootId, relativePath: string): Promise<void> {
    const filePath = this.safePath(root, relativePath);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Élément introuvable.');
    }
    await rm(filePath, { recursive: true });
    this.logger.log(`Supprimé : ${root}/${relativePath}`);
  }
}
