import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { copyFile, readdir, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';

export interface BackupFileInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Sauvegardes locales de la base SQLite (§ sauvegarde).
 *
 * Une sauvegarde est un snapshot cohérent de la base (`VACUUM INTO`), stocké
 * dans `BACKUP_PATH` (défaut `./backups` en dev, `/app/data/backups` en
 * Docker — le volume `backend_data` couvre `/app/data`). Un cron quotidien
 * crée automatiquement une sauvegarde et envoie un email au super-admin
 * avec un lien de téléchargement.
 *
 * Restauration : le fichier (local ou uploadé) remplace la base. Prisma est
 * déconnecté pendant le remplacement puis reconnecté.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
  ) {}

  private backupDir(): string {
    const configured = this.config.get<string>('BACKUP_PATH', './backups');
    return resolve(process.cwd(), configured);
  }

  private dbPath(): string {
    const url = this.config.getOrThrow<string>('DATABASE_URL');
    // DATABASE_URL="file:./dev.db" (dev) ou "file:/app/data/monstres.db" (Docker).
    const raw = url.replace(/^file:/, '');
    return resolve(process.cwd(), raw);
  }

  /** Vérifie qu'un nom de fichier reste dans le dossier de sauvegardes (anti path traversal). */
  private assertSafeName(name: string): void {
    if (
      !name ||
      name.includes('..') ||
      name.includes('/') ||
      name.includes('\\')
    ) {
      throw new BadRequestException('Nom de sauvegarde invalide.');
    }
  }

  private async ensureBackupDir(): Promise<string> {
    const dir = this.backupDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** Crée un snapshot cohérent de la base dans BACKUP_PATH. */
  async createBackup(): Promise<BackupFileInfo> {
    const dir = await this.ensureBackupDir();
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const name = `monstres-${stamp}.db`;
    const target = join(dir, name);

    // Snapshot cohérent même si l'app écrit pendant ce temps.
    const client = createClient({ url: `file:${this.dbPath()}` });
    try {
      await client.execute(`VACUUM INTO '${target.replace(/\\/g, '\\\\')}'`);
    } finally {
      client.close();
    }

    const info = await stat(target);
    this.logger.log(`Sauvegarde créée : ${name} (${info.size} octets)`);
    return { name, sizeBytes: info.size, createdAt: info.mtime.toISOString() };
  }

  async listBackups(): Promise<BackupFileInfo[]> {
    const dir = this.backupDir();
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir);
    const files = await Promise.all(
      entries
        .filter((name) => name.endsWith('.db'))
        .map(async (name) => {
          const info = await stat(join(dir, name));
          return {
            name,
            sizeBytes: info.size,
            createdAt: info.mtime.toISOString(),
          };
        }),
    );
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async backupExists(name: string): Promise<boolean> {
    this.assertSafeName(name);
    return existsSync(join(this.backupDir(), name));
  }

  downloadBackup(name: string): StreamableFile {
    this.assertSafeName(name);
    const filePath = join(this.backupDir(), name);
    if (!existsSync(filePath)) throw new NotFoundException('Sauvegarde introuvable.');
    return new StreamableFile(createReadStream(filePath));
  }

  async deleteBackup(name: string): Promise<void> {
    this.assertSafeName(name);
    const filePath = join(this.backupDir(), name);
    if (!existsSync(filePath)) throw new NotFoundException('Sauvegarde introuvable.');
    await rm(filePath);
  }

  /** Remplace la base courante par une sauvegarde (locale ou uploadée). */
  async restoreBackup(sourcePath: string, sourceName: string): Promise<void> {
    if (!existsSync(sourcePath)) throw new NotFoundException('Fichier de sauvegarde introuvable.');

    const dbFile = this.dbPath();
    this.logger.warn(
      `Restauration de la base depuis "${sourceName}" — remplacement de ${dbFile}`,
    );

    // Déconnexion propre de Prisma pendant le remplacement du fichier.
    await this.prisma.$disconnect();
    try {
      await copyFile(sourcePath, dbFile);
      // Élimine d'éventuels fichiers WAL/SHM restés attachés à l'ancienne base.
      for (const suffix of ['-wal', '-shm']) {
        const sideFile = `${dbFile}${suffix}`;
        if (existsSync(sideFile)) await rm(sideFile);
      }
    } finally {
      await this.prisma.$connect();
    }

    this.logger.log(`Base restaurée depuis "${sourceName}".`);
  }

  /** Restauration depuis une sauvegarde locale du dossier BACKUP_PATH. */
  async restoreFromLocal(name: string): Promise<void> {
    this.assertSafeName(name);
    const sourcePath = join(this.backupDir(), name);
    await this.restoreBackup(sourcePath, name);
  }

  /** Restauration depuis un fichier uploadé (multer, stocké en tmp). */
  async restoreFromUpload(file: Express.Multer.File): Promise<void> {
    if (!file || !file.path) {
      throw new BadRequestException('Aucun fichier de sauvegarde fourni.');
    }
    await this.restoreBackup(file.path, file.originalname ?? 'upload');
  }

  /**
   * Cron quotidien (04:00) : sauvegarde automatique + email au super-admin
   * avec lien de téléchargement. Désactivable via `backup_enabled`.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async scheduledBackup(): Promise<void> {
    const enabled = await this.settings.getBoolean('backup_enabled', true);
    if (!enabled) {
      this.logger.log('backup_enabled=false — cron de sauvegarde ignoré.');
      return;
    }

    try {
      const backup = await this.createBackup();
      await this.notifySuperAdmin(backup);
    } catch (error) {
      this.logger.error('Échec de la sauvegarde automatique', error as Error);
    }
  }

  /** Envoie le mail de confirmation au premier super-admin, sinon au setting `backup_notification_email`. */
  private async notifySuperAdmin(backup: BackupFileInfo): Promise<void> {
    const superAdmin = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { email: true },
    });
    const to =
      superAdmin?.email ??
      (await this.settings.getString('backup_notification_email', '')) ??
      '';

    if (!to) {
      this.logger.warn(
        `Aucun super-admin ni backup_notification_email — mail de sauvegarde non envoyé.`,
      );
      return;
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const downloadUrl = `${frontendUrl}/api/v1/admin/backups/${encodeURIComponent(backup.name)}/download`;
    const adminUrl = `${frontendUrl}/admin/sauvegardes`;

    try {
      await this.email.sendBackupSuccess(to, {
        fileName: backup.name,
        sizeBytes: backup.sizeBytes,
        downloadUrl,
        adminUrl,
      });
    } catch (error) {
      this.logger.error(`Échec envoi mail de sauvegarde à ${to}`, error as Error);
    }
  }

}
