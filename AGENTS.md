# AGENTS.md — Aturan Main Project Prep-Truth

> Kontrak kerja. WAJIB dibaca setiap sesi AI/developer sebelum menulis satu baris kode.
> Pelanggaran aturan di sini = pekerjaan gagal meskipun kodenya jalan.

## 1. Identitas

- **Nama:** Prep-Truth
- **Satu kalimat:** Upload order history resto → keluar angka prep time yang seharusnya diset.
- **Tujuan:** Portfolio engineering ketiga untuk melamar **Delivery Hero (Berlin)** —
  sisi **resto partner**, melengkapi trilogi: `lastmile-lab` (rider/dispatch),
  `hungry` (customer), `prep-truth` (resto).
- **Lokasi:** `/home/rico/portfolio/prep-truth`
- **Charter:** `docs/PROJECT_CHARTER.md` — sumber kebenaran WHAT/WHY + keputusan terkunci.

## 2. Urutan membaca (setiap sesi baru)

1. `AGENTS.md` (file ini)
2. `docs/PROJECT_CHARTER.md` (misi, scope, keputusan D1–D8, roadmap 3 fase)
3. `docs/PROGRESS.md` (status kerja terkini, dibuat saat Fase 1 mulai)

Keputusan baru wajib masuk §8 charter pada commit yang sama dengan kodenya.

## 3. Ritual per fase

1. Baca dokumen di atas; kerjakan **scope fase aktif saja**.
2. Implementasi + penuhi seluruh DoD fase di charter.
3. Verifikasi wajib: `npm run typecheck`, `npm run build`, `npm test`.
4. Commit konvensional: `feat|fix|docs|chore|refactor|test(scope): pesan`.
5. Fase selesai setelah push/deploy sukses + charter §10 dan PROGRESS diperbarui
   pada commit yang sama.

## 4. Aturan keras

### Scope
- Semua non-goal di charter §7 tetap non-goal. Fitur baru harus menghapus kompleksitas
  lain; kalau tidak, tolak dan catat di daftar tidak-jadi.
- 3 fase, selesai = selesai. Melebihi estimasi berarti scope bocor — pangkas, bukan perpanjang.

### LLM
- Engine menghitung (p85, % telat, replay — deterministik di browser); LLM hanya
  mapping format (Opsi A) dan kata-kata (Opsi B).
- Output LLM divalidasi schema; gagal → fallback. Tidak pernah crash karena LLM ngawur.
- **MOCK_MODE wajib** — tanpa API key aplikasi tetap hidup penuh. Demo tidak boleh mati.
- Key hanya di serverless function via env var; tanpa SDK (fetch biasa); tidak ada
  secret di git; `.env.example` placeholder saja.

### Frontend
- **Theme terang default**, toggle dark; pilihan persist di localStorage, awal ikut OS.
- Semua warna via design tokens (`tokens.css` → CSS variables → Tailwind) — dilarang
  hardcode warna di komponen.
- UI produk 100% English. Grafik = SVG tulis tangan, tanpa chart library.

### Data & kejujuran
- Angka di README harus reproducible (seed eksplisit). Tidak pernah melaporkan angka
  yang tidak direproduksi sendiri.
- Baris CSV tidak valid dilewati **dan dihitung** — tidak boleh dibuang diam-diam.
- Data demo synthetic resto Berlin; tidak ada data nyata, tidak ada merek nyata.

## 5. Peta cepat

| Hal | Lokasi |
|---|---|
| Misi, scope, keputusan | `docs/PROJECT_CHARTER.md` |
| Status kerja | `docs/PROGRESS.md` |
| Aplikasi (Fase 1+) | `src/` |
| Serverless LLM (Fase 2) | `api/llm.ts` — satu function, mode `map`/`report` |
| Data contoh + generator | `src/data/` (fixture seeded, deterministik) |
| Test engine | `src/engine/__tests__/` (vitest) |
