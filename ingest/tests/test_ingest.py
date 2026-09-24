"""ingest.py unit tests: no network, no MediaPipe. The full pipeline
(Openverse queries, image fetch, pose detection) is exercised manually
via `python ingest.py --limit N --terms ...` and reported in
docs/build/PHASE-2.md's report, not in CI."""

import json
from pathlib import Path

import jsonschema
import pytest

import ingest
import signature as sig

SCHEMA = json.loads((Path(__file__).parents[2] / "shared" / "index.schema.json").read_text())

BASELINE_JOINTS: sig.Joints = {
    "nose": {"x": 0, "y": 0, "v": 1},
    "shoulder_L": {"x": -1, "y": 2, "v": 1}, "shoulder_R": {"x": 1, "y": 2, "v": 1},
    "elbow_L": {"x": -1, "y": 5, "v": 1}, "elbow_R": {"x": 1, "y": 5, "v": 1},
    "wrist_L": {"x": -1, "y": 8, "v": 1}, "wrist_R": {"x": 1, "y": 8, "v": 1},
    "hip_L": {"x": -0.8, "y": 8, "v": 1}, "hip_R": {"x": 0.8, "y": 8, "v": 1},
    "knee_L": {"x": -0.8, "y": 12, "v": 1}, "knee_R": {"x": 0.8, "y": 12, "v": 1},
    "ankle_L": {"x": -0.8, "y": 16, "v": 1}, "ankle_R": {"x": 0.8, "y": 16, "v": 1},
}

GOOD_RECORD = {
    "id": "abc123",
    "provider": "flickr",
    "thumbnail": "https://example.com/thumb.jpg",
    "foreign_landing_url": "https://example.com/photo",
    "license": "by",
    "license_version": "2.0",
    "creator": "someone",
    "title": "a photo",
    "attribution": "\"a photo\" by someone is licensed under CC BY 2.0.",
    "mature": False,
}


def test_build_entry_matches_schema():
    entry = ingest.build_entry(GOOD_RECORD, BASELINE_JOINTS)
    jsonschema.validate(entry, SCHEMA)
    assert len(entry["j"]) == 26
    assert len(entry["v"]) == 13
    assert entry["sig"]["weight_side"] == "even"


@pytest.mark.parametrize("overrides,expected", [
    ({}, True),
    ({"license": ""}, False),
    ({"license": None}, False),
    ({"creator": None}, False),  # RESULTS.md: creator can be null in practice
    ({"creator": ""}, False),
    ({"foreign_landing_url": None}, False),
    ({"mature": True}, False),
])
def test_passes_metadata_filter(overrides, expected):
    record = {**GOOD_RECORD, **overrides}
    assert ingest.passes_metadata_filter(record) is expected


def test_load_exclude_ids(tmp_path, monkeypatch):
    exclude_file = tmp_path / "exclude.txt"
    exclude_file.write_text("id-one\n# a comment\nid-two # inline comment\n\n")
    monkeypatch.setattr(ingest, "EXCLUDE_FILE", exclude_file)
    assert ingest.load_exclude_ids() == {"id-one", "id-two"}


def test_load_exclude_ids_missing_file(tmp_path, monkeypatch):
    monkeypatch.setattr(ingest, "EXCLUDE_FILE", tmp_path / "does_not_exist.txt")
    assert ingest.load_exclude_ids() == set()


def test_build_stats_percentiles_are_ordered():
    entries = [ingest.build_entry({**GOOD_RECORD, "id": f"id{i}"}, BASELINE_JOINTS) for i in range(5)]
    stats = ingest.build_stats(entries)
    assert stats["count"] == 5
    assert "torso_lean" in stats["features"]
    for feature in stats["features"].values():
        assert feature["p2"] <= feature["p50"] <= feature["p98"]
    assert "weight_side" not in stats["features"]  # categorical, not percentiled
