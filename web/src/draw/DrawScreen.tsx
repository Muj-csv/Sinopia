/**
 * PHASE-1 task 3-6: '/new/draw'. Loads the draft, wires the canvas +
 * tool rail + autosave + keyboard shortcuts + export. Finish rasterizes
 * the canvas, stashes the result on the draft, and hands off to
 * PHASE-3's '/new/finish' form (FrescoFinishForm.tsx) for title/save.
 */
import type Konva from 'konva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDraft, updateDraft, type Draft } from '../lib/draftStore'
import { DrawCanvas, type Tool } from './DrawCanvas'
import './draw.css'
import { exportFresco } from './exportFresco'
import {
  LAYER_COUNT,
  canRedo,
  canUndo,
  emptyHistory,
  hasAnyStroke,
  pushEntry,
  redo,
  undo,
  type History,
  type Point,
} from './strokeHistory'
import { ToolRail } from './ToolRail'
import { useAutosave } from './useAutosave'

const RESUME_THRESHOLD_MS = 5 * 60 * 1000 // draft touched in the last 5 minutes reads as "continuing"

export function DrawScreen() {
  const [params] = useSearchParams()
  const draftId = params.get('draft')
  const stageRef = useRef<Konva.Stage>(null)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [history, setHistory] = useState<History>(emptyHistory())
  const [activeLayer, setActiveLayer] = useState(0)
  const [layerVisible, setLayerVisible] = useState<boolean[]>(Array(LAYER_COUNT).fill(true))
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [tool, setTool] = useState<Tool>({ name: 'brush', color: '#1e1b18', size: 8, opacity: 1 })
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()
  const [resuming, setResuming] = useState(false)

  useEffect(() => {
    if (draftId === null) return
    getDraft(draftId).then((d) => {
      if (d === undefined) return
      setDraft(d)
      setHistory(d.history)
      setResuming(Date.now() - d.updatedAt < RESUME_THRESHOLD_MS && hasAnyStroke(d.history))
    })
  }, [draftId])

  const photoUrl = useMemo(
    () => (draft !== null ? URL.createObjectURL(draft.photo) : null),
    [draft],
  )
  useEffect(
    () => () => {
      if (photoUrl !== null) URL.revokeObjectURL(photoUrl)
    },
    [photoUrl],
  )

  // The 10s/visibilitychange autosave (useAutosave) is a safety net, but its
  // "on hide" write races an actual reload/navigation and can lose the
  // final edit (confirmed via manual testing: an immediate reload after a
  // stroke did not persist it; the same reload after the 10s tick did).
  // history only changes at meaningful commit points (stroke complete,
  // clear, undo, redo) -- never mid-stroke -- so saving on every change is
  // cheap and closes that gap.
  useEffect(() => {
    if (draftId === null) return
    updateDraft(draftId, { history })
  }, [draftId, history])

  useAutosave(draftId, { history })

  const addStroke = useCallback(
    (points: Point[]) => {
      setRecentColors((prev) => [tool.color, ...prev.filter((c) => c !== tool.color)].slice(0, 8))
      setHistory((h) =>
        pushEntry(h, {
          type: 'stroke',
          id: crypto.randomUUID(),
          layerIndex: activeLayer,
          tool: tool.name,
          points,
          color: tool.color,
          size: tool.size,
          opacity: tool.opacity,
        }),
      )
    },
    [activeLayer, tool],
  )

  const clearLayer = useCallback((layerIndex: number) => {
    if (!window.confirm(`Clear layer ${layerIndex + 1}? This can be undone.`)) return
    setHistory((h) => pushEntry(h, { type: 'clear', id: crypto.randomUUID(), layerIndex }))
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        setHistory((h) => undo(h))
      } else if (
        mod &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        setHistory((h) => redo(h))
      } else if (e.key === '[') {
        setTool((t) => ({ ...t, size: Math.max(1, t.size - 2) }))
      } else if (e.key === ']') {
        setTool((t) => ({ ...t, size: Math.min(64, t.size + 2) }))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const finish = async () => {
    if (stageRef.current === null || draftId === null) return
    setExporting(true)
    try {
      const result = await exportFresco(stageRef.current)
      await updateDraft(draftId, { exported: result })
      navigate(`/new/finish?draft=${draftId}`)
    } finally {
      setExporting(false)
    }
  }

  if (draftId === null || draft === null || photoUrl === null) {
    return <p className="draw-status">Photo decoding...</p>
  }

  return (
    <div className="draw-screen">
      {resuming && (
        <p className="draw-status">
          Continuing your sinopia from {new Date(draft.updatedAt).toLocaleTimeString()}
        </p>
      )}

      <DrawCanvas
        stageRef={stageRef}
        photoUrl={photoUrl}
        width={draft.width}
        height={draft.height}
        history={history}
        activeLayer={activeLayer}
        layerVisible={layerVisible}
        tool={tool}
        onStrokeComplete={addStroke}
      />

      <ToolRail
        tool={tool}
        onToolChange={setTool}
        recentColors={recentColors}
        activeLayer={activeLayer}
        onActiveLayerChange={setActiveLayer}
        layerVisible={layerVisible}
        onLayerVisibleChange={(i, v) =>
          setLayerVisible((prev) => prev.map((x, idx) => (idx === i ? v : x)))
        }
        onClearLayer={clearLayer}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={() => setHistory(undo)}
        onRedo={() => setHistory(redo)}
      />

      <button
        type="button"
        className="draw-finish"
        disabled={!hasAnyStroke(history) || exporting}
        onClick={finish}
      >
        {exporting ? 'Exporting...' : 'Finish'}
      </button>
    </div>
  )
}
