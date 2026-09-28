import spriteMarkup from './sprite.svg?raw'

/**
 * The one icon set (DESIGN_BRIEF.md §7). These are the design kit's stand-ins in the Doodle Icons
 * register; swapping in Doodle Icons (CC0) means replacing sprite.svg and keeping the same ids.
 * Mixing in a second set (Lucide and friends) is on the forbidden list.
 */
export type IconName =
  | 'x'
  | 'back'
  | 'globe'
  | 'plus'
  | 'book'
  | 'search'
  | 'camera'
  | 'upload'
  | 'pin'
  | 'locate'
  | 'undo'
  | 'redo'
  | 'brush'
  | 'eraser'
  | 'size'
  | 'layers'
  | 'ref'
  | 'eye'
  | 'eyeoff'
  | 'trash'
  | 'flag'
  | 'lock'
  | 'edit'
  | 'page'
  | 'info'
  | 'warn'
  | 'check'
  | 'zoomin'
  | 'zoomout'
  | 'bigpin'

/**
 * Inlined once at the app root so `<use href="#i-name">` resolves without a network round trip and
 * the symbols can read theme variables. Rendering it twice would duplicate the ids.
 */
export function IconSprite() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: spriteMarkup }} />
}

type IconProps = {
  name: IconName
  /** Announce the icon to screen readers. Omit it when neighbouring text already says this. */
  label?: string
  className?: string
}

export function Icon({ name, label, className }: IconProps) {
  return (
    <svg
      className={className ? `i ${className}` : 'i'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <use href={`#i-${name}`} />
    </svg>
  )
}
