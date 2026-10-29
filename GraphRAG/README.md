# GraphRAG sidecar

Local GraphRAG service. The KG is indexed once with Cloudflare Workers AI; queries run fully local with Ollama. Queries never rebuild the index.

## Windows shortcuts

- `start.bat` — starts Docker Desktop, Ollama (GPU + CPU), and the sidecar.
- `stop.bat` — stops the sidecar and Ollama. It leaves Docker Desktop running.

## Models

| Role | Model | Where |
| --- | --- | --- |
| KG extraction | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Cloudflare, offline build |
| Query chat | `qwen2.5-rag` | Ollama, GPU |
| Embeddings | `qwen3-embedding:0.6b` | Ollama, CPU |

`qwen2.5-rag` is built from `qwen2.5:7b-instruct-q4_K_S` with `num_ctx 4096` (see `Modelfile`).

## Setup

1. Copy `.env.example` to `.env` and fill:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN` (Workers AI → Edit)
   - `ASSISTANT_TOKEN` (same value in `Server/.env`)
   - `OLLAMA_*` values if you changed ports/models
2. Install Ollama and pull models:
   ```bash
   ollama pull qwen2.5:7b-instruct-q4_K_S
   ollama pull qwen3-embedding:0.6b
   ollama create qwen2.5-rag -f Modelfile
   ```
3. Start the two local Ollama instances:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/start-ollama.ps1
   ```
   - `11434`: chat on GPU
   - `11435`: embeddings on CPU
4. Start Docker Desktop.
5. Export source data:
   ```bash
   cd Server
   npm run export:assistant
   ```
6. Build the sidecar image and check both providers:
   ```bash
   cd GraphRAG
   docker compose build graphrag
   docker compose run --rm --no-deps graphrag python scripts/check_ollama.py
   docker compose run --rm --no-deps graphrag python scripts/check_cloudflare.py
   ```
   `check_cloudflare.py` only validates the 70B indexing model. A `429` means the daily free quota is exhausted; the existing index is still usable.
7. Reindex when documents/embeddings change:
   ```bash
   docker compose --profile index run --rm graphrag-index python -m service.indexer --force
   ```
8. Start the sidecar:
   ```bash
   docker compose up -d graphrag
   ```
9. Verify:
   ```bash
   docker compose exec graphrag python -m service.preflight
   docker compose exec graphrag python scripts/verify_demo.py
   ```

The seeded demo cache works even before the index exists, so the UI can be demoed immediately.

## Notes

- Query is fully local: Qwen 7B on GPU, `qwen3-embedding` on CPU. No Cloudflare calls at query time.
- VRAM target: 7B Q4_K_S ~4.5GB; embedding model ~0.7GB on CPU.
- A second GPU process can push the 7B to `90% GPU / 10% CPU`; close games/browsers before the demo.
- `input/`, `output/`, `spike/`, `cache/`, `logs/`, and `output-cloudflare/` are generated and gitignored.
- `output-cloudflare/` is the pre-local-embedding index backup.
- The runtime answer cache lives in `cache/demo_cache.json`.
- Reindex only when services/categories/policies change.
- Cloudflare Workers Free includes 10,000 neurons/day for the one-time KG build.
- `ASSISTANT_CACHE_FIRST=true` makes seeded demo answers win; set it to `false` to query GraphRAG first.
- `ASSISTANT_ALLOW_REINDEX=false` disables the admin reindex endpoint during the demo.
- Global search is disabled by default (`ASSISTANT_ALLOW_GLOBAL=false`).
