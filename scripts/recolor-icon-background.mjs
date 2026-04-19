/**
 * Replace dark background in v4 orbit icon with a solid color; keeps bright foreground.
 * Usage: node scripts/recolor-icon-background.mjs [hexBg] [inputPath] [outputPath]
 * Example: node scripts/recolor-icon-background.mjs FDE8D4
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parseHex(s) {
  const h = s.replace(/^#/, '');
  if (h.length !== 6) throw new Error('Use 6-char hex, e.g. FDE8D4');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** True if pixel reads as v4's dark navy background (not the blue glow). */
function isBackground(r, g, b) {
  const sum = r + g + b;
  // Core plate: very dark blue-gray; avoids most indigo/lavender foreground.
  if (sum > 118) return false;
  if (r > 38 || g > 44 || b > 56) return false;
  // Drop pixels that are too "blue bright" for bg (unlikely if sum low)
  if (b > r + 25 && sum > 55) return false;
  return true;
}

const hex = process.argv[2] || 'FDE8D4';
const inputRel =
  process.argv[3] || path.join('assets', 'icon-options', 'v4-orbit-minimal.png');
const outputRel =
  process.argv[4] || path.join('assets', 'icon-options', 'v4-orbit-bg-recolored.png');

const input = path.isAbsolute(inputRel) ? inputRel : path.join(root, inputRel);
const output = path.isAbsolute(outputRel) ? outputRel : path.join(root, outputRel);

const { r: tr, g: tg, b: tb } = parseHex(hex);

if (!fs.existsSync(input)) {
  console.error('Missing input:', input);
  process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
let replaced = 0;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (isBackground(r, g, b)) {
    data[i] = tr;
    data[i + 1] = tg;
    data[i + 2] = tb;
    data[i + 3] = 255;
    replaced++;
  }
}

await sharp(Buffer.from(data), {
  raw: { width, height, channels: 4 },
})
  .png()
  .toFile(output);

console.log('Wrote', output);
console.log('Background hex', '#' + hex.toUpperCase(), '| pixels replaced:', replaced, '/', width * height);
