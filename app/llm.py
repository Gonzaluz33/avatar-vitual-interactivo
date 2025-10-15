
from __future__ import annotations
from typing import List, Dict, Any
import os

from .config import (
    ANTHROPIC_API_KEY, CLAUDE_MODEL, LLM_PROVIDER
)

def _anthropic_chat(messages: List[Dict[str, str]], model: str = CLAUDE_MODEL, max_tokens: int = 512, temperature: float = 0.7) -> str:
    try:
        import anthropic
    except ImportError as e:
        raise RuntimeError("anthropic no instalado. pip install anthropic") from e

    if not (ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY")):
        raise RuntimeError("Falta ANTHROPIC_API_KEY en entorno (.env)")

    system_parts = [m.get("content", "") for m in messages if m.get("role") == "system" and m.get("content")]
    system = "\n\n".join(system_parts) if system_parts else None

    msg_payload = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
        if m.get("role") in ("user", "assistant")
    ]

    client = anthropic.Anthropic()
    kwargs = dict(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=msg_payload,
    )
    if system:
        kwargs["system"] = system

    resp = client.messages.create(**kwargs)

    blocks = getattr(resp, "content", []) or []
    out = []
    for b in blocks:
        if getattr(b, "type", "") == "text":
            out.append(b.text)
        elif isinstance(b, dict) and b.get("type") == "text":
            out.append(b.get("text", ""))
    return "".join(out).strip()


def _ollama_chat(messages: List[Dict[str, str]], model: str = "qwen2.5:0.5b", stream: bool = False) -> str:
    try:
        import ollama
    except ImportError as e:
        raise RuntimeError("ollama no instalado. pip install ollama") from e
    client = ollama.Client()
    resp = client.chat(model=model, messages=messages, stream=stream)
    if stream:
        out = []
        for chunk in resp:
            delta = chunk.get("message", {}).get("content", "")
            out.append(delta)
        return "".join(out).strip()
    else:
        return resp.get("message", {}).get("content", "").strip()

def chat(system_prompt: str, user_text: str, history: List[Dict[str, str]] | None = None, provider: str | None = None) -> str:
    provider = (provider or LLM_PROVIDER).lower()
    msgs = []
    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})
    if history:
        msgs.extend(history[-6:])
    msgs.append({"role": "user", "content": user_text})

    if provider == "anthropic":
        return _anthropic_chat(messages=msgs)
    elif provider == "ollama":
        return _ollama_chat(messages=msgs)
    else:
        raise ValueError(f"Proveedor no soportado: {provider}")
