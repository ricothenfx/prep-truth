import { RESTAURANT_SAMPLES } from "../data/restaurants"

interface Props {
  onSelect: (id: string) => void
  onCancel: () => void
}

export default function SamplePicker({ onSelect, onCancel }: Props) {
  return (
    <section aria-label="Sample restaurants">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sample restaurants</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Ten synthetic Berlin kitchens, each generated in your browser from a fixed
            seed — pick the data condition you want to test.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
        >
          cancel
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="sample-grid">
        {RESTAURANT_SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            data-testid={`sample-card-${s.id}`}
            className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{s.name}</span>
              <span className="whitespace-nowrap text-xs tabular-nums text-muted">{s.size}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{s.tagline}</p>
            <p className="mt-2 text-xs leading-snug">
              <span className="rounded-full border border-line px-2 py-0.5 text-muted">
                testing: {s.condition}
              </span>
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
