import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { open, type Reader, type CityResponse } from 'maxmind';
import { resolve } from 'node:path';

/**
 * Localisation approximative (pays/ville) à partir de l'IP, via une base
 * MaxMind GeoLite2 auto-hébergée (aucun appel réseau par requête, l'IP ne
 * quitte jamais le serveur). La base n'est PAS fournie avec le dépôt — voir
 * `.env.example` (GEOIP_DB_PATH) pour l'obtenir. En son absence, la
 * géolocalisation est simplement désactivée (retourne `null`) : le reste
 * des statistiques continue de fonctionner normalement.
 */
@Injectable()
export class GeoIpService implements OnModuleInit {
  private readonly logger = new Logger(GeoIpService.name);
  private reader: Reader<CityResponse> | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const dbPath = resolve(this.config.get<string>('GEOIP_DB_PATH', './data/GeoLite2-City.mmdb'));
    try {
      this.reader = await open<CityResponse>(dbPath);
      this.logger.log(`Base GeoIP chargée (${dbPath}).`);
    } catch {
      this.logger.warn(
        `Base GeoIP introuvable (${dbPath}) — la localisation des visiteurs sera vide. Voir .env.example (GEOIP_DB_PATH).`,
      );
    }
  }

  lookup(ip: string | null): { country: string | null; city: string | null } {
    if (!this.reader || !ip) {
      return { country: null, city: null };
    }
    try {
      const result = this.reader.get(ip);
      return {
        country: result?.country?.names?.fr ?? result?.country?.names?.en ?? null,
        city: result?.city?.names?.fr ?? result?.city?.names?.en ?? null,
      };
    } catch {
      return { country: null, city: null };
    }
  }
}
