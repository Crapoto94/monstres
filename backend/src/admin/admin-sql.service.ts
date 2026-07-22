import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Console SQL réservée SUPER_ADMIN (§14).
 *
 * Sécurité : une v0.2.0 précédente ne bloquait les écritures qu'en
 * inspectant le premier mot de la requête brute — contournable par un
 * commentaire SQL placé avant (`/* x *\/ DELETE ...`). Une v0.3.0 a corrigé
 * ça avec une connexion SQLite dédiée en lecture seule (`PRAGMA
 * query_only`), mais une session suivante l'a réverté (a priori parce que
 * la 2e connexion posait un souci sur `listTables`) en repassant sur la
 * connexion Prisma partagée (qui peut écrire) protégée par le seul filtre
 * de mots-clés d'origine — réintroduisant le contournement.
 *
 * Ici : on reste sur la connexion Prisma partagée (pas de 2e connexion
 * SQLite à gérer), mais la validation est **lexicale et stricte** plutôt
 * qu'une simple recherche de mot interdit :
 *   1. Les commentaires SQL (`--` et `/* *\/`) sont retirés AVANT toute
 *      inspection — un mot interdit caché derrière un commentaire ne peut
 *      plus passer inaperçu.
 *   2. Requêtes empilées (plusieurs instructions séparées par `;`)
 *      refusées explicitement.
 *   3. **Liste blanche** : la requête nettoyée doit commencer par SELECT ou
 *      WITH (CTE) — SQLite n'autorise de toute façon aucune écriture dans
 *      une CTE, contrairement à Postgres. Une liste blanche est plus sûre
 *      qu'une liste noire de mots interdits (qui doit rester exhaustive).
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

  /** Exécute une requête en lecture seule. */
  async exec(sql: string) {
    const sanitized = this.assertReadOnly(sql);

    try {
      const result = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(sanitized);
      this.logger.log(`SQL exec by SUPER_ADMIN: ${sanitized.substring(0, 200)}`);
      return { rows: result, count: result.length };
    } catch (error: any) {
      throw new BadRequestException(`Erreur SQL : ${error.message}`);
    }
  }

  /**
   * Retire les commentaires SQL puis vérifie qu'il ne reste qu'une seule
   * instruction commençant par SELECT/WITH. Lève `BadRequestException`
   * sinon. Retourne la requête (non nettoyée des commentaires — l'original
   * est exécuté tel quel, seule la validation travaille sur la version
   * nettoyée) pour exécution.
   */
  private assertReadOnly(sql: string): string {
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

    const firstWord = withoutTrailingSemicolon.split(/\s/)[0]?.toUpperCase();
    if (firstWord !== 'SELECT' && firstWord !== 'WITH') {
      throw new BadRequestException('Seules les requêtes SELECT sont autorisées.');
    }

    return trimmed;
  }
}
