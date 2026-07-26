import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Console SQL réservée SUPER_ADMIN (§14).
 *
 * Désormais les requêtes d'écriture (INSERT, UPDATE, DELETE, etc.) sont
 * autorisées. La sécurité repose sur :
 *   1. Le guard `@Roles('SUPER_ADMIN')` — seul un SUPER_ADMIN y accède.
 *   2. Les commentaires SQL (`--` et `/* *\/`) sont retirés avant
 *      inspection pour éviter les contournements.
 *   3. Requêtes empilées (plusieurs instructions séparées par `;`)
 *      refusées explicitement.
 */
@Injectable()
export class AdminSqlService {
  private readonly logger = new Logger(AdminSqlService.name);

  private static readonly READ_KEYWORDS = new Set(['SELECT', 'WITH', 'PRAGMA', 'EXPLAIN']);

  constructor(private readonly prisma: PrismaService) {}

  /** Liste toutes les tables de la base (SQLite). */
  async listTables() {
    const result = await this.prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    return { tables: result.map((row) => row.name) };
  }

  /** Exécute une requête SQL quelconque. */
  async exec(sql: string) {
    const sanitized = this.validate(sql);

    try {
      const firstWord = this.extractFirstKeyword(sanitized);
      const isRead = AdminSqlService.READ_KEYWORDS.has(firstWord);

      if (isRead) {
        const result = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(sanitized);
        this.logger.log(`SQL query by SUPER_ADMIN: ${sanitized.substring(0, 200)}`);
        return { rows: result, count: result.length, type: 'query' as const };
      } else {
        const affected = await this.prisma.$executeRawUnsafe(sanitized);
        this.logger.log(`SQL exec by SUPER_ADMIN: ${sanitized.substring(0, 200)}`);
        return { rows: null, affected, type: 'exec' as const };
      }
    } catch (error: any) {
      throw new BadRequestException(`Erreur SQL : ${error.message}`);
    }
  }

  /**
   * Retire les commentaires SQL, vérifie l'instruction unique, et retourne
   * la requête originale pour exécution.
   */
  private validate(sql: string): string {
    const trimmed = sql.trim();
    if (!trimmed) {
      throw new BadRequestException('Requête vide.');
    }

    const withoutComments = trimmed
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ')
      .trim();

    // Une seule instruction : pas de ';' ailleurs qu'en toute fin de chaîne.
    const withoutTrailingSemicolon = withoutComments.replace(/;+\s*$/, '');
    if (withoutTrailingSemicolon.includes(';')) {
      throw new BadRequestException('Une seule requête à la fois (pas de point-virgule).');
    }

    return trimmed;
  }

  private extractFirstKeyword(sql: string): string {
    return sql.trim().split(/\s/)[0]?.toUpperCase() ?? '';
  }
}
