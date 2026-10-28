import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * clamp01(t);
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

function sdEllipse(x, y, cx, cy, rx, ry, rot = 0) {
  const dx = x - cx;
  const dy = y - cy;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  const px = dx * c - dy * s;
  const py = dx * s + dy * c;
  const k = Math.hypot(px / rx, py / ry);
  return (k - 1) * Math.min(rx, ry);
}

function sdSegment(x, y, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = x - ax;
  const wy = y - ay;
  const t = clamp01((wx * vx + wy * vy) / (vx * vx + vy * vy));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

function render(size, maskable = false) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.82 : 1;
  const cx = 0.5;
  const cy = 0.5;
  const membraneR = 0.356 * scale;
  const nucleus = { x: 0.596, y: 0.585, r: 0.108 * scale };
  const mitos = [
    [0.365, 0.41, 0.435, 0.35, 0.019],
    [0.41, 0.648, 0.34, 0.69, 0.016],
    [0.63, 0.335, 0.71, 0.36, 0.015],
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const index = (y * size + x) * 4;

      const radial = clamp01(Math.hypot(u - cx, v - cy) / 0.72);
      let r = mix(24, 7, radial);
      let g = mix(48, 15, radial * radial);
      let b = mix(40, 12, radial * radial);

      const halo = smooth(membraneR + 0.08, membraneR - 0.02, Math.hypot(u - cx, v - cy));
      r = mix(r, 40, halo * 0.5);
      g = mix(g, 106, halo * 0.5);
      b = mix(b, 93, halo * 0.5);

      const membraneD = sdCircle(u, v, cx, cy, membraneR);
      const inside = smooth(0.004, -0.006, membraneD);
      if (inside > 0) {
        const cellGlow = clamp01(1 - Math.hypot(u - cx, v - cy) / membraneR);
        r = mix(r, 52 + 32 * cellGlow, inside * 0.72);
        g = mix(g, 126 + 40 * cellGlow, inside * 0.72);
        b = mix(b, 111 + 34 * cellGlow, inside * 0.72);
      }

      const rim = smooth(0.018, 0.002, Math.abs(membraneD));
      r = mix(r, 113, rim * 0.9);
      g = mix(g, 228, rim * 0.9);
      b = mix(b, 210, rim * 0.9);

      const nucleusD = sdCircle(u, v, nucleus.x, nucleus.y, nucleus.r);
      const nucleusIn = smooth(0.004, -0.004, nucleusD);
      if (nucleusIn > 0) {
        const shade = clamp01(1 - (v - (nucleus.y - nucleus.r)) / (nucleus.r * 2));
        r = mix(r, 150 + 30 * shade, nucleusIn * 0.94);
        g = mix(g, 122 + 20 * shade, nucleusIn * 0.94);
        b = mix(b, 226 + 12 * shade, nucleusIn * 0.94);
      }
      const nucleolusD = sdCircle(u, v, nucleus.x + 0.025 * scale, nucleus.y + 0.018 * scale, 0.038 * scale);
      const nucleolusIn = smooth(0.003, -0.003, nucleolusD);
      if (nucleolusIn > 0) {
        r = mix(r, 94, nucleolusIn);
        g = mix(g, 62, nucleolusIn);
        b = mix(b, 170, nucleolusIn);
      }

      for (const [ax, ay, bx, by, radius] of mitos) {
        const d = sdSegment(u, v, ax, ay, bx, by) - radius * scale;
        const m = smooth(0.004, -0.004, d);
        if (m > 0) {
          r = mix(r, 235, m * 0.92);
          g = mix(g, 137, m * 0.92);
          b = mix(b, 84, m * 0.92);
        }
      }

      const chloro = sdEllipse(u, v, 0.34, 0.57, 0.055 * scale, 0.026 * scale, -0.5);
      const chloroIn = smooth(0.004, -0.004, chloro);
      if (chloroIn > 0) {
        r = mix(r, 159, chloroIn * 0.9);
        g = mix(g, 211, chloroIn * 0.9);
        b = mix(b, 125, chloroIn * 0.9);
      }

      const dots = [
        [0.47, 0.3, 0.009],
        [0.55, 0.73, 0.007],
        [0.72, 0.55, 0.008],
        [0.29, 0.47, 0.006],
        [0.65, 0.69, 0.005],
      ];
      for (const [dx, dy, dr] of dots) {
        const d = sdCircle(u, v, dx, dy, dr * scale);
        const m = smooth(0.002, -0.002, d);
        if (m > 0) {
          r = mix(r, 199, m * 0.8);
          g = mix(g, 243, m * 0.8);
          b = mix(b, 165, m * 0.8);
        }
      }

      const vignette = clamp01(Math.hypot(u - 0.5, v - 0.5) / 0.74);
      const vf = 1 - vignette * vignette * 0.3;
      pixels[index] = Math.round(clamp01((r / 255) * vf) * 255);
      pixels[index + 1] = Math.round(clamp01((g / 255) * vf) * 255);
      pixels[index + 2] = Math.round(clamp01((b / 255) * vf) * 255);
      pixels[index + 3] = 255;
    }
  }
  return encodePng(size, size, pixels);
}

const icon192 = render(192);
const icon512 = render(512);
const maskable = render(512, true);

writeFileSync(join(outDir, 'icon-192.png'), icon192);
writeFileSync(join(outDir, 'icon-512.png'), icon512);
writeFileSync(join(outDir, 'icon-maskable-512.png'), maskable);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="CellScope">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0" stop-color="#183028"/>
      <stop offset="1" stop-color="#070f0c"/>
    </radialGradient>
    <radialGradient id="cell" cx="45%" cy="40%" r="65%">
      <stop offset="0" stop-color="#8be7d1" stop-opacity=".5"/>
      <stop offset="1" stop-color="#2f8a78" stop-opacity=".24"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="182" fill="url(#cell)" stroke="#71e4d2" stroke-width="7"/>
  <circle cx="305" cy="299" r="56" fill="#9b7de6"/>
  <circle cx="318" cy="310" r="18" fill="#5e3fa8"/>
  <path d="M189 220l42-42" stroke="#eb8954" stroke-width="20" stroke-linecap="round"/>
  <path d="M174 335l-34 24" stroke="#eb8954" stroke-width="16" stroke-linecap="round"/>
  <path d="M342 180l42 12" stroke="#eb8954" stroke-width="16" stroke-linecap="round"/>
  <ellipse cx="174" cy="292" rx="28" ry="14" fill="#9fd37d" transform="rotate(-28 174 292)"/>
  <circle cx="240" cy="154" r="6" fill="#c7f36b"/>
  <circle cx="280" cy="374" r="5" fill="#c7f36b"/>
  <circle cx="366" cy="280" r="6" fill="#c7f36b"/>
  <circle cx="150" cy="240" r="5" fill="#c7f36b"/>
</svg>
`;
writeFileSync(join(outDir, 'icon.svg'), svg);

console.log('icons written to public/icons');
