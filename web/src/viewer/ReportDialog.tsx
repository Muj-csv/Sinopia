/** PHASE-4 task 4 (FR-013): report a public fresco. Sign-in required (caller gates visibility). */
import { useState } from 'react'
import { MAX_REASON_LENGTH, reportFresco, validateReason } from './report'

export function ReportDialog({
  frescoId,
  reporterId,
  onClose,
}: {
  frescoId: string
  reporterId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<'editing' | 'submitting' | 'done' | 'error'>('editing')
  const error = validateReason(reason)

  const submit = async () => {
    setStatus('submitting')
    const result = await reportFresco(frescoId, reporterId, reason)
    setStatus(result.ok ? 'done' : 'error')
  }

  return (
    <div className="report-dialog-backdrop" onClick={onClose}>
      <div className="report-dialog" onClick={(e) => e.stopPropagation()}>
        {status === 'done' ? (
          <p>Thanks. It's hidden while we review it.</p>
        ) : (
          <>
            <h3>Report this fresco</h3>
            <textarea
              maxLength={MAX_REASON_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What's wrong with it? (optional)"
            />
            {status === 'error' && <p role="alert">Couldn't send the report. Try again.</p>}
            <div className="report-dialog-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button type="button" disabled={error !== null || status === 'submitting'} onClick={submit}>
                {status === 'submitting' ? 'Sending...' : 'Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
