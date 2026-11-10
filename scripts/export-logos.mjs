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
  { svg: 'assets/logo/gesty-lockup-oscuro.svg', png: 'assets/images/logo-lockup.png', height: 160 },
];

/**
 * Some SVGs declare only `height` on the root element, which makes generic renderers letterbox
 * the drawing. Drop the root width/height (in memory only) so the size comes from the viewBox.
 */
function sizeFromViewBox(source) {
  return source.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, ''));
}

for (const { svg, png, height } of exports) {
  const source = sizeFromViewBox(readFileSync(join(root, svg), 'utf8'));
  const image = new Resvg(source, { fitTo: { mode: 'height', value: height } }).render();
  writeFileSync(join(root, png), image.asPng());
  console.log(`${svg} → ${png} (${image.width}×${image.height})`);
}
