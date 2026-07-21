import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ReportType, ItemStatus } from '../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateReportDto } from './dto/create-report.dto';

/** §6.5 : signalements « qualité » — distincts du signal "déjà récupéré". */
const QUALITY_TYPES: ReportType[] = [
  ReportType.FAKE,
  ReportType.WRONG_LOCATION,
  ReportType.INAPPROPRIATE,
  ReportType.DUPLICATE,
];

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async create(itemId: string, user: AuthenticatedUser, dto: CreateReportDto) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    if (item.userId === user.id) {
      throw new BadRequestException('Vous ne pouvez pas signaler votre propre Monstre.');
    }

    const existing = await this.prisma.report.findUnique({
      where: { itemId_userId: { itemId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('Tu as déjà signalé ce Monstre.');
    }

    await this.prisma.report.create({
      data: { itemId, userId: user.id, type: dto.type, reason: dto.reason },
    });

    await this.applyThresholds(itemId);

    return { reported: true };
  }

  /**
   * §6.5 : recalcule les compteurs de signalements PENDING pour l'Item et
   * applique la transition de statut si un seuil est atteint. Les seuils
   * s'appliquent uniquement depuis AVAILABLE/RESERVED — un Item déjà en
   * PENDING_REVIEW/HIDDEN/ARCHIVED/COLLECTED n'est pas retouché ici.
   */
  private async applyThresholds(itemId: string): Promise<void> {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || (item.status !== ItemStatus.AVAILABLE && item.status !== ItemStatus.RESERVED)) return;

    const [qualityCount, alreadyCollectedCount] = await Promise.all([
      this.prisma.report.count({
        where: { itemId, status: 'PENDING', type: { in: QUALITY_TYPES } },
      }),
      this.prisma.report.count({
        where: { itemId, status: 'PENDING', type: ReportType.ALREADY_COLLECTED },
      }),
    ]);

    const reportThreshold = await this.settings.getNumber('report_threshold', 3);
    const alreadyCollectedThreshold = await this.settings.getNumber('already_collected_threshold', 3);

    if (item.status === ItemStatus.AVAILABLE && qualityCount >= reportThreshold) {
      await this.prisma.item.update({ where: { id: itemId }, data: { status: ItemStatus.PENDING_REVIEW } });
      return;
    }

    if (alreadyCollectedCount >= alreadyCollectedThreshold) {
      await this.prisma.item.update({ where: { id: itemId }, data: { status: ItemStatus.ARCHIVED } });
    }
  }
}
