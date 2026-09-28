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
import { BRUSHES, BRUSH_ORDER, DEFAULT_BRUSH, SIZES, isBrush, type BrushName } from './brushes'
import { swatchesFor } from './palette'
import { LAYER_COUNT } from './strokeHistory'

type OpenPopover = 'brush' | 'color' | 'size' | 'layers' | null

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
  /** Remembered when a brush is picked, so switching to the eraser and back returns to it. */
  const [lastBrush, setLastBrush] = useState<BrushName>(DEFAULT_BRUSH)

  const pickBrush = (name: BrushName) => {
    setLastBrush(name)
    onToolChange({ ...tool, name, opacity: BRUSHES[name].opacity })
  }
  /** Which layer is awaiting an inline "really clear?" -- never a blocking window.confirm. */
  const [confirmingClear, setConfirmingClear] = useState<number | null>(null)

  const swatches = swatchesFor(recentColors)
  const drawingWithBrush = isBrush(tool.name)
  // The eraser is a mode, not a brush, so the tray keeps showing the brush you'll return to.
  // The guard is inlined rather than reusing `drawingWithBrush`, which doesn't narrow tool.name.
  const currentBrush: BrushName = isBrush(tool.name) ? tool.name : lastBrush

  const toggle = (which: OpenPopover) => setOpen((current) => (current === which ? null : which))
  const close = () => setOpen(null)

  return (
    <div className="tray" role="toolbar" aria-label="Drawing tools">
      {/* One slot, two jobs: tap to draw with the current brush, tap again to change which brush.
          The label names the brush, so the tray always says what the next mark will be. */}
      <div className="tool-slot">
        <button
          type="button"
          className={`tool${drawingWithBrush ? ' active' : ''}${open === 'brush' ? ' open' : ''}`}
          aria-pressed={drawingWithBrush}
          aria-expanded={open === 'brush'}
          onClick={() => {
            if (drawingWithBrush) toggle('brush')
            else pickBrush(currentBrush)
          }}
        >
          <Icon name="brush" />
          <span>{BRUSHES[currentBrush].label}</span>
        </button>

        {open === 'brush' && (
          <Popover label="Brush" onClose={close}>
            {BRUSH_ORDER.map((name) => (
              <button
                key={name}
                type="button"
                className={`layer-pick${tool.name === name ? ' active' : ''}`}
                aria-pressed={tool.name === name}
                onClick={() => pickBrush(name)}
              >
                <span className={`brush-sample brush-sample-${name}`} aria-hidden="true" />
                {BRUSHES[name].label}
                {tool.name === name && <Icon name="check" />}
              </button>
            ))}
          </Popover>
        )}
      </div>

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
              {swatches.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  className="swatch"
                  title={swatch.name}
                  aria-label={swatch.name}
                  aria-pressed={tool.color.toLowerCase() === swatch.value.toLowerCase()}
                  style={{ background: swatch.value }}
                  onClick={() => onToolChange({ ...tool, color: swatch.value })}
                >
                  {/* A tick, so the selection is not carried by colour alone. */}
                  <Icon name="check" className="swatch-check" />
                </button>
              ))}

              {/* Anything the nine named colours don't cover. The native picker is the $0,
                  dependency-free option and is already keyboard and touch accessible. */}
              <label className="swatch swatch-custom" title="Custom colour">
                <span className="sr-only">Custom colour</span>
                <input
                  type="color"
                  value={tool.color}
                  onChange={(e) => onToolChange({ ...tool, color: e.target.value })}
                />
                <Icon name="plus" />
              </label>
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
            <div className="size-choices">
              {SIZES.map((size) => (
                <button
                  key={size.label}
                  type="button"
                  className={`layer-pick${tool.size === size.value ? ' active' : ''}`}
                  aria-pressed={tool.size === size.value}
                  onClick={() => onToolChange({ ...tool, size: size.value })}
                >
                  {size.label}
                  {tool.size === size.value && <Icon name="check" />}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Fine tune</span>
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
