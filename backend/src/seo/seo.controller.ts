import { Controller, Get, Header, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { escapeHtml } from '../common/html.util';

/** Texte brut d'un contenu HTML, pour en tirer une méta-description. */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/[\s,;:]+\S*$/, '')}…`;
}

/**
 * `robots.txt` et `sitemap.xml`, servis par le backend car ils doivent être
 * dynamiques (le sitemap liste les Monstres visibles, qui changent en
 * permanence — publication puis archivage automatique à 24h).
 *
 * nginx route ces deux chemins vers le backend (voir nginx/nginx.conf) :
 * sans ça, le fallback SPA du frontend les renvoyait en `index.html` avec
 * un code 200, ce qui est pire qu'un 404 — Google recevait du HTML là où
 * il attendait du texte et du XML, et n'a donc jamais pu découvrir le site.
 *
 * Exclus du préfixe global /api/v1 (voir main.ts) pour répondre sur les
 * URLs réelles attendues par les moteurs.
 */
@Controller()
export class SeoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private get siteUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots(): string {
    // Espaces privés/authentifiés : aucun intérêt pour l'index, et on évite
    // de gaspiller le budget d'exploration de Google sur des pages qui
    // redirigent toutes vers /connexion.
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /profil',
      'Disallow: /connexion',
      'Disallow: /inscription',
      'Disallow: /mot-de-passe-oublie',
      'Disallow: /reinitialiser-mot-de-passe',
      'Disallow: /verifier-email',
      'Disallow: /tutoriel',
      'Disallow: /api/',
      '',
      `Sitemap: ${this.siteUrl}/sitemap.xml`,
      '',
    ].join('\n');
  }

  @Get('sitemap.xml')
  async sitemap(@Res() res: Response): Promise<void> {
    const site = this.siteUrl;

    // Pages fixes : le cœur de ce qu'on veut voir indexé.
    const staticPages: { path: string; changefreq: string; priority: string }[] = [
      { path: '/', changefreq: 'hourly', priority: '1.0' },
      { path: '/pourquoi', changefreq: 'monthly', priority: '0.9' },
      { path: '/carte', changefreq: 'hourly', priority: '0.8' },
      { path: '/archives', changefreq: 'daily', priority: '0.6' },
      { path: '/communaute', changefreq: 'weekly', priority: '0.5' },
      { path: '/mentions-legales', changefreq: 'yearly', priority: '0.2' },
      { path: '/rgpd', changefreq: 'yearly', priority: '0.2' },
    ];

    // Monstres publiquement consultables uniquement : ni PENDING_REVIEW ni
    // HIDDEN, qui ne doivent jamais apparaître dans un index public.
    const items = await this.prisma.item.findMany({
      where: { status: { in: ['AVAILABLE', 'RESERVED', 'COLLECTED', 'ARCHIVED'] } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const urls = [
      ...staticPages.map(
        (page) =>
          `  <url>\n    <loc>${escapeHtml(site + page.path)}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`,
      ),
      ...items.map(
        (item) =>
          `  <url>\n    <loc>${escapeHtml(`${site}/monstres/${item.id}`)}</loc>\n    <lastmod>${item.updatedAt.toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.5</priority>\n  </url>`,
      ),
    ];

    res
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  }

  /**
   * Page « C'est quoi, un Monstre ? » prérendue pour les moteurs de
   * recherche (nginx y route les mêmes User-Agent que pour /monstres/:id).
   *
   * C'est la page qui explique le projet, donc celle qui porte le vocabulaire
   * sur lequel on veut être trouvé. Son contenu vient du réglage
   * `mission_content` et n'était jusqu'ici injecté que côté client : un
   * moteur devait exécuter le JS de la SPA pour le voir, ce qui est lent et
   * peu fiable. Ici il est servi directement dans le HTML — le texte est
   * strictement le même que celui affiché aux visiteurs.
   */
  @Get('pourquoi')
  async mission(@Res() res: Response): Promise<void> {
    const site = this.siteUrl;
    const content = await this.settings.getString('mission_content', '');
    const description = truncate(htmlToText(content), 300);
    const url = `${site}/pourquoi`;

    res.type('html').send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>C'est quoi, un Monstre ? | Les monstres - L'appli</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Les monstres - L'appli" />
  <meta property="og:title" content="C'est quoi, un Monstre ?" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
</head>
<body>
  <h1>C'est quoi, un Monstre ?</h1>
  <p><strong>« Les Monstres »</strong>, c'est l'autre nom des encombrants : les meubles, l'électroménager, les livres et les jouets abandonnés sur le trottoir.</p>
  ${content}
  <p><a href="${escapeHtml(site)}/">Voir les Monstres à récupérer près de chez toi</a></p>
</body>
</html>`);
  }
}
