/** Plain-language display of the sketch's own pose signature (FR-003, part of Phase 3's results screen). */
import type { Signature } from '../pose/signature'

interface Row {
  label: string
  format: (sig: Signature) => string | undefined
}

const DEG = (v: number | undefined) => (v === undefined ? undefined : `${Math.round(v)}°`)

const ROWS: Row[] = [
  { label: 'Torso lean', format: (s) => DEG(s.torso_lean) },
  { label: 'Shoulder tilt', format: (s) => DEG(s.shoulder_tilt) },
  { label: 'Pelvis tilt', format: (s) => DEG(s.pelvis_tilt) },
  { label: 'Shoulder / pelvis contrast', format: (s) => DEG(s.tilt_contrast) },
  { label: 'Left elbow bend', format: (s) => DEG(s.elbow_L) },
  { label: 'Right elbow bend', format: (s) => DEG(s.elbow_R) },
  { label: 'Left knee bend', format: (s) => DEG(s.knee_L) },
  { label: 'Right knee bend', format: (s) => DEG(s.knee_R) },
  {
    label: 'Weight',
    format: (s) =>
      s.weight_side === undefined
        ? undefined
        : s.weight_side === 'even'
          ? 'Even on both legs'
          : `Mostly on the ${s.weight_side === 'L' ? 'left' : 'right'} leg`,
  },
  { label: 'Line of action', format: (s) => DEG(s.line_of_action) },
]

interface Props {
  signature: Signature
}

export function SignaturePanel({ signature }: Props) {
  const rows = ROWS.map((row) => ({ label: row.label, value: row.format(signature) })).filter(
    (row) => row.value !== undefined,
  )

  return (
    <section aria-label="Pose signature" className="signature-panel">
      <h2>Pose geometry</h2>
      {rows.length === 0 ? (
        <p>Not enough joints are placed yet to read a pose geometry.</p>
      ) : (
        <dl>
          {rows.map((row) => (
            <div key={row.label} className="signature-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
