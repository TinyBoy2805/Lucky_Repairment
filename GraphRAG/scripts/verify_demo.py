import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = os.getenv("ASSISTANT_URL", "http://127.0.0.1:8000")
TOKEN = os.getenv("ASSISTANT_TOKEN", "")

QUESTIONS = [
    "Sửa bình nóng lạnh giá bao nhiêu?",
    "Bảo hành bao lâu?",
    "Hủy đơn có mất phí không?",
    "Thanh toán bằng cách nào?",
    "Thông tắc bồn cầu mất bao lâu?",
    "Có bao nhiêu dịch vụ điện nước?",
    "Dịch vụ nào đắt nhất?",
    "Dịch vụ nào bảo hành dài nhất?",
    "Danh mục sửa chữa nước gồm những gì?",
    "Dịch vụ nào rẻ nhất?",
]


def ask(question: str) -> dict:
    body = json.dumps({"question": question}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["X-Assistant-Token"] = TOKEN

    request = urllib.request.Request(
        f"{BASE_URL}/query", data=body, headers=headers, method="POST"
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    failures = []

    for question in QUESTIONS:
        try:
            first = ask(question)
            second = ask(question)
        except (urllib.error.URLError, TimeoutError) as error:
            failures.append(f"{question}: {error}")
            print(f"FAIL  {question}: {error}")
            continue

        ok = bool(first.get("answer")) and second.get("source") == "cache"
        if not ok:
            failures.append(question)

        print(
            f"{'PASS' if ok else 'FAIL'}  {question} "
            f"first={first.get('source')} second={second.get('source')} "
            f"citations={len(first.get('citations') or [])}"
        )

    print(json.dumps({"passed": len(QUESTIONS) - len(failures), "failed": failures}))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
