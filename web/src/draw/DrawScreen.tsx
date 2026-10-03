/**
 * PHASE-1 task 3-6: '/new/draw'. Loads the draft, wires the canvas +
 * tool rail + autosave + keyboard shortcuts + export. Finish rasterizes
 * the canvas, stashes the result on the draft, and hands off to
 * PHASE-3's '/new/finish' form (FrescoFinishForm.tsx) for title/save.
 */
import type Konva from 'konva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { markMilestone } from '../achievements/localMilestones'
import { getDraft, updateDraft, type Draft } from '../lib/draftStore'
import { PinnedReferences } from '../references/PinnedReference'
import { ReferencePanel } from '../references/ReferencePanel'
import type { Reference } from '../references/referencesClient'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import { DrawCanvas, type Tool } from './DrawCanvas'
import './draw.css'
import { drawingOnlyCanvas, exportFresco } from './exportFresco'
import { BRUSHES, DEFAULT_BRUSH, DEFAULT_SIZE } from './brushes'
import { PALETTE, rememberColor } from './palette'
import {
  LAYER_COUNT,
  canRedo,
  canUndo,
  emptyHistory,
  hasAnyStroke,
  migrateHistory,
  pushEntry,
  redo,
  undo,
  type History,
  type Point,
} from './strokeHistory'
import { ToolRail } from './ToolRail'
import { saveDraftPatch, useAutosave, type SaveResult } from './useAutosave'

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
  const [tool, setTool] = useState<Tool>({
    name: DEFAULT_BRUSH,
    color: PALETTE[0].value,
    size: DEFAULT_SIZE,
    opacity: BRUSHES[DEFAULT_BRUSH].opacity,
  })
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()
  const [resuming, setResuming] = useState(false)
  const [referenceOpen, setReferenceOpen] = useState(false)
  const [pinnedReferences, setPinnedReferences] = useState<Reference[]>([])
  // A pinned reference or the Draw This Wall source, opened full-size in the lightbox.
  const [expandedPinned, setExpandedPinned] = useState<{ url: string; title: string } | null>(null)
  const [save, setSave] = useState<SaveResult>({ savedAt: null, failed: false })
  const [eyedropperArmed, setEyedropperArmed] = useState(false)
  const [contextLabel, setContextLabel] = useState<string | null>(null)

  const pickColorFromPhoto = useCallback((hex: string) => {
    setTool((t) => ({ ...t, color: hex }))
    setRecentColors((prev) => rememberColor(prev, hex))
    setEyedropperArmed(false)
    markMilestone('eyedropper')
  }, [])

  useEffect(() => {
    if (draftId === null) return
    getDraft(draftId).then((d) => {
      if (d === undefined) return
      setDraft(d)
      setHistory(migrateHistory(d.history))
      setPinnedReferences(d.pinnedReferences ?? [])
      setResuming(Date.now() - d.updatedAt < RESUME_THRESHOLD_MS && hasAnyStroke(d.history))

      // UX-03: keep showing what this underdrawing is for while drawing, not just at capture.
      const { missionId, collaborativeFrescoId } = d
      if (missionId !== undefined) {
        import('../missions/missions').then(({ fetchMission }) =>
          fetchMission(missionId).then((m) => setContextLabel(m !== null ? m.title : null)),
        )
      } else if (collaborativeFrescoId !== undefined) {
        import('../collab/collaborativeFrescos').then(({ fetchCollaborativeFresco }) =>
          fetchCollaborativeFresco(collaborativeFrescoId).then((cf) =>
            setContextLabel(cf !== null ? cf.title : null),
          ),
        )
      }
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
    saveDraftPatch(draftId, { history }).then(setSave)
  }, [draftId, history])

  // Same immediate-write reasoning as history above: a pin/unpin is a meaningful commit, not
  // mid-gesture state, so it's cheap to persist right away rather than waiting on the 10s tick.
  useEffect(() => {
    if (draftId === null) return
    saveDraftPatch(draftId, { pinnedReferences }).then(setSave)
  }, [draftId, pinnedReferences])

  useAutosave(draftId, { history }, setSave)

  const addStroke = useCallback(
    (points: Point[]) => {
      setRecentColors((prev) => rememberColor(prev, tool.color))
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

  // The tray confirms inline before calling this (SCREENS.md); a window.confirm would block the
  // page and, on the canvas, throw away the drawing gesture the artist was mid-way through.
  const clearLayer = useCallback((layerIndex: number) => {
    setHistory((h) => pushEntry(h, { type: 'clear', id: crypto.randomUUID(), layerIndex }))
  }, [])

  // Toggle: pinning an already-pinned reference (clicking it again in the panel) unpins it.
  const togglePin = useCallback((reference: Reference) => {
    setPinnedReferences((prev) => {
      if (prev.some((r) => r.id === reference.id)) return prev.filter((r) => r.id !== reference.id)
      markMilestone('pinned-reference')
      return [...prev, reference]
    })
  }, [])
  const unpin = useCallback((id: string) => {
    setPinnedReferences((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // tfjs is a multi-hundred-KB dependency (nsfwCheck.ts's lesson: loading it eagerly blew past
  // the production build's precache budget), so doodleGuess.ts -- and tfjs with it -- is only
  // pulled into its own chunk once someone actually taps "What am I drawing?".
  const handleGuessDoodle = useCallback(async () => {
    if (stageRef.current === null) return []
    markMilestone('doodle-guess')
    const { guessDoodle } = await import('./doodleGuess')
    return guessDoodle(drawingOnlyCanvas(stageRef.current))
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
    return (
      <>
        <FlowBar title="Your underdrawing" exit="back" />
        <p className="page t-small">Photo decoding&hellip;</p>
      </>
    )
  }

  return (
    <div className="draw-screen-layout">
      <FlowBar title="Your underdrawing" exit="back">
        {/* Save status lives in the bar so it is always visible without taking canvas height. */}
        <span className={save.failed ? 'savestate failed' : 'savestate'}>
          {save.failed
            ? "Draft isn't being saved on this device"
            : save.savedAt === null
              ? 'Draft not saved yet'
              : `Draft kept on this device · ${new Date(save.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </span>

        <button
          type="button"
          className="ibtn"
          disabled={!canUndo(history)}
          onClick={() => setHistory(undo)}
        >
          <Icon name="undo" label="Undo" />
        </button>
        <button
          type="button"
          className="ibtn"
          disabled={!canRedo(history)}
          onClick={() => setHistory(redo)}
        >
          <Icon name="redo" label="Redo" />
        </button>

        {/* The canvas's one yellow button. Enabled once there is at least one stroke. */}
        <button
          type="button"
          className="btn-y"
          disabled={!hasAnyStroke(history) || exporting}
          onClick={finish}
        >
          {exporting ? 'Exporting…' : 'Finish'}
        </button>
      </FlowBar>

      <div className="draw-screen">
        {resuming && (
          <p className="draw-resume">
            Continuing your underdrawing from {new Date(draft.updatedAt).toLocaleTimeString()}
          </p>
        )}
        {contextLabel !== null && (
          <p className="draw-resume">
            <Icon name={draft.missionId !== undefined ? 'target' : 'layers'} />
            {draft.missionId !== undefined ? 'Mission: ' : 'Layer for: '}
            {contextLabel}
          </p>
        )}

        <div className="draw-stage">
          {eyedropperArmed && (
            <p className="draw-eyedropper-hint">
              <Icon name="eyedropper" />
              <span>Tap the photo to pick its colour</span>
              <button type="button" className="link" onClick={() => setEyedropperArmed(false)}>
                Cancel
              </button>
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
            eyedropperArmed={eyedropperArmed}
            onPickColor={pickColorFromPhoto}
          />
          <PinnedReferences
            references={pinnedReferences}
            onUnpin={unpin}
            onExpand={setExpandedPinned}
            leading={
              draft.source === undefined ? undefined : (
                // Context only, never on the canvas (DTW-FR-04): no unpin, and tapping it opens
                // their fresco full-size the same way a pinned reference does.
                <div className="pinned-reference response-pin">
                  {draft.source.thumbUrl !== null && (
                    <button
                      type="button"
                      className="pinned-reference-thumb"
                      disabled={draft.source.imageUrl === null}
                      onClick={() =>
                        draft.source?.imageUrl &&
                        setExpandedPinned({
                          url: draft.source.imageUrl,
                          title: draft.source.title,
                        })
                      }
                    >
                      <img
                        src={draft.source.thumbUrl}
                        alt={`${draft.source.artist}'s “${draft.source.title}”, enlarge`}
                      />
                    </button>
                  )}
                  <span className="t-small">Responding to {draft.source.artist}</span>
                </div>
              )
            }
          />
        </div>

        {/* In the page flow, not over the canvas: opening it shrinks the stage instead of
            covering the street the artist is drawing (Design Council #1 and #2). */}
        {referenceOpen && (
          <ReferencePanel
            onClose={() => setReferenceOpen(false)}
            pinned={pinnedReferences}
            onPin={togglePin}
            onGuessDoodle={handleGuessDoodle}
          />
        )}

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
          referenceOpen={referenceOpen}
          onToggleReference={() => setReferenceOpen((v) => !v)}
          onPickFromPhoto={() => setEyedropperArmed(true)}
        />
      </div>

      {expandedPinned !== null && (
        <div className="reference-lightbox" onClick={() => setExpandedPinned(null)}>
          <img src={expandedPinned.url} alt={expandedPinned.title} />
        </div>
      )}
    </div>
  )
}
