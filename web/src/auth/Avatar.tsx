/**
 * Draws an AvatarConfig (Update 1.2). Flat fills and 2px ink outlines, matching `ui/sprite.svg`:
 * no gradients, no blur, no soft shading, so it sits beside the icon set as though the same hand
 * drew it. It is one inline SVG rather than a second icon set, which DESIGN_BRIEF.md forbids.
 */
import {
  DEFAULT_AVATAR,
  EXTRAS,
  FRAMES,
  HAIR,
  HAIR_COLORS,
  SKINS,
  type AvatarConfig,
} from './avatarConfig'

const INK = '#1A1A1A'

/** Hair drawn behind the head (length that falls past the jaw), by HAIR index. */
function HairBack({ index, fill }: { index: number; fill: string }) {
  switch (HAIR[index]?.label) {
    case 'Long':
      return <path d="M15 26c0-9 7-16 17-16s17 7 17 16v18H15z" fill={fill} stroke={INK} />
    case 'Coiled':
      return <circle cx="32" cy="24" r="19" fill={fill} stroke={INK} />
    case 'Braids':
      return (
        <>
          <path d="M15 26v16h6V26zM43 26v16h6V26z" fill={fill} stroke={INK} />
          <path d="M15 26c0-9 7-16 17-16s17 7 17 16z" fill={fill} stroke={INK} />
        </>
      )
    default:
      return null
  }
}

/** Hair drawn over the head, by HAIR index. */
function HairFront({ index, fill }: { index: number; fill: string }) {
  switch (HAIR[index]?.label) {
    case 'Shaved':
      return null
    case 'Cropped':
      return (
        <path
          d="M18 25c0-8 6-13 14-13s14 5 14 13c-4-5-8-7-14-7s-10 2-14 7z"
          fill={fill}
          stroke={INK}
        />
      )
    case 'Wavy':
      return (
        <path
          d="M18 26c0-9 6-14 14-14s14 5 14 14c-2-3-5-4-7-2s-5 2-7 0-5-1-7 2-4 2-7 0z"
          fill={fill}
          stroke={INK}
        />
      )
    case 'Bun':
      return (
        <>
          <circle cx="32" cy="8" r="6" fill={fill} stroke={INK} />
          <path
            d="M18 25c0-8 6-13 14-13s14 5 14 13c-4-5-8-7-14-7s-10 2-14 7z"
            fill={fill}
            stroke={INK}
          />
        </>
      )
    case 'Headwrap':
      return (
        <>
          <path d="M17 24c0-9 7-15 15-15s15 6 15 15z" fill={fill} stroke={INK} />
          <path d="M47 24c4-2 6-6 4-9" fill="none" stroke={INK} />
        </>
      )
    default:
      return (
        <path
          d="M18 25c0-8 6-13 14-13s14 5 14 13c-4-5-8-7-14-7s-10 2-14 7z"
          fill={fill}
          stroke={INK}
        />
      )
  }
}

function Face({ index }: { index: number }) {
  const eyes =
    index === 2 ? (
      // Thinking: one eye narrowed into a line.
      <>
        <circle cx="26" cy="27" r="1.6" fill={INK} />
        <path d="M35 27h4" stroke={INK} />
      </>
    ) : index === 3 ? (
      // Delighted: both eyes closed and curved up.
      <>
        <path d="M24 28c1-2 3-2 4 0" fill="none" stroke={INK} />
        <path d="M36 28c1-2 3-2 4 0" fill="none" stroke={INK} />
      </>
    ) : (
      <>
        <circle cx="26" cy="27" r="1.6" fill={INK} />
        <circle cx="38" cy="27" r="1.6" fill={INK} />
      </>
    )

  const mouth =
    index === 0 ? (
      <path d="M29 34h6" fill="none" stroke={INK} />
    ) : index === 3 ? (
      <path d="M28 33c2 4 6 4 8 0z" fill={INK} stroke={INK} />
    ) : (
      <path d="M28 33c2 3 6 3 8 0" fill="none" stroke={INK} />
    )

  return (
    <>
      {eyes}
      {mouth}
    </>
  )
}

function Wear({ index, fill }: { index: number; fill: string }) {
  const body = <path d="M12 64v-6c0-7 9-11 20-11s20 4 20 11v6z" fill={fill} stroke={INK} />
  switch (index) {
    case 1:
      return (
        <>
          {body}
          <path d="M26 48l6 7 6-7" fill="none" stroke={INK} />
        </>
      )
    case 2:
      return (
        <>
          {body}
          <path d="M22 50c6 4 14 4 20 0" fill="none" stroke={INK} />
        </>
      )
    case 3:
      return (
        <>
          {body}
          <path d="M26 48v16M38 48v16" fill="none" stroke={INK} />
        </>
      )
    default:
      return body
  }
}

function Extra({ index }: { index: number }) {
  switch (EXTRAS[index]?.label) {
    case 'Glasses':
      return (
        <>
          <circle cx="26" cy="27" r="5" fill="none" stroke={INK} />
          <circle cx="38" cy="27" r="5" fill="none" stroke={INK} />
          <path d="M31 27h2" stroke={INK} />
        </>
      )
    case 'Earring':
      return <circle cx="17" cy="30" r="2" fill="none" stroke={INK} />
    case 'Cap':
      return (
        <>
          <path d="M17 22a15 15 0 0 1 30 0z" fill={INK} />
          <path d="M47 22h6" stroke={INK} />
        </>
      )
    case 'Freckles':
      return (
        <>
          <circle cx="23" cy="31" r="0.9" fill={INK} />
          <circle cx="27" cy="33" r="0.9" fill={INK} />
          <circle cx="41" cy="31" r="0.9" fill={INK} />
          <circle cx="37" cy="33" r="0.9" fill={INK} />
        </>
      )
    default:
      return null
  }
}

export function Avatar({
  config = DEFAULT_AVATAR,
  size = 44,
  className,
}: {
  config?: AvatarConfig
  size?: number
  className?: string
}) {
  const skin = SKINS[config.skin]?.value ?? SKINS[0].value
  const hair = HAIR_COLORS[config.hairColor]?.value ?? HAIR_COLORS[0].value
  const frame = FRAMES[config.frame]?.value ?? FRAMES[0].value

  return (
    <svg
      className={className ? `avatar ${className}` : 'avatar'}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      // Decorative by default: every place it appears is already labelled by the name beside it.
      aria-hidden="true"
      focusable="false"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Clipped to the frame so shoulders and long hair stop at the disc's edge. */}
      <clipPath id={`avatar-clip-${config.frame}`}>
        <circle cx="32" cy="32" r="30" />
      </clipPath>
      <circle cx="32" cy="32" r="30" fill={frame} />
      <g clipPath={`url(#avatar-clip-${config.frame})`}>
        <HairBack index={config.hair} fill={hair} />
        <Wear index={config.wear} fill={frame === '#FFFFFF' ? '#E4ECF3' : '#FFFFFF'} />
        <path d="M28 40h8v8h-8z" fill={skin} stroke={INK} />
        <circle cx="32" cy="27" r="15" fill={skin} stroke={INK} />
        <HairFront index={config.hair} fill={hair} />
        <Face index={config.face} />
        <Extra index={config.extra} />
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke={INK} />
    </svg>
  )
}
