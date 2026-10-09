import { RESTAURANT_SAMPLES } from "../data/restaurants"

interface Props {
  onText: (text: string, label: string, filename?: string) => void
  onExample: () => void
  compact?: boolean
}

export default function UploadPanel({ onText, onExample, compact }: Props) {
  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    onText(text, file.name, file.name)
  }

  const sampleCount = RESTAURANT_SAMPLES.length

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent">
          Upload another CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          onClick={onExample}
          data-testid="load-example"
          className="text-sm text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink"
        >
          or pick one of the {sampleCount} sample restaurants
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-surface p-8 text-center">
      <p className="text-lg font-medium">Drop your order history in</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        One CSV row per order. Every calculation runs in your browser — your file never
        leaves this page.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <label className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            data-testid="csv-input"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          onClick={onExample}
          data-testid="load-example"
          className="rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Browse {sampleCount} sample restaurants
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">
        Needed columns: accepted_at · food_ready_at · rider_arrived_at · picked_up_at ·
        promised_prep_min — other names are fine, you can map them next. No file handy?
        The sample kitchens cover ten different data conditions.
      </p>
    </div>
  )
}
