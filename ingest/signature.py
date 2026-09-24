"""Pose signature (ARCHITECTURE.md §3-4). FR-003, NFR-005.

Identical in Python and web/src/pose/signature.ts, within 0.01deg / 0.0001
on normalized values. Any change here must be mirrored there and re-checked
against shared/test-vectors/signature/*.json.

Coordinate convention (ARCHITECTURE.md §3):
  Input joints are image-plane coordinates, x increasing right, y
  increasing down (typical image / MediaPipe landmark convention).
  We convert to y-up, then place the origin at the hip midpoint and
  scale by torso length (hip midpoint -> shoulder midpoint distance).
  No rotation normalization: a lying figure must not match a standing
  one (ADR-002, ADR-003).

Underspecified formula, documented here rather than in ARCHITECTURE.md:
  weight_side picks the ankle that is both closer under the shoulder-hip
  centre (horizontally) and lower in the frame. We score each ankle as
  `abs(ankle.x - center.x) + max(0, ankle.y - min(ankle_L.y, ankle_R.y))`
  (lower score wins; "even" if the scores are within an epsilon). The
  first term rewards being under the centre; the second penalizes an
  ankle for being higher than the lower of the two.
"""

from __future__ import annotations

import math
from typing import Optional, TypedDict

VISIBILITY_THRESHOLD = 0.3
WEIGHT_SIDE_EPSILON = 1e-6

CORE_JOINT_NAMES = [
    "nose",
    "shoulder_L", "shoulder_R",
    "elbow_L", "elbow_R",
    "wrist_L", "wrist_R",
    "hip_L", "hip_R",
    "knee_L", "knee_R",
    "ankle_L", "ankle_R",
]

# (left, right) name pairs, used by mirror().
MIRROR_PAIRS = [
    ("shoulder_L", "shoulder_R"),
    ("elbow_L", "elbow_R"),
    ("wrist_L", "wrist_R"),
    ("hip_L", "hip_R"),
    ("knee_L", "knee_R"),
    ("ankle_L", "ankle_R"),
]

SIGNATURE_FIELDS = [
    "torso_lean", "head_offset_x", "head_offset_y",
    "shoulder_tilt", "pelvis_tilt", "tilt_contrast",
    "upper_arm_L", "upper_arm_R", "forearm_L", "forearm_R", "elbow_L", "elbow_R",
    "thigh_L", "thigh_R", "shin_L", "shin_R", "knee_L", "knee_R",
    "ratio_upper_arm_L", "ratio_upper_arm_R", "ratio_forearm_L", "ratio_forearm_R",
    "ratio_thigh_L", "ratio_thigh_R", "ratio_shin_L", "ratio_shin_R",
    "balance_offset", "weight_side", "line_of_action", "curvature",
]


class Joint(TypedDict):
    x: float
    y: float
    v: float  # visibility, 0..1


Point = tuple[float, float]
Joints = dict[str, Joint]
NormalizedJoints = dict[str, Optional[Point]]
Signature = dict[str, Optional[float] | Optional[str]]


# --- vector helpers -------------------------------------------------------

def _sub(a: Point, b: Point) -> Point:
    return (a[0] - b[0], a[1] - b[1])


def _add(a: Point, b: Point) -> Point:
    return (a[0] + b[0], a[1] + b[1])


def _scale(a: Point, k: float) -> Point:
    return (a[0] * k, a[1] * k)


def _norm(v: Point) -> float:
    return math.hypot(v[0], v[1])


def _dot(a: Point, b: Point) -> float:
    return a[0] * b[0] + a[1] * b[1]


def _cross(a: Point, b: Point) -> float:
    return a[0] * b[1] - a[1] * b[0]


def _angle_deg(v: Point) -> float:
    """Angle from the positive x-axis, counter-clockwise positive (y-up)."""
    return math.degrees(math.atan2(v[1], v[0]))


def _wrap_deg(a: float) -> float:
    """Wrap to (-180, 180]."""
    return (a + 180) % 360 - 180


def _interior_angle_deg(joint: Point, a: Point, b: Point) -> Optional[float]:
    v1 = _sub(a, joint)
    v2 = _sub(b, joint)
    n1, n2 = _norm(v1), _norm(v2)
    if n1 == 0 or n2 == 0:
        return None
    cos_a = max(-1.0, min(1.0, _dot(v1, v2) / (n1 * n2)))
    return math.degrees(math.acos(cos_a))


def _midpoint(a: Point, b: Point) -> Point:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


# --- normalization ----------------------------------------------------------

def normalize_joints(joints: Joints) -> tuple[Optional[NormalizedJoints], Optional[float]]:
    """Returns (normalized joints, torso_length), or (None, None) if the
    hips or shoulders needed to establish the origin/scale are missing."""
    required = ("shoulder_L", "shoulder_R", "hip_L", "hip_R")
    for name in required:
        j = joints.get(name)
        if j is None or j["v"] < VISIBILITY_THRESHOLD:
            return None, None

    yup = {name: (j["x"], -j["y"]) for name, j in joints.items() if j["v"] >= VISIBILITY_THRESHOLD}

    hip_mid = _midpoint(yup["hip_L"], yup["hip_R"])
    shoulder_mid = _midpoint(yup["shoulder_L"], yup["shoulder_R"])
    torso_length = _norm(_sub(shoulder_mid, hip_mid))
    if torso_length < 1e-9:
        return None, None

    normalized: NormalizedJoints = {name: None for name in CORE_JOINT_NAMES}
    for name in CORE_JOINT_NAMES:
        if name in yup:
            normalized[name] = _scale(_sub(yup[name], hip_mid), 1 / torso_length)
    return normalized, torso_length


def _mid(normalized: NormalizedJoints, a: str, b: str) -> Optional[Point]:
    pa, pb = normalized.get(a), normalized.get(b)
    if pa is None or pb is None:
        return None
    return _midpoint(pa, pb)


# --- feature computation -----------------------------------------------------

def _empty_signature() -> Signature:
    return {field: None for field in SIGNATURE_FIELDS}


def compute_features(normalized: Optional[NormalizedJoints]) -> Signature:
    if normalized is None:
        return _empty_signature()

    sig: Signature = _empty_signature()

    shoulder_mid = _mid(normalized, "shoulder_L", "shoulder_R")
    hip_mid = _mid(normalized, "hip_L", "hip_R")  # always (0, 0) post-normalization

    if shoulder_mid is not None and hip_mid is not None:
        sig["torso_lean"] = _wrap_deg(90 - _angle_deg(_sub(shoulder_mid, hip_mid)))

    nose = normalized.get("nose")
    if nose is not None and shoulder_mid is not None:
        sig["head_offset_x"] = nose[0] - shoulder_mid[0]
        sig["head_offset_y"] = nose[1] - shoulder_mid[1]

    sL, sR = normalized.get("shoulder_L"), normalized.get("shoulder_R")
    if sL is not None and sR is not None:
        sig["shoulder_tilt"] = _angle_deg(_sub(sR, sL))

    hL, hR = normalized.get("hip_L"), normalized.get("hip_R")
    if hL is not None and hR is not None:
        sig["pelvis_tilt"] = _angle_deg(_sub(hR, hL))

    if sig["shoulder_tilt"] is not None and sig["pelvis_tilt"] is not None:
        sig["tilt_contrast"] = _wrap_deg(sig["shoulder_tilt"] - sig["pelvis_tilt"])

    # limb segments: (segment feature name, bend feature name or None, proximal, mid, distal)
    limbs = [
        ("upper_arm_L", None, "shoulder_L", "elbow_L", None),
        ("upper_arm_R", None, "shoulder_R", "elbow_R", None),
        ("forearm_L", "elbow_L", "elbow_L", "wrist_L", "shoulder_L"),
        ("forearm_R", "elbow_R", "elbow_R", "wrist_R", "shoulder_R"),
        ("thigh_L", None, "hip_L", "knee_L", None),
        ("thigh_R", None, "hip_R", "knee_R", None),
        ("shin_L", "knee_L", "knee_L", "ankle_L", "hip_L"),
        ("shin_R", "knee_R", "knee_R", "ankle_R", "hip_R"),
    ]
    ratio_name = {
        "upper_arm_L": "ratio_upper_arm_L", "upper_arm_R": "ratio_upper_arm_R",
        "forearm_L": "ratio_forearm_L", "forearm_R": "ratio_forearm_R",
        "thigh_L": "ratio_thigh_L", "thigh_R": "ratio_thigh_R",
        "shin_L": "ratio_shin_L", "shin_R": "ratio_shin_R",
    }
    for segment_field, bend_field, proximal_name, distal_name, bend_far_name in limbs:
        proximal, distal = normalized.get(proximal_name), normalized.get(distal_name)
        if proximal is not None and distal is not None:
            vec = _sub(distal, proximal)
            sig[segment_field] = _angle_deg(vec)
            sig[ratio_name[segment_field]] = _norm(vec)
        if bend_field is not None:
            far = normalized.get(bend_far_name)
            joint = normalized.get(proximal_name)  # elbow or knee itself
            if joint is not None and far is not None and distal is not None:
                sig[bend_field] = _interior_angle_deg(joint, far, distal)

    aL, aR = normalized.get("ankle_L"), normalized.get("ankle_R")
    if aL is not None and aR is not None and shoulder_mid is not None:
        center = _scale(shoulder_mid, 0.5)  # midpoint of shoulder_mid and hip_mid=(0,0)
        ankle_mid = _midpoint(aL, aR)
        sig["balance_offset"] = center[0] - ankle_mid[0]

        lower_y = min(aL[1], aR[1])
        score_L = abs(aL[0] - center[0]) + max(0.0, aL[1] - lower_y)
        score_R = abs(aR[0] - center[0]) + max(0.0, aR[1] - lower_y)
        if abs(score_L - score_R) < WEIGHT_SIDE_EPSILON:
            sig["weight_side"] = "even"
        else:
            sig["weight_side"] = "L" if score_L < score_R else "R"

        support = {"L": aL, "R": aR, "even": ankle_mid}[sig["weight_side"]]
        if nose is not None:
            vec = _sub(nose, support)
            sig["line_of_action"] = _angle_deg(vec)
            line_len = _norm(vec)
            if line_len > 1e-9:
                # signed perpendicular distance of hip_mid=(0,0) from the
                # line through support -> nose.
                to_origin = _sub((0.0, 0.0), support)
                sig["curvature"] = _cross(vec, to_origin) / line_len

    return sig


def compute_signature(joints: Joints) -> Signature:
    normalized, _ = normalize_joints(joints)
    return compute_features(normalized)


def mirror_normalized(normalized: Optional[NormalizedJoints]) -> Optional[NormalizedJoints]:
    """Reflect a normalized joint set through its own vertical (hip) axis
    and swap L/R labels. Recomputing features on the result is equivalent
    to 'swap L/R labels and negate x-dependent angles' (ARCHITECTURE §4),
    but derived geometrically instead of hand-flipping each feature's sign.
    """
    if normalized is None:
        return None

    def flip(p: Optional[Point]) -> Optional[Point]:
        return None if p is None else (-p[0], p[1])

    mirrored: NormalizedJoints = {"nose": flip(normalized.get("nose"))}
    for left, right in MIRROR_PAIRS:
        mirrored[right] = flip(normalized.get(left))
        mirrored[left] = flip(normalized.get(right))
    return mirrored


def mirror_signature(joints: Joints) -> Signature:
    normalized, _ = normalize_joints(joints)
    return compute_features(mirror_normalized(normalized))
