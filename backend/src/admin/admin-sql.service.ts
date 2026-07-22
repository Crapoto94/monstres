import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type Client } from '@libsql/client';

const QUERY_TIMEOUT_MS = 5000;

/**
 * Console SQL réservée SUPER_ADMIN (§14).
 *
 * Sécurité : la lecture seule n'est PAS un filtre de mots-clés (contournable
 * par un commentaire avant le mot interdit, ex. `/* x *\/ DELETE ...`) mais
 * une **connexion SQLite dédiée** ouverte avec `PRAGMA query_only = ON` —
 * toute tentative d'écriture est alors refusée par le moteur lui-même,
 * quelle que soit la requête envoyée. Cette connexion est distincte de
 * celle de `PrismaService` (qui doit rester capable d'écrire) et n'est
 * jamais utilisée que pour cette console. Un timeout applicatif évite
 * qu'une requête coûteuse ne bloque indéfiniment le process.
 */
@Injectable()
export class AdminSqlService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminSqlService.name);
  private readonly client: Client;

  constructor(config: ConfigService) {
    this.client = createClient({ url: config.getOrThrow<string>('DATABASE_URL') });
  }

  async onModuleInit() {
    await this.client.execute('PRAGMA busy_timeout = 3000;');
    await this.client.execute('PRAGMA query_only = ON;');
  }

  async onModuleDestroy() {
    this.client.close();
  }

  /** Liste toutes les tables de la base (SQLite). */
  async listTables() {
    const result = await this.withTimeout(
      this.client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"),
    );
    return { tables: result.rows.map((row) => row.name as string) };
  }

  /**
   * Exécute une requête en lecture seule. La vraie garde est la connexion
   * `query_only` ouverte dans `onModuleInit` ; ce garde-fou par mot-clé n'est
   * qu'un confort pour renvoyer un message clair sur le cas évident, avant
   * même de solliciter la base.
   */
  async exec(sql: string) {
    const firstWord = sql.trim().split(/\s/)[0]?.toUpperCase();
    const obviouslyForbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'ATTACH', 'DETACH', 'PRAGMA'];
    if (obviouslyForbidden.includes(firstWord)) {
      throw new BadRequestException('Seules les requêtes SELECT sont autorisées.');
    }

    try {
      const result = await this.withTimeout(this.client.execute(sql));
      this.logger.log(`SQL exec by SUPER_ADMIN: ${sql.substring(0, 200)}`);
      return { rows: result.rows, count: result.rows.length };
    } catch (error: any) {
      throw new BadRequestException(`Erreur SQL : ${error.message}`);
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Requête trop longue (> 5 s), abandonnée.')), QUERY_TIMEOUT_MS),
      ),
    ]);
  }
}
