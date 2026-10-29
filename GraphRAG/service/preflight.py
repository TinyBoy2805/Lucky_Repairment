import json
import os
import sys

from service.common import (
    CACHE_FILE,
    INPUT_MANIFEST_FILE,
    OUTPUT_MANIFEST_FILE,
    SEED_CACHE_FILE,
    SOURCES_FILE,
    index_ready,
    load_cache,
    read_json,
)


def main() -> int:
    checks: list[tuple[str, bool, str]] = []

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN", "")
    index_model = os.getenv("CF_INDEX_MODEL", "")
    query_url = os.getenv("OLLAMA_QUERY_URL", "")
    embed_url = os.getenv("OLLAMA_EMBED_URL", "")
    query_model = os.getenv("OLLAMA_QUERY_MODEL", "")
    embedding_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "")

    checks.append(
        ("CLOUDFLARE_ACCOUNT_ID is set", bool(account_id), "set" if account_id else "missing")
    )
    checks.append(
        ("CLOUDFLARE_API_TOKEN is set", bool(api_token), "set" if api_token else "missing")
    )
    checks.append(("CF_INDEX_MODEL is set", bool(index_model), index_model or "missing"))
    checks.append(("OLLAMA_QUERY_URL is set", bool(query_url), query_url or "missing"))
    checks.append(("OLLAMA_EMBED_URL is set", bool(embed_url), embed_url or "missing"))
    checks.append(("OLLAMA_QUERY_MODEL is set", bool(query_model), query_model or "missing"))
    checks.append(
        ("OLLAMA_EMBEDDING_MODEL is set", bool(embedding_model), embedding_model or "missing")
    )

    sources = read_json(SOURCES_FILE, {}) or {}
    service_count = len(sources.get("services") or {})
    checks.append(("sources.json has services", service_count > 0, str(service_count)))

    input_manifest = read_json(INPUT_MANIFEST_FILE, {}) or {}
    checks.append(
        (
            "input manifest has dataHash",
            bool(input_manifest.get("dataHash")),
            str(input_manifest.get("dataHash", ""))[:12],
        )
    )

    checks.append(("index artifacts are ready", index_ready(), str(index_ready())))

    output_manifest = read_json(OUTPUT_MANIFEST_FILE, {}) or {}
    checks.append(
        (
            "index manifest matches input",
            output_manifest.get("dataHash") == input_manifest.get("dataHash"),
            str(output_manifest.get("dataHash", ""))[:12],
        )
    )

    cache_entries = load_cache()
    checks.append(("demo cache is loaded", len(cache_entries) > 0, str(len(cache_entries))))
    checks.append(("seed cache exists", SEED_CACHE_FILE.exists(), str(SEED_CACHE_FILE)))
    checks.append(("runtime cache path", True, str(CACHE_FILE)))

    for name, passed, detail in checks:
        print(f"{'PASS' if passed else 'FAIL'}  {name}  [{detail}]")

    failed = [name for name, passed, _ in checks if not passed]
    print(json.dumps({"passed": len(checks) - len(failed), "failed": failed}))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
