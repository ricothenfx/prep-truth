interface Props {
  text: string
  source: "ai" | "template"
}

export default function SummaryCard({ text, source }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5" data-testid="summary-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Plain-English readout</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            source === "ai" ? "bg-accent text-accent-ink" : "border border-line text-muted"
          }`}
        >
          {source === "ai" ? "drafted by AI from your numbers" : "template — straight from the engine numbers"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{text}</p>
    </div>
  )
}
