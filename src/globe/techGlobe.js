import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createRandom } from '../utils/seededRandom';
import { GLOBE_RADIUS as R, formatLatLon, latLonToVector3 } from './geo';
import { CONNECTIONS, HUB_ID, NODES } from './network';

/* =====================================================================
   Globe hologram jaringan cloud. Kamera mengorbit globe yang diam, sehingga
   ruang globe = ruang dunia: daratan, node, jalur, dan radar Jakarta memakai
   koordinat yang sama dan ikut "berputar" bersama Bumi.
   ===================================================================== */

const COLORS = {
  background: 0x03050b,
  landBlue: 0x3d5ca6,
  landViolet: 0x6a50b0,
  grid: 0x2d4a7c,
  shellFill: 0x060c1c,
  rim: 0x4fb4ff,
  atmosphere: 0x3aa8ff,
  node: 0x5ff4ff,
  hub: 0xaafcff,
  arcStart: 0x46e6ff,
  arcEnd: 0x5d5cf2,
  data: 0xc8f6ff,
};

const ARC_SEGMENTS = 72;
const FOCUS_ZOOM = 0.8;      // jarak kamera saat fokus ke node, relatif terhadap jarak awal
const IDLE_RESUME_MS = 6000; // putaran otomatis kembali setelah diam selama ini

/* ----------------------------- Shader ----------------------------- */
// Seberapa menghadap kamera titik di permukaan bola (1 = depan, <0 = sisi belakang)
const FACING_GLSL = `
  float facing(vec3 p, vec4 mv) {
    vec3 n = normalize(normalMatrix * normalize(p));
    return dot(n, normalize(-mv.xyz));
  }`;

const landMaterial = (uTime, uScale) => new THREE.ShaderMaterial({
  uniforms: {
    uTime, uScale,
    uReveal: { value: 0 },
    uSize: { value: 0.011 },
    uBlue: { value: new THREE.Color(COLORS.landBlue) },
    uViolet: { value: new THREE.Color(COLORS.landViolet) },
  },
  vertexShader: `
    attribute float aMix; attribute float aSeed;
    uniform float uTime; uniform float uScale; uniform float uSize; uniform float uReveal;
    varying float vMix; varying float vAlpha; varying float vScan;
    ${FACING_GLSL}
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float front = smoothstep(-0.25, 0.35, facing(position, mv));
      float scanY = mod(uTime * 0.22, 2.8) - 1.4; // garis pindai hologram yang turun perlahan
      vScan = smoothstep(0.045, 0.0, abs(position.y - scanY)) * front;
      float twinkle = 0.85 + 0.15 * sin(uTime * 1.3 + aSeed * 40.0);
      float reveal = smoothstep(aSeed, aSeed + 0.15, uReveal * 1.15);
      vMix = aMix;
      vAlpha = mix(0.09, 0.85, front) * twinkle * reveal;
      gl_PointSize = max(1.5, uSize * (0.75 + 0.5 * aSeed) * mix(0.7, 1.0, front) * uScale / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uBlue; uniform vec3 uViolet;
    varying float vMix; varying float vAlpha; varying float vScan;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.18, d);
      vec3 col = mix(uBlue, uViolet, vMix) + vec3(0.1, 0.3, 0.36) * vScan;
      gl_FragColor = vec4(col, a * (vAlpha + vScan * 0.2));
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// Garis lintang/bujur dan cincin orbit: redup di sisi belakang globe
const lineMaterial = (color, front, back) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uFront: { value: front }, uBack: { value: back } },
  vertexShader: `
    uniform float uFront; uniform float uBack; varying float vAlpha;
    ${FACING_GLSL}
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vAlpha = mix(uBack, uFront, smoothstep(-0.2, 0.3, facing(position, mv)));
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uColor; varying float vAlpha;
    void main() { gl_FragColor = vec4(uColor, vAlpha);
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// Cangkang transparan: isi sangat tipis + tepi fresnel
const shellMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uFill: { value: new THREE.Color(COLORS.shellFill) }, uRim: { value: new THREE.Color(COLORS.rim) } },
  vertexShader: `
    varying vec3 vN; varying vec3 vView;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uFill; uniform vec3 uRim; varying vec3 vN; varying vec3 vView;
    void main() {
      float rim = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), 3.5);
      gl_FragColor = vec4(mix(uFill, uRim, rim), 0.22 + rim * 0.22);
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
});

// Pendaran atmosfer tipis di sekitar siluet. Globe transparan, jadi sisi belakang bola atmosfer
// terlihat menembus tengah globe: pendaran dibuat memuncak di tepi globe (|n·v| ≈ LIMB) dan
// meredup ke arah tengah, bukan menyala penuh seperti pada planet padat.
const ATMOS_SCALE = 1.13;
const atmosphereMaterial = () => new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(COLORS.atmosphere) },
    uLimb: { value: Math.sqrt(1 - 1 / (ATMOS_SCALE * ATMOS_SCALE)) },
  },
  vertexShader: `
    varying vec3 vN; varying vec3 vView;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uColor; uniform float uLimb; varying vec3 vN; varying vec3 vView;
    void main() {
      float c = abs(dot(normalize(vN), normalize(vView)));
      float outer = pow(smoothstep(0.0, uLimb, c), 2.2);
      float inner = 1.0 - smoothstep(uLimb, uLimb + 0.3, c) * 0.94;
      gl_FragColor = vec4(uColor * outer * inner * 0.22, 1.0);
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
});

// Jalur Bezier: digambar bertahap (uDraw), kepala data terang (uHead), gradasi cyan → indigo
const arcMaterial = () => new THREE.ShaderMaterial({
  uniforms: {
    uDraw: { value: 1 }, uAlpha: { value: 1 }, uHighlight: { value: 0 }, uHead: { value: -1 },
    uStart: { value: new THREE.Color(COLORS.arcStart) }, uEnd: { value: new THREE.Color(COLORS.arcEnd) },
  },
  vertexShader: `
    attribute float aT; varying float vT; varying float vFront;
    ${FACING_GLSL}
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vT = aT; vFront = smoothstep(-0.25, 0.3, facing(position, mv));
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform float uDraw; uniform float uAlpha; uniform float uHighlight; uniform float uHead;
    uniform vec3 uStart; uniform vec3 uEnd; varying float vT; varying float vFront;
    void main() {
      if (vT > uDraw) discard;
      float trail = uHead < 0.0 ? 0.0 : step(vT, uHead) * smoothstep(0.2, 0.0, uHead - vT);
      vec3 col = mix(uStart, uEnd, vT) + vec3(0.5, 0.85, 1.0) * trail * 0.5;
      float a = (mix(0.18, 0.6, uHighlight) + trail * 0.85) * uAlpha * mix(0.22, 1.0, vFront);
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// Partikel kecil (data di jalur & partikel melayang); aAlpha = 0 menyembunyikan titik
const sparkMaterial = (uTime, uScale, size, color, twinkle) => new THREE.ShaderMaterial({
  uniforms: { uTime, uScale, uSize: { value: size }, uColor: { value: new THREE.Color(color) }, uTwinkle: { value: twinkle } },
  vertexShader: `
    attribute float aAlpha; attribute float aSeed;
    uniform float uTime; uniform float uScale; uniform float uSize; uniform float uTwinkle;
    varying float vAlpha;
    ${FACING_GLSL}
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float sparkle = mix(1.0, 0.15 + 0.85 * pow(0.5 + 0.5 * sin(uTime * 0.8 + aSeed * 31.0), 6.0), uTwinkle);
      vAlpha = aAlpha * sparkle * mix(0.25, 1.0, smoothstep(-0.25, 0.3, facing(position, mv)));
      gl_PointSize = max(1.5, uSize * uScale / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uColor; varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vAlpha);
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const radialTexture = (stops) => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([at, color]) => grad.addColorStop(at, color));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

/* ----------------------------- Utilitas ----------------------------- */
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const approach = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);

// Interpolasi sferis dua vektor satuan
const slerpUnit = (a, b, t, out) => {
  const theta = a.angleTo(b), s = Math.sin(theta);
  if (s < 1e-4) return out.copy(a).lerp(b, t).normalize();
  return out.copy(a).multiplyScalar(Math.sin((1 - t) * theta) / s).addScaledVector(b, Math.sin(t * theta) / s);
};

const showFallback = (container) => {
  const el = document.createElement('div');
  el.className = 'globe-fallback';
  el.textContent = 'Tampilan 3D tidak tersedia di perangkat atau browser ini.';
  container.appendChild(el);
};

/* ===================================================================== */
export const initTechGlobe = (container) => {
  if (!container) return null;
  const mobile = window.innerWidth <= 768;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = createRandom(8086);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.error('WebGL tidak tersedia, globe 3D dilewati:', err);
    showFallback(container);
    return null;
  }

  const events = new AbortController();
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: events.signal });

  /* ---------- Renderer, scene, kamera ---------- */
  const size = { w: container.clientWidth || 1, h: container.clientHeight || 1 };
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(size.w, size.h);
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Globe 3D interaktif berisi ilustrasi jaringan cloud global dengan pusat di Jakarta, Indonesia');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  const camera = new THREE.PerspectiveCamera(45, size.w / size.h, 0.05, 50);
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // Jarak agar globe + atmosfer muat di sisi tersempit kontainer
  const homeDistance = () => (R * 1.32) / tanHalfFov / Math.min(1, camera.aspect);
  const HOME_DIR = latLonToVector3(12, 108, 1).normalize(); // Indonesia menghadap kamera saat awal

  let composer = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(size.w, size.h);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.45, 0.4, 0.2));
    composer.addPass(new OutputPass());
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.55;
  controls.enablePan = false;
  controls.enableZoom = false; // roda mouse tetap menggulung halaman
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.82;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.45;
  // Di layar sentuh, geser vertikal tetap menggulung halaman
  canvas.style.touchAction = 'pan-y';

  const startDistance = homeDistance() * (reduceMotion ? 1 : 1.9);
  camera.position.copy(HOME_DIR).multiplyScalar(startDistance);
  controls.update();

  // Uniform bersama
  const uTime = { value: 0 };
  const uScale = { value: 1 };

  /* ---------- Globe ---------- */
  const globe = new THREE.Group();
  scene.add(globe);

  const shell = new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 48), shellMaterial());
  shell.renderOrder = -1;
  globe.add(shell);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * ATMOS_SCALE, 64, 48), atmosphereMaterial()));

  // Garis lintang tiap 30° dan bujur tiap 30°
  const gridPts = [];
  const pushPath = (fn, steps) => {
    for (let i = 0; i < steps; i++) {
      gridPts.push(fn(i / steps), fn((i + 1) / steps));
    }
  };
  [-60, -30, 0, 30, 60].forEach((lat) => pushPath((t) => latLonToVector3(lat, t * 360 - 180, R * 1.001), 120));
  for (let lon = -180; lon < 180; lon += 30) pushPath((t) => latLonToVector3(t * 160 - 80, lon, R * 1.001), 60);
  globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), lineMaterial(COLORS.grid, 0.2, 0.04)));

  // Cincin orbit tipis yang miring sebagai detail geometris
  const orbitPts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    orbitPts.push(new THREE.Vector3(Math.cos(a) * R * 1.3, 0, Math.sin(a) * R * 1.3));
  }
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPts), lineMaterial(COLORS.rim, 0.13, 0.03));
  orbit.rotation.set(THREE.MathUtils.degToRad(72), 0, THREE.MathUtils.degToRad(-16));
  globe.add(orbit);

  // Partikel daratan dimuat terpisah (data garis pantai besar) saat browser senggang
  const land = landMaterial(uTime, uScale);
  if (mobile) land.uniforms.uSize.value = 0.014;
  let landPoints = null;
  let revealStart = -1;
  const loadLand = () => import('./land')
    .then(({ sampleLandPoints }) => {
      if (events.signal.aborted) return;
      const { positions, mix, seed } = sampleLandPoints(mobile ? 30000 : 60000);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      g.setAttribute('aMix', new THREE.BufferAttribute(mix, 1));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      landPoints = new THREE.Points(g, land);
      globe.add(landPoints);
      revealStart = reduceMotion ? -Infinity : time;
    })
    .catch((err) => console.error('Gagal memuat data daratan globe:', err));
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadLand, { timeout: 1500 });
  else setTimeout(loadLand, 400);

  // Partikel data melayang di sekitar globe
  const floatCount = mobile ? 90 : 220;
  const floatPos = new Float32Array(floatCount * 3);
  const floatSeed = new Float32Array(floatCount);
  const tmpV = new THREE.Vector3();
  for (let i = 0; i < floatCount; i++) {
    tmpV.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(R * (1.08 + rand() * 0.42));
    floatPos.set([tmpV.x, tmpV.y, tmpV.z], i * 3);
    floatSeed[i] = rand();
  }
  const floatGeo = new THREE.BufferGeometry();
  floatGeo.setAttribute('position', new THREE.BufferAttribute(floatPos, 3));
  floatGeo.setAttribute('aSeed', new THREE.BufferAttribute(floatSeed, 1));
  floatGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(floatCount).fill(0.55), 1));
  const floaters = new THREE.Points(floatGeo, sparkMaterial(uTime, uScale, 0.009, COLORS.data, 1));
  scene.add(floaters); // sengaja di luar `globe`: melayang bebas, tidak terikat koordinat Bumi

  /* ---------- Node ---------- */
  const dotTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  const glowTex = radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.25, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
  const ringGeo = new THREE.RingGeometry(0.82, 1, 64);
  const Z = new THREE.Vector3(0, 0, 1);
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

  const nodes = NODES.map((n, i) => {
    const hub = n.id === HUB_ID || !!n.hub;
    const color = new THREE.Color(hub ? COLORS.hub : COLORS.node);
    const normal = latLonToVector3(n.lat, n.lon, 1);
    const group = new THREE.Group();
    group.position.copy(normal).multiplyScalar(R * 1.003);
    group.quaternion.setFromUnitVectors(Z, normal); // bidang XY grup = bidang singgung permukaan
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: color.clone().multiplyScalar(hub ? 1.8 : 1.3), ...additive }));
    core.scale.setScalar(hub ? 0.05 : 0.032);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, ...additive }));
    halo.scale.setScalar(hub ? 0.13 : 0.11);
    const rings = Array.from({ length: hub ? 3 : 1 }, () => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, ...additive }));
      group.add(m);
      return m;
    });
    group.add(halo, core);
    globe.add(group);
    return {
      data: n, hub, normal, group, core, halo, rings,
      phase: i * 0.83, hover: 0, flash: 0, front: 1, sx: 0, sy: 0, links: 0,
    };
  });
  const nodeById = Object.fromEntries(nodes.map((s) => [s.data.id, s]));

  /* ---------- Jalur Bezier & partikel data ---------- */
  const arcGroup = new THREE.Group();
  globe.add(arcGroup);
  const tA = new THREE.Vector3(), tB = new THREE.Vector3();
  const arcs = CONNECTIONS.map((conn, i) => {
    const from = nodeById[conn.from], to = nodeById[conn.to];
    if (!from || !to) { console.warn('Koneksi globe tidak valid:', conn); return null; }
    from.links++; to.links++;
    const theta = from.normal.angleTo(to.normal);
    // Puncak lengkung naik sesuai panjang jalur; titik kontrol di 1/4 dan 3/4 busur permukaan
    const apex = R * (1.04 + 0.3 * (theta / Math.PI));
    const lift = (apex - 0.25 * R) / 0.75;
    const curve = new THREE.CubicBezierCurve3(
      from.normal.clone().multiplyScalar(R * 1.003),
      slerpUnit(from.normal, to.normal, 0.25, tA).clone().multiplyScalar(lift),
      slerpUnit(from.normal, to.normal, 0.75, tB).clone().multiplyScalar(lift),
      to.normal.clone().multiplyScalar(R * 1.003),
    );
    const pts = curve.getSpacedPoints(ARC_SEGMENTS);
    const flat = new Float32Array(pts.length * 3);
    const tAttr = new Float32Array(pts.length);
    pts.forEach((p, k) => { flat.set([p.x, p.y, p.z], k * 3); tAttr[k] = k / ARC_SEGMENTS; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(flat, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(tAttr, 1));
    const line = new THREE.Line(g, arcMaterial());
    arcGroup.add(line);
    const particleCount = conn.flow ? (theta > 1.2 ? 2 : 1) : 0;
    return {
      conn, from, to, flat, line, theta,
      duration: 2.4 + 2.2 * (theta / Math.PI),
      particles: Array.from({ length: particleCount }, (_, k) => ({ offset: k / particleCount, prevT: 0 })),
      period: 11 + i * 1.7, phase: rand() * 10,
      hl: 0, dim: 1, forced: 0,
    };
  }).filter(Boolean);

  const sparkCount = arcs.reduce((n, a) => n + a.particles.length, 0);
  const sparkPos = new Float32Array(Math.max(1, sparkCount) * 3);
  const sparkAlpha = new Float32Array(Math.max(1, sparkCount));
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sparkAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(Math.max(1, sparkCount)), 1));
  const sparks = new THREE.Points(sparkGeo, sparkMaterial(uTime, uScale, 0.034, COLORS.data, 0));
  sparks.frustumCulled = false; // posisinya berubah tiap frame
  arcGroup.add(sparks);

  const pointAt = (flat, t, out, offset) => {
    const f = clamp01(t) * ARC_SEGMENTS;
    const i = Math.min(ARC_SEGMENTS - 1, Math.floor(f)), k = f - i;
    for (let c = 0; c < 3; c++) out[offset + c] = flat[i * 3 + c] + (flat[(i + 1) * 3 + c] - flat[i * 3 + c]) * k;
  };

  /* ---------- UI: label, pil hover, toolbar, panel ---------- */
  const labelLayer = document.createElement('div');
  labelLayer.className = 'globe-labels';
  container.appendChild(labelLayer);
  const hubState = nodeById[HUB_ID];
  const hubLabel = document.createElement('div');
  hubLabel.className = 'globe-label hub';
  hubLabel.textContent = hubState ? hubState.data.name : '';
  labelLayer.appendChild(hubLabel);
  const pill = document.createElement('div');
  pill.className = 'globe-pill';
  pill.innerHTML = '<strong></strong><span></span>';
  labelLayer.appendChild(pill);

  const toolbar = document.createElement('div');
  toolbar.className = 'globe-toolbar';
  toolbar.innerHTML = `
    <button type="button" data-act="play" aria-label="Jeda atau putar animasi">Jeda</button>
    <button type="button" data-act="arcs" aria-label="Tampilkan jalur koneksi" aria-pressed="true" class="on">Jalur</button>
    <button type="button" data-act="reset" aria-label="Reset tampilan">Reset</button>`;
  container.appendChild(toolbar);

  const panel = document.createElement('div');
  panel.className = 'globe-panel';
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = `
    <button type="button" class="globe-panel-close" aria-label="Tutup">×</button>
    <p class="globe-panel-kicker"></p>
    <h4 class="globe-panel-title"></h4>
    <p class="globe-panel-desc"></p>
    <dl>
      <dt>Peran</dt><dd data-k="role"></dd>
      <dt>Lokasi</dt><dd data-k="place"></dd>
      <dt>Koordinat</dt><dd data-k="coords"></dd>
      <dt>Koneksi</dt><dd data-k="links"></dd>
    </dl>
    <p class="globe-panel-note">Ilustrasi konseptual, bukan lokasi server sebenarnya.</p>`;
  container.appendChild(panel);

  const touchFirst = window.matchMedia('(hover: none)').matches;
  const hint = document.createElement('div');
  hint.className = 'interaction-helper';
  hint.innerHTML = `<span>${touchFirst ? 'Geser untuk memutar · Ketuk titik untuk detail' : 'Seret untuk memutar · Klik titik untuk detail'}</span>`;
  container.appendChild(hint);
  let hintHidden = false;
  const hideHint = () => {
    if (hintHidden) return;
    hintHidden = true;
    hint.classList.add('fadeout');
    setTimeout(() => { hint.style.display = 'none'; }, 800);
  };

  /* ---------- State & interaksi ---------- */
  let time = 0;
  let paused = false;
  let hovered = null, selected = null;
  let lastInteraction = performance.now();
  let introT = reduceMotion ? 1 : 0, introStarted = false;
  // Transisi kamera: arah & jarak awal → tujuan
  const move = { active: false, t: 0, fromDir: new THREE.Vector3(), toDir: new THREE.Vector3(), fromDist: 0, toZoom: 1 };
  let zoom = 1; // pengali jarak terhadap homeDistance()

  const showPanel = (s) => {
    const n = s.data;
    panel.querySelector('.globe-panel-kicker').textContent = n.category;
    panel.querySelector('.globe-panel-title').textContent = n.name;
    panel.querySelector('.globe-panel-desc').textContent = n.description;
    const values = { role: n.role, place: n.place, coords: formatLatLon(n.lat, n.lon), links: `${s.links} jalur` };
    panel.querySelectorAll('dd').forEach((dd) => { dd.textContent = values[dd.dataset.k]; });
    panel.classList.add('open');
  };

  const flyTo = (dir, toZoom) => {
    move.fromDir.copy(camera.position).normalize();
    move.toDir.copy(dir).normalize();
    move.fromDist = camera.position.length();
    move.toZoom = toZoom;
    move.t = 0;
    move.active = true;
    if (reduceMotion) move.t = 1;
  };

  const select = (s) => {
    selected = s;
    controls.autoRotate = false;
    showPanel(s);
    // Di kontainer sempit panel menutupi bagian bawah: arahkan kamera sedikit ke selatan node
    // agar node tampil di sepertiga atas, tetap terlihat di atas panel
    const narrow = size.w < 640;
    flyTo(narrow ? latLonToVector3(Math.max(-60, s.data.lat - 22), s.data.lon, 1) : s.normal, FOCUS_ZOOM);
  };
  const deselect = () => {
    selected = null;
    panel.classList.remove('open');
    lastInteraction = performance.now();
  };
  const resetView = () => {
    deselect();
    flyTo(HOME_DIR, 1);
    lastInteraction = 0; // langsung boleh berputar lagi
  };

  toolbar.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'play') {
      paused = !paused;
      btn.textContent = paused ? 'Putar' : 'Jeda';
      if (paused) controls.autoRotate = false;
    }
    if (act === 'arcs') {
      arcGroup.visible = !arcGroup.visible;
      btn.classList.toggle('on', arcGroup.visible);
      btn.setAttribute('aria-pressed', String(arcGroup.visible));
    }
    if (act === 'reset') resetView();
  });
  panel.querySelector('.globe-panel-close').addEventListener('click', deselect);
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && selected) deselect(); });

  // Pemilihan node di ruang layar: murah dan lebih ramah sentuhan daripada raycast ke sprite kecil
  const pointer = { x: 0, y: 0, inside: false, down: false, sx: 0, sy: 0, moved: 0, type: 'mouse' };
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  };
  const pickAt = (x, y, radius) => {
    let best = null, bestD = Infinity;
    nodes.forEach((s) => {
      if (s.front < 0.4) return;
      const d = Math.hypot(s.sx - x, s.sy - y) - (s.hub ? 6 : 0);
      if (d < radius && d < bestD) { bestD = d; best = s; }
    });
    return best;
  };

  on(canvas, 'pointerdown', (e) => {
    toLocal(e);
    Object.assign(pointer, { down: true, sx: e.clientX, sy: e.clientY, moved: 0, type: e.pointerType });
    controls.autoRotate = false;
    move.active = false; // seret membatalkan transisi kamera
    lastInteraction = performance.now();
    hideHint();
  });
  on(canvas, 'pointermove', (e) => {
    toLocal(e);
    pointer.inside = true;
    pointer.type = e.pointerType;
    if (pointer.down) {
      pointer.moved = Math.max(pointer.moved, Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy));
      lastInteraction = performance.now();
    }
  });
  on(window, 'pointerup', (e) => {
    if (!pointer.down) return;
    pointer.down = false;
    lastInteraction = performance.now();
    if (pointer.moved >= 6 || e.target !== canvas) return;
    toLocal(e);
    const hit = pickAt(pointer.x, pointer.y, e.pointerType === 'mouse' ? 16 : 26);
    if (hit) select(hit);
    else if (selected) deselect(); // klik di luar node menutup panel
  });
  on(window, 'pointercancel', () => { pointer.down = false; });
  on(canvas, 'pointerleave', () => { pointer.inside = false; });
  on(window, 'scroll', () => { pointer.inside = false; }, { passive: true });

  /* ---------- Resize, visibilitas, konteks WebGL ---------- */
  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    size.w = w; size.h = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    uScale.value = (h * dpr) / (2 * tanHalfFov);
    if (introT >= 1 && !move.active) camera.position.setLength(homeDistance() * zoom);
  };
  onResize();
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  let visible = false, contextLost = false, running = false, rafId = 0;
  const clock = new THREE.Clock();
  const syncRunning = () => {
    const want = visible && !document.hidden && !contextLost;
    if (want && !running) {
      running = true;
      clock.getDelta(); // buang jeda selama tidak terlihat
      rafId = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };
  const io = new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) introStarted = true;
    syncRunning();
  }, { threshold: 0.15 });
  io.observe(container);
  on(document, 'visibilitychange', syncRunning);
  on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); contextLost = true; syncRunning(); });
  on(canvas, 'webglcontextrestored', () => { contextLost = false; syncRunning(); });

  /* ---------- Loop ---------- */
  const proj = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const q = new THREE.Quaternion(), qId = new THREE.Quaternion();
  const sparkTmp = [0, 0, 0];

  const placeLabel = (el, x, y, lift, opacity) => {
    el.style.transform = `translate(${x.toFixed(1)}px, ${(y - lift).toFixed(1)}px) translate(-50%, -100%)`;
    el.style.opacity = opacity.toFixed(2);
  };

  const update = (dt) => {
    if (!paused) time += dt;
    uTime.value = time;
    const now = performance.now();

    // Kamera: terbang masuk saat pertama terlihat, lalu transisi fokus
    if (introStarted && introT < 1) {
      introT = Math.min(1, introT + dt / 2.4);
      if (!move.active && !pointer.down) camera.position.setLength(homeDistance() * THREE.MathUtils.lerp(1.9, 1, easeOut(introT)));
    }
    if (move.active) {
      move.t = Math.min(1, move.t + dt / 1.4);
      const k = easeInOut(move.t);
      q.setFromUnitVectors(move.fromDir, move.toDir);
      camDir.copy(move.fromDir).applyQuaternion(qId.identity().slerp(q, k));
      zoom = THREE.MathUtils.lerp(move.fromDist / homeDistance(), move.toZoom, k);
      camera.position.copy(camDir).multiplyScalar(homeDistance() * zoom);
      if (move.t >= 1) { move.active = false; zoom = move.toZoom; }
    }
    if (!reduceMotion && !paused && !selected && !pointer.down && !move.active && now - lastInteraction > IDLE_RESUME_MS) {
      controls.autoRotate = true;
    }
    controls.update(dt); // dt → kecepatan putar otomatis tidak bergantung frame rate

    // Hover (mouse/pen saja; layar sentuh memakai ketuk)
    const prevHovered = hovered;
    hovered = pointer.inside && !pointer.down && pointer.type !== 'touch' ? pickAt(pointer.x, pointer.y, 16) : null;
    if (hovered !== prevHovered) canvas.style.cursor = hovered ? 'pointer' : '';
    const focus = hovered || selected;

    // Daratan muncul bertahap setelah dimuat
    if (landPoints) land.uniforms.uReveal.value = revealStart === -Infinity ? 1 : clamp01((time - revealStart) / 1.8);
    floaters.rotation.y = time * 0.015;

    // Node: menghadap kamera?, denyut, hover, kilatan saat data tiba
    nodes.forEach((s) => {
      camDir.copy(camera.position).sub(s.group.position).normalize();
      s.front = smooth01((s.normal.dot(camDir) + 0.05) / 0.3);
      s.hover = approach(s.hover, s === focus ? 1 : 0, 10, dt);
      s.flash *= Math.exp(-dt * 2.5);
      s.group.scale.setScalar(1 + (s.hub ? 0.15 : 0.4) * s.hover + 0.2 * s.flash);
      const breathe = 0.5 + 0.5 * Math.sin(time * 2 + s.phase);
      s.core.material.opacity = s.front * (0.8 + 0.2 * s.hover);
      s.halo.material.opacity = s.front * Math.min(1, (s.hub ? 0.4 : 0.25) + 0.15 * breathe + (s.hub ? 0.15 : 0.35) * s.hover + 0.5 * s.flash);
      s.rings.forEach((ring, k) => {
        const p = (time * (s.hub ? 0.38 : 0.45) + k / s.rings.length + s.phase) % 1;
        ring.scale.setScalar(s.hub ? 0.025 + p * 0.12 : 0.015 + p * 0.06);
        ring.material.opacity = Math.pow(1 - p, 1.6) * s.front * (s.hub ? 0.85 : 0.4 + 0.4 * s.hover);
      });
      proj.copy(s.group.position).project(camera);
      s.sx = (proj.x * 0.5 + 0.5) * size.w;
      s.sy = (-proj.y * 0.5 + 0.5) * size.h;
    });

    // Jalur: yang "sesekali" digambar → bertahan → memudar; yang terkait node fokus disorot
    let si = 0;
    arcs.forEach((arc) => {
      const connected = !!focus && (arc.from === focus || arc.to === focus);
      arc.forced = approach(arc.forced, connected ? 1 : 0, 5, dt);
      arc.hl = approach(arc.hl, connected ? 1 : 0, 8, dt);
      arc.dim = approach(arc.dim, focus && !connected ? 0.35 : 1, 6, dt);
      let draw = 1, alpha = 1;
      if (arc.conn.occasional) {
        const local = (time + arc.phase) % arc.period;
        draw = local > 7 ? 0 : smooth01(local / 1.4);
        alpha = local > 7 ? 0 : 1 - smooth01((local - 6) / 1);
      }
      draw = Math.max(draw, arc.forced);
      alpha = Math.max(alpha, arc.forced) * arc.dim;
      const u = arc.line.material.uniforms;
      u.uDraw.value = draw;
      u.uAlpha.value = alpha;
      u.uHighlight.value = arc.hl;
      const active = draw > 0.999 && alpha > 0.3;
      let head = -1;
      arc.particles.forEach((p, k) => {
        const t = (time / arc.duration + p.offset) % 1;
        if (active && t < p.prevT) arc.to.flash = 1; // paket data tiba
        p.prevT = t;
        pointAt(arc.flat, t, sparkTmp, 0);
        sparkPos[si * 3] = sparkTmp[0]; sparkPos[si * 3 + 1] = sparkTmp[1]; sparkPos[si * 3 + 2] = sparkTmp[2];
        sparkAlpha[si] = active ? alpha : 0;
        if (k === 0 && active) head = t;
        si++;
      });
      u.uHead.value = head;
    });
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.aAlpha.needsUpdate = true;

    // Label Jakarta + pil info node yang di-hover
    if (hubState) {
      placeLabel(hubLabel, hubState.sx, hubState.sy, 16 + hubState.hover * 4, smooth01((hubState.front - 0.3) / 0.4));
      hubLabel.classList.toggle('active', hubState === focus);
    }
    const pillNode = hovered && !hovered.hub ? hovered : null;
    if (pillNode) {
      if (pill.dataset.id !== pillNode.data.id) {
        pill.dataset.id = pillNode.data.id;
        pill.querySelector('strong').textContent = pillNode.data.name;
        pill.querySelector('span').textContent = `${pillNode.data.category} · ${pillNode.data.place}`;
      }
      placeLabel(pill, pillNode.sx, pillNode.sy, 16, 1);
    } else if (pill.style.opacity !== '0') {
      pill.style.opacity = '0';
    }
  };

  const render = () => { if (composer) composer.render(); else renderer.render(scene, camera); };
  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    update(Math.min(clock.getDelta(), 0.05));
    render();
  }

  /* ---------- Bersih-bersih ---------- */
  const dispose = () => {
    running = false;
    cancelAnimationFrame(rafId);
    events.abort();
    ro.disconnect();
    io.disconnect();
    controls.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    land.dispose();
    dotTex.dispose();
    glowTex.dispose();
    if (composer) composer.dispose();
    renderer.dispose();
    [canvas, labelLayer, toolbar, panel, hint].forEach((el) => el.remove());
  };

  return { dispose };
};
