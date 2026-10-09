import type { Mapping } from "../engine/types"

interface Props {
  headers: string[]
  mapping: Mapping
  aiAssisted?: boolean
  onChange: (m: Mapping) => void
  onConfirm: () => void
}

const FIELDS: { key: keyof Mapping; label: string; hint: string }[] = [
  { key: "acceptedAt", label: "Kitchen accepted the order", hint: "timestamp" },
  { key: "foodReadyAt", label: "Food marked ready", hint: "timestamp" },
  { key: "riderArrivedAt", label: "Rider arrived at the restaurant", hint: "timestamp" },
  { key: "pickedUpAt", label: "Rider picked up the order", hint: "timestamp" },
  { key: "promisedPrepMin", label: "Promised prep time", hint: "minutes (number)" },
]

export default function MappingPanel({ headers, mapping, aiAssisted, onChange, onConfirm }: Props) {
  const complete = FIELDS.every((f) => mapping[f.key] !== "")

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-base font-semibold">Match your columns</h2>
      <p className="mt-1 text-sm text-muted">
        Pick which column in your file holds each piece of information.
        {aiAssisted && (
          <>
            {" "}
            <span
              className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-ink"
              data-testid="ai-assisted-badge"
            >
              suggested by AI — double-check
            </span>
          </>
        )}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {f.label} <span className="font-normal text-muted">({f.hint})</span>
            </span>
            <select
              value={mapping[f.key]}
              data-testid={`map-${f.key}`}
              onChange={(e) => onChange({ ...mapping, [f.key]: e.target.value })}
              className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">— none —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!complete}
        data-testid="mapping-confirm"
        onClick={onConfirm}
        className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analyze orders
      </button>
    </div>
  )
}
