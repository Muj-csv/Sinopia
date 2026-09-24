"""Openverse ingest pipeline (ARCHITECTURE.md §2, §8). FR-008 (ingest
side), NFR-004. Builds index.v1.json + stats.json from openly licensed
single-person photos.

Usage:
    python ingest.py --limit 3000
    python ingest.py --limit 30 --terms "person dancing,yoga pose person"

Writes out/index.v1.json, out/stats.json. Copy both into
web/public/ once reviewed (see review.html / exclude.txt).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import signature as sig  # noqa: E402

API_URL = "https://api.openverse.org/v1/images/"
USER_AGENT = "sinopia-ingest/0.1 (GIBC V2 hackathon project)"
OUT_DIR = Path(__file__).parent / "out"
EXCLUDE_FILE = Path(__file__).parent / "exclude.txt"
MODEL_PATH = Path(__file__).parent / "pose_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)

# ARCHITECTURE.md §8: favour dynamic poses, plus everyday standing/sitting/reaching.
DEFAULT_SEARCH_TERMS = [
    "person dancing", "person running", "martial arts kick", "yoga pose person",
    "person climbing wall", "parkour jump", "worker lifting box", "person throwing ball",
    "gymnast pose", "basketball player jumping", "swimmer diving", "person walking",
    "person standing", "person sitting", "person reaching shelf", "person stretching",
]

MIN_VISIBLE_CORE_JOINTS = 9
PAGE_SIZE = 20
MAX_RETRIES = 4
RETRY_BASE_DELAY = 1.5

# MediaPipe's 33-point pose model, indices for the 13 core joints
# ARCHITECTURE.md §3 keeps (hands/feet/face detail dropped). Order must
# match signature.CORE_JOINT_NAMES (used for the stored `j` array).
LANDMARK_INDEX = {
    "nose": 0,
    "shoulder_L": 11, "shoulder_R": 12,
    "elbow_L": 13, "elbow_R": 14,
    "wrist_L": 15, "wrist_R": 16,
    "hip_L": 23, "hip_R": 24,
    "knee_L": 25, "knee_R": 26,
    "ankle_L": 27, "ankle_R": 28,
}


def ensure_model() -> None:
    if MODEL_PATH.exists():
        return
    print(f"downloading pose model -> {MODEL_PATH}")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


def fetch_with_retry(url: str, headers: dict[str, str] | None = None, timeout: int = 15) -> bytes:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            req = Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
            with urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except HTTPError as e:
            if e.code == 429 or e.code >= 500:
                last_error = e
            else:
                raise  # 4xx other than 429: don't retry, it won't succeed
        except URLError as e:
            last_error = e
        time.sleep(RETRY_BASE_DELAY * (2 ** attempt))
    raise RuntimeError(f"failed after {MAX_RETRIES} retries: {url}") from last_error


def search_openverse(term: str, limit: int):
    """Yields Openverse result dicts for one search term, paginated."""
    page = 1
    fetched = 0
    while fetched < limit:
        params = {
            "q": term,
            "license_type": "commercial,modification",
            "mature": "false",
            "category": "photograph",
            "page_size": min(PAGE_SIZE, limit - fetched),
            "page": page,
        }
        url = f"{API_URL}?{urlencode(params)}"
        try:
            body = fetch_with_retry(url)
        except (HTTPError, RuntimeError) as e:
            print(f"  [{term}] page {page} failed: {e}, stopping this term")
            return
        data = json.loads(body)
        results = data.get("results", [])
        if not results:
            return
        for r in results:
            yield r
            fetched += 1
            if fetched >= limit:
                return
        page += 1


def passes_metadata_filter(record: dict) -> bool:
    """ARCHITECTURE §8: drop records missing license, creator or source URL.
    RESULTS.md (Phase 0): creator can be null in practice, not just absent."""
    if record.get("mature"):
        return False
    if not record.get("license"):
        return False
    if not record.get("creator"):
        return False
    if not record.get("foreign_landing_url"):
        return False
    return True


def detect_joints(landmarker, image_bytes: bytes) -> tuple[sig.Joints | None, int]:
    """Returns (joints dict or None if not exactly one person detected,
    number of core joints with visibility >= threshold)."""
    import mediapipe as mp

    img = Image.open(__import__("io").BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=arr)
    result = landmarker.detect(mp_image)

    if not result.pose_landmarks:
        return None, 0
    if len(result.pose_landmarks) != 1:
        return None, 0  # 0 or 2+ people: reject (single-person only)

    landmarks = result.pose_landmarks[0]
    joints: sig.Joints = {}
    visible_count = 0
    for name, idx in LANDMARK_INDEX.items():
        lm = landmarks[idx]
        v = getattr(lm, "visibility", 1.0)
        joints[name] = {"x": lm.x, "y": lm.y, "v": v}
        if v >= sig.VISIBILITY_THRESHOLD:
            visible_count += 1
    return joints, visible_count


def build_entry(record: dict, joints: sig.Joints) -> dict:
    normalized, _ = sig.normalize_joints(joints)
    signature = sig.compute_features(normalized)

    j: list[float] = []
    v: list[float] = []
    for name in sig.CORE_JOINT_NAMES:
        p = normalized.get(name) if normalized else None
        j.extend([p[0], p[1]] if p is not None else [0.0, 0.0])
        joint = joints.get(name)
        v.append(joint["v"] if joint else 0.0)

    return {
        "id": record["id"],
        "provider": record.get("provider", ""),
        "thumb": record.get("thumbnail", ""),
        "landing": record["foreign_landing_url"],
        "license": record["license"],
        "license_version": record.get("license_version", ""),
        "creator": record["creator"],
        "title": record.get("title", ""),
        "attribution": record.get("attribution", ""),
        "j": j,
        "v": v,
        "sig": signature,
    }


def load_exclude_ids() -> set[str]:
    if not EXCLUDE_FILE.exists():
        return set()
    ids = set()
    for line in EXCLUDE_FILE.read_text().splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            ids.add(line)
    return ids


def build_stats(entries: list[dict]) -> dict:
    percentiles = [2, 5, 50, 95, 98]
    features: dict[str, dict] = {}
    for field in sig.SIGNATURE_FIELDS:
        if field == "weight_side":
            continue
        values = [e["sig"].get(field) for e in entries if e["sig"].get(field) is not None]
        if not values:
            continue
        arr = np.array(values, dtype=float)
        features[field] = {f"p{p}": float(np.percentile(arr, p)) for p in percentiles}
    return {"count": len(entries), "features": features}


def run(limit: int, terms: list[str]) -> None:
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import (
        PoseLandmarker,
        PoseLandmarkerOptions,
        RunningMode,
    )

    ensure_model()
    OUT_DIR.mkdir(exist_ok=True)
    exclude_ids = load_exclude_ids()

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=RunningMode.IMAGE,
        num_poses=2,  # >1 detected => reject as multi-person
    )

    per_limit = max(1, limit // len(terms))
    seen_ids: set[str] = set()
    entries: list[dict] = []
    counts_by_term: dict[str, dict[str, int]] = {}

    with PoseLandmarker.create_from_options(options) as landmarker:
        for term in terms:
            counts_by_term[term] = {"queried": 0, "kept": 0}
            for record in search_openverse(term, per_limit):
                counts_by_term[term]["queried"] += 1
                rid = record.get("id")
                if not rid or rid in seen_ids or rid in exclude_ids:
                    continue
                if not passes_metadata_filter(record):
                    continue

                image_url = record.get("url")
                if not image_url:
                    continue
                try:
                    image_bytes = fetch_with_retry(image_url, timeout=20)
                except Exception as e:
                    print(f"  [{term}] image fetch failed for {rid}: {e}")
                    continue

                try:
                    joints, visible_count = detect_joints(landmarker, image_bytes)
                except Exception as e:
                    print(f"  [{term}] detection failed for {rid}: {e}")
                    continue

                if joints is None or visible_count < MIN_VISIBLE_CORE_JOINTS:
                    continue

                seen_ids.add(rid)
                entries.append(build_entry(record, joints))
                counts_by_term[term]["kept"] += 1

    index_path = OUT_DIR / "index.v1.json"
    stats_path = OUT_DIR / "stats.json"
    index_path.write_text(json.dumps(entries))
    stats_path.write_text(json.dumps(build_stats(entries), indent=2))

    print(f"\n{len(entries)} entries kept (target: {limit})\n")
    print(f"{'term':32s} {'queried':>8s} {'kept':>6s}")
    for term, c in counts_by_term.items():
        print(f"{term:32s} {c['queried']:8d} {c['kept']:6d}")
    print(f"\nwrote {index_path}")
    print(f"wrote {stats_path}")
    if exclude_ids:
        print(f"({len(exclude_ids)} previously-excluded ids skipped)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3000)
    parser.add_argument("--terms", type=str, default=None, help="comma-separated, overrides the default list")
    args = parser.parse_args()
    terms = args.terms.split(",") if args.terms else DEFAULT_SEARCH_TERMS
    run(args.limit, terms)


if __name__ == "__main__":
    main()
