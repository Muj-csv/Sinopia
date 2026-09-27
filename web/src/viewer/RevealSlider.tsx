/** DESIGN_BRIEF.md RevealSlider: native range input, accent-2/accent-3 ends, arrows +-5, Home/End. */
import { useState } from 'react'
import { SLIDER_MAX, SLIDER_MIN, SLIDER_STEP, clampSlider, compositeClipInset } from './sliderMath'

export function RevealSlider({ photoUrl, compositeUrl }: { photoUrl: string; compositeUrl: string }) {
  const [value, setValue] = useState(50)

  return (
    <div className="reveal-slider">
      <div className="reveal-slider-stage">
        <img src={photoUrl} alt="The real place" className="reveal-slider-photo" />
        <img
          src={compositeUrl}
          alt="The drawing over the real place"
          className="reveal-slider-composite"
          style={{ clipPath: compositeClipInset(value) }}
        />
      </div>
      <input
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        value={value}
        aria-label="Reality to drawing"
        onChange={(e) => setValue(clampSlider(Number(e.target.value)))}
      />
      <div className="reveal-slider-labels">
        <span>Reality</span>
        <span>Drawing</span>
      </div>
    </div>
  )
}
