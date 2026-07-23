import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Sert les photos en dev local uniquement. En prod (Docker), le
  // sous-domaine img.monstres.fbc.fr est servi par le conteneur `storage`
  // qui lit le même volume — voir docker-compose.yml.
  app.useStaticAssets(resolve(config.get<string>('STORAGE_PATH', './storage')), {
    prefix: '/uploads/',
  });

  // `monstres/:id` reste hors préfixe /api/v1 : c'est la route publique
  // exacte (nginx y route les robots de partage — voir ShareController)
  // pour que `og:url` corresponde au vrai lien partagé.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'monstres/:id', method: RequestMethod.GET }],
  });
  app.use(cookieParser());
  // Plusieurs domaines peuvent pointer vers ce même serveur (ex.
  // monstres.fbc.fr + monstres.app) — CORS_ORIGIN accepte une liste séparée
  // par des virgules. Utile surtout pour un client qui appellerait l'API en
  // absolu depuis un autre domaine ; le SPA lui-même appelle l'API en
  // chemin relatif (voir VITE_API_URL) et n'est donc jamais concerné par le
  // CORS tant qu'il est servi par le même nginx que l'API.
  const corsOrigins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new AuditLogInterceptor(app.get(PrismaService)), new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
