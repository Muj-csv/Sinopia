"""Phase 1 acceptance: signature.py must pass every vector in
shared/test-vectors/signature/ within 0.01 deg / 0.0001 on normalized
values (NFR-005), plus the mirror test (ARCHITECTURE §12)."""

import json
import math
from pathlib import Path

import pytest

import signature as sig

VECTORS_DIR = Path(__file__).parents[2] / "shared" / "test-vectors" / "signature"
ANGLE_TOLERANCE = 0.01
RATIO_TOLERANCE = 0.0001

VECTOR_FILES = sorted(VECTORS_DIR.glob("*.json"))


def _tolerance_for(field: str) -> float:
    return RATIO_TOLERANCE if field.startswith("ratio_") or field in (
        "head_offset_x", "head_offset_y", "balance_offset", "curvature",
    ) else ANGLE_TOLERANCE


def _load(path: Path) -> dict:
    return json.loads(path.read_text())


def _joints(raw: dict) -> sig.Joints:
    return {name: {"x": j["x"], "y": j["y"], "v": j["v"]} for name, j in raw.items()}


@pytest.mark.parametrize("path", VECTOR_FILES, ids=lambda p: p.stem)
def test_vector(path: Path) -> None:
    vector = _load(path)
    joints = _joints(vector["joints"])
    actual = sig.compute_signature(joints)

    for field, expected in vector["expected"].items():
        got = actual.get(field)
        if expected is None:
            assert got is None, f"{vector['name']}.{field}: expected missing, got {got}"
        elif isinstance(expected, str):
            assert got == expected, f"{vector['name']}.{field}: expected {expected!r}, got {got!r}"
        else:
            assert got is not None, f"{vector['name']}.{field}: expected {expected}, got None"
            tol = _tolerance_for(field)
            assert math.isclose(got, expected, abs_tol=tol), (
                f"{vector['name']}.{field}: expected {expected}, got {got} (tol {tol})"
            )


def test_mirror_is_involution() -> None:
    """Mirroring twice returns the original signature (ARCHITECTURE §12)."""
    vector = _load(VECTORS_DIR / "06_weight_on_right_leg.json")
    joints = _joints(vector["joints"])
    normalized = sig.normalize_joints(joints)[0]
    twice = sig.compute_features(sig.mirror_normalized(sig.mirror_normalized(normalized)))
    once = sig.compute_signature(joints)
    for field in sig.SIGNATURE_FIELDS:
        a, b = once.get(field), twice.get(field)
        if isinstance(a, str):
            assert a == b
        elif a is None:
            assert b is None
        else:
            assert math.isclose(a, b, abs_tol=1e-9)


def test_mirror_matches_geometric_opposite() -> None:
    """Vector 07 is the true L/R mirror of vector 06's joints (hand-
    constructed). mirror_signature(06) must equal compute_signature(07)."""
    v6 = _joints(_load(VECTORS_DIR / "06_weight_on_right_leg.json")["joints"])
    v7 = _joints(_load(VECTORS_DIR / "07_weight_on_left_leg.json")["joints"])

    mirrored = sig.mirror_signature(v6)
    direct = sig.compute_signature(v7)

    for field in sig.SIGNATURE_FIELDS:
        a, b = mirrored.get(field), direct.get(field)
        if isinstance(a, str) or isinstance(b, str):
            assert a == b, field
        elif a is None or b is None:
            assert a is None and b is None, field
        else:
            assert math.isclose(a, b, abs_tol=1e-6), f"{field}: {a} != {b}"
