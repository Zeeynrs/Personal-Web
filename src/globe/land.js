// Partikel daratan dari geografi dunia nyata (Natural Earth, lihat earthData.js).
// Garis pantai dirasterisasi menjadi masker bujur/lintang, lalu titik-titik Fibonacci
// yang tersebar merata di bola disaring: hanya yang jatuh di daratan yang dipakai.
// Modul ini dimuat terpisah (dynamic import) karena data garis pantainya besar.
import { EARTH_LAKES, EARTH_LAND } from '../earthData';
import { createRandom } from '../utils/seededRandom';
import { GLOBE_RADIUS, latLonToVector3, unitToLatLon } from './geo';

/* ---------- rasterisasi data geografi (diadaptasi dari earthTexture.js lama) ---------- */
// Cincin terkode (selisih, seperseratus derajat) → koordinat piksel bujur/lintang
const toPixelRing = (flat, w, h) => {
  const n = flat.length / 2;
  const out = new Float64Array(n * 2);
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) {
    x += flat[i * 2];
    y += flat[i * 2 + 1];
    out[i * 2] = ((x / 100 + 180) / 360) * w;
    out[i * 2 + 1] = ((90 - y / 100) / 180) * h;
  }
  return out;
};

// Isi poligon (aturan genap-ganjil, mencakup lubang) pada grid w x h; 1 = di dalam
const rasterizeRings = (rings, w, h) => {
  const rows = Array.from({ length: h }, () => []);
  for (const flat of rings) {
    const p = toPixelRing(flat, w, h);
    const n = p.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = p[i * 2], y1 = p[i * 2 + 1], x2 = p[j * 2], y2 = p[j * 2 + 1];
      if (y1 === y2) continue;
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      const r0 = Math.max(0, Math.ceil(lo - 0.5)), r1 = Math.min(h - 1, Math.ceil(hi - 0.5) - 1);
      for (let r = r0; r <= r1; r++) rows[r].push(x1 + ((r + 0.5 - y1) * (x2 - x1)) / (y2 - y1));
    }
  }
  const mask = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) {
    const xs = rows[r].sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let x = a; x <= b; x++) mask[r * w + x] = 1;
    }
  }
  return mask;
};

// Masker daratan (tanpa danau besar) beresolusi 0,5°
export const createLandMask = (w = 720, h = 360) => {
  const land = rasterizeRings(EARTH_LAND, w, h);
  const lakes = rasterizeRings(EARTH_LAKES, w, h);
  const isLand = (lat, lon) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor(((lon + 180) / 360) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor(((90 - lat) / 180) * h)));
    const i = y * w + x;
    return land[i] === 1 && lakes[i] === 0;
  };
  return { isLand };
};

/**
 * Titik daratan: `samples` titik Fibonacci di seluruh bola, ~29% di antaranya daratan.
 * Mengembalikan posisi (xyz) + atribut per titik: aMix (0 = biru, 1 = ungu) dan aSeed (variasi kedip/ukuran).
 */
export const sampleLandPoints = (samples, radius = GLOBE_RADIUS) => {
  const { isLand } = createLandMask();
  const rand = createRandom(4242);
  const pos = [], mix = [], seed = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const v = latLonToVector3(0, 0);
  for (let i = 0; i < samples; i++) {
    const y = 1 - ((i + 0.5) / samples) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const { lat, lon } = unitToLatLon(Math.cos(th) * r, y, Math.sin(th) * r);
    if (!isLand(lat, lon)) continue;
    latLonToVector3(lat, lon, radius, v);
    pos.push(v.x, v.y, v.z);
    // Gradasi biru → ungu yang lembut menurut bujur/lintang, ditambah sedikit acak
    const band = 0.5 + 0.25 * Math.sin((lon * Math.PI) / 140) + 0.2 * Math.sin((lat * Math.PI) / 55);
    mix.push(Math.min(1, Math.max(0, band + (rand() - 0.5) * 0.35)));
    seed.push(rand());
  }
  return { positions: new Float32Array(pos), mix: new Float32Array(mix), seed: new Float32Array(seed) };
};
