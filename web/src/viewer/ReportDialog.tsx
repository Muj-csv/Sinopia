/** PHASE-4 task 4 (FR-013): report a public fresco. Sign-in required (caller gates visibility).
 *
 * SCREENS.md "Report sheet": reasons as radio rows, optional detail, one line on what happens,
 * then Send report -- the sheet's one yellow button. The reasons are a client-side vocabulary
 * folded into the single `reason` column, so this needs no schema change. */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { MAX_REASON_LENGTH, reportFresco, validateReason } from './report'

const REASONS = [
  "It isn't a drawing of a real place",
  'It shows someone who has not agreed to it',
  'It is hateful or harassing',
  'It is sexual content',
  'Something else',
] as const

export function ReportDialog({
  frescoId,
  reporterId,
  onClose,
}: {
  frescoId: string
  reporterId: string
  onClose: () => void
}) {
  const [choice, setChoice] = useState<string>(REASONS[0])
  const [detail, setDetail] = useState('')
  const [status, setStatus] = useState<'editing' | 'submitting' | 'done' | 'error'>('editing')
  const sheetRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const reason = detail.trim() === '' ? choice : `${choice} — ${detail.trim()}`
  const error = validateReason(reason)

  // Focus moves into the sheet and returns to whatever opened it, same contract as Popover.
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    sheetRef.current?.querySelector<HTMLElement>('input, button, textarea')?.focus()
    return () => {
      const opener = openerRef.current
      if (opener !== null && document.contains(opener)) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const submit = async () => {
    setStatus('submitting')
    const result = await reportFresco(frescoId, reporterId, reason)
    setStatus(result.ok ? 'done' : 'error')
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Report this fresco" ref={sheetRef}>
        {status === 'done' ? (
          <>
            <div className="sheet-head">
              <h2>Thanks</h2>
            </div>
            <p>It&apos;s hidden while we review it.</p>
            <button type="button" className="btn-o btn-wide" onClick={onClose}>
              Back to the globe
            </button>
          </>
        ) : (
          <>
            <div className="sheet-head">
              <h2>Report this fresco</h2>
              <button type="button" className="ibtn" onClick={onClose}>
                <Icon name="x" label="Close" />
              </button>
            </div>

            <div className="report-reasons">
              {REASONS.map((r) => (
                <label key={r} className="choice">
                  <input
                    type="radio"
                    name="report-reason"
                    checked={choice === r}
                    onChange={() => setChoice(r)}
                  />
                  <span className="title">{r}</span>
                </label>
              ))}
            </div>

            <label className="field">
              <span>Anything to add?</span>
              <textarea
                maxLength={MAX_REASON_LENGTH}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
              {error !== null && <span className="error">{error}</span>}
            </label>

            <p className="t-small">
              A reported fresco is hidden from the globe straight away while someone looks at it.
            </p>

            {status === 'error' && (
              <p className="notice danger" role="alert">
                <Icon name="warn" />
                <span>Couldn&apos;t send the report. Try again.</span>
              </p>
            )}

            <button
              type="button"
              className="btn-y btn-wide"
              disabled={error !== null || status === 'submitting'}
              onClick={submit}
            >
              {status === 'submitting' ? 'Sending…' : 'Send report'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
