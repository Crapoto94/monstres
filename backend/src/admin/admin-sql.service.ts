import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Console SQL réservée SUPER_ADMIN (§14).
 *
 * Sécurité : lecture seule via mot-clé interdit (confort utilisateur) +
 * garde-fou `Roles('SUPER_ADMIN')` sur le controller. Le blocage réel
 * est le RolesGuard — seuls les SUPER_ADMIN atteignent ce service.
 * Les requêtes passent par Prisma $queryRaw (même pool de connexions
 * que le reste de l'app).
 */
@Injectable()
export class AdminSqlService {
  private readonly logger = new Logger(AdminSqlService.name);

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

  /**
   * Exécute une requête en lecture seule.
   */
  async exec(sql: string) {
    const firstWord = sql.trim().split(/\s/)[0]?.toUpperCase();
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'ATTACH', 'DETACH', 'PRAGMA'];
    if (forbidden.includes(firstWord)) {
      throw new BadRequestException('Seules les requêtes SELECT sont autorisées.');
    }

    try {
      const result = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
      this.logger.log(`SQL exec by SUPER_ADMIN: ${sql.substring(0, 200)}`);
      return { rows: result, count: result.length };
    } catch (error: any) {
      throw new BadRequestException(`Erreur SQL : ${error.message}`);
    }
  }
}
