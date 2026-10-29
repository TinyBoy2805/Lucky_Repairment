import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "input"
OUTPUT_DIR = ROOT / "output"
CACHE_FILE = ROOT / "cache" / "demo_cache.json"
SEED_CACHE_FILE = ROOT / "demo_cache.seed.json"
SOURCES_FILE = INPUT_DIR / "sources.json"
INPUT_MANIFEST_FILE = INPUT_DIR / "manifest.json"
OUTPUT_MANIFEST_FILE = OUTPUT_DIR / "index_manifest.json"

INDEX_FILES = [
    "entities.parquet",
    "communities.parquet",
    "community_reports.parquet",
    "text_units.parquet",
    "relationships.parquet",
]


def read_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temp.replace(path)


def normalize(text: str) -> str:
    value = unicodedata.normalize("NFC", str(text or "")).casefold().strip()
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0

    left_tokens = set(left.split())
    right_tokens = set(right.split())
    union = left_tokens | right_tokens
    jaccard = len(left_tokens & right_tokens) / len(union) if union else 0.0
    sequence = SequenceMatcher(None, left, right).ratio()
    return max(jaccard, sequence)


def load_sources() -> dict:
    data = read_json(SOURCES_FILE, {})
    return data if isinstance(data, dict) else {}


def index_ready() -> bool:
    if not OUTPUT_DIR.joinpath("lancedb").exists():
        return False
    return all(OUTPUT_DIR.joinpath(name).exists() for name in INDEX_FILES)


def load_cache() -> dict[str, dict]:
    merged: dict[str, dict] = {}

    seed = read_json(SEED_CACHE_FILE, {})
    if isinstance(seed, dict):
        merged.update(seed.get("entries") or {})

    runtime = read_json(CACHE_FILE, {})
    if isinstance(runtime, dict):
        merged.update(runtime.get("entries") or {})

    return merged


def save_cache(entries: dict[str, dict]) -> None:
    write_json(CACHE_FILE, {"version": 1, "entries": entries})


def find_cache_entry(
    question: str,
    entries: dict[str, dict],
    min_score: float = 0.78,
) -> dict | None:
    key = normalize(question)
    if not key:
        return None

    exact = entries.get(key)
    if exact:
        return exact

    best_score = 0.0
    best_entry = None
    for cached_key, entry in entries.items():
        score = similarity(key, cached_key)
        if score > best_score:
            best_score = score
            best_entry = entry

    if best_entry and best_score >= min_score:
        return best_entry

    return None
