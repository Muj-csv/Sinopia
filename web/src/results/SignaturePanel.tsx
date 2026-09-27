import type { Signature } from '../pose/signature'
import { describeSignature } from './signatureLabels'

export function SignaturePanel({ signature }: { signature: Signature }) {
  const groups = describeSignature(signature)
  if (groups.length === 0) return null

  return (
    <div className="signature-panel">
      {groups.map((group) => (
        <div key={group.heading} className="signature-group">
          <h3>{group.heading}</h3>
          <dl>
            {group.rows.map((row) => (
              <div key={row.field} className="signature-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
