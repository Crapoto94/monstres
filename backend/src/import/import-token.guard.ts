import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Protège les routes d'import par un token statique partagé
 * (`IMPORT_API_TOKEN` dans l'environnement), passé dans l'en-tête
 * `x-import-token`. Volontairement indépendant du JWT/cookie : la routine
 * d'import (session Claude planifiée) n'est pas un utilisateur connecté au
 * sens classique — elle crée les Monstres sous le compte robot côté serveur.
 * Si `IMPORT_API_TOKEN` n'est pas défini, l'import est désactivé (refus).
 */
@Injectable()
export class ImportTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('IMPORT_API_TOKEN');
    if (!expected) {
      throw new UnauthorizedException("Import désactivé (IMPORT_API_TOKEN non configuré).");
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-import-token');
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Token d\'import invalide.');
    }
    return true;
  }
}
