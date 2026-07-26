import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ImageService } from '../images/image.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateFacebookImportDto } from './dto/create-facebook-import.dto';
import { CreateImportLogEntryDto } from './dto/create-import-log-entry.dto';

const SOURCE = 'facebook';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  /** Définit l'avatar du compte robot d'import à partir d'une image uploadée. */
  async setBotAvatar(photo: Express.Multer.File | undefined): Promise<{ avatar: string }> {
    if (!photo) throw new BadRequestException('Photo manquante.');
    this.imageService.validateFormat(photo.mimetype);
    const botEmail = this.config.get<string>('IMPORT_BOT_EMAIL');
    if (!botEmail) throw new BadRequestException('IMPORT_BOT_EMAIL non configuré.');
    const bot = await this.prisma.user.findUnique({ where: { email: botEmail }, select: { id: true } });
    if (!bot) throw new NotFoundException(`Compte robot introuvable (${botEmail}).`);
    const avatar = await this.imageService.processAvatar(photo.buffer, bot.id);
    await this.prisma.user.update({ where: { id: bot.id }, data: { avatar } });
    this.logger.log(`Avatar du compte robot mis à jour (${avatar}).`);
    return { avatar };
  }

  /**
   * Journal du passage de la routine : une ligne par annonce examinée
   * (importée, doublon, trouvaille écartée, erreur…), ou une ligne "run"
   * quand le cycle n'a rien trouvé de neuf — pour que le passage lui-même
   * reste visible en admin même sans import.
   */
  async logEntry(dto: CreateImportLogEntryDto): Promise<{ id: string }> {
    const entry = await this.prisma.importLogEntry.create({
      data: {
        runId: dto.runId,
        source: SOURCE,
        decision: dto.decision,
        postId: dto.postId ?? null,
        reason: dto.reason ?? null,
        title: dto.title ?? null,
        itemId: dto.itemId ?? null,
      },
      select: { id: true },
    });
    return entry;
  }

  /** Identifiants des posts déjà importés — permet à la routine de sauter tôt. */
  async knownExternalIds(): Promise<string[]> {
    const rows = await this.prisma.importedPost.findMany({
      where: { source: SOURCE },
      select: { externalId: true },
    });
    return rows.map((r) => r.externalId);
  }

  async createFromFacebook(
    dto: CreateFacebookImportDto,
    photos: Express.Multer.File[] | undefined,
  ): Promise<{ status: 'created' | 'duplicate'; itemId: string | null }> {
    // Anti-doublon : si ce post a déjà été importé, on ne recrée rien.
    const existing = await this.prisma.importedPost.findUnique({
      where: { source_externalId: { source: SOURCE, externalId: dto.postId } },
    });
    if (existing) {
      return { status: 'duplicate', itemId: existing.itemId };
    }

    if (!photos || photos.length === 0) {
      throw new BadRequestException('Au moins une photo est requise.');
    }
    photos.forEach((photo) => this.imageService.validateFormat(photo.mimetype));

    // Compte robot sous lequel les Monstres importés sont créés.
    const botEmail = this.config.get<string>('IMPORT_BOT_EMAIL');
    if (!botEmail) {
      throw new BadRequestException('IMPORT_BOT_EMAIL non configuré.');
    }
    const bot = await this.prisma.user.findUnique({ where: { email: botEmail }, select: { id: true } });
    if (!bot) {
      throw new NotFoundException(
        `Compte robot d'import introuvable (${botEmail}). Lance scripts/create-import-bot.js.`,
      );
    }

    // Position : coordonnées fournies, sinon géocodage BAN de l'adresse.
    let latitude = dto.latitude;
    let longitude = dto.longitude;
    let address = dto.address ?? null;
    if ((latitude == null || longitude == null) && dto.address) {
      const geo = await this.geocode(dto.address);
      if (!geo) {
        throw new BadRequestException(`Adresse introuvable via la BAN : "${dto.address}".`);
      }
      latitude = geo.latitude;
      longitude = geo.longitude;
      address = geo.label;
    }
    if (latitude == null || longitude == null) {
      throw new BadRequestException('Position manquante (ni coordonnées ni adresse géocodable).');
    }

    const itemId = randomUUID();
    const processedPhotos = await Promise.all(
      photos.map((photo) => this.imageService.process(photo.buffer, itemId)),
    );

    // Publication immédiate (AVAILABLE) ou mise en attente de modération
    // (PENDING_REVIEW), pilotable via `settings` sans redéploiement — défaut :
    // en ligne tout de suite (modération a posteriori, choix utilisateur).
    const autoPublish = await this.settings.getBoolean('import_facebook_auto_publish', true);

    const item = await this.prisma.item.create({
      data: {
        id: itemId,
        userId: bot.id,
        title: dto.title,
        description: dto.description || null,
        latitude,
        longitude,
        address,
        status: autoPublish ? 'AVAILABLE' : 'PENDING_REVIEW',
        photos: {
          create: processedPhotos.map((photo, index) => ({
            type: 'LISTING',
            path: photo.path,
            thumbnailPath: photo.thumbnailPath,
            order: index,
          })),
        },
      },
      select: { id: true },
    });

    await this.prisma.importedPost.create({
      data: { source: SOURCE, externalId: dto.postId, itemId: item.id },
    });

    this.logger.log(
      `Monstre importé de Facebook (post ${dto.postId}) → item ${item.id} (${autoPublish ? 'AVAILABLE' : 'PENDING_REVIEW'}).`,
    );
    return { status: 'created', itemId: item.id };
  }

  /**
   * Géocodage serveur via la BAN (Base Adresse Nationale, data.gouv.fr) —
   * même source que le frontend (meilleure couverture des numéros de rue en
   * France que Nominatim). Retourne la 1re correspondance de type
   * `housenumber` si disponible, sinon la 1re tout court.
   */
  private async geocode(address: string): Promise<GeocodeResult | null> {
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=5`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        features?: Array<{
          geometry: { coordinates: [number, number] };
          properties: { label: string; type?: string };
        }>;
      };
      const features = data.features ?? [];
      if (!features.length) return null;
      const best = features.find((f) => f.properties.type === 'housenumber') ?? features[0];
      const [lon, lat] = best.geometry.coordinates;
      return { latitude: lat, longitude: lon, label: best.properties.label };
    } catch (error) {
      this.logger.warn(`Échec géocodage BAN pour "${address}": ${String(error)}`);
      return null;
    }
  }
}
