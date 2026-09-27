/**
 * Phase 3 task 2 (docs/build/PHASE-3.md): 13 draggable joints over the
 * sketch. Also the fully-manual placement path (ADR-005) when detection
 * fails -- initialJoints is then empty and every joint starts at its
 * jointTemplate.ts default, ready to be dragged into place.
 *
 * Keyboard: click or Tab to a joint (or its entry in the list), then arrow
 * keys move it; hold Shift for a bigger step.
 */
import { useRef, useState } from 'react'
import { CORE_JOINT_NAMES, type Joint, type JointName, type Joints } from '../pose/signature'
import './JointEditor.css'
import { clamp01, pointToNormalized, stepForKey } from './jointEditorMath'
import { withTemplateDefaults } from './jointTemplate'
import { SKELETON_EDGES } from './skeleton'

export function JointEditor({
  imageUrl,
  initialJoints,
  onConfirm,
}: {
  imageUrl: string
  initialJoints: Joints
  onConfirm: (joints: Joints) => void
}) {
  const [joints, setJoints] = useState<Record<JointName, Joint>>(() =>
    withTemplateDefaults(initialJoints),
  )
  const [selected, setSelected] = useState<JointName>(CORE_JOINT_NAMES[0])
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<JointName | null>(null)

  const moveTo = (name: JointName, x: number, y: number) => {
    setJoints((prev) => ({ ...prev, [name]: { x: clamp01(x), y: clamp01(y), v: 1 } }))
  }

  const startDrag = (name: JointName) => (e: React.PointerEvent) => {
    e.stopPropagation()
    dragging.current = name
    setSelected(name)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onOverlayPointerMove = (e: React.PointerEvent) => {
    const name = dragging.current
    const rect = overlayRef.current?.getBoundingClientRect()
    if (name === null || rect === undefined) return
    const [x, y] = pointToNormalized(e.clientX, e.clientY, rect)
    moveTo(name, x, y)
  }

  const stopDrag = () => {
    dragging.current = null
  }

  const nudge = (name: JointName) => (e: React.KeyboardEvent) => {
    const step = stepForKey(e.key, e.shiftKey)
    if (step === null) return
    e.preventDefault()
    const current = joints[name]
    moveTo(name, current.x + step[0], current.y + step[1])
  }

  return (
    <div className="joint-editor">
      <div
        className="joint-editor-image"
        ref={overlayRef}
        onPointerMove={onOverlayPointerMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        <img src={imageUrl} alt="Sketch with joints to place" />
        <svg className="joint-editor-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
          {SKELETON_EDGES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={joints[a].x}
              y1={joints[a].y}
              x2={joints[b].x}
              y2={joints[b].y}
            />
          ))}
          {CORE_JOINT_NAMES.map((name) => (
            <circle
              key={name}
              cx={joints[name].x}
              cy={joints[name].y}
              r={selected === name ? 0.018 : 0.013}
              tabIndex={0}
              role="button"
              aria-label={`${name.replace('_', ' ')} joint`}
              className={selected === name ? 'selected' : ''}
              onPointerDown={startDrag(name)}
              onFocus={() => setSelected(name)}
              onKeyDown={nudge(name)}
            />
          ))}
        </svg>
      </div>

      <div className="joint-editor-list" role="listbox" aria-label="Joints">
        {CORE_JOINT_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            role="option"
            aria-selected={selected === name}
            className={selected === name ? 'active' : ''}
            onClick={() => setSelected(name)}
            onKeyDown={nudge(name)}
          >
            {name.replace('_', ' ')}
          </button>
        ))}
      </div>

      <button type="button" className="joint-editor-confirm" onClick={() => onConfirm(joints)}>
        Confirm joints
      </button>
    </div>
  )
}
