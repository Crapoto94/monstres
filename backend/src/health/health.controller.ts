import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

const { version } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRawUnsafe('SELECT 1');
    return { status: 'ok', database: 'connected', version };
  }
}
