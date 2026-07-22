import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  findByKey(key: string) {
    return this.prisma.emailTemplate.findUnique({ where: { key } });
  }

  create(data: { key: string; name: string; subject: string; htmlContent: string; isSystem?: boolean }) {
    return this.prisma.emailTemplate.create({ data });
  }

  update(id: string, data: { name?: string; subject?: string; htmlContent?: string }) {
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async remove(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (template?.isSystem) {
      throw new Error('Cannot delete system template');
    }
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  async renderPreview(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) throw new Error('Template not found');

    const sampleData: Record<string, string> = {
      user_name: 'Jean Dupont',
      item_title: 'Canapé gris 3 places',
      item_url: 'https://monstres.fbc.fr/monstres/demo123',
      item_photo_url: 'https://monstres.fbc.fr/storage/demo-photo.jpg',
      verification_url: 'https://monstres.fbc.fr/verifier-email?token=demo',
      reset_url: 'https://monstres.fbc.fr/reinitialiser-mot-de-passe?token=demo',
      badge_name: 'Explorateur',
      reserver_name: 'Marie Martin',
      collector_name: 'Pierre Durand',
    };

    let html = template.htmlContent;
    for (const [key, value] of Object.entries(sampleData)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }

    return {
      subject: this.replaceVars(template.subject, sampleData),
      htmlContent: html,
    };
  }

  private replaceVars(text: string, vars: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
  }
}
