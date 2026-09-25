/**
 * Joint editor (FR-002, ADR-005, NFR-006). 13 core joints over the sketch,
 * draggable, keyboard-movable. Used both to correct auto-detected joints
 * and, when detection fails or is low-confidence, for fully manual
 * placement -- a normal path, not an error screen.
 */
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { CORE_JOINT_NAMES, type JointName, type Joints } from '../pose/signature'
import { seedPositions } from './seedJoints'
import type { CapturedImage } from './types'

interface Props {
  image: CapturedImage
  /** already-seeded joints (detected + defaulted), in [0,1] image-relative coordinates -- see seedInitialJoints. */
  initialJoints: Joints
  onChange: (joints: Joints) => void
}

const KEY_STEP = 0.01
const KEY_STEP_SHIFT = 0.05

const JOINT_LABELS: Record<JointName, string> = {
  nose: 'Nose',
  shoulder_L: 'Left shoulder',
  shoulder_R: 'Right shoulder',
  elbow_L: 'Left elbow',
  elbow_R: 'Right elbow',
  wrist_L: 'Left wrist',
  wrist_R: 'Right wrist',
  hip_L: 'Left hip',
  hip_R: 'Right hip',
  knee_L: 'Left knee',
  knee_R: 'Right knee',
  ankle_L: 'Left ankle',
  ankle_R: 'Right ankle',
}

function toJoints(positions: Record<JointName, [number, number]>): Joints {
  const joints: Joints = {}
  for (const name of CORE_JOINT_NAMES) {
    const [x, y] = positions[name]
    joints[name] = { x, y, v: 1 }
  }
  return joints
}

export function JointEditor({ image, initialJoints, onChange }: Props) {
  const [positions, setPositions] = useState(() => seedPositions(initialJoints))
  const [selected, setSelected] = useState<JointName>('nose')
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<JointName | undefined>(undefined)

  // Notify the parent from an effect, not from inside the setPositions
  // updater -- React can invoke that updater during another component's
  // render (e.g. StrictMode), and calling a different component's setState
  // there triggers "Cannot update a component while rendering a different
  // component". onChange is read via a ref (not a dependency) since App
  // passes a new closure every render; depending on it would re-fire this
  // effect every render and loop, since toJoints() always returns a new object.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })
  useEffect(() => onChangeRef.current(toJoints(positions)), [positions])

  function updateJoint(name: JointName, x: number, y: number) {
    const clamped: [number, number] = [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]
    setPositions((prev) => ({ ...prev, [name]: clamped }))
  }

  function fractionFromPointer(e: ReactPointerEvent): [number, number] {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return [0, 0]
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
  }

  function handlePointerDown(name: JointName) {
    return (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.current = name
      setSelected(name)
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const name = dragging.current
    if (!name) return
    const [x, y] = fractionFromPointer(e)
    updateJoint(name, x, y)
  }

  function handlePointerUp() {
    dragging.current = undefined
  }

  function handleKeyDown(name: JointName) {
    return (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const step = e.shiftKey ? KEY_STEP_SHIFT : KEY_STEP
      const [x, y] = positions[name]
      let handled = true
      switch (e.key) {
        case 'ArrowLeft':
          updateJoint(name, x - step, y)
          break
        case 'ArrowRight':
          updateJoint(name, x + step, y)
          break
        case 'ArrowUp':
          updateJoint(name, x, y - step)
          break
        case 'ArrowDown':
          updateJoint(name, x, y + step)
          break
        default:
          handled = false
      }
      if (handled) e.preventDefault()
    }
  }

  return (
    <div className="joint-editor">
      <div ref={containerRef} className="joint-editor-stage">
        <img src={image.dataUrl} alt="Your sketch" className="joint-editor-image" />
        {CORE_JOINT_NAMES.map((name) => {
          const [x, y] = positions[name]
          return (
            <button
              key={name}
              type="button"
              className={`joint-handle${name === selected ? ' selected' : ''}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              aria-label={JOINT_LABELS[name]}
              onPointerDown={handlePointerDown(name)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onFocus={() => setSelected(name)}
              onKeyDown={handleKeyDown(name)}
            />
          )
        })}
      </div>
      <p className="joint-editor-hint">
        Drag a joint, or select one and use the arrow keys (hold Shift to move faster). Currently
        editing: {JOINT_LABELS[selected]}.
      </p>
    </div>
  )
}
