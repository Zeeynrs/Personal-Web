import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null bila env belum diisi → website memakai isi dari src/data/site.js
export const supabase = url && key ? createClient(url, key) : null;

export const isAdminUser = (user) => user?.app_metadata?.role === 'admin';

// Bucket Storage untuk semua gambar (lihat supabase/migrations/0001_schema.sql)
export const BUCKET = 'portfolio';
