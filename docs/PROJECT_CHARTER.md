# PROJECT CHARTER — Prep-Truth

> Sumber kebenaran untuk WHAT & WHY. Perubahan perilaku wajib mencatat keputusan baru
> di §8 pada commit yang sama. Development mengandalkan dokumen ini, bukan memori chat.

## 1. Misi (satu kalimat)

**Upload order history resto → keluar angka prep time yang seharusnya diset. Titik.**

## 2. Masalah

Angka prep time adalah input paling penting di rantai delivery (menentukan ETA customer,
kirim rider, mulai masak) — tapi biasanya angka statis yang di-set manual sekali dan tidak
pernah dikalibrasi. Salah ke dua arah, dua-duanya mahal:

- **Terlalu pendek (optimis):** order "telat" sejak awal, rider menganggur di counter,
  keterlambatan menjalar ke order berikutnya → refund, tiket support.
- **Terlalu panjang (pesimis):** makanan selesai duluan lalu dingin → rating 1★,
  ETA janji membengkak → konversi turun.

Root cause: satu angka statis vs variasi nyata per daypart, ukuran order, dan jenis menu.

## 3. Untuk siapa

- **Utama:** pemilik/manajer resto — dapat angka setting per daypart berbasis datanya sendiri.
- **Konteks platform (untuk cerita portfolio):** tool audit yang sama bisa dipakai city ops.

## 4. Solusi — satu halaman, empat blok

1. **Upload CSV** (atau "Load example" — data contoh resto Berlin, demo langsung hidup).
   LLM memetakan kolom CSV apa pun ke 5 kolom standar (Opsi A, §6); user konfirmasi
   via dropdown, tidak pernah auto-apply.
2. **Verdict strip** — 4 angka: % telat, median prep aktual, total menit tunggu rider,
   total menit makanan menganggur.
3. **Rekomendasi** — tabel per daypart (pagi/siang/sore/malam): setting lama → angka
   rekomendasi = **p85 prep aktual, dibulatkan ke atas per 5 menit**. Satu aturan,
   bisa dijelaskan ke siapa pun.
4. **Before → after** — order yang sama diputar ulang dengan angka rekomendasi:
   % telat dan menit tunggu rider sebelum vs sesudah (replay deterministik).

Plus **Opsi B**: satu paragraf ringkasan naratif yang ditulis LLM **hanya dari angka
hasil hitungan engine**, setiap klaim mengutip angka yang tampil di halaman (grounded).

## 5. Data

CSV 5 kolom: `accepted_at, food_ready_at, rider_arrived_at, picked_up_at, promised_prep_min`.

- Prep aktual = `food_ready_at − accepted_at`.
- Tunggu rider = `picked_up_at − rider_arrived_at` (durasi rider berhenti di resto, ≥ 0).
- Makanan menganggur = `rider_arrived_at − food_ready_at` (jika positif — makanan
  selesai sebelum rider datang).
- "% telat" = prep aktual > `promised_prep_min` (keterlambatan level dapur).
- Baris tidak lengkap/tidak valid → **dilewati dan dihitung** ("% baris dilewati"),
  tidak boleh dibuang diam-diam.

## 6. LLM (OpenAI) — peran & pagar

| | Opsi A: CSV Mapper (utama) | Opsi B: Ringkasan Naratif (bonus) |
|---|---|---|
| Masalah | "CSV saya kolomnya beda" — friction #1 tools CSV | Angka tabel belum berbicara ke pemilik resto |
| LLM mengerjakan | Header + 3 baris contoh → usulan mapping kolom | Menulis paragraf dari angka jadi |
| Dilarang | Auto-apply tanpa konfirmasi user | Menghitung angka baru |

Pagar (harga mati):
- **Engine menghitung, LLM memilih format & kata.** p85, % telat, replay = deterministik
  di browser; LLM tidak pernah menghitung.
- Output LLM **divalidasi schema**; gagal → fallback (mapping manual dropdown /
  ringkasan disembunyikan). Tidak pernah crash karena LLM ngawur.
- **MOCK_MODE wajib:** tanpa API key aplikasi tetap hidup penuh (mapping pre-baked,
  ringkasan pre-baked untuk data contoh). Demo tidak boleh mati.
- Key hanya di server (satu serverless function, mode `map`/`report`); klien tidak
  pernah melihat key. **Tanpa SDK** — fetch biasa ke OpenAI-compatible endpoint.

## 7. Non-goals (kontrak anti-ribet)

Tidak ada: auth/multi-tenant, database, integrasi POS, model ML, optimasi dispatch,
realtime streaming, ranking multi-kota, cold-start prior, chat interface.
Aturan scope saat develop: **fitur baru harus menghapus kompleksitas lain; kalau tidak,
masuk daftar tidak-jadi.**

## 8. Keputusan terkunci (log)

| ID | Keputusan |
|---|---|
| D1 | Arsitektur: 100% klien-side untuk engine + **satu** serverless function hanya untuk LLM. Deploy statis di Vercel (pola minutemind). |
| D2 | Frontend Vite + React + TypeScript + Tailwind; **theme terang default** + toggle dark (persist localStorage, awal ikut OS). Warna hanya via design tokens — dilarang hardcode di komponen. |
| D3 | Grafik: SVG tulis tangan, tanpa chart library. Parsing CSV: `papaparse` (satu-satunya dep runtime baru, dibenarkan: edge case quoting/encoding CSV). |
| D4 | Aturan rekomendasi: p85 prep aktual per daypart, bulat ke atas per 5 menit. Tidak ada cost model multi-bobot. |
| D5 | LLM scope: Opsi A + Opsi B saja, satu function dua mode. Tanpa SDK, tanpa fitur LLM lain. |
| D6 | Bahasa: UI produk 100% English; docs repo Bahasa Indonesia (mengikuti gaya hungry/lastmile-lab). |
| D7 | Data demo: synthetic resto Berlin (döner, ramen, currywurst, vegan bowls), seed eksplisit, angka di README harus reproducible. |
| D8 | Test: unit test engine statistik (vitest) sejak Fase 1. |
| D9 | Model replay: waktu datang rider di-simulasi ulang dengan menggeser jadwal datang sebesar delta setting lama→baru (batas ±60 menit); kecepatan dapur tidak berubah. |
| D10 | Data contoh: 30 hari berakhir 2026-09-30, seed 42, ~3% baris rusak (uji lewati-jujur), pola rush siap/malam. |
| D11 | Mapping kolom manual: dropdown per field + auto-guess dari nama header standar; LLM (Fase 2) hanya menyempurnakan usulan. |
| D12 | Kontrak LLM final: mapping AI hanya mengisi field yang biarkan kosong oleh guess lokal (tidak pernah menimpa); ringkasan AI digagalkan → template offline yang mengutip angka engine yang sama; satu function `api/llm.ts` mode `map`/`report`, response `{offline:true}` bila tanpa key/mock/gagal → klien fallback senyap. |
| D13 | Angka dataset contoh di README dikunci oleh test (`readme.test.ts`); keterbatasan model replay naif (food cooling naik karena dapur diasumsikan tetap memasak di waktu lama) diungkap jujur di UI + README. |
| D14 | Payload ringkasan LLM wajib self-describing: `totalOrders` = jumlah order, `*TotalMinutes` = akumulasi semua order, `*AvgMinutes` = per order; system prompt melarang konversi satuan; template offline juga mengutip rata-rata per order. Label replay "food cooling*" diberi asterisk yang menunjuk ke penjelasan model naif. |

## 9. Roadmap — 3 fase pendek

### Fase 1 — Engine + empat blok (produk deterministik utuh)
Scaffold Vite+TS+Tailwind+tokens+light/dark toggle · CSV upload (format standar 5 kolom,
dropdown mapping manual) · Load example · hitung verdict/rekomendasi/replay · SVG chart
per daypart · % baris dilewati ditampilkan · unit test engine.
**DoD:** typecheck + build + test hijau; data contoh menghasilkan 4 blok benar;
angka identik untuk seed yang sama; beli deploy preview jalan.

### Fase 2 — LLM layer (Opsi A + B)
Satu serverless function (mode map/report) · schema validation + fallback · MOCK_MODE
pre-baked · ringkasan naratif grounded (kutip angka halaman) · env var contoh di
`.env.example`.
**DoD:** upload CSV "berantakan" (kolom beda nama) → usulan mapping → konfirmasi →
angka muncul; tanpa key semua fitur tetap hidup (mock); key tidak pernah ke klien.

### Fase 3 — Halus + dokumentasi + live
Polish UI light/dark · README dengan angka reproducible + honest limitations ·
live URL di Vercel.
**DoD:** live demo publik; setiap angka README bisa direproduce dengan seed yang sama;
tidak ada fitur di luar charter.

## 10. Status

- [x] Fase 1 — engine + empat blok: selesai (vitest 15/15, typecheck + build hijau)
- [x] Fase 2 — LLM layer: selesai (api/llm.ts + mapper AI + ringkasan; fallback offline teruji)
- [x] Fase 3 — halus + README + live: selesai — **https://prep-truth.vercel.app** (e2e 3/3 hijau melawan produksi; `/api/llm` fallback offline terverifikasi live)
