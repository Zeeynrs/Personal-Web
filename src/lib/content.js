import { supabase } from './supabase';
import { site } from '../data/site';

// Isi bawaan dari src/data/site.js, dipakai bila Supabase belum dikonfigurasi atau gagal dimuat
const fallback = () => ({
  about: site.about,
  skills: site.skills,
  certificates: site.certificates,
  projects: site.projects,
  cvs: site.cvs,
});

const ordered = (table) => supabase.from(table).select('*').order('position', { nullsFirst: false }).order('created_at');

// Bentuk baris database disamakan dengan bentuk data di site.js
export const loadContent = async () => {
  if (!supabase) return fallback();
  try {
    const [profile, skills, certificates, projects, cvs] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', 1).maybeSingle(),
      ordered('skills'),
      ordered('certificates'),
      ordered('projects'),
      ordered('cvs'),
    ]);
    const failed = [profile, skills, certificates, projects, cvs].find((r) => r.error);
    if (failed) throw failed.error;
    return {
      about: {
        description: profile.data?.description ?? site.about.description,
        image: profile.data?.image_path || site.about.image,
      },
      skills: skills.data.map((r) => ({ id: r.id, name: r.name, image: r.image_path })),
      certificates: certificates.data.map((r) => ({ id: r.id, title: r.title, image: r.image_path })),
      projects: projects.data.map((r) => ({
        id: r.id, title: r.title, description: r.description, image: r.image_path, link: r.link, tags: r.tags,
      })),
      cvs: cvs.data.map((r) => ({ id: r.id, title: r.title, url: r.url })),
    };
  } catch (err) {
    console.error('Gagal memuat konten dari Supabase, memakai site.js:', err);
    return fallback();
  }
};

// Pra-muat gambar; selesai saat semua termuat/gagal, atau setelah batas waktu
export const preloadImages = (urls, maxMs = 6000) => Promise.race([
  Promise.all(urls.filter(Boolean).map((u) => new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = u;
  }))),
  new Promise((resolve) => setTimeout(resolve, maxMs)),
]);
