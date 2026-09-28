// Katmanların üst yüzüne basılan 2B çizimler (canvas) ve animasyonlu LED noktalarının konumları.
import type { LayerDrawing } from '@/content/site';

export const TEX = 1024;
export const RED = '#E1141C';     // marka kırmızısı (etiket bandı, fiber hatları)
export const RED_LIT = '#FF4B45'; // koyu yüzey üstünde parlayan kırmızı

export type DotKind = 'blink' | 'steady' | 'cursor' | 'load' | 'wave' | 'rec';

/** Üst yüzdeki bir LED; u/v doku koordinatı (0–1), r piksel cinsinden yarıçap. */
export interface DotDef {
  kind: DotKind;
  u: number;
  v: number;
  r: number;
  seed?: number;
  /** cursor: kaçıncı satır */
  idx?: number;
  /** load: pencere içindeki sıra ve pencere numarası */
  k?: number;
  w?: number;
  /** wave: sinir ağındaki sütun */
  col?: number;
}

export interface DrawEnv {
  rnd: () => number;
  mono: string;
}

type Drawer = (cx: CanvasRenderingContext2D, env: DrawEnv) => DotDef[];

const ink = (a: number) => `rgba(228,231,234,${a})`;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function rr(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  cx.beginPath();
  cx.roundRect(x, y, w, h, r);
}

// L1 — iki patch panel ve aralarındaki patch kabloları
const drawNetwork: Drawer = (cx, { rnd, mono }) => {
  const dots: DotDef[] = [];
  const x0 = 84, w = TEX - 168, cols = 12, pitch = w / cols, pw = pitch * 0.7, ph = 56;
  const ports: { x: number; top: number; bottom: number; w: number; h: number }[][] = [[], []];
  cx.font = `500 22px ${mono}`;
  [96, 610].forEach((py, p) => {
    cx.fillStyle = ink(0.62);
    cx.fillText(p ? 'PP-B  25–48' : 'PP-A  01–24', x0 - 10, py);
    cx.fillText(p ? 'SW-02' : 'SW-01', x0 + w - 70, py);
    cx.strokeStyle = ink(0.3);
    cx.lineWidth = 2;
    cx.strokeRect(x0 - 22, py + 20, w + 44, 246);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * pitch + (pitch - pw) / 2;
        const y = py + 62 + r * (ph + 58);
        drawPort(cx, x, y, pw, ph);
        ports[p].push({ x: x + pw / 2, top: y, bottom: y + ph, w: pw, h: ph });
        dots.push({ u: (x + pw - 6) / TEX, v: (y - 19) / TEX, r: 7, kind: 'blink', seed: rnd() });
      }
    }
  });
  const pairs = [[1, 3], [3, 1], [4, 7], [6, 6], [8, 10], [10, 9], [11, 2], [0, 0]];
  cx.lineCap = 'round';
  pairs.forEach(([a, b], k) => {
    const A = ports[0][12 + a], B = ports[1][b];
    const col = k % 3 === 0 ? RED_LIT : ink(0.72);
    cx.strokeStyle = col;
    cx.lineWidth = 7;
    cx.beginPath();
    cx.moveTo(A.x, A.bottom - 12);
    cx.bezierCurveTo(A.x, A.bottom + 170, B.x, B.top - 170, B.x, B.top + 12);
    cx.stroke();
    cx.fillStyle = col;
    [A, B].forEach((pt) => cx.fillRect(pt.x - pt.w * 0.3, pt.top + pt.h * 0.18, pt.w * 0.6, pt.h * 0.64));
  });
  return dots;
};

function drawPort(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const n = w * 0.38, s = h * 0.74;
  cx.strokeStyle = ink(0.62);
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(x, y); cx.lineTo(x + w, y); cx.lineTo(x + w, y + s);
  cx.lineTo(x + (w + n) / 2, y + s); cx.lineTo(x + (w + n) / 2, y + h);
  cx.lineTo(x + (w - n) / 2, y + h); cx.lineTo(x + (w - n) / 2, y + s);
  cx.lineTo(x, y + s); cx.closePath();
  cx.stroke();
  cx.strokeStyle = ink(0.32);
  cx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const px = x + w * 0.16 + (i * w * 0.68) / 7;
    cx.beginPath(); cx.moveTo(px, y + 6); cx.lineTo(px, y + 16); cx.stroke();
  }
}

// L2 — kamera yerleşim planı: odalar, görüş açıları, NVR'a giden PoE hatları
const drawCamera: Drawer = (cx, { rnd, mono }) => {
  const dots: DotDef[] = [];
  const x0 = 96, y0 = 96, x1 = TEX - 96, y1 = TEX - 96;
  const nvr = { x: 770, y: 740, w: 130, h: 160 };
  const cams = [
    { x: 118, y: 118, dir: 45, range: 360, label: 'CAM-01' },
    { x: 540, y: 118, dir: 135, range: 330, label: 'CAM-02' },
    { x: 906, y: 118, dir: 135, range: 380, label: 'CAM-03' },
    { x: 118, y: 906, dir: -45, range: 380, label: 'CAM-04' },
    { x: 600, y: 540, dir: 20, range: 300, label: 'CAM-05' },
  ];

  // görüş alanları
  cams.forEach((c) => {
    const a = (c.dir * Math.PI) / 180, half = (34 * Math.PI) / 180;
    const g = cx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.range);
    g.addColorStop(0, 'rgba(255,75,69,0.34)');
    g.addColorStop(1, 'rgba(255,75,69,0.02)');
    cx.fillStyle = g;
    cx.beginPath();
    cx.moveTo(c.x, c.y);
    cx.arc(c.x, c.y, c.range, a - half, a + half);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = 'rgba(255,75,69,0.6)';
    cx.lineWidth = 2;
    cx.stroke();
  });

  // duvarlar (kapı boşluklarıyla)
  const wall = (ax: number, ay: number, bx: number, by: number) => {
    cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(bx, by); cx.stroke();
  };
  cx.lineCap = 'square';
  cx.strokeStyle = ink(0.78);
  cx.lineWidth = 9;
  cx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  cx.strokeStyle = ink(0.55);
  cx.lineWidth = 6;
  wall(560, y0, 560, 400); wall(560, 480, 560, 620);
  wall(x0, 620, 300, 620); wall(390, 620, x1, 620);
  wall(740, 620, 740, 700); wall(740, 800, 740, y1);

  // PoE hatları → NVR
  cx.setLineDash([10, 10]);
  cx.strokeStyle = ink(0.34);
  cx.lineWidth = 3;
  cams.forEach((c) => {
    cx.beginPath();
    cx.moveTo(c.x, c.y);
    cx.lineTo(c.x, nvr.y + nvr.h / 2);
    cx.lineTo(nvr.x, nvr.y + nvr.h / 2);
    cx.stroke();
  });
  cx.setLineDash([]);

  // NVR
  cx.fillStyle = '#16191d';
  cx.fillRect(nvr.x, nvr.y, nvr.w, nvr.h);
  cx.strokeStyle = ink(0.8);
  cx.lineWidth = 3;
  cx.strokeRect(nvr.x, nvr.y, nvr.w, nvr.h);
  cx.strokeStyle = ink(0.4);
  cx.lineWidth = 2;
  for (let k = 0; k < 4; k++) cx.strokeRect(nvr.x + 16, nvr.y + 50 + k * 24, nvr.w - 32, 16);
  cx.font = `600 22px ${mono}`;
  cx.fillStyle = ink(0.9);
  cx.fillText('NVR', nvr.x + 16, nvr.y + 34);
  dots.push({ u: (nvr.x + nvr.w - 22) / TEX, v: (nvr.y + 26) / TEX, r: 8, kind: 'blink', seed: rnd() });

  // oda adları
  cx.font = `500 20px ${mono}`;
  cx.fillStyle = ink(0.45);
  ([['OFİS', 150, 470], ['DEPO', 610, 430], ['GİRİŞ', 150, 860], ['SUNUCU', 766, 690]] as const)
    .forEach(([n, x, y]) => cx.fillText(n, x, y));

  // kameralar
  cams.forEach((c) => {
    cx.fillStyle = ink(0.92);
    cx.beginPath(); cx.arc(c.x, c.y, 17, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#16191d';
    cx.beginPath(); cx.arc(c.x, c.y, 9, 0, Math.PI * 2); cx.fill();
    cx.font = `500 17px ${mono}`;
    cx.fillStyle = ink(0.7);
    const right = c.x < 500;
    cx.textAlign = right ? 'left' : 'right';
    cx.fillText(c.label, c.x + (right ? 28 : -28), c.y + (c.y > 800 ? -18 : 34));
    cx.textAlign = 'left';
    dots.push({ u: c.x / TEX, v: c.y / TEX, r: 6, kind: 'rec', seed: rnd() });
  });
  return dots;
};

// L3 — rack üniteleri
const drawSystem: Drawer = (cx, { rnd, mono }) => {
  const dots: DotDef[] = [];
  const x0 = 84, w = TEX - 168, rh = 92, gap = 26;
  cx.font = `500 22px ${mono}`;
  for (let i = 0, y = 92; i < 7; i++, y += rh + gap) {
    cx.strokeStyle = ink(0.5);
    cx.lineWidth = 2.5;
    cx.strokeRect(x0, y, w, rh);
    cx.fillStyle = ink(0.2);
    cx.fillRect(x0 - 28, y + 12, 16, rh - 24);
    cx.fillRect(x0 + w + 12, y + 12, 16, rh - 24);
    cx.fillStyle = ink(0.3);
    for (let k = 0; k < 12; k++) cx.fillRect(x0 + 24 + k * 15, y + 20, 6, rh - 40);
    cx.fillStyle = ink(0.78);
    cx.fillText(`SRV-0${i + 1}`, x0 + 232, y + rh / 2 + 8);
    cx.strokeStyle = ink(0.36);
    cx.lineWidth = 2;
    for (let k = 0; k < 4; k++) cx.strokeRect(x0 + 420 + k * 80, y + 18, 66, rh - 36);
    if (i === 2 || i === 5) {
      cx.fillStyle = RED_LIT;
      cx.fillRect(x0 + 420, y + 18, 66, rh - 36);
    }
    dots.push({ u: (x0 + w - 84) / TEX, v: (y + rh / 2) / TEX, r: 9, kind: 'steady', seed: rnd() });
    dots.push({ u: (x0 + w - 46) / TEX, v: (y + rh / 2) / TEX, r: 9, kind: 'blink', seed: rnd() });
  }
  return dots;
};

// L4 — kod mini haritası
const drawCode: Drawer = (cx, { rnd, mono }) => {
  const dots: DotDef[] = [];
  cx.font = `500 20px ${mono}`;
  cx.fillStyle = ink(0.72);
  cx.fillText('api/siparis.ts', 150, 70);
  cx.fillStyle = ink(0.32);
  cx.fillText('entegrasyon.py', 430, 70);
  cx.fillStyle = RED_LIT;
  cx.fillRect(150, 84, 250, 4);
  cx.font = `400 15px ${mono}`;
  let indent = 0;
  for (let i = 0; i < 29; i++) {
    const y = 124 + i * 28;
    cx.fillStyle = ink(0.28);
    cx.fillText(String(i + 1).padStart(2, '0'), 84, y + 11);
    if (rnd() < 0.1) { indent = Math.max(0, indent - 1); continue; }
    const r = rnd();
    indent = clamp(indent + (r < 0.28 ? 1 : r > 0.72 ? -1 : 0), 0, 4);
    let x = 150 + indent * 40;
    const tokens = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < tokens && x < TEX - 200; k++) {
      const tw = 28 + rnd() * 150;
      const c = rnd();
      cx.fillStyle = c < 0.12 ? RED_LIT : c < 0.42 ? ink(0.85) : ink(0.42);
      rr(cx, x, y, tw, 12, 6);
      cx.fill();
      x += tw + 14;
    }
    dots.push({ u: (x + 6) / TEX, v: (y + 6) / TEX, r: 8, kind: 'cursor', idx: dots.length });
  }
  return dots;
};

// L5 — masaüstü, mobil ve e-ticaret pencereleri
const drawWeb: Drawer = (cx) => {
  const dots: DotDef[] = [];
  let wi = 0;
  const win = (x: number, y: number, w: number, h: number) => {
    cx.strokeStyle = ink(0.6);
    cx.lineWidth = 3;
    rr(cx, x, y, w, h, 12);
    cx.stroke();
    cx.beginPath(); cx.moveTo(x, y + 44); cx.lineTo(x + w, y + 44); cx.stroke();
    cx.fillStyle = ink(0.16);
    rr(cx, x + 96, y + 14, Math.min(w - 120, 300), 16, 8);
    cx.fill();
    for (let k = 0; k < 3; k++) dots.push({ u: (x + 26 + k * 22) / TEX, v: (y + 22) / TEX, r: 7, kind: 'load', k, w: wi });
    wi++;
    return { x: x + 24, y: y + 66, w: w - 48 };
  };
  const bar = (x: number, y: number, w: number, h: number, fill: string) => {
    cx.fillStyle = fill;
    rr(cx, x, y, w, h, Math.min(6, h / 2));
    cx.fill();
  };

  let c = win(84, 84, 556, 404);
  bar(c.x, c.y, c.w, 150, ink(0.12));
  bar(c.x + 24, c.y + 34, 280, 24, ink(0.85));
  bar(c.x + 24, c.y + 72, 200, 12, ink(0.45));
  bar(c.x + 24, c.y + 100, 110, 28, RED_LIT);
  const cw = (c.w - 32) / 3;
  for (let k = 0; k < 3; k++) {
    cx.strokeStyle = ink(0.38);
    cx.lineWidth = 2;
    cx.strokeRect(c.x + k * (cw + 16), c.y + 170, cw, 130);
    bar(c.x + k * (cw + 16) + 16, c.y + 190, cw * 0.6, 12, ink(0.6));
    bar(c.x + k * (cw + 16) + 16, c.y + 214, cw * 0.8, 8, ink(0.3));
    bar(c.x + k * (cw + 16) + 16, c.y + 230, cw * 0.5, 8, ink(0.3));
  }

  c = win(680, 84, 260, 520);
  bar(c.x, c.y, c.w, 130, ink(0.12));
  bar(c.x, c.y + 150, c.w * 0.8, 18, ink(0.85));
  bar(c.x, c.y + 180, c.w * 0.9, 9, ink(0.4));
  bar(c.x, c.y + 196, c.w * 0.7, 9, ink(0.4));
  bar(c.x, c.y + 226, c.w, 34, RED_LIT);
  for (let k = 0; k < 3; k++) {
    cx.strokeStyle = ink(0.34);
    cx.lineWidth = 2;
    cx.strokeRect(c.x, c.y + 284 + k * 52, c.w, 40);
  }

  c = win(84, 644, 856, 296);
  const pw = (c.w - 4 * 16) / 5;
  for (let k = 0; k < 5; k++) {
    const x = c.x + k * (pw + 16);
    bar(x, c.y, pw, 110, ink(0.12));
    bar(x, c.y + 126, pw * 0.8, 10, ink(0.6));
    bar(x, c.y + 146, pw * 0.5, 10, ink(0.3));
    bar(x, c.y + 172, pw * 0.36, 14, k === 1 ? RED_LIT : ink(0.8));
  }
  return dots;
};

// L6 — sinir ağı
const drawAI: Drawer = (cx, { rnd, mono }) => {
  const dots: DotDef[] = [];
  const cols = [170, 400, 630, 856], counts = [4, 6, 6, 3], R0 = 26;
  const pos = cols.map((x, c) =>
    Array.from({ length: counts[c] }, (_, i) => ({ x, y: 150 + (i + 0.5) * (760 / counts[c]) })),
  );
  for (let c = 0; c < 3; c++) {
    for (const a of pos[c]) {
      for (const b of pos[c + 1]) {
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const strong = rnd() < 0.12;
        cx.strokeStyle = strong ? RED_LIT : ink(0.08 + rnd() * 0.24);
        cx.lineWidth = strong ? 3 : 2;
        cx.beginPath();
        cx.moveTo(a.x + ux * R0, a.y + uy * R0);
        cx.lineTo(b.x - ux * R0, b.y - uy * R0);
        cx.stroke();
      }
    }
  }
  pos.forEach((col, c) => col.forEach((node) => {
    cx.strokeStyle = ink(0.66);
    cx.lineWidth = 3;
    cx.beginPath(); cx.arc(node.x, node.y, R0, 0, Math.PI * 2); cx.stroke();
    dots.push({ u: node.x / TEX, v: node.y / TEX, r: 15, kind: 'wave', col: c, seed: rnd() });
  }));
  cx.font = `500 20px ${mono}`;
  cx.fillStyle = ink(0.55);
  cx.textAlign = 'center';
  cx.fillText('GİRDİ', cols[0], 100);
  cx.fillText('ÇIKTI', cols[3], 100);
  cx.textAlign = 'left';
  return dots;
};

export const DRAWERS: Record<LayerDrawing, Drawer> = {
  network: drawNetwork,
  camera: drawCamera,
  system: drawSystem,
  code: drawCode,
  web: drawWeb,
  ai: drawAI,
};

/** Katman önündeki etiket makinesi bandı: kırmızı zemin, beyaz yazı. */
export function drawTape(text: string, mono: string): HTMLCanvasElement {
  const hPx = 80;
  const c = document.createElement('canvas');
  const cx = c.getContext('2d')!;
  const font = `600 32px ${mono}`;
  cx.font = font;
  const wPx = Math.ceil(cx.measureText(text).width + 48);
  c.width = wPx;
  c.height = hPx;
  cx.fillStyle = RED;
  cx.fillRect(0, 0, wPx, hPx);
  cx.fillStyle = '#FFFFFF';
  cx.font = font;
  cx.textBaseline = 'middle';
  cx.fillText(text, 24, hPx / 2 + 2);
  return c;
}

/** Zemindeki nokta ızgarası ve yığının ayak izini gösteren kesim işaretleri. */
export function drawGrid(footprint: number, planeSize: number): HTMLCanvasElement {
  const S = 1024, step = 32;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const cx = c.getContext('2d')!;
  const smoothstep = (a: number, b: number, v: number) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  for (let y = step / 2; y < S; y += step) {
    for (let x = step / 2; x < S; x += step) {
      const d = Math.hypot(x - S / 2, y - S / 2) / (S / 2);
      const a = 0.42 * (1 - smoothstep(0.35, 0.95, d));
      if (a <= 0.01) continue;
      cx.fillStyle = `rgba(17,19,22,${a})`;
      cx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
  const fp = (footprint / planeSize) * S, o = (S - fp) / 2 - 22, e = o + fp + 44, L = 30;
  cx.strokeStyle = 'rgba(17,19,22,0.55)';
  cx.lineWidth = 3;
  ([[o, o, 1, 1], [e, o, -1, 1], [o, e, 1, -1], [e, e, -1, -1]] as const).forEach(([x, y, sx, sy]) => {
    cx.beginPath();
    cx.moveTo(x + sx * L, y); cx.lineTo(x, y); cx.lineTo(x, y + sy * L);
    cx.stroke();
  });
  return c;
}
