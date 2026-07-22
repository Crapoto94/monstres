import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeForLog } from '../sanitize.util';
import type { AuthenticatedUser } from '../../auth/jwt.strategy';

const IGNORED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Journalise automatiquement toute requête mutante (POST/PATCH/PUT/DELETE)
 * dans `audit_logs` — « qui a fait quoi » pour tout le monde, pas seulement
 * l'espace admin. Volontairement générique (basé sur la route Nest, pas sur
 * des appels ajoutés à la main dans chaque service) pour couvrir aussi les
 * futures routes sans qu'on pense à l'instrumenter à chaque fois.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (IGNORED_METHODS.has(method)) {
      return next.handle();
    }

    const user: AuthenticatedUser | undefined = request.user;
    const action = `${context.getClass().name}.${context.getHandler().name}`;
    const details = {
      method,
      path: request.originalUrl,
      params: sanitizeForLog(request.params),
      body: sanitizeForLog(request.body),
    };

    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id ?? null,
              action,
              data: JSON.stringify(details),
            },
          })
          .catch((error) => this.logger.error("Échec écriture du journal d'activité", error as Error));
      }),
    );
  }
}
