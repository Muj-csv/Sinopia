/**
 * PHASE-1 task 3/6: brush, eraser, colors (8 recents), size, opacity,
 * layer visibility, undo/redo. 44px touch targets (DESIGN_BRIEF.md).
 */
import type { Tool } from './DrawCanvas'
import { LAYER_COUNT } from './strokeHistory'

const DEFAULT_RECENT_COLORS = [
  '#1e1b18',
  '#ffffff',
  '#8c3f2d',
  '#c0392b',
  '#2d6a4f',
  '#1d3557',
  '#e9c46a',
  '#6d597a',
]

export function ToolRail({
  tool,
  onToolChange,
  recentColors,
  activeLayer,
  onActiveLayerChange,
  layerVisible,
  onLayerVisibleChange,
  onClearLayer,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: Tool
  onToolChange: (tool: Tool) => void
  recentColors: string[]
  activeLayer: number
  onActiveLayerChange: (layer: number) => void
  layerVisible: boolean[]
  onLayerVisibleChange: (layer: number, visible: boolean) => void
  onClearLayer: (layer: number) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  const colors = recentColors.length > 0 ? recentColors : DEFAULT_RECENT_COLORS

  return (
    <div className="tool-rail" role="toolbar" aria-label="Drawing tools">
      <div className="tool-rail-group">
        <button
          type="button"
          aria-label="Brush"
          aria-pressed={tool.name === 'brush'}
          className={tool.name === 'brush' ? 'active' : ''}
          onClick={() => onToolChange({ ...tool, name: 'brush' })}
        >
          Brush
        </button>
        <button
          type="button"
          aria-label="Eraser"
          aria-pressed={tool.name === 'eraser'}
          className={tool.name === 'eraser' ? 'active' : ''}
          onClick={() => onToolChange({ ...tool, name: 'eraser' })}
        >
          Eraser
        </button>
      </div>

      <div className="tool-rail-group tool-rail-colors">
        {colors.slice(0, 8).map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={tool.color === c}
            className={tool.color === c ? 'active' : ''}
            style={{ background: c }}
            onClick={() => onToolChange({ ...tool, color: c })}
          />
        ))}
      </div>

      <label className="tool-rail-slider">
        Size
        <input
          type="range"
          min={1}
          max={64}
          value={tool.size}
          onChange={(e) => onToolChange({ ...tool, size: Number(e.target.value) })}
        />
      </label>

      <label className="tool-rail-slider">
        Opacity
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          value={tool.opacity}
          onChange={(e) => onToolChange({ ...tool, opacity: Number(e.target.value) })}
        />
      </label>

      <div className="tool-rail-group tool-rail-layers">
        {Array.from({ length: LAYER_COUNT }, (_, i) => (
          <div key={i} className="tool-rail-layer">
            <button
              type="button"
              aria-label={`Layer ${i + 1}`}
              aria-pressed={activeLayer === i}
              className={activeLayer === i ? 'active' : ''}
              onClick={() => onActiveLayerChange(i)}
            >
              L{i + 1}
            </button>
            <button
              type="button"
              aria-label={`Toggle layer ${i + 1} visibility`}
              onClick={() => onLayerVisibleChange(i, !(layerVisible[i] ?? true))}
            >
              {(layerVisible[i] ?? true) ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              aria-label={`Clear layer ${i + 1}`}
              onClick={() => onClearLayer(i)}
            >
              Clear
            </button>
          </div>
        ))}
      </div>

      <div className="tool-rail-group">
        <button type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
      </div>
    </div>
  )
}
