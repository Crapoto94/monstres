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

/**
 * Gestionnaire de fichiers de `frontend/public/media` (SUPER_ADMIN).
 *
 * Ces fichiers sont servis publiquement (ex. `/media/image.jpg`) et vivent
 * dans le repo pour être commités/poussés. Le chemin racine est configurable
 * via `FILE_MANAGER_ROOT` (défaut : `../frontend/public/media` relatif au
 * process backend — fonctionne en dev local ; en Docker il faut monter le
 * dossier ou renseigner une variable adaptée).
 *
 * Sécurité : toutes les opérations sont bornées au dossier racine — les
 * chemins traversants (`..`, absolus, séparateurs) sont refusés.
 */
@Injectable()
export class AdminFilesService {
  private readonly logger = new Logger(AdminFilesService.name);

  constructor(private readonly config: ConfigService) {}

  private rootDir(): string {
    const configured = this.config.get<string>(
      'FILE_MANAGER_ROOT',
      '../frontend/public/media',
    );
    return resolve(process.cwd(), configured);
  }

  /** Normalise un chemin relatif et refuse toute sortie du dossier racine. */
  private safePath(relative: string | undefined): string {
    const cleaned = (relative ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
    const resolved = resolve(this.rootDir(), cleaned);
    const root = this.rootDir();
    if (resolved !== root && !resolved.startsWith(root + sep)) {
      throw new BadRequestException('Chemin hors du dossier de fichiers.');
    }
    return resolved;
  }

  private async ensureExists(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  async list(relative = ''): Promise<FileEntry[]> {
    const dir = this.safePath(relative);
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

  async createDirectory(relative: string): Promise<void> {
    const dir = this.safePath(relative);
    await mkdir(dir, { recursive: true });
    this.logger.log(`Dossier créé : ${relative}`);
  }

  async saveUpload(
    file: Express.Multer.File,
    relativePath: string,
  ): Promise<FileEntry> {
    if (!file || !file.path) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    const dir = this.safePath(relativePath);
    await this.ensureExists(dir);
    const dest = join(dir, basename(file.originalname || 'fichier'));
    const source = file.path;
    await copyFile(source, dest);
    await rm(source).catch(() => undefined);
    const info = await stat(dest);
    this.logger.log(`Fichier uploadé : ${relativePath}/${basename(dest)}`);
    return {
      name: basename(dest),
      type: 'file',
      sizeBytes: info.size,
      modifiedAt: info.mtime.toISOString(),
    };
  }

  download(relativePath: string): StreamableFile {
    const filePath = this.safePath(relativePath);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      throw new NotFoundException('Fichier introuvable.');
    }
    return new StreamableFile(createReadStream(filePath));
  }

  async remove(relativePath: string): Promise<void> {
    const filePath = this.safePath(relativePath);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Élément introuvable.');
    }
    await rm(filePath, { recursive: true });
    this.logger.log(`Supprimé : ${relativePath}`);
  }
}
