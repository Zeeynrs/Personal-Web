-- =====================================================================
-- Perketat hak akses tabel (lapisan pengaman di atas RLS). Jalankan SEKALI
-- setelah 0001_schema.sql: Supabase Dashboard → SQL Editor → tempel → Run.
-- Pengunjung (anon) hanya perlu membaca konten dan mengirim pesan kontak;
-- admin login sebagai authenticated dan tetap dibatasi oleh policy RLS.
-- =====================================================================

revoke insert, update, delete, truncate, trigger, references
  on public.profiles, public.skills, public.certificates, public.projects, public.cvs
  from anon;

revoke select, update, delete, truncate, trigger, references
  on public.contacts
  from anon;

revoke truncate, trigger, references
  on public.profiles, public.skills, public.certificates, public.projects, public.cvs, public.contacts
  from authenticated;
