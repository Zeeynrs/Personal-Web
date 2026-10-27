import * as THREE from 'three';

// Satu-satunya konversi geografis yang dipakai globe: daratan, node, jalur, radar, dan kamera
// semuanya lewat fungsi ini sehingga posisinya selalu konsisten.
// Sumbu: +Y = kutub utara, bujur 0° di +X, bujur 90° BT di -Z (searah putaran Bumi bila dilihat dari utara).
export const GLOBE_RADIUS = 1;

const DEG = Math.PI / 180;

export const latLonToVector3 = (lat, lon, radius = GLOBE_RADIUS, out = new THREE.Vector3()) => {
  const phi = lat * DEG, lambda = lon * DEG;
  const c = Math.cos(phi);
  return out.set(radius * c * Math.cos(lambda), radius * Math.sin(phi), -radius * c * Math.sin(lambda));
};

// Kebalikan latLonToVector3 untuk vektor satuan (dipakai saat sampling daratan)
export const unitToLatLon = (x, y, z) => ({
  lat: Math.asin(Math.max(-1, Math.min(1, y))) / DEG,
  lon: Math.atan2(-z, x) / DEG,
});

export const formatLatLon = (lat, lon) => {
  const f = (v) => Math.abs(v).toFixed(2).replace('.', ',');
  return `${f(lat)}° ${lat < 0 ? 'LS' : 'LU'} · ${f(lon)}° ${lon < 0 ? 'BB' : 'BT'}`;
};
