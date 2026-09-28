/**
 * PHASE-1 task 3/6: the six-tool tray -- Brush · Eraser · Colour · Size · Layers · Refs
 * (SCREENS.md "Canvas"). Colour, Size and Layers open popovers rather than living in the tray,
 * so the chrome stays under the height budget and the canvas keeps the screen.
 *
 * A tray tool is 56x56 with a Gaegu label; active is a yellow fill with an ink edge, and a tool
 * whose popover is open takes the yellow tint.
 */
import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Popover } from '../ui/Popover'
import type { Tool } from './DrawCanvas'
import { LAYER_COUNT } from './strokeHistory'

/**
 * A starter palette for the artist's first stroke, before there are any recents. These are
 * pigments on the photo, not app chrome, so they are deliberately not theme tokens -- but the
 * first two are the app's own ink and paper, which is what most people reach for first.
 */
const DEFAULT_RECENT_COLORS = [
  '#1A1A1A',
  '#FFFFFF',
  '#B3261E',
  '#E2B537',
  '#237636',
  '#1D3557',
  '#8C3F2D',
  '#6D597A',
]

type OpenPopover = 'color' | 'size' | 'layers' | null

export function ToolRail({
  tool,
  onToolChange,
  recentColors,
  activeLayer,
  onActiveLayerChange,
  layerVisible,
  onLayerVisibleChange,
  onClearLayer,
  referenceOpen,
  onToggleReference,
}: {
  tool: Tool
  onToolChange: (tool: Tool) => void
  recentColors: string[]
  activeLayer: number
  onActiveLayerChange: (layer: number) => void
  layerVisible: boolean[]
  onLayerVisibleChange: (layer: number, visible: boolean) => void
  onClearLayer: (layer: number) => void
  /** PHASE-2 task 1: the toolbar slot the reference panel plugs into. */
  referenceOpen: boolean
  onToggleReference: () => void
}) {
  const [open, setOpen] = useState<OpenPopover>(null)
  /** Which layer is awaiting an inline "really clear?" -- never a blocking window.confirm. */
  const [confirmingClear, setConfirmingClear] = useState<number | null>(null)

  const colors = recentColors.length > 0 ? recentColors : DEFAULT_RECENT_COLORS
  const toggle = (which: OpenPopover) => setOpen((current) => (current === which ? null : which))
  const close = () => setOpen(null)

  return (
    <div className="tray" role="toolbar" aria-label="Drawing tools">
      <button
        type="button"
        className={`tool${tool.name === 'brush' ? ' active' : ''}`}
        aria-pressed={tool.name === 'brush'}
        onClick={() => onToolChange({ ...tool, name: 'brush' })}
      >
        <Icon name="brush" />
        <span>Brush</span>
      </button>

      <button
        type="button"
        className={`tool${tool.name === 'eraser' ? ' active' : ''}`}
        aria-pressed={tool.name === 'eraser'}
        onClick={() => onToolChange({ ...tool, name: 'eraser' })}
      >
        <Icon name="eraser" />
        <span>Eraser</span>
      </button>

      <div className="tool-slot">
        <button
          type="button"
          className={`tool${open === 'color' ? ' open' : ''}`}
          aria-expanded={open === 'color'}
          onClick={() => toggle('color')}
        >
          {/* The swatch IS the icon: it shows the current colour without a legend. */}
          <span className="tool-swatch" style={{ background: tool.color }} aria-hidden="true" />
          <span>Colour</span>
        </button>

        {open === 'color' && (
          <Popover label="Colour" onClose={close}>
            <div className="swatches">
              {colors.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch"
                  aria-label={`Colour ${c}`}
                  aria-pressed={tool.color === c}
                  style={{ background: c }}
                  onClick={() => onToolChange({ ...tool, color: c })}
                />
              ))}
            </div>
            <label className="field">
              <span>Opacity</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={tool.opacity}
                onChange={(e) => onToolChange({ ...tool, opacity: Number(e.target.value) })}
              />
            </label>
          </Popover>
        )}
      </div>

      <div className="tool-slot">
        <button
          type="button"
          className={`tool${open === 'size' ? ' open' : ''}`}
          aria-expanded={open === 'size'}
          onClick={() => toggle('size')}
        >
          <Icon name="size" />
          <span>Size</span>
        </button>

        {open === 'size' && (
          <Popover label="Size" onClose={close}>
            {/* Design Council #8: show the actual stroke, not just a number. */}
            <div className="size-preview">
              <span
                className="size-dot"
                style={{
                  width: tool.size,
                  height: tool.size,
                  opacity: tool.opacity,
                  background: tool.color,
                }}
              />
            </div>
            <label className="field">
              <span>Size</span>
              <input
                type="range"
                min={1}
                max={64}
                value={tool.size}
                onChange={(e) => onToolChange({ ...tool, size: Number(e.target.value) })}
              />
            </label>
          </Popover>
        )}
      </div>

      <div className="tool-slot">
        <button
          type="button"
          className={`tool${open === 'layers' ? ' open' : ''}`}
          aria-expanded={open === 'layers'}
          onClick={() => toggle('layers')}
        >
          {/* Design Council #3: the layer number is a badge, so the label never wraps to two lines. */}
          <span className="tool-badge-wrap">
            <Icon name="layers" />
            <span className="tool-badge">{activeLayer + 1}</span>
          </span>
          <span>Layers</span>
        </button>

        {open === 'layers' && (
          <Popover label="Layers" onClose={close}>
            {Array.from({ length: LAYER_COUNT }, (_, i) => {
              const visible = layerVisible[i] ?? true
              return (
                <div key={i} className="layer-row">
                  <button
                    type="button"
                    className={`layer-pick${activeLayer === i ? ' active' : ''}`}
                    aria-pressed={activeLayer === i}
                    onClick={() => onActiveLayerChange(i)}
                  >
                    Layer {i + 1}
                  </button>

                  <button
                    type="button"
                    className="ibtn"
                    onClick={() => onLayerVisibleChange(i, !visible)}
                  >
                    <Icon
                      name={visible ? 'eye' : 'eyeoff'}
                      label={visible ? `Hide layer ${i + 1}` : `Show layer ${i + 1}`}
                    />
                  </button>

                  {confirmingClear === i ? (
                    <span className="layer-confirm">
                      <button
                        type="button"
                        className="link"
                        onClick={() => {
                          onClearLayer(i)
                          setConfirmingClear(null)
                        }}
                      >
                        Clear it
                      </button>
                      <button
                        type="button"
                        className="link"
                        onClick={() => setConfirmingClear(null)}
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="ibtn" onClick={() => setConfirmingClear(i)}>
                      <Icon name="trash" label={`Clear layer ${i + 1}`} />
                    </button>
                  )}
                </div>
              )
            })}
            {confirmingClear !== null && (
              <p className="t-small">Clearing can be undone with the undo button.</p>
            )}
          </Popover>
        )}
      </div>

      <button
        type="button"
        className={`tool${referenceOpen ? ' active' : ''}`}
        aria-pressed={referenceOpen}
        onClick={onToggleReference}
      >
        <Icon name="ref" />
        <span>Refs</span>
      </button>
    </div>
  )
}
