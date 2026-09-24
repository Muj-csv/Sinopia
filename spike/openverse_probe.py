"""Phase 0 task 4: one filtered Openverse search. Confirms the real
field names ARCHITECTURE.md §8-9 needs for ingest.py (Phase 2):
license, license_version, creator, landing URL, thumbnail, provider.

Usage: python openverse_probe.py
Writes out/openverse_probe_results.json (5 raw results).
"""

import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://api.openverse.org/v1/images/"
PARAMS = {
    "q": "person dancing",
    "license_type": "commercial,modification",
    "mature": "false",
    "category": "photograph",
    "page_size": 5,
}
OUT_DIR = Path(__file__).parent / "out"
OUT_FILE = OUT_DIR / "openverse_probe_results.json"

FIELD_MAP = {
    "license": "license",
    "license_version": "license_version",
    "creator": "creator",
    "landing URL": "foreign_landing_url",
    "thumbnail": "thumbnail",
    "provider": "provider",
    "id (dedup key)": "id",
    "attribution (precomputed)": "attribution",
}


def main() -> None:
    url = f"{API_URL}?{urlencode(PARAMS)}"
    # Openverse rejects the default urllib user agent with 403.
    req = Request(url, headers={"User-Agent": "sinopia-ingest-probe/0.1"})
    with urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())

    OUT_DIR.mkdir(exist_ok=True)
    OUT_FILE.write_text(json.dumps(data, indent=2))

    results = data.get("results", [])
    print(f"query: {PARAMS}")
    print(f"result_count (total matching): {data.get('result_count')}")
    print(f"saved {len(results)} raw results -> {OUT_FILE}")
    print()
    print("Real field names for ARCHITECTURE.md §8-9:")
    for label, key in FIELD_MAP.items():
        sample = results[0].get(key) if results else None
        print(f"  {label:28s} -> results[].{key!r}  e.g. {sample!r}")


if __name__ == "__main__":
    main()
