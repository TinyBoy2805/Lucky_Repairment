import json
import os
import sys
import time
import urllib.error
import urllib.request

QUERY_URL = os.getenv("OLLAMA_QUERY_URL", "http://host.docker.internal:11434")
EMBED_URL = os.getenv("OLLAMA_EMBED_URL", "http://host.docker.internal:11435")
QUERY_MODEL = os.getenv("OLLAMA_QUERY_MODEL", "qwen2.5-rag")
EMBED_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "qwen3-embedding:0.6b")


def request(url: str, body: dict | None = None, timeout: int = 180) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="GET" if body is None else "POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def check(name: str, condition: bool, detail: str = "") -> bool:
    print(f"{'PASS' if condition else 'FAIL'}  {name}  [{detail}]")
    return condition


def model_names(base: str) -> list[str]:
    data = request(f"{base}/api/tags")
    return [item.get("name", "") for item in data.get("models", [])]


def main() -> int:
    failed = False

    try:
        query_models = model_names(QUERY_URL)
        embed_models = model_names(EMBED_URL)
        failed |= not check(
            "query Ollama reachable",
            any(name.startswith(QUERY_MODEL) for name in query_models),
            f"{QUERY_URL} models={len(query_models)}",
        )
        failed |= not check(
            "embed Ollama reachable",
            any(name.startswith(EMBED_MODEL) for name in embed_models),
            f"{EMBED_URL} models={len(embed_models)}",
        )
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"FAIL  Ollama connectivity: {error}")
        return 1

    started = time.time()
    data = request(
        f"{QUERY_URL}/api/chat",
        {
            "model": QUERY_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": "Trả lời ngắn: dịch vụ sửa điện là gì?",
                }
            ],
            "stream": False,
            "options": {"num_predict": 80},
        },
    )
    content = data.get("message", {}).get("content", "")
    failed |= not check(
        "query model chat",
        bool(content),
        f"latency={time.time() - started:.1f}s",
    )

    started = time.time()
    data = request(
        f"{EMBED_URL}/api/embed",
        {"model": EMBED_MODEL, "input": ["Xin chào Lucky Repairment"]},
    )
    embeddings = data.get("embeddings") or []
    dimensions = len(embeddings[0]) if embeddings else 0
    failed |= not check(
        "embedding model",
        dimensions == 1024,
        f"dim={dimensions} latency={time.time() - started:.1f}s",
    )

    for label, base in (("query", QUERY_URL), ("embed", EMBED_URL)):
        try:
            data = request(f"{base}/api/ps")
            models = data.get("models") or []
            for item in models:
                size = item.get("size") or 0
                vram = item.get("size_vram") or 0
                percent = round(vram / size * 100) if size else 0
                print(
                    f"INFO  {label}: {item.get('name')} "
                    f"vram={vram / 1e9:.2f}GB/{size / 1e9:.2f}GB ({percent}% GPU)"
                )
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            print(f"WARN  {label} /api/ps: {error}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
