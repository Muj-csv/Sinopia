/**
 * Plain-language signature values (PHASE-3 task 5, PRD §4 wording rule:
 * describe geometry, never grade it). Pure and testable -- rendering lives
 * in SignaturePanel.tsx.
 */
import type { Signature, SignatureField } from '../pose/signature'

type ScalarField = Exclude<SignatureField, 'weight_side'>

export interface SignatureRow {
  field: SignatureField
  label: string
  value: string
}

export interface SignatureGroup {
  heading: string
  rows: SignatureRow[]
}

const ANGLE_FIELDS = new Set<ScalarField>([
  'torso_lean',
  'shoulder_tilt',
  'pelvis_tilt',
  'tilt_contrast',
  'upper_arm_L',
  'upper_arm_R',
  'forearm_L',
  'forearm_R',
  'elbow_L',
  'elbow_R',
  'thigh_L',
  'thigh_R',
  'shin_L',
  'shin_R',
  'knee_L',
  'knee_R',
  'line_of_action',
])

const LABELS: Record<ScalarField, string> = {
  torso_lean: 'Torso lean from vertical',
  head_offset_x: 'Head offset, sideways (of torso length)',
  head_offset_y: 'Head offset, up/down (of torso length)',
  shoulder_tilt: 'Shoulder line tilt',
  pelvis_tilt: 'Hip line tilt',
  tilt_contrast: 'Shoulder/hip counter-tilt',
  upper_arm_L: 'Left upper arm angle',
  upper_arm_R: 'Right upper arm angle',
  forearm_L: 'Left forearm angle',
  forearm_R: 'Right forearm angle',
  elbow_L: 'Left elbow bend',
  elbow_R: 'Right elbow bend',
  thigh_L: 'Left thigh angle',
  thigh_R: 'Right thigh angle',
  shin_L: 'Left shin angle',
  shin_R: 'Right shin angle',
  knee_L: 'Left knee bend',
  knee_R: 'Right knee bend',
  ratio_upper_arm_L: 'Left upper arm length (of torso)',
  ratio_upper_arm_R: 'Right upper arm length (of torso)',
  ratio_forearm_L: 'Left forearm length (of torso)',
  ratio_forearm_R: 'Right forearm length (of torso)',
  ratio_thigh_L: 'Left thigh length (of torso)',
  ratio_thigh_R: 'Right thigh length (of torso)',
  ratio_shin_L: 'Left shin length (of torso)',
  ratio_shin_R: 'Right shin length (of torso)',
  balance_offset: 'Balance offset (of torso length)',
  line_of_action: 'Line of action angle',
  curvature: 'Line of action curvature (of torso length)',
}

const GROUPS: { heading: string; fields: ScalarField[] }[] = [
  { heading: 'Torso', fields: ['torso_lean', 'head_offset_x', 'head_offset_y'] },
  { heading: 'Shoulders', fields: ['shoulder_tilt'] },
  { heading: 'Pelvis', fields: ['pelvis_tilt', 'tilt_contrast'] },
  {
    heading: 'Left arm',
    fields: ['upper_arm_L', 'forearm_L', 'elbow_L', 'ratio_upper_arm_L', 'ratio_forearm_L'],
  },
  {
    heading: 'Right arm',
    fields: ['upper_arm_R', 'forearm_R', 'elbow_R', 'ratio_upper_arm_R', 'ratio_forearm_R'],
  },
  { heading: 'Left leg', fields: ['thigh_L', 'shin_L', 'knee_L', 'ratio_thigh_L', 'ratio_shin_L'] },
  { heading: 'Right leg', fields: ['thigh_R', 'shin_R', 'knee_R', 'ratio_thigh_R', 'ratio_shin_R'] },
  { heading: 'Gesture', fields: ['balance_offset', 'line_of_action', 'curvature'] },
]

function formatValue(field: ScalarField, value: number): string {
  return ANGLE_FIELDS.has(field) ? `${Math.round(value)}°` : value.toFixed(2)
}

function weightSideRow(sig: Signature): SignatureRow | undefined {
  const side = sig.weight_side
  if (side === undefined) return undefined
  const value = side === 'even' ? 'even on both feet' : side === 'L' ? 'on the left foot' : 'on the right foot'
  return { field: 'weight_side', label: 'Weight', value }
}

/** Groups every available signature value into readable rows, skipping missing features. */
export function describeSignature(sig: Signature): SignatureGroup[] {
  const groups: SignatureGroup[] = []
  for (const { heading, fields } of GROUPS) {
    const rows: SignatureRow[] = []
    for (const field of fields) {
      const value = sig[field]
      if (value === undefined) continue
      rows.push({ field, label: LABELS[field], value: formatValue(field, value) })
    }
    if (heading === 'Gesture') {
      const row = weightSideRow(sig)
      if (row !== undefined) rows.push(row)
    }
    if (rows.length > 0) groups.push({ heading, rows })
  }
  return groups
}
