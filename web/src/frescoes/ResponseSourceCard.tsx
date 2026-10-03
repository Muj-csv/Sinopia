/** Draw This Wall: the compact "which fresco am I answering" card on Capture and Finish (UX-03). */
import './fresco.css'
import type { DrawSource } from './responses'

export function ResponseSourceCard({
  source,
  hint,
}: {
  source: Pick<DrawSource, 'title' | 'artist' | 'thumbUrl'>
  hint?: string
}) {
  return (
    <div className="response-source">
      {source.thumbUrl !== null && <img src={source.thumbUrl} alt="" />}
      <div>
        <p>
          Responding to {source.artist}&apos;s &ldquo;{source.title}&rdquo;
        </p>
        {hint !== undefined && <p className="t-small">{hint}</p>}
      </div>
    </div>
  )
}
