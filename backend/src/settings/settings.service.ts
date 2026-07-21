import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingType } from '../generated/prisma/enums';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getString(key: string, fallback: string): Promise<string> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? fallback;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) return fallback;
    const parsed = Number(setting.value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting ? setting.value === 'true' : fallback;
  }

  async set(key: string, value: string, type: SettingType = 'STRING'): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value, type },
      update: { value, type },
    });
  }
}
