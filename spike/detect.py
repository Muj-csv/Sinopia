"""Phase 0 task 2: measure automatic pose detection on real gesture
sketches, across 4 preprocessing variants. Sets D-002 (default capture
path: auto-detect first vs. manual placement first).

Depends on ingest/requirements.txt (mediapipe, pillow, numpy) — install
that first: `pip install -r ../ingest/requirements.txt`.

Usage: python detect.py
Reads every image in sketches/, writes one overlay PNG per
(image, variant) to out/overlays/, and out/detect_results.json.
Prints a per-variant detection-rate summary; feed that into RESULTS.md.
"""

import json
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

SKETCH_DIR = Path(__file__).parent / "sketches"
OUT_DIR = Path(__file__).parent / "out"
OVERLAY_DIR = OUT_DIR / "overlays"
MODEL_PATH = Path(__file__).parent / "pose_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)

# MediaPipe's 33-point pose model, indices for the 13 core joints
# ARCHITECTURE.md §3 keeps (hands/feet/face detail dropped).
CORE_JOINTS = {
    "nose": 0,
    "shoulder_L": 11,
    "shoulder_R": 12,
    "elbow_L": 13,
    "elbow_R": 14,
    "wrist_L": 15,
    "wrist_R": 16,
    "hip_L": 23,
    "hip_R": 24,
    "knee_L": 25,
    "knee_R": 26,
    "ankle_L": 27,
    "ankle_R": 28,
}
SKELETON_EDGES = [
    ("shoulder_L", "shoulder_R"),
    ("shoulder_L", "elbow_L"), ("elbow_L", "wrist_L"),
    ("shoulder_R", "elbow_R"), ("elbow_R", "wrist_R"),
    ("hip_L", "hip_R"),
    ("shoulder_L", "hip_L"), ("shoulder_R", "hip_R"),
    ("hip_L", "knee_L"), ("knee_L", "ankle_L"),
    ("hip_R", "knee_R"), ("knee_R", "ankle_R"),
]
VISIBILITY_THRESHOLD = 0.3


def ensure_model() -> None:
    if MODEL_PATH.exists():
        return
    print(f"downloading pose model -> {MODEL_PATH}")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


# --- preprocessing variants (ARCHITECTURE.md / PHASE-0.md task 2) ---

def variant_raw(img: Image.Image) -> Image.Image:
    return img.convert("RGB")


def variant_contrast(img: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(img)
    stretched = ImageOps.autocontrast(gray, cutoff=1)
    return stretched.convert("RGB")


def variant_dilated(img: Image.Image) -> Image.Image:
    stretched = variant_contrast(img).convert("L")
    # Dark sketch lines get thicker: MinFilter darkens by taking the min
    # (darkest) pixel in each neighborhood.
    dilated = stretched.filter(ImageFilter.MinFilter(3))
    return dilated.convert("RGB")


def variant_gray_fill(img: Image.Image) -> Image.Image:
    dilated = variant_dilated(img).convert("L")
    arr = np.array(dilated).astype(np.float32)
    # Composite onto light gray paper: white background pixels are pulled
    # toward gray, dark strokes stay dark, to mimic a physical sketchbook.
    paper = 235.0
    mask = (arr > 245).astype(np.float32)  # near-white -> replace with paper
    out = arr * (1 - mask) + paper * mask
    return Image.fromarray(out.astype(np.uint8)).convert("RGB")


VARIANTS = {
    "raw": variant_raw,
    "grayscale_contrast": variant_contrast,
    "grayscale_contrast_dilated": variant_dilated,
    "grayscale_contrast_dilated_gray_fill": variant_gray_fill,
}


def draw_overlay(img: Image.Image, landmarks) -> Image.Image:
    overlay = img.copy()
    draw = ImageDraw.Draw(overlay)
    w, h = overlay.size
    points = {}
    for name, idx in CORE_JOINTS.items():
        lm = landmarks[idx]
        if lm.visibility >= VISIBILITY_THRESHOLD:
            points[name] = (lm.x * w, lm.y * h)
    for a, b in SKELETON_EDGES:
        if a in points and b in points:
            draw.line([points[a], points[b]], fill=(255, 0, 0), width=3)
    for x, y in points.values():
        r = 5
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(0, 200, 0))
    return overlay


def run() -> None:
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import (
        PoseLandmarker,
        PoseLandmarkerOptions,
        RunningMode,
    )

    ensure_model()
    OVERLAY_DIR.mkdir(parents=True, exist_ok=True)

    images = sorted(
        p for p in SKETCH_DIR.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg")
    )
    if not images:
        print(f"no sketches found in {SKETCH_DIR} -- nothing to detect.")
        print("Phase 0 blocked: RESULTS.md cannot report a real detection rate")
        print("until the team's ~30 gesture sketches are added there.")
        OUT_DIR.mkdir(exist_ok=True)
        (OUT_DIR / "detect_results.json").write_text(json.dumps({
            "status": "blocked",
            "reason": "sketches/ is empty",
            "images": [],
        }, indent=2))
        return

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=RunningMode.IMAGE,
    )

    results = {}
    with PoseLandmarker.create_from_options(options) as landmarker:
        for variant_name, preprocess in VARIANTS.items():
            variant_results = []
            for img_path in images:
                img = Image.open(img_path)
                processed = preprocess(img)
                mp_image = _to_mp_image(processed)
                detection = landmarker.detect(mp_image)

                detected = bool(detection.pose_landmarks)
                visible_count = 0
                if detected:
                    landmarks = detection.pose_landmarks[0]
                    visible_count = sum(
                        1 for idx in CORE_JOINTS.values()
                        if landmarks[idx].visibility >= VISIBILITY_THRESHOLD
                    )
                    overlay = draw_overlay(processed, landmarks)
                    overlay.save(OVERLAY_DIR / f"{img_path.stem}__{variant_name}.png")

                variant_results.append({
                    "image": img_path.name,
                    "detected": detected,
                    "core_joints_visible": visible_count,
                    "core_joints_total": len(CORE_JOINTS),
                })
            results[variant_name] = variant_results

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "detect_results.json").write_text(json.dumps(results, indent=2))

    print(f"{len(images)} sketches x {len(VARIANTS)} variants\n")
    for variant_name, variant_results in results.items():
        n = len(variant_results)
        detected = sum(1 for r in variant_results if r["detected"])
        avg_joints = (
            sum(r["core_joints_visible"] for r in variant_results) / n if n else 0
        )
        print(
            f"{variant_name:40s} detected {detected}/{n} "
            f"({100 * detected / n:.0f}%)  avg core joints visible: {avg_joints:.1f}/13"
        )


def _to_mp_image(pil_img: Image.Image):
    import mediapipe as mp
    arr = np.array(pil_img.convert("RGB"))
    return mp.Image(image_format=mp.ImageFormat.SRGB, data=arr)


if __name__ == "__main__":
    run()
