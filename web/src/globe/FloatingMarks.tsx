/**
 * Small ink marks that drift slowly around the corners of the system view (Update 1.2 background
 * polish). Purely decorative: `aria-hidden`, `pointer-events: none`, and positioned behind every
 * interactive thing on the screen, so they never compete with a tap on a world.
 *
 * Plain CSS animation rather than anything driven by JS or WebGL -- these never need to be exact,
 * so there's no reason to spend a frame budget on them. Each mark gets its own drift distance,
 * duration and delay (derived from its index, not random, so a re-render doesn't jump the motion)
 * to avoid the whole set breathing in and out together.
 */
const MARKS = [
  { id: 'a', corner: 'top-left', shape: 'ring' },
  { id: 'b', corner: 'top-right', shape: 'star' },
  { id: 'c', corner: 'bottom-left', shape: 'wave' },
  { id: 'd', corner: 'bottom-right', shape: 'ring' },
  { id: 'e', corner: 'top-left', shape: 'wave' },
  { id: 'f', corner: 'bottom-right', shape: 'star' },
] as const

function Mark({ shape }: { shape: 'ring' | 'star' | 'wave' }) {
  if (shape === 'ring') {
    return (
      <svg viewBox="0 0 32 32" className="floating-mark-svg">
        <circle cx="16" cy="16" r="10" />
      </svg>
    )
  }
  if (shape === 'star') {
    return (
      <svg viewBox="0 0 32 32" className="floating-mark-svg">
        <path d="M16 4 L19 13 L28 13 L20.5 18.5 L23.5 27.5 L16 22 L8.5 27.5 L11.5 18.5 L4 13 L13 13 Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" className="floating-mark-svg">
      <path d="M2 20 Q 9 8, 16 20 T 30 20" fill="none" />
    </svg>
  )
}

export function FloatingMarks() {
  return (
    <div className="floating-marks" aria-hidden="true">
      {MARKS.map((mark) => (
        <span key={mark.id} className={`floating-mark mark-${mark.id} corner-${mark.corner}`}>
          <Mark shape={mark.shape} />
        </span>
      ))}
    </div>
  )
}
