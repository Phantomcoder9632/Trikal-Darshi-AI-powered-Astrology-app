/**
 * Terminal ASCII preview of a PNG. Usage:
 *   node scripts/viewpng.js <file> [cols] [--auto]
 * Renders luminance art; kept for diagnosing on-device screenshots/frames.
 */
const fs = require('fs');
const zlib = require('zlib');

const file = process.argv[2];
if (!file) {
  console.error('usage: node viewpng.js <file.png> [cols] [--auto]');
  process.exit(1);
}
const COLS = parseInt(process.argv[3] || '72', 10);
const AUTO = process.argv.includes('--auto');

const buf = fs.readFileSync(file);

// --- parse PNG chunks ---
let pos = 8;
let idat = Buffer.alloc(0);
let w = 0, h = 0, bitDepth = 0, colorType = 0;
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const chunk = buf.subarray(pos + 8, pos + 8 + len);
  if (type === 'IHDR') {
    w = chunk.readUInt32BE(0);
    h = chunk.readUInt32BE(4);
    bitDepth = chunk[8];
    colorType = chunk[9];
  } else if (type === 'IDAT') {
    idat = Buffer.concat([idat, chunk]);
  } else if (type === 'IEND') {
    break;
  }
  pos += 12 + len;
}

const raw = zlib.inflateSync(idat);
const bpp = { 6: 4, 2: 3, 0: 1, 4: 2 }[colorType];
const stride = w * bpp;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const out = Buffer.alloc(stride * h);
let prev = Buffer.alloc(stride);
let p = 0;
for (let y = 0; y < h; y++) {
  const filter = raw[p++];
  const line = Buffer.from(raw.subarray(p, p + stride));
  p += stride;
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? line[x - bpp] : 0;
    const b = prev[x];
    const c = x >= bpp ? prev[x - bpp] : 0;
    if (filter === 1) line[x] = (line[x] + a) & 0xff;
    else if (filter === 2) line[x] = (line[x] + b) & 0xff;
    else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 0xff;
    else if (filter === 4) line[x] = (line[x] + paeth(a, b, c)) & 0xff;
  }
  line.copy(out, y * stride);
  prev = line;
}

const ROWS = Math.max(1, Math.floor((COLS * h) / w / 2));
const CHARS = ' .:+*#@';
let autoLo = 255, autoHi = 0;
const lines = [];

// first pass: find range if --auto
if (AUTO) {
  for (let ry = 0; ry < ROWS; ry++) {
    const y0 = Math.floor((ry * h) / ROWS), y1 = Math.floor(((ry + 1) * h) / ROWS);
    for (let rx = 0; rx < COLS; rx++) {
      const x0 = Math.floor((rx * w) / COLS), x1 = Math.floor(((rx + 1) * w) / COLS);
      let tot = 0, n = 0;
      for (let y = y0; y < y1; y += Math.max(1, Math.floor((y1 - y0) / 4) || 1)) {
        const base = y * stride;
        for (let x = x0; x < x1; x += Math.max(1, Math.floor((x1 - x0) / 4) || 1)) {
          const o = base + x * bpp;
          tot += (out[o] * 299 + out[o + 1] * 587 + out[o + 2] * 114) / 1000;
          n++;
        }
      }
      const avg = tot / Math.max(n, 1);
      if (avg < autoLo) autoLo = avg;
      if (avg > autoHi) autoHi = avg;
    }
  }
}

for (let ry = 0; ry < ROWS; ry++) {
  const y0 = Math.floor((ry * h) / ROWS), y1 = Math.floor(((ry + 1) * h) / ROWS);
  let row = '';
  for (let rx = 0; rx < COLS; rx++) {
    const x0 = Math.floor((rx * w) / COLS), x1 = Math.floor(((rx + 1) * w) / COLS);
    let tot = 0, n = 0;
    for (let y = y0; y < y1; y += Math.max(1, Math.floor((y1 - y0) / 4) || 1)) {
      const base = y * stride;
      for (let x = x0; x < x1; x += Math.max(1, Math.floor((x1 - x0) / 4) || 1)) {
        const o = base + x * bpp;
        tot += (out[o] * 299 + out[o + 1] * 587 + out[o + 2] * 114) / 1000;
        n++;
      }
    }
    const avg = tot / Math.max(n, 1);
    let idx;
    if (AUTO) {
      const span = Math.max(1, autoHi - autoLo);
      idx = Math.min(6, Math.floor(((autoHi - avg) * 7) / span));
    } else {
      idx = Math.min(6, Math.floor(((255 - avg) * 7) / 256));
    }
    row += CHARS[idx];
  }
  lines.push(row);
}
console.log(lines.join('\n'));
