import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminSqlService {
  private readonly logger = new Logger(AdminSqlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Liste toutes les tables de la base (SQLite). */
  async listTables() {
    const result = await this.prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    return { tables: result.map((r) => r.name) };
  }

  /** Exécute une requête SQL en lecture seule. INSERT/UPDATE/DELETE/ALTER interdits. */
  async exec(sql: string) {
    const trimmed = sql.trim().toUpperCase();
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'ATTACH', 'DETACH'];
    const firstWord = trimmed.split(/\s/)[0];
    if (forbidden.includes(firstWord)) {
      throw new BadRequestException('Seules les requêtes SELECT sont autorisées.');
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe(sql);
      this.logger.log(`SQL exec by SUPER_ADMIN: ${sql.substring(0, 200)}`);
      return { rows, count: Array.isArray(rows) ? rows.length : 0 };
    } catch (error: any) {
      throw new BadRequestException(`Erreur SQL : ${error.message}`);
    }
  }
}
