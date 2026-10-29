import argparse
import asyncio
import hashlib
import json
import time

from service.common import (
    INPUT_DIR,
    INPUT_MANIFEST_FILE,
    OUTPUT_MANIFEST_FILE,
    ROOT,
    index_ready,
    read_json,
    write_json,
)


async def run_index(force: bool = False, spike: int = 0) -> dict:
    if spike > 0:
        return await _run_spike(spike)

    source = read_json(INPUT_MANIFEST_FILE, {}) or {}
    previous = read_json(OUTPUT_MANIFEST_FILE, {}) or {}

    source_hash = source.get("dataHash")
    if (
        not force
        and source_hash
        and source_hash == previous.get("dataHash")
        and index_ready()
    ):
        return {
            "skipped": True,
            "reason": "Index is up to date.",
            "dataHash": source_hash,
        }

    from graphrag.api import build_index
    from graphrag.config.load_config import load_config

    config = load_config(str(ROOT))
    results = await build_index(config)

    failures = [
        f"{result.workflow}: {result.error}"
        for result in results
        if getattr(result, "error", None)
    ]
    if failures:
        raise RuntimeError("Indexing failed: " + "; ".join(failures))

    manifest = {
        "dataHash": source_hash,
        "builtAt": int(time.time() * 1000),
        "generatedAt": source.get("generatedAt"),
        "counts": source.get("counts") or {},
        "graphragVersion": _graphrag_version(),
    }
    write_json(OUTPUT_MANIFEST_FILE, manifest)

    return {
        "skipped": False,
        "dataHash": source_hash,
        "workflows": len(results),
        "manifest": manifest,
    }


async def _run_spike(limit: int) -> dict:
    documents = read_json(INPUT_DIR / "documents.json", []) or []
    selected = documents[:limit]
    if not selected:
        raise RuntimeError("No documents available for the spike.")

    spike_input = ROOT / "spike" / "input"
    spike_output = ROOT / "spike" / "output"
    spike_input.mkdir(parents=True, exist_ok=True)
    spike_output.mkdir(parents=True, exist_ok=True)

    write_json(spike_input / "documents.json", selected)
    spike_hash = hashlib.sha256(
        json.dumps(selected, ensure_ascii=False).encode("utf-8")
    ).hexdigest()

    from graphrag.api import build_index
    from graphrag.config.load_config import load_config

    config = load_config(
        str(ROOT),
        cli_overrides={
            "input_storage": {"base_dir": "spike/input"},
            "output_storage": {"base_dir": "spike/output"},
            "vector_store": {"db_uri": "spike/output/lancedb"},
        },
    )
    started = time.time()
    results = await build_index(config)

    failures = [
        f"{result.workflow}: {result.error}"
        for result in results
        if getattr(result, "error", None)
    ]
    if failures:
        raise RuntimeError("Spike indexing failed: " + "; ".join(failures))

    manifest = {
        "dataHash": spike_hash,
        "builtAt": int(time.time() * 1000),
        "documents": len(selected),
        "durationSeconds": round(time.time() - started, 1),
        "graphragVersion": _graphrag_version(),
    }
    write_json(spike_output / "index_manifest.json", manifest)

    return {
        "spike": True,
        "documents": len(selected),
        "workflows": len(results),
        "manifest": manifest,
        "output": str(spike_output),
    }


def _graphrag_version() -> str:
    try:
        from importlib.metadata import version

        return version("graphrag")
    except Exception:
        return "unknown"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the GraphRAG index.")
    parser.add_argument("--force", action="store_true", help="Rebuild even if unchanged.")
    parser.add_argument(
        "--spike",
        type=int,
        default=0,
        metavar="N",
        help="Index only the first N documents into spike/output.",
    )
    args = parser.parse_args()

    result = asyncio.run(run_index(force=args.force, spike=args.spike))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
