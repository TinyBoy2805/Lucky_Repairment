import json
import os
import sys
import time
import urllib.error
import urllib.request

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
INDEX_MODEL = os.getenv("CF_INDEX_MODEL", "")

BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1"


def post(path: str, body: dict) -> tuple[int, dict]:
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        payload = error.read().decode("utf-8")
        try:
            return error.code, json.loads(payload)
        except json.JSONDecodeError:
            return error.code, {"error": payload}


def check(name: str, condition: bool, detail: str = "") -> bool:
    print(f"{'PASS' if condition else 'FAIL'}  {name}  [{detail}]")
    return condition


def main() -> int:
    if not all([ACCOUNT_ID, API_TOKEN, INDEX_MODEL]):
        print("FAIL  Missing Cloudflare index env vars")
        return 1

    failed = False
    started = time.time()
    status, data = post(
        "/chat/completions",
        {
            "model": INDEX_MODEL,
            "messages": [{"role": "user", "content": "Say OK"}],
            "max_tokens": 20,
            "temperature": 0,
        },
    )
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    failed |= not check(
        "index model chat",
        status == 200 and bool(content),
        f"status={status} latency={time.time() - started:.1f}s",
    )

    schema = {
        "type": "json_schema",
        "json_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "items": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["status", "items"],
            "additionalProperties": False,
        },
    }
    started = time.time()
    status, data = post(
        "/chat/completions",
        {
            "model": INDEX_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": 'Return {"status":"ok","items":["dich vu","chinh sach"]}',
                }
            ],
            "response_format": schema,
            "max_tokens": 120,
            "temperature": 0,
        },
    )
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        parsed = json.loads(content)
        json_ok = isinstance(parsed.get("items"), list)
    except (json.JSONDecodeError, AttributeError):
        json_ok = False
    failed |= not check(
        "index model JSON mode",
        status == 200 and json_ok,
        f"status={status} latency={time.time() - started:.1f}s",
    )

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
