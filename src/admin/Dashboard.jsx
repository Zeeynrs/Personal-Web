import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase, BUCKET } from '../lib/supabase';
import { site } from '../data/site';

const TABS = ['projects', 'certificates', 'skills', 'profile', 'cvs', 'messages'];
const TABLE = { projects: 'projects', certificates: 'certificates', skills: 'skills', profile: 'profiles', cvs: 'cvs', messages: 'contacts' };
const LABEL = { projects: 'Proyek', certificates: 'Sertifikat', skills: 'Tech Stack', profile: 'Tentang Saya', cvs: 'CV', messages: 'Pesan' };
// Kolom yang boleh dikirim ke tabel
const COLUMNS = {
  projects: ['title', 'description', 'tags', 'link', 'image_path'],
  certificates: ['title', 'image_path'],
  skills: ['name', 'image_path'],
  profile: ['description', 'image_path'],
  cvs: ['title', 'url'],
};
const REORDERABLE = ['projects', 'certificates', 'skills', 'cvs'];
const WITH_IMAGE = ['projects', 'certificates', 'skills', 'profile'];
const MAX_IMAGE_MB = 5;
const ICON = {
  projects: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  certificates: 'M12 15a6 6 0 100-12 6 6 0 000 12zm-3 .5L7.5 21l4.5-2.5 4.5 2.5L15 15.5',
  skills: 'M8 9l-4 3 4 3m8-6l4 3-4 3m-3-9l-2 12',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  cvs: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  messages: 'M4 6h16v12H4zM4 7l8 6 8-6',
};

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const inputCls = 'w-full bg-black-200 px-4 py-3 rounded-xl border border-white/5 focus:border-indigo-500/60 focus:outline-none transition-colors';
const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-secondary mb-1 text-sm">{label}</span>
    {children}
    {hint && <span className="block text-xs text-secondary mt-1">{hint}</span>}
  </label>
);

// ---------- Storage ----------
// Nama objek dari URL publik Storage; null bila bukan file di bucket kita (mis. URL devicon / aset /images)
const storageName = (url) => {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url ? url.indexOf(marker) : -1;
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
};
const removeFile = async (url) => {
  const name = storageName(url);
  if (name) await supabase.storage.from(BUCKET).remove([name]);
};
// crypto.randomUUID hanya ada di konteks aman (HTTPS/localhost); getRandomValues tersedia di HTTP biasa juga,
// mis. saat admin dibuka dari HP lewat http://192.168.x.x:5173
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

const uploadFile = async (file, folder) => {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin';
  const name = `${folder}/${randomId()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(name, file, { cacheControl: '31536000', contentType: file.type || undefined });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
};

// ---------- Toast & dialog konfirmasi ----------
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((kind, text) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5000 : 2200);
  }, []);
  const view = (
    <div className="fixed top-4 right-4 z-[70] space-y-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`px-4 py-3 rounded-xl text-sm shadow-lg border max-w-xs ${t.kind === 'error' ? 'bg-red-950 border-red-500/50 text-red-200' : 'bg-emerald-950 border-emerald-500/40 text-emerald-200'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
  return [push, view];
};

const ConfirmDialog = ({ title, text, confirmLabel, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="bg-tertiary w-full max-w-sm rounded-2xl p-6 border border-white/10" role="alertdialog" aria-modal="true">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-secondary mt-2 text-sm break-words">{text}</p>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onCancel} className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl">Batal</button>
        <button type="button" onClick={onConfirm} autoFocus className="flex-1 bg-red-600 hover:bg-red-500 py-2.5 rounded-xl font-semibold">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

// ---------- Pemilih gambar (klik / seret file) ----------
const DropZone = ({ file, currentUrl, onFile, toast, light }) => {
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('error', 'File harus berupa gambar');
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) return toast('error', `Ukuran maksimal ${MAX_IMAGE_MB} MB`);
    onFile(f);
  };

  const shown = preview || currentUrl;
  return (
    <div>
      <span className="block text-secondary mb-1 text-sm">Gambar</span>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files?.[0]); }}
        className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all text-center overflow-hidden ${over ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-500/50 bg-black-200'}`}
      >
        {shown ? (
          <div className={`relative h-40 ${light ? 'bg-white/90' : ''}`}>
            <img src={shown} alt="" className={`w-full h-full object-contain ${light ? 'p-6' : ''}`} />
            <div className="absolute inset-0 bg-black/55 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-sm">Klik atau seret untuk mengganti</div>
          </div>
        ) : (
          <div className="py-8 px-4 text-secondary">
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-indigo-400">
              <Icon d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" size={20} />
            </div>
            <p className="text-sm"><span className="text-indigo-400 font-medium">Klik untuk pilih</span> atau seret file ke sini</p>
            <p className="text-xs mt-1 opacity-70">PNG, JPG, WEBP, SVG · maks {MAX_IMAGE_MB} MB</p>
          </div>
        )}
        <input ref={inputRef} type="file" hidden accept="image/*" onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {file && (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-secondary bg-white/5 rounded-lg px-3 py-2">
          <span className="truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          <button type="button" onClick={() => onFile(null)} className="text-red-400 hover:text-red-300 shrink-0">Hapus</button>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [data, setData] = useState([]);
  const [dataTab, setDataTab] = useState(null); // tab pemilik `data` (cegah render data tab lama)
  const tabRef = useRef('projects');
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [toast, toastView] = useToast();

  const reorderable = REORDERABLE.includes(activeTab);
  const set = (k) => (e) => setFormData((f) => ({ ...f, [k]: e.target.value }));

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    try {
      let q = supabase.from(TABLE[tab]).select('*');
      if (tab === 'messages') q = q.order('created_at', { ascending: false });
      else if (REORDERABLE.includes(tab)) q = q.order('position', { nullsFirst: false }).order('created_at');
      const { data: rows, error } = await q;
      if (error) throw error;
      if (tabRef.current !== tab) return; // respons tab lama, abaikan
      setData(rows || []);
      setDataTab(tab);
      setCounts((c) => ({ ...c, [tab]: (rows || []).length }));
    } catch (err) {
      console.error('Fetch error:', err);
      toast('error', `Gagal memuat data: ${err.message}`);
      if (tabRef.current === tab) { setData([]); setDataTab(tab); }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    tabRef.current = activeTab;
    fetchData(activeTab);
    setQuery('');
    setMenuOpen(false);
  }, [activeTab, fetchData]);

  // Jumlah data per tab untuk lencana di sidebar
  useEffect(() => {
    Promise.all(TABS.map(async (t) => {
      const { count } = await supabase.from(TABLE[t]).select('*', { count: 'exact', head: true });
      return [t, count ?? 0];
    })).then((entries) => setCounts(Object.fromEntries(entries)));
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditItem(null);
    setFormData({});
    setSelectedFile(null);
  }, []);

  // Esc menutup modal
  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, saving, closeModal]);

  const openCreate = () => { setEditItem(null); setFormData({}); setSelectedFile(null); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setFormData(item); setSelectedFile(null); setModalOpen(true); };

  const askLogout = () => setConfirm({
    title: 'Logout?', text: 'Yakin ingin mengakhiri sesi?', confirmLabel: 'Logout',
    action: () => supabase.auth.signOut(),
  });

  const askDelete = (item) => setConfirm({
    title: 'Hapus data?',
    text: `"${item.name || item.title || item.email || 'item ini'}" akan dihapus permanen.`,
    confirmLabel: 'Ya, hapus',
    action: async () => {
      try {
        const { error } = await supabase.from(TABLE[activeTab]).delete().eq('id', item.id);
        if (error) throw error;
        // File Storage dihapus setelah baris terhapus agar tidak ada baris yang menunjuk file hilang
        await removeFile(item.image_path);
        toast('success', 'Data dihapus');
        fetchData(activeTab);
      } catch (err) {
        console.error('Delete error:', err);
        toast('error', err.message || 'Gagal menghapus');
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const table = TABLE[activeTab];
    let uploaded = null;
    setSaving(true);

    try {
      const payload = {};
      COLUMNS[activeTab].forEach((k) => { if (formData[k] !== undefined) payload[k] = typeof formData[k] === 'string' ? formData[k].trim() : formData[k]; });
      if ('link' in payload) payload.link = payload.link || null; // opsional: kosong = tanpa link
      if ('image_path' in payload) payload.image_path = payload.image_path || null;
      if (activeTab === 'cvs' && !/^https?:\/\/\S+$/i.test(payload.url || '')) throw new Error('Link CV harus diawali http:// atau https://');

      // Upload file baru; file lama dihapus setelah baris berhasil disimpan
      if (selectedFile) {
        uploaded = await uploadFile(selectedFile, activeTab);
        payload.image_path = uploaded;
      }
      const stale = editItem?.image_path && editItem.image_path !== payload.image_path && 'image_path' in payload ? editItem.image_path : null;

      let error;
      if (activeTab === 'profile') {
        ({ error } = await supabase.from(table).upsert({ id: 1, ...payload }));
      } else if (editItem) {
        ({ error } = await supabase.from(table).update(payload).eq('id', editItem.id));
      } else {
        // Item baru masuk di urutan paling akhir
        if (reorderable) payload.position = data.reduce((m, d) => Math.max(m, d.position ?? -1), -1) + 1;
        ({ error } = await supabase.from(table).insert(payload));
      }
      if (error) throw error;
      if (stale) await removeFile(stale);

      toast('success', editItem ? 'Data diperbarui' : 'Data ditambahkan');
      closeModal();
      fetchData(activeTab);
    } catch (err) {
      console.error('Submit error:', err);
      if (uploaded) await removeFile(uploaded); // bersihkan upload yatim
      toast('error', err.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  // ----- Drag & drop urutan -----
  const handleReorderDrop = async (targetId) => {
    const from = data.findIndex((d) => d.id === dragId);
    const to = data.findIndex((d) => d.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...data];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const prev = data;
    setData(next.map((d, i) => ({ ...d, position: i })));

    try {
      const results = await Promise.all(
        next.map((d, i) => (d.position === i ? null : supabase.from(TABLE[activeTab]).update({ position: i }).eq('id', d.id)))
      );
      const failed = results.find((r) => r?.error);
      if (failed) throw failed.error;
      toast('success', 'Urutan disimpan');
    } catch (err) {
      console.error('Reorder error:', err);
      setData(prev);
      toast('error', 'Gagal menyimpan urutan');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => [d.title, d.name, d.tags, d.description, d.email, d.message, d.url].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [data, query]);

  const canAdd = activeTab !== 'messages' && (activeTab !== 'profile' || data.length === 0);
  const canDrag = reorderable && !query.trim() && filtered.length > 1;

  const dragProps = (item) => ({
    draggable: canDrag,
    onDragStart: (e) => { setDragId(item.id); e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e) => { if (canDrag && dragId) { e.preventDefault(); if (overId !== item.id) setOverId(item.id); } },
    onDrop: (e) => { e.preventDefault(); if (canDrag && dragId) handleReorderDrop(item.id); },
    onDragEnd: () => { setDragId(null); setOverId(null); },
  });
  const cardCls = (item) => `bg-tertiary rounded-2xl border transition-all ${
    dragId === item.id ? 'opacity-40 scale-95 border-indigo-500/50' : overId === item.id && dragId ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-white/5 hover:border-indigo-500/30'
  } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`;

  const editBtn = (item) => (
    <button type="button" onClick={() => openEdit(item)} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg" title="Edit" aria-label="Edit">
      <Icon d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" size={16} />
    </button>
  );
  const deleteBtn = (item) => (
    <button type="button" onClick={() => askDelete(item)} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg shadow-lg" title="Hapus" aria-label="Hapus">
      <Icon d="M5 7h14M10 11v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" size={16} />
    </button>
  );

  const pageTitle = activeTab === 'messages' ? 'Pesan Masuk' : `Kelola ${LABEL[activeTab]}`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {toastView}

      {/* Bar atas (HP) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-tertiary border-b border-white/10 sticky top-0 z-40">
        <h2 className="text-xl font-bold text-indigo-400">{site.brand} Admin</h2>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-secondary hover:text-white" aria-label="Menu">
          <Icon d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16m-7 6h7'} size={24} />
        </button>
      </div>
      {menuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 z-50 w-64 bg-tertiary border-r border-white/10 p-6 flex flex-col h-screen transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <h2 className="text-2xl font-bold mb-1 text-indigo-400 hidden md:block">{site.brand} Admin</h2>
        <p className="text-xs text-secondary mb-8 hidden md:block">Kelola konten portofolio</p>
        <nav className="flex-1 space-y-1">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
            >
              <Icon d={ICON[tab]} />
              <span className="flex-1">{LABEL[tab]}</span>
              {counts[tab] !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20' : 'bg-white/5'}`}>{counts[tab]}</span>
              )}
            </button>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noopener noreferrer" className="mb-3 w-full text-center text-sm text-secondary hover:text-white py-2 rounded-xl hover:bg-white/5 transition-all">Lihat Website ↗</a>
        <button type="button" onClick={askLogout} className="w-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white py-3 rounded-xl transition-all">Logout</button>
      </aside>

      {/* Konten */}
      <main className="flex-1 p-4 md:p-10 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{pageTitle}</h1>
            {canDrag && <p className="text-xs text-secondary mt-1">Seret kartu untuk mengubah urutan tampil di website.</p>}
          </div>
          {canAdd && (
            <button type="button" onClick={openCreate} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-medium transition-all">
              {activeTab === 'profile' ? 'Isi Tentang Saya' : '+ Tambah'}
            </button>
          )}
        </div>

        {activeTab !== 'profile' && data.length > 0 && (
          <div className="relative mb-6 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"><Icon d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari…" aria-label="Cari" className={`${inputCls} pl-10`} />
          </div>
        )}

        {loading || dataTab !== activeTab ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => <div key={i} className="bg-tertiary rounded-2xl h-64 animate-pulse border border-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-secondary border border-dashed border-white/10 rounded-2xl">
            <p className="mb-4">{query ? 'Tidak ada hasil yang cocok.' : activeTab === 'messages' ? 'Belum ada pesan masuk.' : 'Belum ada data.'}</p>
            {!query && canAdd && <button type="button" onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm">+ Tambah sekarang</button>}
          </div>
        ) : activeTab === 'messages' ? (
          <div className="space-y-4">
            {filtered.map((m) => (
              <div key={m.id} className="bg-tertiary rounded-2xl border border-white/5 p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg break-words">{m.name}</h3>
                    <a href={`mailto:${m.email}`} className="text-indigo-400 hover:underline text-sm break-all">{m.email}</a>
                  </div>
                  <span className="text-secondary text-xs whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="mt-4 text-white/85 whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>
                <div className="mt-4 flex gap-3">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Balasan dari ${site.brand}`)}`} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors">Balas</a>
                  <button type="button" onClick={() => askDelete(m)} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-sm font-medium transition-colors">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (activeTab === 'cvs' ? (
              <div key={item.id} {...dragProps(item)} className={`${cardCls(item)} p-5 flex items-center gap-4`}>
                <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center"><Icon d={ICON.cvs} size={22} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold truncate">{item.title}</h3>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline block truncate">{item.url.replace(/^https?:\/\//, '')} ↗</a>
                </div>
                <div className="flex gap-2 shrink-0">{editBtn(item)}{deleteBtn(item)}</div>
              </div>
            ) : (
              <div key={item.id} {...dragProps(item)} className={`${cardCls(item)} overflow-hidden group`}>
                <div className={`h-40 relative overflow-hidden ${activeTab === 'skills' ? 'bg-white/90' : 'bg-black-200'}`}>
                  {item.image_path ? (
                    <img src={item.image_path} alt="" draggable={false} className={`w-full h-full transition-transform group-hover:scale-105 ${activeTab === 'skills' ? 'object-contain p-8' : 'object-cover'}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary text-sm">Tanpa gambar</div>
                  )}
                  {canDrag && (
                    <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 text-white/80" title="Seret untuk mengurutkan">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.3" /><circle cx="11" cy="3" r="1.3" /><circle cx="5" cy="8" r="1.3" /><circle cx="11" cy="8" r="1.3" /><circle cx="5" cy="13" r="1.3" /><circle cx="11" cy="13" r="1.3" /></svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {editBtn(item)}
                    {activeTab !== 'profile' && deleteBtn(item)}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg truncate">{activeTab === 'profile' ? 'Profil Saya' : (item.name || item.title)}</h3>
                  <p className="text-secondary text-sm mt-1 line-clamp-2">{activeTab === 'profile' ? item.description : activeTab === 'projects' ? item.tags : ''}</p>
                  {activeTab === 'projects' && item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block max-w-full truncate text-xs text-indigo-400 hover:underline">{item.link.replace(/^https?:\/\//, '')} ↗</a>
                  )}
                </div>
              </div>
            )))}
          </div>
        )}
      </main>

      {/* Form tambah / edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) closeModal(); }}>
          <div className="bg-tertiary w-full max-w-lg rounded-2xl p-6 md:p-8 border border-white/10 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {activeTab === 'profile' ? 'Ubah Tentang Saya' : `${editItem ? 'Edit' : 'Tambah'} ${LABEL[activeTab]}`}
              </h2>
              <button type="button" onClick={closeModal} disabled={saving} className="text-secondary hover:text-white p-1" aria-label="Tutup">
                <Icon d="M6 18L18 6M6 6l12 12" size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'profile' && (
                <Field label="Deskripsi">
                  <textarea className={`${inputCls} min-h-[160px]`} value={formData.description || ''} onChange={set('description')} required />
                </Field>
              )}
              {activeTab === 'skills' && (
                <Field label="Nama teknologi">
                  <input type="text" maxLength={100} className={inputCls} value={formData.name || ''} onChange={set('name')} required />
                </Field>
              )}
              {(activeTab === 'projects' || activeTab === 'certificates' || activeTab === 'cvs') && (
                <Field label={activeTab === 'cvs' ? 'Nama CV' : 'Judul'}>
                  <input type="text" maxLength={activeTab === 'cvs' ? 100 : 200} className={inputCls} value={formData.title || ''} onChange={set('title')} placeholder={activeTab === 'cvs' ? 'mis. CV Bahasa Indonesia' : ''} required />
                </Field>
              )}
              {activeTab === 'cvs' && (
                <Field label="Link CV" hint="Pastikan link bisa dibuka publik (mis. Google Drive: “Siapa saja yang memiliki link”).">
                  <input type="url" pattern="https?://.+" maxLength={500} className={inputCls} value={formData.url || ''} onChange={set('url')} placeholder="https://drive.google.com/file/d/…" required />
                </Field>
              )}
              {activeTab === 'projects' && (
                <>
                  <Field label="Deskripsi" hint="Boleh memakai HTML sederhana seperti <b> atau <br/>.">
                    <textarea className={`${inputCls} min-h-[90px]`} value={formData.description || ''} onChange={set('description')} />
                  </Field>
                  <Field label="Tag (pisahkan dengan koma)">
                    <input type="text" className={inputCls} value={formData.tags || ''} onChange={set('tags')} placeholder="mis. React, Three.js, GSAP" />
                  </Field>
                  <Field label="Link proyek (opsional)">
                    <input type="url" pattern="https?://.+" maxLength={500} className={inputCls} value={formData.link || ''} onChange={set('link')} placeholder="https://contoh.com" />
                  </Field>
                </>
              )}

              {WITH_IMAGE.includes(activeTab) && (
                <>
                  <DropZone file={selectedFile} currentUrl={formData.image_path} onFile={setSelectedFile} toast={toast} light={activeTab === 'skills'} />
                  {!selectedFile && (
                    <Field label="…atau pakai URL gambar" hint={activeTab === 'skills' ? 'Contoh ikon: https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/react/react-original.svg' : undefined}>
                      <input type="text" className={inputCls} value={formData.image_path || ''} onChange={set('image_path')} placeholder="https://… atau /images/…" />
                    </Field>
                  )}
                </>
              )}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModal} disabled={saving} className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl disabled:opacity-50">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const { action } = confirm; setConfirm(null); action(); }}
        />
      )}
    </div>
  );
};

export default Dashboard;
