/**
 * Rasterizes the official logo SVGs in assets/logo/ to the PNGs the app uses.
 * The SVGs are used as they are (never redrawn). Run: npm run export-logos
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const exports = [
  // Home screen lockup: shown 40 dp tall, exported at 4x.
  { svg: 'assets/logo/gesty-lockup-oscuro.svg', png: 'assets/images/logo-lockup.png', fit: { mode: 'height', value: 160 } },
  // App icon (legacy launchers) and adaptive icon foreground: 1024×1024 per the SPEC.
  { svg: 'assets/logo/gesty-icono.svg', png: 'assets/icon.png', fit: { mode: 'width', value: 1024 } },
  { svg: 'assets/logo/gesty-icono-foreground.svg', png: 'assets/adaptive-icon.png', fit: { mode: 'width', value: 1024 } },
  // Splash: shown 180 dp wide (fits Android 12's 192 dp circular icon mask), up to 4x = 720 px.
  { svg: 'assets/logo/gesty-lockup-oscuro.svg', png: 'assets/splash-lockup.png', fit: { mode: 'width', value: 1024 } },
];

/**
 * Some SVGs declare only `height` on the root element, which makes generic renderers letterbox
 * the drawing. Drop the root width/height (in memory only) so the size comes from the viewBox.
 */
function sizeFromViewBox(source) {
  return source.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, ''));
}

for (const { svg, png, fit } of exports) {
  const source = sizeFromViewBox(readFileSync(join(root, svg), 'utf8'));
  const image = new Resvg(source, { fitTo: fit }).render();
  writeFileSync(join(root, png), image.asPng());
  console.log(`${svg} → ${png} (${image.width}×${image.height})`);
}
