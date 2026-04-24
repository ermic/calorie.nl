#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, '..', 'public', 'icons', 'icon-source.svg');
const outDir = resolve(here, '..', 'public', 'icons');

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const svg = await readFile(sourcePath);

for (const { file, size } of targets) {
  const out = resolve(outDir, file);
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out);
  console.log(`generated ${file} (${size}×${size})`);
}
