from typing import Dict, List

from django.conf import settings
from openai import APIConnectionError, AuthenticationError, OpenAI, RateLimitError


class LLMChatError(RuntimeError):
    pass


def _openai_compatible_client(api_key, base_url=None):
    if not api_key:
        raise LLMChatError("LLM chat API key is not configured.")
    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def _extract_reasoning_text(message) -> str:
    if not message:
        return ""

    direct = getattr(message, "reasoning_content", None)
    if isinstance(direct, str) and direct:
        return direct

    reasoning = getattr(message, "reasoning", None)
    if isinstance(reasoning, str):
        return reasoning
    if isinstance(reasoning, list):
        parts = []
        for item in reasoning:
            text = getattr(item, "text", None) if item is not None else None
            if isinstance(text, str) and text:
                parts.append(text)
        return "".join(parts)

    return ""


def _deepseek_options(messages):
    api_key = getattr(settings, "DEEPSEEK_API_KEY", None)
    base_url = getattr(settings, "DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = getattr(settings, "DEEPSEEK_CHAT_MODEL", getattr(settings, "DEEPSEEK_MODEL", "deepseek-chat"))
    reasoning_effort = getattr(settings, "DEEPSEEK_REASONING_EFFORT", "high")
    thinking = getattr(settings, "DEEPSEEK_CHAT_THINKING", getattr(settings, "DEEPSEEK_THINKING", {"type": "disabled"}))

    return (
        _openai_compatible_client(api_key=api_key, base_url=base_url),
        {
            "model": model,
            "messages": messages,
            "reasoning_effort": reasoning_effort,
            "extra_body": {"thinking": thinking},
        },
    )


def _openai_options(messages):
    api_key = getattr(settings, "OPENAI_API_KEY", None)
    base_url = getattr(settings, "OPENAI_BASE_URL", None)
    model = getattr(settings, "OPENAI_CHAT_MODEL", "gpt-4.1-mini")

    return (
        _openai_compatible_client(api_key=api_key, base_url=base_url),
        {
            "model": model,
            "messages": messages,
        },
    )


def _doubao_options(messages):
    api_key = getattr(settings, "DOUBAO_API_KEY", None)
    base_url = getattr(settings, "DOUBAO_BASE_URL", None)
    model = getattr(settings, "DOUBAO_CHAT_MODEL", None)
    if not base_url or not model:
        raise LLMChatError("DOUBAO_BASE_URL and DOUBAO_CHAT_MODEL must be configured for Doubao chat.")

    return (
        _openai_compatible_client(api_key=api_key, base_url=base_url),
        {
            "model": model,
            "messages": messages,
        },
    )


def _request_options_for_provider(provider, messages):
    if provider == "deepseek":
        return _deepseek_options(messages)
    if provider == "openai":
        return _openai_options(messages)
    if provider == "doubao":
        return _doubao_options(messages)
    raise LLMChatError(f"Unsupported LLM chat provider: {provider}")


def generate_chat_reply_payload(messages: List[dict], provider=None) -> Dict[str, str]:
    provider_name = (provider or getattr(settings, "LLM_CHAT_PROVIDER", "deepseek")).strip().lower()

    try:
        client, request_options = _request_options_for_provider(provider_name, messages)
        resp = client.chat.completions.create(**request_options, stream=False)
        message = resp.choices[0].message
        return {
            "answer": message.content or "",
            "reasoning": _extract_reasoning_text(message),
        }
    except AuthenticationError:
        raise LLMChatError(f"{provider_name} authentication failed.")
    except RateLimitError as exc:
        raise LLMChatError(f"{provider_name} rate limit exceeded: {exc}")
    except APIConnectionError as exc:
        raise LLMChatError(f"{provider_name} connection failed: {exc}")
    except LLMChatError:
        raise
    except Exception as exc:
        raise LLMChatError(f"{provider_name} chat failed: {exc}")


def generate_chat_reply(messages: List[dict], provider=None) -> str:
    return generate_chat_reply_payload(messages=messages, provider=provider)["answer"]


def stream_chat_reply_events(messages: List[dict], provider=None):
    provider_name = (provider or getattr(settings, "LLM_CHAT_PROVIDER", "deepseek")).strip().lower()

    try:
        client, request_options = _request_options_for_provider(provider_name, messages)
        stream = client.chat.completions.create(**request_options, stream=True)
        for chunk in stream:
            if not getattr(chunk, "choices", None):
                continue

            delta = chunk.choices[0].delta
            reasoning = getattr(delta, "reasoning_content", None) or ""
            content = getattr(delta, "content", None) or ""

            if reasoning:
                yield {"type": "reasoning", "delta": reasoning}
            if content:
                yield {"type": "content", "delta": content}

        yield {"type": "done"}
    except AuthenticationError:
        raise LLMChatError(f"{provider_name} authentication failed.")
    except RateLimitError as exc:
        raise LLMChatError(f"{provider_name} rate limit exceeded: {exc}")
    except APIConnectionError as exc:
        raise LLMChatError(f"{provider_name} connection failed: {exc}")
    except LLMChatError:
        raise
    except Exception as exc:
        raise LLMChatError(f"{provider_name} stream failed: {exc}")


def stream_chat_reply(messages: List[dict], provider=None):
    for event in stream_chat_reply_events(messages=messages, provider=provider):
        if event.get("type") == "content":
            yield event.get("delta", "")
