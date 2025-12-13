# app/services/deepseek.py
# Keep ALL DeepSeek/OpenAI specifics in this file.

import json
import re
from typing import Any, List
from django.conf import settings
from openai import OpenAI

DEEPSEEK_BASE_URL = getattr(settings, "DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = getattr(settings, "DEEPSEEK_MODEL", "deepseek-reasoner")


class DeepseekError(RuntimeError):
    pass


def _client() -> OpenAI:
    key = getattr(settings, "DEEPSEEK_API_KEY", None)
    if not key:
        raise DeepseekError("DEEPSEEK_API_KEY is not configured in settings.py")
    return OpenAI(api_key=key, base_url=DEEPSEEK_BASE_URL)


# ------------------- JSON parsing helpers -------------------

def _sanitize_json(raw: str) -> str:
    """Try to fix common JSON format errors from the model."""
    s = raw.replace("\ufeff", "").strip()

    # remove ```json fences
    s = re.sub(r"^```[a-zA-Z]*\s*|```$", "", s, flags=re.MULTILINE)

    # find the first [ ... ] block
    start, end = s.find("["), s.rfind("]")
    if start != -1 and end != -1 and end > start:
        s = s[start:end + 1]

    # fix keys like `" "content"` → `"content"`
    s = s.replace('" "content"', '"content"').replace('" "entity"', '"entity"')
    s = re.sub(r'"\s+"(?=[A-Za-z0-9_\u4e00-\u9fff]+")', '"', s)

    # remove trailing commas before } or ]
    s = re.sub(r",(\s*[}\]])", r"\1", s)

    return s


def _safe_parse_json(raw: str) -> Any:
    """Parse model output; tolerate minor JSON mistakes."""
    try:
        return json.loads(raw)
    except Exception:
        fixed = _sanitize_json(raw)
        try:
            return json.loads(fixed)
        except Exception as e:
            raise DeepseekError(
                f"Model did not return valid JSON: {e}\n"
                f"--- RAW ---\n{raw[:500]}\n\n--- SANITIZED ---\n{fixed[:500]}"
            )


# ------------------- Main API call -------------------

def analyze_bazi(messages: List[dict], stream_debug: bool = False):
    """
    Call DeepSeek and return parsed JSON list.
    If stream_debug=True, prints reasoning and content in real-time and
    returns a dict:
        {
            "data": parsed_json,
            "reply": full_reply,
            "reasoning": full_reasoning
        }
    """
    client = _client()

    # --- Non-stream mode (simple) ---
    if not stream_debug:
        resp = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
            stream=False,
        )
        raw = resp.choices[0].message.content
        parsed = _safe_parse_json(raw)
        return {"data": parsed, "reply": raw, "reasoning": ""}

    # --- Stream mode with debug ---
    print("📡 Streaming response...\n")
    full_reply = ""
    full_reasoning = ""

    try:
        stream = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
            stream=True,
        )

        for chunk in stream:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta

                # DeepSeek reasoning tokens
                rc = getattr(delta, "reasoning_content", None)
                if rc:
                    print(rc, end="", flush=True)
                    full_reasoning += rc

                # Normal content tokens
                cp = getattr(delta, "content", None)
                if cp:
                    print(cp, end="", flush=True)
                    full_reply += cp

        print("\n\n✅ Streaming complete.")
        print("\n" + "=" * 50)
        print("完整推理过程:")
        print(full_reasoning)
        print("\n" + "=" * 50)
        print("完整回答内容:")
        print(full_reply)

        parsed = _safe_parse_json(full_reply)
        return {
            "payload": parsed,
            "reason": full_reasoning,
        }

    except KeyboardInterrupt:
        print("\n\n⛔️ Streaming interrupted by user.")
        raise
    except Exception as e:
        raise DeepseekError(f"Streaming failed: {e}")
