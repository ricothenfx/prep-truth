import { useEffect, useState } from "react"

interface Props {
  text: string
  defaultText?: string
  filename: string
  onApply: (text: string) => void
  onReset?: () => void
}

export default function CsvDataPanel({ text, defaultText, filename, onApply, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(text)

  useEffect(() => {
    setDraft(text)
  }, [text])

  const edited = defaultText !== undefined && text !== defaultText
  const dirty = draft !== text
  const rows = draft.trim() === "" ? 0 : draft.trim().split("\n").length - 1
  const canReset = onReset !== undefined && defaultText !== undefined && (dirty || edited)

  const download = () => {
    const blob = new Blob([draft], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-line bg-surface" data-testid="data-panel">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-testid="data-panel-toggle"
        className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">
          Order data (CSV)
          <span className="ml-2 font-normal text-muted">
            {rows} rows behind these numbers — view, edit, download
          </span>
        </span>
        <span className="flex items-center gap-2">
          {edited && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-ink">
              edited — this session only
            </span>
          )}
          <span className="text-xs text-muted">{open ? "hide" : "show"}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-line p-4">
          <p className="text-xs leading-snug text-muted">
            Edits re-run the analysis instantly and last until you leave or reload the
            page — the built-in sample always reloads from its original seed.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            data-testid="data-editor"
            spellCheck={false}
            rows={12}
            className="mt-3 w-full resize-y rounded-lg border border-line bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={download}
              data-testid="data-download"
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              Download CSV
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => onApply(draft)}
              data-testid="data-apply"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply changes
            </button>
            {onReset && (
              <button
                type="button"
                disabled={!canReset}
                onClick={onReset}
                data-testid="data-reset"
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset to default
              </button>
            )}
            {dirty && <span className="text-xs text-warn">unsaved edits</span>}
          </div>
        </div>
      )}
    </div>
  )
}
