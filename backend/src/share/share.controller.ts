import { Controller, Get, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { escapeHtml } from '../common/html.util';

/**
 * Sert une mini-page HTML avec balises Open Graph pour `/monstres/:id`,
 * exactement la même URL publique que la fiche Monstre — nginx y route
 * spécifiquement les robots de partage (Facebook, WhatsApp, etc., voir
 * nginx/nginx.conf) car ces robots n'exécutent pas le JS de la SPA et ne
 * verraient sinon aucune donnée par Monstre. Les vrais visiteurs
 * continuent d'être servis par le frontend Vue, jamais par cette route.
 * Exclue du préfixe global /api/v1 (voir main.ts) pour matcher l'URL réelle.
 */
@Controller()
export class ShareController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('monstres/:id')
  async shareItem(@Param('id') id: string, @Res() res: Response) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        address: true,
        photos: { orderBy: { order: 'asc' }, take: 1, select: { path: true } },
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const pageUrl = `${frontendUrl}/monstres/${id}`;

    if (!item) {
      res.type('html').send(this.renderHtml({
        title: 'Les Monstres',
        description: 'Repère, partage et récupère les objets encombrants abandonnés dans la rue.',
        image: null,
        url: pageUrl,
      }));
      return;
    }

    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');
    const photo = item.photos[0];

    res.type('html').send(this.renderHtml({
      title: item.title,
      description: item.address ? shortenAddress(item.address) : (item.description ?? 'Un Monstre à récupérer sur Les Monstres.'),
      image: photo ? `${imgBaseUrl}/${photo.path}` : null,
      url: pageUrl,
    }));
  }

  private renderHtml({ title, description, image, url }: { title: string; description: string; image: string | null; url: string }): string {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const pageTitle = title === 'Les Monstres' ? title : `${safeTitle} — Les Monstres`;
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${pageTitle}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
</head>
<body>
  <p><a href="${escapeHtml(url)}">${safeTitle}</a></p>
</body>
</html>`;
  }
}

/** Même logique que `shortAddress` côté frontend (ItemDetailView.vue) : numéro, rue, ville. */
function shortenAddress(fullAddress: string): string {
  const parts = fullAddress.split(',').map((s) => s.trim());
  return parts.length <= 3 ? fullAddress : parts.slice(0, 3).join(', ');
}
