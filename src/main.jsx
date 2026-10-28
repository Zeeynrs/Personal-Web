import './style.css';
import './modern.css';
import { initEffects } from './effects';
import { initTechGlobe } from './globe/techGlobe';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import SkillsSection from './components/SkillsSection';
import PortfolioSection from './components/PortfolioSection';
import AboutSection from './components/AboutSection';
import { createRandom } from './utils/seededRandom';
import { site } from './data/site';
import { BRAND_ICONS, LINE_ICONS } from './icons';
import { supabase } from './lib/supabase';
import { loadContent, preloadImages } from './lib/content';

gsap.registerPlugin(ScrollTrigger);

// Selalu mulai dari atas saat halaman dimuat ulang / dibuka kembali
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
window.addEventListener('load', () => window.scrollTo(0, 0));
window.addEventListener('pageshow', (e) => { if (e.persisted) window.scrollTo(0, 0); });

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============ ISI HALAMAN DARI src/data/site.js ============
const pick = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), site);

const iconLink = (className, label, href, svgInner, key) => {
  const a = document.createElement('a');
  a.className = className;
  a.setAttribute('aria-label', label);
  a.dataset.label = label;
  a.title = label;

  if (key === 'discord' && !/^https?:/.test(href)) {
    a.href = '#';
    a.title = `Discord: ${href} (Klik untuk menyalin)`;
    a.dataset.label = `Discord: ${href}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(href);
        const originalLabel = a.dataset.label;
        const originalTitle = a.title;
        a.dataset.label = 'Tersalin!';
        a.title = 'Tersalin!';
        setTimeout(() => {
          a.dataset.label = originalLabel;
          a.title = originalTitle;
        }, 2000);
      }
    });
  } else {
    a.href = href;
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  }

  a.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${svgInner}</svg>`;
  return a;
};

const applySiteContent = () => {
  document.querySelectorAll('[data-site]').forEach((el) => { el.textContent = pick(el.dataset.site) ?? ''; });
  document.title = `${site.brand} | ${site.roles[0] || 'Portfolio'}`;

  const c = site.contact;
  const s = c.socials;
  const links = [
    c.email && ['Email', `mailto:${c.email}`, 'email'],
    c.whatsapp && ['WhatsApp', `https://wa.me/${c.whatsapp}`, 'whatsapp'],
    s.instagram && ['Instagram', s.instagram, 'instagram'],
    s.github && ['GitHub', s.github, 'github'],
    s.linkedin && ['LinkedIn', s.linkedin, 'linkedin'],
    s.youtube && ['YouTube', s.youtube, 'youtube'],
    s.discord && ['Discord', /^\d+$/.test(s.discord) ? `https://discord.com/users/${s.discord}` : s.discord, 'discord'],
  ].filter(Boolean);

  const ccIcons = document.getElementById('cc-icons');
  links.forEach(([label, href, key]) => ccIcons.appendChild(iconLink('cc-icon', label, href, BRAND_ICONS[key], key)));

  const footSocials = document.getElementById('foot-socials');
  links.filter(([, , key]) => key !== 'email')
    .forEach(([label, href, key]) => footSocials.appendChild(iconLink('foot-social', label, href, BRAND_ICONS[key], key)));

  const footContacts = document.getElementById('foot-contacts');
  const lineRow = (tag, icon, text, href) => {
    const el = document.createElement(tag);
    el.className = 'foot-contact';
    if (href) el.href = href;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE_ICONS[icon]}</svg>`;
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    footContacts.appendChild(el);
  };
  if (c.email) lineRow('a', 'email', c.email, `mailto:${c.email}`);
  if (c.phone) lineRow('a', 'phone', c.phone, `tel:${c.phone.replace(/[^\d+]/g, '')}`);
  if (c.location) lineRow('span', 'location', c.location);
};

// ============ LATAR BINTANG + BENTUK 3D ============
const initBackgroundScene = () => {
  const rand = createRandom(20240601); // benih tetap → latar selalu sama
  const canvas = document.querySelector('#canvas-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  canvas.appendChild(renderer.domElement);

  const particlesCount = window.innerWidth < 768 ? 1000 : 2000;
  const posArray = new Float32Array(particlesCount * 3);
  const colorsArray = new Float32Array(particlesCount * 3);
  // Putih → abu: monokrom di atas latar gelap
  const colorPalette = [
    new THREE.Color(0xf5f5f5),
    new THREE.Color(0xc4c4c4),
    new THREE.Color(0x8a8a8a),
    new THREE.Color(0x5c5c5c),
  ];

  for (let i = 0; i < particlesCount; i++) {
    posArray[i * 3] = (rand() - 0.5) * 10;
    posArray[i * 3 + 1] = (rand() - 0.5) * 10;
    posArray[i * 3 + 2] = (rand() - 0.5) * 10;
    const color = colorPalette[Math.floor(rand() * colorPalette.length)];
    colorsArray[i * 3] = color.r;
    colorsArray[i * 3 + 1] = color.g;
    colorsArray[i * 3 + 2] = color.b;
  }

  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
  const particlesMesh = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({
    size: 0.015, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true,
  }));
  scene.add(particlesMesh);

  const shapes = [];
  const shapeGroup = new THREE.Group();
  scene.add(shapeGroup);
  const geometries = [
    new THREE.TetrahedronGeometry(0.3, 0),
    new THREE.OctahedronGeometry(0.3, 0),
    new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.TorusGeometry(0.3, 0.1, 16, 32),
  ];
  const shapeCount = window.innerWidth < 768 ? 3 : 6;
  for (let i = 0; i < shapeCount; i++) {
    const mesh = new THREE.Mesh(
      geometries[Math.floor(rand() * geometries.length)],
      new THREE.MeshStandardMaterial({
        color: colorPalette[Math.floor(rand() * colorPalette.length)].getHex(),
        wireframe: rand() > 0.5,
        transparent: true,
        opacity: 0.35,
        metalness: 0.3,
        roughness: 0.8,
      })
    );
    mesh.position.set((rand() - 0.5) * 8, (rand() - 0.5) * 8, (rand() - 0.5) * 8);
    mesh.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    mesh.userData = {
      rotationSpeed: { x: (rand() - 0.5) * 0.01, y: (rand() - 0.5) * 0.01, z: (rand() - 0.5) * 0.01 },
      floatDistance: 0.2 + rand() * 0.3,
      initialY: mesh.position.y,
      floatOffset: rand() * Math.PI * 2,
    };
    shapes.push(mesh);
    shapeGroup.add(mesh);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(2, 3, 4);
  scene.add(pointLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(-5, 2, 2);
  scene.add(directionalLight);
  camera.position.z = 4;

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let time = 0;
  const animate = () => {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    time += 0.01;
    particlesMesh.rotation.y += 0.0003 + mouseX * 0.0003;
    particlesMesh.rotation.x += mouseY * 0.0003;
    shapes.forEach((shape) => {
      const u = shape.userData;
      shape.rotation.x += u.rotationSpeed.x;
      shape.rotation.y += u.rotationSpeed.y;
      shape.rotation.z += u.rotationSpeed.z;
      shape.position.y = u.initialY + Math.sin(time + u.floatOffset) * u.floatDistance;
    });
    shapeGroup.rotation.y = Math.sin(time * 0.1) * 0.1;
    renderer.render(scene, camera);
  };
  animate();
};

// ============ ANIMASI SCROLL ============
const initScrollAnimations = () => {
  // Animasi hero dijalankan oleh playHeroIntro() setelah preloader selesai
  gsap.to('.model-title', {
    scrollTrigger: { trigger: '.model-title', start: 'top 80%' },
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power2.out',
    onComplete: () => gsap.to('#indonesia-time', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }),
  });
  gsap.to('#model-container', {
    scrollTrigger: { trigger: '#model-container', start: 'top 80%' },
    opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out',
  });
  gsap.to('.model-description', {
    scrollTrigger: { trigger: '.model-description', start: 'top 90%' },
    opacity: 1, y: 0, duration: 1, ease: 'power1.out',
  });

  gsap.to('.contact-title', {
    scrollTrigger: { trigger: '.contact-title', start: 'top 80%' },
    opacity: 1, y: 0, duration: 1, ease: 'power2.out',
  });
  gsap.to('.contact-form', {
    scrollTrigger: { trigger: '.contact-form', start: 'top 80%' },
    opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power2.out',
  });

  // Parallax halus antar section (desktop saja)
  if (window.innerWidth > 768) {
    document.querySelectorAll('section').forEach((section) => {
      gsap.to(section, {
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
        y: -10,
        ease: 'none',
      });
    });
  }
};

// Garis bawah judul section muncul saat terlihat
const initAnimatedUnderlines = () => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      setTimeout(() => entry.target.classList.add('active'), 300);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.animated-underline:not(.active)').forEach((el) => io.observe(el));
};

// ============ INTRO: preloader + animasi hero ============
const splitHeroTitle = () => {
  const el = document.querySelector('#hero-title > span');
  if (!el || el.dataset.split) return [];
  const text = el.textContent;
  el.dataset.split = '1';
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const chars = [];
  [...text].forEach((ch) => {
    if (ch === ' ') {
      const sp = document.createElement('span');
      sp.className = 'hero-char-space';
      el.appendChild(sp);
      return;
    }
    const mask = document.createElement('span');
    mask.className = 'hero-char-mask';
    mask.setAttribute('aria-hidden', 'true');
    const c = document.createElement('span');
    c.className = 'hero-char';
    c.textContent = ch;
    mask.appendChild(c);
    el.appendChild(mask);
    chars.push(c);
  });
  return chars;
};

// Jumlah huruf `brand` di awal judul hero (0 = judul tidak diawali brand → tanpa animasi terbang)
const brandCharCount = () => {
  const brand = site.brand.trim();
  if (!brand || /\s/.test(brand) || !site.heroTitle.startsWith(brand)) return 0;
  return [...brand].length;
};

const playHeroIntro = ({ delay = 0, from = null, bgEl = null, onDone = null } = {}) => {
  const root = document.documentElement;
  const chars = splitHeroTitle();
  const navbar = document.getElementById('main-navbar');
  const q = (s) => document.querySelector(s);
  const targets = ['.hero-badge', '#hero-subtitle', '#hero-button', '.btn-ghost', '#scroll-indicator'].map(q).filter(Boolean);

  // brandChars = huruf brand di judul; sisanya muncul satu per satu
  const n = brandCharCount();
  const brandChars = chars.slice(0, n);
  const restChars = from && n ? chars.slice(n) : chars;

  // Ukur posisi brand di judul SEBELUM ada transformasi apa pun
  let fly = null;
  if (from && n) {
    const rs = brandChars.map((c) => c.getBoundingClientRect());
    const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
    const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
    const fr = from.getBoundingClientRect();
    fly = {
      dx: (left + right) / 2 - (fr.left + fr.width / 2),
      dy: (top + bottom) / 2 - (fr.top + fr.height / 2),
      s: (right - left) / fr.width,
    };
  }

  // Keadaan awal lewat inline style, baru kelas .intro dilepas (tanpa kedip)
  gsap.set(targets, { opacity: 0, y: 28 });
  gsap.set(restChars, { yPercent: 118, rotate: 7, transformOrigin: '0% 100%' });
  if (fly) gsap.set(brandChars, { opacity: 0 }); // brand di judul hanya ditukar saat kata terbang mendarat
  gsap.set('#hero-title', { opacity: 1 });
  if (!fly) root.classList.remove('intro');

  const tl = gsap.timeline({ delay, defaults: { ease: 'power4.out' } });
  let t = 0;
  if (fly) {
    gsap.set(from, { filter: 'none' });
    const FLIGHT = 1.3;
    const land = () => {
      gsap.set(brandChars, { opacity: 1, clearProps: 'transform' });
      gsap.set(from, { opacity: 0 });
      root.classList.remove('intro');
    };
    tl.add(gsap.to(from, { x: fly.dx, y: fly.dy, scale: fly.s, duration: FLIGHT, ease: 'power3.inOut', onComplete: land }), 0);
    if (bgEl) tl.to(bgEl, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 0.2);
    t = FLIGHT;
  } else if (from) {
    // judul tidak diawali brand: brand intro cukup memudar
    tl.to(from, { opacity: 0, duration: 0.5 }, 0);
    if (bgEl) tl.to(bgEl, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 0.1);
  }
  tl.to('.hero-badge', { opacity: 1, y: 0, duration: 0.9, clearProps: 'transform,opacity' }, t + (fly ? 0.1 : 0))
    .to(restChars, { yPercent: 0, rotate: 0, duration: 1.1, stagger: fly ? 0.09 : 0.055, clearProps: 'transform' }, t + 0.05)
    .to('#hero-subtitle', { opacity: 1, y: 0, duration: 1, clearProps: 'transform' }, t + 0.55)
    .to(['#hero-button', '.btn-ghost'], { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'transform' }, t + 0.8)
    .to('#scroll-indicator', { opacity: 1, y: 0, duration: 1, ease: 'power2.out', clearProps: 'transform' }, t + 1.4)
    .add(() => { if (navbar) navbar.classList.remove('nav-hidden'); }, fly ? t + 0.2 : 0.55)
    .add(() => { gsap.set('#hero-title', { clearProps: 'opacity' }); if (onDone) onDone(); }, '>');
  return tl;
};

// Resolve saat window load + konten (Supabase) siap, dengan batas waktu agar tidak menggantung
const whenPageReady = (contentReady) => Promise.race([
  Promise.all([
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((r) => window.addEventListener('load', r, { once: true })),
    contentReady,
  ]),
  new Promise((r) => setTimeout(r, 10000)),
]);

const initPreloader = (contentReady) => {
  const preloader = document.getElementById('preloader');
  const root = document.documentElement;
  const fullIntro = root.classList.contains('intro');

  // Mode cepat: kunjungan berikutnya di sesi yang sama, atau pengguna meminta gerak dikurangi
  if (!fullIntro) {
    root.classList.remove('intro', 'intro-lock');
    let ready = false;
    setTimeout(() => { if (!ready) preloader.classList.add('waiting'); }, 400);
    whenPageReady(contentReady).then(() => {
      ready = true;
      setTimeout(() => {
        preloader.classList.remove('waiting');
        preloader.classList.add('fade-out');
        playHeroIntro({ delay: 0.1 });
      }, 300);
    });
    return;
  }

  try { sessionStorage.setItem('introSeen', '1'); } catch { /* abaikan */ }

  const bgEl = document.getElementById('pl-bg');
  const brand = document.getElementById('pl-brand');
  const words = [...preloader.querySelectorAll('.pl-word')];

  // Brand dipecah per huruf agar bisa muncul satu per satu
  const letters = [...site.brand].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch;
    brand.appendChild(s);
    return s;
  });

  const BLUR_OUT = { opacity: 0, filter: 'blur(14px)' };
  gsap.set([...words, brand], { xPercent: -50, yPercent: -50 });
  gsap.set([...words, brand], BLUR_OUT);

  const finish = () => { preloader.remove(); root.classList.remove('intro-lock'); };
  const reveal = () => {
    preloader.classList.remove('waiting');
    preloader.classList.add('flying');
    playHeroIntro({ delay: 0, from: brand, bgEl, onDone: finish });
  };

  // Urutan: "Hello World" → "Welcome to" → huruf brand → brand besar → terbang ke judul hero
  const tl = gsap.timeline({ paused: true, onComplete: reveal });
  words.forEach((w) => {
    tl.fromTo(w, { ...BLUR_OUT, y: 18 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.65, ease: 'power3.out' })
      .to(w, { ...BLUR_OUT, y: -14, duration: 0.45, ease: 'power2.in' }, '+=0.6');
  });
  // Ukuran besar menyesuaikan panjang nama agar tetap muat di layar
  const bigSize = `${Math.min((window.innerWidth * 0.9) / Math.max(letters.length * 0.62, 1), window.innerWidth * 0.2, 280)}px`;
  tl.set(brand, { opacity: 1, filter: 'blur(0px)' })
    .fromTo(letters, { opacity: 0, filter: 'blur(10px)', y: 14 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.55, stagger: 0.14, ease: 'power3.out' })
    .to(brand, { letterSpacing: '-0.03em', textIndent: '0em', fontSize: bigSize, duration: 1.2, ease: 'power4.inOut' }, '+=0.35')
    .to(letters, { color: '#ffffff', duration: 0.6, stagger: 0.05 }, '<0.4')
    .to({}, { duration: 0.5 });

  let started = false;
  setTimeout(() => { if (!started) preloader.classList.add('waiting'); }, 300);
  whenPageReady(contentReady).then(() => {
    started = true;
    preloader.classList.remove('waiting');
    setTimeout(() => tl.play(), 450);
  });
};

// ============ TEKS BERGANTI DI HERO ============
const initChangingText = () => {
  const el = document.getElementById('changing-text');
  const texts = site.roles;
  if (!el || !texts.length) return;
  let i = 0;
  el.textContent = texts[0];
  if (texts.length < 2) return;
  setInterval(() => {
    gsap.to(el, {
      opacity: 0,
      y: -20,
      duration: 0.5,
      onComplete: () => {
        i = (i + 1) % texts.length;
        el.textContent = texts[i];
        gsap.to(el, { opacity: 1, y: 0, duration: 0.5 });
      },
    });
  }, 3000);
};

// ============ EFEK MENGETIK DI FOOTER ============
const initTechStackAnimation = () => {
  const el = document.getElementById('tech-stack-text');
  const techs = site.footer.techStack;
  if (!el || !techs.length) return;
  let idx = 0;
  const run = () => {
    const word = techs[idx];
    let i = 0;
    el.textContent = '';
    const type = () => {
      if (i < word.length) { el.textContent += word.charAt(i++); setTimeout(type, 150); }
      else setTimeout(erase, 2000);
    };
    const erase = () => {
      if (el.textContent.length) { el.textContent = el.textContent.slice(0, -1); setTimeout(erase, 75); }
      else { idx = (idx + 1) % techs.length; setTimeout(run, 500); }
    };
    type();
  };
  run();
};

// ============ JAM WIB REAL-TIME ============
const initIndonesiaTime = () => {
  const $ = (id) => document.getElementById(id);
  const els = { day: $('day-name'), date: $('date-num'), month: $('month-name'), year: $('year-num'), time: $('time-display') };
  if (Object.values(els).some((e) => !e)) return;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const pad = (v) => String(v).padStart(2, '0');
  const update = () => {
    const now = new Date();
    const wib = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 7 * 3600000);
    els.day.textContent = days[wib.getDay()];
    els.date.textContent = wib.getDate();
    els.month.textContent = months[wib.getMonth()];
    els.year.textContent = wib.getFullYear();
    els.time.textContent = `${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())} WIB`;
  };
  update();
  setInterval(update, 1000);
};

// ============ MODAL CV ============
const initCVModal = (cvs) => {
  const modal = document.getElementById('cv-modal');
  const content = document.getElementById('cv-modal-content');
  const closeBtn = document.getElementById('close-cv-modal');
  const list = document.getElementById('cv-modal-list');
  if (!modal || !content || !closeBtn || !list) return;

  const COLORS = ['btn-ink', 'bg-white/5 hover:bg-white/10 text-ink border border-white/10'];
  const ICON = 'M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z';
  cvs.forEach((cv, i) => {
    const a = document.createElement('a');
    a.href = cv.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = `${COLORS[i % COLORS.length]} py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-center`;
    a.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${ICON}" /></svg>`;
    const label = document.createElement('span');
    label.className = 'font-medium';
    label.textContent = cv.title;
    a.appendChild(label);
    list.appendChild(a);
  });

  const open = () => {
    modal.classList.remove('hidden');
    gsap.to(content, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    gsap.to(content, {
      scale: 0.95,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => { modal.classList.add('hidden'); document.body.style.overflow = ''; },
    });
  };

  window.openCVModal = open;
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
};

// ============ FORMULIR KONTAK ============
// Pesan disimpan ke Supabase; tanpa Supabase dikirim ke VITE_CONTACT_ENDPOINT (mis. Formspree), atau lewat mailto.
const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT;

const initContactForm = () => {
  const form = document.getElementById('mail-form');
  if (!form) return;
  const nameEl = document.getElementById('mail-name');
  const emailEl = document.getElementById('mail-input');
  const msgEl = document.getElementById('mail-message');
  const count = document.getElementById('mail-count');
  const btn = document.getElementById('mail-btn');
  const status = document.getElementById('mail-status');
  const DEFAULT = status.textContent;
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  let lastSent = 0;
  const say = (msg, kind) => { status.textContent = msg; status.className = 'mail-status' + (kind ? ' ' + kind : ''); };

  [nameEl, emailEl, msgEl].forEach((el) => el.addEventListener('input', () => {
    el.classList.remove('bad');
    if (status.className.includes('err')) say(DEFAULT);
  }));
  msgEl.addEventListener('input', () => { count.textContent = `${msgEl.value.length}/1000`; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements.website.value) return; // honeypot: bot mengisi kolom tersembunyi
    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const message = msgEl.value.trim();
    const errors = [];
    if (!name || name.length > 100) errors.push([nameEl, 'Nama wajib diisi.']);
    if (!EMAIL_RE.test(email) || email.length > 254) errors.push([emailEl, 'Masukkan alamat email yang valid.']);
    if (!message || message.length > 1000) errors.push([msgEl, 'Pesan wajib diisi (maksimal 1000 karakter).']);
    if (errors.length) {
      errors.forEach(([el]) => el.classList.add('bad'));
      errors[0][0].focus();
      say(errors[0][1], 'err');
      return;
    }

    // Tanpa Supabase maupun endpoint: buka aplikasi email pengunjung
    if (!supabase && !CONTACT_ENDPOINT) {
      const subject = encodeURIComponent(`Pesan dari ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
      say('Membuka aplikasi email Anda…', 'ok');
      return;
    }

    if (Date.now() - lastSent < 15000) { say('Tunggu sebentar sebelum mengirim lagi.', 'err'); return; }
    btn.disabled = true;
    say('Mengirim…');
    try {
      if (supabase) {
        // Pesan masuk ke tabel `contacts`, dibaca di /admin → Pesan
        const { error } = await supabase.from('contacts').insert({ name, email, message });
        if (error) throw error;
      } else {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      lastSent = Date.now();
      form.reset();
      count.textContent = '0/1000';
      say('Terima kasih! Pesan Anda terkirim, saya akan membalas lewat email.', 'ok');
    } catch (err) {
      console.error(err);
      say('Gagal mengirim. Coba lagi nanti.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
};

// ============ NAVBAR ============
const initNavbar = () => {
  const navbar = document.getElementById('main-navbar');
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!navbar || !burger || !sidebar || !overlay) return;

  // Sembunyi saat scroll ke bawah, muncul lagi saat scroll ke atas
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 30);
    if (y < 80 || y < lastY) navbar.classList.remove('nav-hidden');
    else if (y > lastY + 4 && !sidebar.classList.contains('open')) navbar.classList.add('nav-hidden');
    lastY = y;
  }, { passive: true });

  const openSidebar = () => {
    burger.classList.add('open');
    sidebar.classList.add('open');
    overlay.style.display = 'block';
    setTimeout(() => overlay.classList.add('open'), 10);
    document.body.style.overflow = 'hidden';
  };
  const closeSidebar = () => {
    burger.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
  };
  burger.addEventListener('click', () => (sidebar.classList.contains('open') ? closeSidebar() : openSidebar()));
  overlay.addEventListener('click', closeSidebar);
  document.querySelectorAll('.sidebar-link, .nav-links a').forEach((link) => link.addEventListener('click', closeSidebar));

  // Tandai menu aktif sesuai section yang sedang terlihat
  const navLinks = document.querySelectorAll('[data-section]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.dataset.section === e.target.id));
    });
  }, { threshold: 0.35 });
  ['about', 'skills', 'portfolio', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });

  document.getElementById('hero-button')?.addEventListener('click', () => {
    document.getElementById('about').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' });
  });
};

const mount = (id, Component, content) => {
  const el = document.getElementById(id);
  if (el) ReactDOM.createRoot(el).render(<React.StrictMode><Component content={content} /></React.StrictMode>);
};

window.addEventListener('DOMContentLoaded', () => {
  // Konten dimuat dari Supabase (atau site.js); preloader menunggu konten + gambar utamanya
  const contentLoaded = loadContent();
  const contentReady = contentLoaded.then((c) => preloadImages([
    c.about.image,
    ...c.projects.slice(0, 3).map((p) => p.image),
    ...c.certificates.slice(0, 3).map((x) => x.image),
  ]));

  applySiteContent();
  try { initBackgroundScene(); } catch (err) { console.error('Latar WebGL gagal dimuat:', err); }
  // Globe 3D tidak boleh menghentikan inisialisasi bagian halaman lainnya bila gagal
  try { initTechGlobe(document.getElementById('model-container')); } catch (err) { console.error('Globe 3D gagal dimuat:', err); }
  initScrollAnimations();
  initPreloader(contentReady);
  initNavbar();
  initEffects();
  initContactForm();
  document.getElementById('foot-year').textContent = new Date().getFullYear();
  initChangingText();
  initTechStackAnimation();
  initIndonesiaTime();

  contentLoaded.then((content) => {
    initCVModal(content.cvs);
    mount('about-root', AboutSection, content);
    mount('skills-root', SkillsSection, content);
    mount('portfolio-root', PortfolioSection, content);

    // Komponen React baru ada setelah render; tunggu sebentar sebelum memasang observer
    requestAnimationFrame(() => setTimeout(() => {
      initAnimatedUnderlines();
      ScrollTrigger.refresh();
    }, 0));
  });
});
