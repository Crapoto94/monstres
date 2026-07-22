// Script ponctuel (non conservé dans les scripts npm) : génère les icônes
// PWA/favicon depuis icone app.jpg, et une version du logo à fond transparent
// depuis LOGO.jpg (chroma-key du blanc). Tourne avec `sharp`, déjà présent
// dans backend/node_modules. Sorties écrites dans frontend/public et
// frontend/src/assets.
const sharp = require('sharp');
const path = require('node:path');

const ASSETS = path.resolve(__dirname, '../../frontend/src/assets');
const PUBLIC = path.resolve(__dirname, '../../frontend/public');

const BRAND_TEAL = { r: 42, g: 120, b: 119 }; // brand-600, fond du canvas maskable

async function main() {
  const iconSrc = path.join(ASSETS, 'app-icon-source.jpg');

  // Recadre le carré arrondi (fond blanc autour) en ne gardant que la zone utile,
  // puis redimensionne pour chaque usage. Un léger rognage supplémentaire
  // élimine le fin liseré blanc résiduel de l'anti-aliasing JPEG sur les bords.
  const roughTrim = await sharp(iconSrc).trim({ background: '#ffffff', threshold: 10 }).toBuffer();
  const roughMeta = await sharp(roughTrim).metadata();
  const INSET = 22;
  const trimmed = await sharp(roughTrim)
    .extract({
      left: INSET,
      top: INSET,
      width: roughMeta.width - INSET * 2,
      height: roughMeta.height - INSET * 2,
    })
    .toBuffer();

  await sharp(trimmed).resize(32, 32).png().toFile(path.join(PUBLIC, 'favicon.png'));
  await sharp(trimmed).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  await sharp(trimmed).resize(192, 192).png().toFile(path.join(PUBLIC, 'pwa-192.png'));
  await sharp(trimmed).resize(512, 512).png().toFile(path.join(PUBLIC, 'pwa-512.png'));

  // Maskable : zone de sécurité ~80% — on réduit l'icône et on l'étend sur un
  // canvas de la couleur de fond de la marque pour qu'aucun détail ne soit
  // coupé par le masque circulaire/arrondi appliqué par l'OS.
  const inner = await sharp(trimmed).resize(410, 410).toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { ...BRAND_TEAL, alpha: 1 } },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(path.join(PUBLIC, 'pwa-maskable-512.png'));

  // Logo à fond transparent (chroma-key du blanc, dégradé pour un bord net).
  const logoSrc = path.join(ASSETS, 'logo.jpg');
  const { data, info } = await sharp(logoSrc).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const minChannel = Math.min(r, g, b);
    // Blanc pur -> alpha 0 ; encre foncée -> alpha 255, avec un dégradé linéaire.
    const alpha = Math.max(0, Math.min(255, Math.round((255 - minChannel) * 2.2)));
    out[i + 3] = alpha;
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(path.join(ASSETS, 'logo-transparent.png'));

  console.log('Assets générés dans', PUBLIC, 'et', ASSETS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
