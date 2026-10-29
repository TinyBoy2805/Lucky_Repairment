import asyncio
import logging
import os
import re
import secrets
import threading
import time
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]

try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:
    pass

from service.common import (
    INPUT_MANIFEST_FILE,
    OUTPUT_MANIFEST_FILE,
    find_cache_entry,
    index_ready,
    load_cache,
    load_sources,
    normalize,
    read_json,
    save_cache,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("assistant")

ASSISTANT_TOKEN = os.getenv("ASSISTANT_TOKEN", "")
ALLOW_REINDEX = os.getenv("ASSISTANT_ALLOW_REINDEX", "false").lower() == "true"
ALLOW_GLOBAL = os.getenv("ASSISTANT_ALLOW_GLOBAL", "false").lower() == "true"
CACHE_FIRST = os.getenv("ASSISTANT_CACHE_FIRST", "true").lower() == "true"

_cache_lock = threading.Lock()
_cache: dict[str, dict] = load_cache()
_graphrag_lock = asyncio.Lock()
_graphrag_state: tuple[Any, dict, Any] | None = None

_index_state: dict[str, Any] = {
    "running": False,
    "startedAt": None,
    "finishedAt": None,
    "ok": None,
    "error": None,
}

app = FastAPI(title="Lucky Repairment GraphRAG", version="1.0.0")


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    mode: Literal["auto", "local", "global"] = "auto"
    service_id: str | None = Field(default=None, max_length=120)
    history: list[dict] = Field(default_factory=list)


async def require_token(
    x_assistant_token: Annotated[str | None, Header()] = None,
) -> None:
    if not ASSISTANT_TOKEN:
        return
    if not x_assistant_token or not secrets.compare_digest(
        x_assistant_token, ASSISTANT_TOKEN
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _clean_answer(text: str) -> str:
    cleaned = re.sub(r"\[Data:[^\]]*\]", "", text)
    cleaned = re.sub(r"\[(?:service|policy|category):[^\]]+\]", "", cleaned)
    cleaned = re.sub(r"^#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.replace("**", "").replace("__", "")
    cleaned = re.sub(r"\s+([.,;:!?])", r"\1", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _iter_strings(value: Any):
    if value is None:
        return
    if isinstance(value, str):
        yield value
        return
    if isinstance(value, dict):
        for item in value.values():
            yield from _iter_strings(item)
        return
    if isinstance(value, (list, tuple, set)):
        for item in value:
            yield from _iter_strings(item)
        return
    if hasattr(value, "to_string"):
        try:
            yield value.to_string()
        except Exception:
            return


def _source_document_ids(context: Any, text_units: Any) -> set[str]:
    sources = context.get("sources") if isinstance(context, dict) else None
    if sources is None or not hasattr(sources, "columns"):
        return set()
    if "id" not in sources.columns:
        return set()
    if "document_id" not in text_units.columns:
        return set()

    id_column = (
        "human_readable_id"
        if "human_readable_id" in text_units.columns
        else "id"
    )
    source_ids = {str(value) for value in sources["id"].tolist()}
    matched = text_units[text_units[id_column].astype(str).isin(source_ids)]
    return {str(value) for value in matched["document_id"].tolist()}


def _build_citations(
    answer: str,
    context_text: str,
    service_id: str | None,
    document_ids: set[str] | None = None,
) -> list[dict]:
    sources = load_sources()
    services = sources.get("services") or {}
    policies = sources.get("policies") or {}
    categories = sources.get("categories") or {}

    found: list[dict] = []
    seen: set[tuple] = set()

    def add(item: dict) -> None:
        key = (item.get("type"), item.get("url"), item.get("label"))
        if key in seen:
            return
        seen.add(key)
        found.append(item)

    if service_id and service_id in services:
        meta = services[service_id]
        add(
            {
                "label": meta.get("title") or service_id,
                "url": meta.get("url") or f"/services/{service_id}",
                "type": "service",
            }
        )

    if document_ids:
        document_matched = False
        for document_id in sorted(document_ids):
            for prefix, collection, kind in (
                ("service-", services, "service"),
                ("policy-", policies, "policy"),
                ("category-", categories, "category"),
            ):
                if not document_id.startswith(prefix):
                    continue
                key = document_id[len(prefix) :]
                meta = collection.get(key)
                if not meta:
                    continue
                document_matched = True
                add(
                    {
                        "label": meta.get("title") or key,
                        "url": meta.get("url"),
                        "type": kind,
                    }
                )

    stopwords = {
        "dịch",
        "vụ",
        "và",
        "của",
        "cho",
        "các",
        "tại",
        "là",
        "có",
        "thể",
        "những",
        "một",
        "với",
        "khi",
        "thì",
        "bạn",
        "mình",
        "này",
        "được",
        "không",
        "trong",
        "để",
        "sẽ",
        "đã",
        "đang",
        "rất",
        "cũng",
        "như",
        "từ",
        "đến",
        "về",
        "theo",
        "nào",
        "gì",
        "sao",
        "nên",
        "cần",
        "hãy",
        "vui",
        "lòng",
        "nhé",
    }
    answer_text = normalize(answer)
    answer_tokens = set(answer_text.split())
    answer_matched = False

    for collection, kind in (
        (services, "service"),
        (policies, "policy"),
        (categories, "category"),
    ):
        for key, meta in collection.items():
            title = meta.get("title") or key
            title_normalized = normalize(title)
            if not title_normalized:
                continue

            title_tokens = set(title_normalized.split()) - stopwords
            if not title_tokens:
                title_tokens = set(title_normalized.split())

            overlap = len(title_tokens & answer_tokens) / len(title_tokens)
            if title_normalized in answer_text or overlap >= 0.6:
                answer_matched = True
                add(
                    {
                        "label": title,
                        "url": meta.get("url"),
                        "type": kind,
                    }
                )

    if answer_matched:
        return found[:6]

    haystack = f"{answer}\n{context_text}"
    marker_pattern = re.compile(
        r"(?:service|policy|category):([A-Za-z0-9_-]+)", re.IGNORECASE
    )
    marker_found = False
    for marker in marker_pattern.findall(haystack):
        for collection, kind in (
            (services, "service"),
            (policies, "policy"),
            (categories, "category"),
        ):
            meta = collection.get(marker)
            if not meta:
                continue
            marker_found = True
            add(
                {
                    "label": meta.get("title") or marker,
                    "url": meta.get("url"),
                    "type": kind,
                }
            )

    if not marker_found:
        normalized_haystack = normalize(haystack)
        for collection, kind in (
            (services, "service"),
            (policies, "policy"),
            (categories, "category"),
        ):
            for key, meta in collection.items():
                title = normalize(meta.get("title") or "")
                if len(title) < 8 or title not in normalized_haystack:
                    continue
                add(
                    {
                        "label": meta.get("title") or key,
                        "url": meta.get("url"),
                        "type": kind,
                    }
                )

    return found[:6]


def _service_suggestions(question: str, limit: int = 3) -> list[dict]:
    services = (load_sources().get("services") or {})
    tokens = set(normalize(question).split())
    scored = []

    for service_id, meta in services.items():
        text = normalize(f"{meta.get('title', '')} {meta.get('summary', '')}")
        score = len(tokens & set(text.split()))
        if score > 0:
            scored.append((score, service_id, meta))

    scored.sort(key=lambda item: item[0], reverse=True)

    return [
        {
            "label": meta.get("title") or service_id,
            "url": meta.get("url") or f"/services/{service_id}",
            "type": "service",
        }
        for _, service_id, meta in scored[:limit]
    ]


def _fallback_answer(question: str, service_id: str | None, reason: str) -> dict:
    sources = load_sources()
    service_meta = (sources.get("services") or {}).get(service_id) if service_id else None

    if service_meta:
        title = str(service_meta.get("title") or service_id or "dịch vụ")
        headline = (
            title
            if title.lower().startswith("dịch vụ")
            else f"Dịch vụ {title}"
        )
        details: list[str] = [headline]
        if service_meta.get("priceDisplay"):
            details.append(f"có giá tham khảo {service_meta['priceDisplay']}")
        if service_meta.get("responseTime"):
            details.append(f"thời gian có mặt {service_meta['responseTime']}")
        if service_meta.get("warranty"):
            details.append(f"bảo hành {service_meta['warranty']}")

        answer = ", ".join(details) + "."
        if service_meta.get("summary"):
            answer += f" {service_meta['summary']}"
        answer += " Chi phí cuối cùng phụ thuộc tình trạng thực tế; thợ sẽ khảo sát và báo giá trước khi sửa."

        return {
            "answer": answer,
            "citations": [
                {
                    "label": title,
                    "url": service_meta.get("url") or f"/services/{service_id}",
                    "type": "service",
                }
            ],
            "mode": "local",
            "source": "fallback",
            "degraded": True,
            "reason": reason,
        }

    cached = find_cache_entry(question, _cache, min_score=0.55)
    if cached:
        result = dict(cached)
        result["source"] = "cache"
        result["degraded"] = True
        result["reason"] = reason
        return result

    citations = _service_suggestions(question)

    answer = (
        "Mình chưa có đủ thông tin để trả lời chính xác câu hỏi này. "
        "Bạn có thể hỏi về giá, bảo hành, thời gian có mặt, hủy đơn hoặc thanh toán."
    )
    if citations:
        answer += " Một số dịch vụ liên quan có thể bạn cần:"

    return {
        "answer": answer,
        "citations": citations[:4],
        "mode": "local",
        "source": "fallback",
        "degraded": True,
        "reason": reason,
    }


def _load_graphrag_state() -> tuple[Any, dict, Any]:
    import pandas as pd
    from graphrag.config.load_config import load_config

    config = load_config(str(ROOT))
    output = ROOT / "output"
    names = [
        "entities",
        "communities",
        "community_reports",
        "text_units",
        "relationships",
    ]
    frames = {name: pd.read_parquet(output / f"{name}.parquet") for name in names}

    covariate_path = output / "covariates.parquet"
    covariates = pd.read_parquet(covariate_path) if covariate_path.exists() else None
    return config, frames, covariates


async def _run_local(question: str) -> tuple[str, str, set[str]]:
    from graphrag.api import local_search

    async with _graphrag_lock:
        global _graphrag_state
        if _graphrag_state is None:
            _graphrag_state = await asyncio.to_thread(_load_graphrag_state)

        config, frames, covariates = _graphrag_state
        response, context = await local_search(
            config=config,
            entities=frames["entities"],
            communities=frames["communities"],
            community_reports=frames["community_reports"],
            text_units=frames["text_units"],
            relationships=frames["relationships"],
            covariates=covariates,
            community_level=2,
            response_type=(
                "câu trả lời ngắn gọn, thân thiện bằng tiếng Việt; "
                "nêu rõ giá, dịch vụ và chính sách liên quan"
            ),
            query=question,
        )

    context_text = "\n".join(_iter_strings(context))
    document_ids = _source_document_ids(context, frames["text_units"])
    return _clean_answer(str(response)), context_text, document_ids


async def _run_global(question: str) -> tuple[str, str, set[str]]:
    from graphrag.api import global_search

    async with _graphrag_lock:
        global _graphrag_state
        if _graphrag_state is None:
            _graphrag_state = await asyncio.to_thread(_load_graphrag_state)

        config, frames, _ = _graphrag_state
        response, context = await global_search(
            config=config,
            entities=frames["entities"],
            communities=frames["communities"],
            community_reports=frames["community_reports"],
            community_level=2,
            dynamic_community_selection=False,
            response_type="câu trả lời ngắn gọn, thân thiện bằng tiếng Việt",
            query=question,
        )

    context_text = "\n".join(_iter_strings(context))
    return _clean_answer(str(response)), context_text, set()


@app.get("/health")
async def health() -> dict:
    manifest = read_json(OUTPUT_MANIFEST_FILE, {}) or {}
    return {
        "status": "ok",
        "indexReady": index_ready(),
        "cacheEntries": len(_cache),
        "indexing": _index_state,
        "models": {
            "index": os.getenv("GRAPHRAG_INDEX_MODEL", ""),
            "query": os.getenv("GRAPHRAG_QUERY_MODEL", ""),
            "embedding": os.getenv("GRAPHRAG_EMBEDDING_MODEL", ""),
        },
        "index": manifest,
    }


@app.post("/query", dependencies=[Depends(require_token)])
async def query(payload: QueryRequest) -> dict:
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    cached = find_cache_entry(question, _cache)
    if cached and (CACHE_FIRST or not index_ready()):
        result = dict(cached)
        result["source"] = "cache"
        result["degraded"] = False
        result.pop("reason", None)
        return result

    if not index_ready():
        return _fallback_answer(question, payload.service_id, "index_not_ready")

    mode = payload.mode
    if mode == "auto" or not ALLOW_GLOBAL:
        mode = "local"

    graph_question = question
    if payload.service_id:
        graph_question = (
            f"Câu hỏi về dịch vụ có mã {payload.service_id}: {question}"
        )

    try:
        if mode == "global":
            answer, context_text, document_ids = await _run_global(graph_question)
        else:
            answer, context_text, document_ids = await _run_local(graph_question)
    except Exception:
        logger.exception("GraphRAG query failed")
        return _fallback_answer(question, payload.service_id, "query_failed")

    result = {
        "answer": answer,
        "citations": _build_citations(
            answer, context_text, payload.service_id, document_ids
        ),
        "mode": mode,
        "source": "graphrag",
        "degraded": False,
    }

    with _cache_lock:
        _cache[normalize(question)] = {
            "question": question,
            "answer": result["answer"],
            "citations": result["citations"],
            "mode": result["mode"],
            "source": "graphrag",
        }
        save_cache(_cache)

    return result


@app.post("/index", dependencies=[Depends(require_token)])
async def start_index() -> dict:
    if not ALLOW_REINDEX:
        raise HTTPException(status_code=403, detail="Reindex is disabled.")
    if _index_state["running"]:
        raise HTTPException(status_code=409, detail="Indexing is already running.")

    asyncio.create_task(_run_index_task())
    return {"started": True}


@app.get("/index/status", dependencies=[Depends(require_token)])
async def index_status() -> dict:
    return {
        "indexing": _index_state,
        "indexReady": index_ready(),
        "index": read_json(OUTPUT_MANIFEST_FILE, {}) or {},
        "source": read_json(INPUT_MANIFEST_FILE, {}) or {},
    }


async def _run_index_task() -> None:
    from service.indexer import run_index

    _index_state.update(
        {
            "running": True,
            "startedAt": int(time.time() * 1000),
            "finishedAt": None,
            "ok": None,
            "error": None,
        }
    )

    try:
        result = await run_index(force=False)
        _index_state.update(
            {
                "running": False,
                "finishedAt": int(time.time() * 1000),
                "ok": True,
                "error": None,
                "result": result,
            }
        )
    except Exception as error:
        logger.exception("Indexing failed")
        _index_state.update(
            {
                "running": False,
                "finishedAt": int(time.time() * 1000),
                "ok": False,
                "error": str(error),
            }
        )
