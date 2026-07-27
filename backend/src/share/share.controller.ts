import { Controller, Get, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { escapeHtml } from '../common/html.util';

/** Statuts réellement consultables par le public — les autres ne doivent jamais être indexés. */
const PUBLIC_STATUSES = ['AVAILABLE', 'RESERVED', 'COLLECTED', 'ARCHIVED'];

/**
 * Sert une page HTML complète pour `/monstres/:id`, exactement la même URL
 * publique que la fiche Monstre — nginx y route les robots de partage
 * (Facebook, WhatsApp…) ET les moteurs de recherche (Googlebot, Bingbot,
 * voir nginx/nginx.conf), car aucun d'eux ne peut compter sur le JS de la
 * SPA pour voir les données du Monstre. Les vrais visiteurs continuent
 * d'être servis par le frontend Vue, jamais par cette route.
 *
 * Le contenu servi ici est **le même** que celui affiché par la SPA (titre,
 * description, adresse, photo) : c'est du rendu dynamique légitime, pas du
 * cloaking, qui suppose de montrer autre chose aux robots qu'aux visiteurs.
 *
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
        status: true,
        createdAt: true,
        photos: { orderBy: { order: 'asc' }, take: 1, select: { path: true } },
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    const pageUrl = `${frontendUrl}/monstres/${id}`;

    if (!item) {
      res.status(404).type('html').send(
        this.renderHtml({
          title: 'Monstre introuvable',
          description: 'Ce Monstre n’existe plus. Découvre les objets encombrants à récupérer près de chez toi.',
          image: null,
          url: pageUrl,
          address: null,
          publishedAt: null,
          indexable: false,
          siteUrl: frontendUrl,
        }),
      );
      return;
    }

    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');
    const photo = item.photos[0];
    const shortAddress = item.address ? shortenAddress(item.address) : null;

    res.type('html').send(
      this.renderHtml({
        title: item.title,
        description:
          item.description?.trim() ||
          (shortAddress
            ? `Objet encombrant à récupérer gratuitement, ${shortAddress}.`
            : 'Un Monstre à récupérer sur Les Monstres.'),
        image: photo ? `${imgBaseUrl}/${photo.path}` : null,
        url: pageUrl,
        address: shortAddress,
        publishedAt: item.createdAt,
        indexable: PUBLIC_STATUSES.includes(item.status),
        siteUrl: frontendUrl,
      }),
    );
  }

  private renderHtml({
    title,
    description,
    image,
    url,
    address,
    publishedAt,
    indexable,
    siteUrl,
  }: {
    title: string;
    description: string;
    image: string | null;
    url: string;
    address: string | null;
    publishedAt: Date | null;
    indexable: boolean;
    siteUrl: string;
  }): string {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeUrl = escapeHtml(url);
    const pageTitle = `${safeTitle}${address ? ` — ${escapeHtml(address)}` : ''} | Les monstres - L'appli`;

    // Schema.org : aide Google à comprendre qu'il s'agit d'un objet donné,
    // localisé et daté, plutôt que d'une page générique.
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: title,
      description,
      ...(image ? { image } : {}),
      url,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        ...(address ? { areaServed: address } : {}),
      },
      ...(publishedAt ? { releaseDate: publishedAt.toISOString() } : {}),
    };

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeUrl}" />
  ${indexable ? '' : '<meta name="robots" content="noindex, follow" />\n  '}<meta property="og:type" content="article" />
  <meta property="og:site_name" content="Les monstres - L'appli" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeUrl}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${address ? `<p><strong>Adresse :</strong> ${escapeHtml(address)}</p>` : ''}
  <p>${safeDescription}</p>
  ${image ? `<p><img src="${escapeHtml(image)}" alt="${safeTitle}" width="600" /></p>` : ''}
  <p><a href="${safeUrl}">Voir ce Monstre sur Les Monstres</a></p>
  <p><a href="${escapeHtml(siteUrl)}/">Les Monstres — repérer, partager et récupérer les objets encombrants abandonnés dans la rue</a></p>
</body>
</html>`;
  }
}

/** Même logique que `shortAddress` côté frontend (ItemDetailView.vue) : numéro, rue, ville. */
function shortenAddress(fullAddress: string): string {
  const parts = fullAddress.split(',').map((s) => s.trim());
  return parts.length <= 3 ? fullAddress : parts.slice(0, 3).join(', ');
}
