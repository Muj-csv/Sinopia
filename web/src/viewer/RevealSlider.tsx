/**
 * Reality <-> Drawing (SCREENS.md "Fresco viewer"): a native range input, 6px ink track, 30px
 * yellow thumb, arrows +-5, Home/End. The drawing FADES in over the photo -- no wipe handle, no
 * chevrons, no "Before/After" pills.
 */
import { useState } from 'react'
import { SLIDER_MAX, SLIDER_MIN, SLIDER_STEP, clampSlider, compositeOpacity } from './sliderMath'

/** Screen readers get the blend in words; the number alone says nothing about what is shown. */
function valueText(value: number): string {
  if (value === 0) return 'The real place'
  if (value === 100) return 'The drawing'
  return `${value}% drawing over the real place`
}

export function RevealSlider({
  photoUrl,
  compositeUrl,
}: {
  photoUrl: string
  compositeUrl: string
}) {
  const [value, setValue] = useState(50)

  return (
    <div className="reveal-slider">
      <div className="reveal-slider-stage">
        <img src={photoUrl} alt="The real place" className="reveal-slider-photo" />
        <img
          src={compositeUrl}
          alt="The drawing over the real place"
          className="reveal-slider-composite"
          style={{ opacity: compositeOpacity(value) }}
        />
      </div>
      <input
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        value={value}
        aria-label="Reality to drawing"
        aria-valuetext={valueText(value)}
        onChange={(e) => setValue(clampSlider(Number(e.target.value)))}
      />
      <div className="reveal-slider-labels">
        <span>Reality</span>
        <span>Drawing</span>
      </div>
    </div>
  )
}
