# PROGRESS — Prep-Truth

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

- Fase 2: `api/llm.ts` (mode map/report), MOCK_MODE, integrasi mapper + ringkasan naratif.
