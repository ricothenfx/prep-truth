# PROGRESS — Prep-Truth

## 2026-10-09 — 10 sampel + panel data live di produksi

- Commit `35af322` push ke main, deploy Vercel production (`prep-truth-5gqvz5vcr`).
- Verifikasi live: halaman 200 di `prep-truth.ricothen.com`; `/api/llm` input tak
  valid → fallback offline benar; e2e penuh 5/5 dijalankan langsung melawan
  produksi (picker, mapping Jerman, panel data unduh/edit/reset/sesi-saja, dark
  mode) — semua hijau.

## 2026-10-09 — 10 sampel restoran + panel data CSV in-app (D15, D16)

- Sampel contoh dari 1 menjadi **10 restoran sintetis Berlin** dengan kondisi data
  berbeda untuk reviewer: baseline (Kreuzberg, seed 42 tetap terkunci), terkalibrasi
  (3.8% telat, rekomendasi ±0), pesimis (0% telat, rekomendasi turun 25→10),
  buka-malam-saja (3 daypart kosong), data kecil (12 order — 3 daypart "too few
  orders"), kolom Jerman (alur mapping), ~15% baris kotor (3 alasan skip muncul),
  variansi ekstrem (88.8% telat, rekomendasi sampai 50 min), format campur POS lama
  (UTC/lokal/milidetik + janji desimal + baris duplikat), dan volume besar (1.952
  order / 45 hari). Profil deklaratif + generator konfigurasi di
  `src/data/restaurants.ts`, RNG bersama `src/data/rng.ts` (`engine/example.ts`
  direfactor memakainya — angka seed 42 terverifikasi identik). Kondisi tiap sampel
  dikunci test baru `restaurants.test.ts` (11 test).
- **Panel data CSV in-app** (`CsvDataPanel`): data di balik angka bisa dibuka, diedit
  langsung (textarea), di-apply (analisis re-run instan), di-reset ke default, dan
  diunduh sebagai file CSV. Edit hanya hidup di sesi browser — state memori, tanpa
  localStorage/backend; kunjungan baru selalu dapat data seed asli (charter D16).
- **Sample picker** (`SamplePicker`): grid 10 kartu (nama, tagline, ukuran, kondisi
  uji). Sampel ber-header standar langsung ke hasil; sampel kolom Jerman masuk alur
  mapping seperti upload. Pemilih bisa dibuka dari landing maupun halaman hasil.
- E2E diperbarui + ditambah (5 test): alur picker baseline, mapping sampel Jerman
  (364 order), panel data (lihat → unduh `kreuzberg-kanteen.csv` → edit 2 order
  valid + 1 rusak → apply → reset → 747 order → reload = kembali landing).
- Verifikasi: typecheck + vitest 27/27 + build (66,0 KB gzip) + e2e 5/5 hijau lokal
  terhadap build preview. Doc: README bagian "Sample restaurants", charter §4/§8
  (D15, D16).

## 2026-10-09 — Fix satuan ringkasan AI + label food cooling (D14)

- Bug dari testing live: kalimat AI menulis "average of 3366.93 seconds" — itu
  **total rider wait dalam menit** (56h 7m = 3367 min), salah satuan & salah makna
  (bukan rata-rata per order). Akar: payload kirim angka tanpa satuan di nama field,
  system prompt tidak menyebut unit.
- Fix: `SummaryPayload` kini `totalOrders` + `riderWaitTotalMinutesBefore/After` +
  `riderWaitAvgMinutesBefore/After` (App.tsx hitung rata-rata per order); system
  prompt `api/llm.ts` melarang konversi satuan dan menjelaskan konvensi penamaan;
  template offline juga mengutip menit/order. Charter D14. Uji live pasca-deploy:
  AI kini menulis "average of 4.51 minutes before to 1.02 minutes after" — satuan
  dan makna benar (rename `total` → `totalOrders` menyusul karena AI menyebutnya
  "747 minutes").
- UI: label replay jadi "food cooling*" dengan asterisk ke penjelasan model naif
  (dapur yang menyesuaikan jadwal masak menghindari kenaikan itu).
- Verifikasi: typecheck + build + vitest hijau; deploy produksi; e2e 3/3 melawan
  live; kalimat AI produksi kini mengutip menit total dan menit per order dengan benar.

## 2026-10-09 — AI aktif di produksi

- `LLM_API_KEY` terpasang di env Vercel **production** (secret, tidak pernah melalui
  chat/log); produksi di-redeploy.
- Verifikasi live: `POST /api/llm` mode `map` dengan header berbahasa Indonesia
  (`waktu_terima`, `siap_dapur`, `kurir_datang`, `kurir_ambil`, `janji_menit`) →
  `offline:false` + pemetaan lengkap dan benar.
- E2E diperbarui: badge ringkasan kini menerima "drafted by AI" atau "offline template"
  (robust untuk kedua mode); 3/3 hijau melawan `https://prep-truth.ricothen.com`.
- Catatan: env `preview` gagal ditambahkan via CLI (non-blocking — alur deploy hanya
  production). Key lokal tersalin ke `.env.local` project ini (gitignored).

## 2026-10-09 — Domain custom

- `https://prep-truth.ricothen.com` live: domain di-assign ke project (`vercel domains
  add <domain> <project>`) + alias produksi; terverifikasi 200 + `/api/llm` fallback
  offline. Catatan: alias manual saja memicu Vercel Authentication (302) — domain harus
  resmi menempel di project.

## 2026-10-09 — Deploy produksi

- Vercel production: **https://prep-truth.vercel.app** (Ready, alias resmi project).
- Verifikasi live: halaman 200; `POST /api/llm` tanpa key → `{offline:true}`; e2e
  Playwright dijalankan langsung melawan URL produksi (E2E_BASE_URL) → 3/3 hijau.
- playwright.config kini mendukung `E2E_BASE_URL` untuk smoke-test produksi.

## 2026-10-09 — Fase 3

- Playwright e2e (3 test, Chromium headless): example end-to-end, messy-CSV mapping
  flow (12 used / 2 skipped), dark toggle persist — semua hijau.
- CI: `.github/workflows/ci.yaml` (typecheck → vitest → build → e2e, Node 20).
- README: angka contoh seed 42 dikunci test `readme.test.ts` (36.7% → 7.2% late,
  rider wait −77%); honest limitation replay naif diungkap di UI + README (D13).
- Badge "suggested by AI" + SummaryCard template/AI badge terverifikasi e2e.

## 2026-10-09 — Fase 2 selesai

- `api/llm.ts` — satu serverless function Vercel, dua mode, tanpa SDK (fetch + AbortSignal):
  - `map`: headers + 3 baris contoh → JSON `{"mapping":{...}}`; divalidasi (semua nilai
    string ∈ headers, 5 field lengkap) → gagal `{offline:true}`.
  - `report`: payload angka engine → `{"summary":"..."}` (40–1500 char) → gagal offline.
  - Tanpa `LLM_API_KEY` atau `MOCK_MODE=true` → langsung offline. Key hanya di server.
- Klien `src/lib/api.ts`: `suggestAiMapping` (hanya mengisi field yang kosong dari guess
  lokal — charter D12) + `generateSummary` (AI → fallback template yang mengutip angka
  yang sama). Timeout klien 20/30 s, gagal = senyap ke offline.
- UI: badge "suggested by AI — double-check" di MappingPanel; SummaryCard dengan badge
  sumber ("drafted by AI" vs "offline template — no API key configured").
- Typecheck + build + 15/15 vitest hijau. Bundle 61,8 KB gzip.

## 2026-10-09 — Fase 1 selesai

- Scaffold Vite 5 + React 18 + TS strict + Tailwind 3; design tokens light/dark di
  `src/index.css`; toggle persist `prep-truth-theme` (awal: OS preference), anti-FOUC
  script inline di `index.html`.
- Engine deterministik (`src/engine/`):
  - `parse.ts` — papaparse, mapping 5 kolom, validasi (prep ≤ 0 / > 240 min, stop rider
    < 0 / > 60 min → dilewati dengan alasan terhitung), `guessMapping` header standar.
  - `stats.ts` — daypart (05/11/15/19), median, p85 nearest-rank, rekomendasi
    p85→bulat ke atas per 5 min (min 10, min 5 order), replay dengan shift dibatasi
    ±60 min (charter D9).
  - `example.ts` — generator seeded (mulberry32, seed 42): 30 hari resto "Kreuzberg
    Kanteen", rush siap ×1.7 / malam ×1.45, ~3% baris rusak.
- UI satu halaman (`src/components/`): UploadPanel, MappingPanel (5 dropdown),
  VerdictStrip (4 kartu), DaypartChart (SVG tulis tangan: median/p85/promised),
  RecommendationTable, BeforeAfter (replay), ThemeToggle.
- Test: vitest 15/15 hijau. Typecheck + build hijau (bundle ~60 KB gzip).

## Berikutnya

- Fase 3: Playwright e2e otonom, README dengan angka reproducible, deploy Vercel.
