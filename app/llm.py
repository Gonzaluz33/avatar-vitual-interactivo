
from __future__ import annotations
from typing import List, Dict, Any
import os

from .config import (
    ANTHROPIC_API_KEY, CLAUDE_MODEL, LLM_PROVIDER
)

# --- Anthropic (Claude) ---
def _anthropic_chat(messages: List[Dict[str, str]], model: str = CLAUDE_MODEL, max_tokens: int = 512, temperature: float = 0.7) -> str:
    try:
        import anthropic
    except ImportError as e:
        raise RuntimeError("anthropic no instalado. pip install anthropic") from e

    if not (ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY")):
        raise RuntimeError("Falta ANTHROPIC_API_KEY en entorno (.env)")

    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages
    )
    # Claude devuelve una lista de 'content' (bloques). Tomamos el texto plano.
    blocks = getattr(resp, "content", []) or []
    text = ""
    for b in blocks:
        if getattr(b, "type", "") == "text":
            text += b.text
        elif isinstance(b, dict) and b.get("type") == "text":  # por si viene dict
            text += b.get("text", "")
    return text.strip()

# --- Ollama (opcional) ---
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
        # Anthropic requiere formato messages con roles user/assistant; 'system' se maneja como primer mensaje system.
        return _anthropic_chat(messages=msgs)
    elif provider == "ollama":
        # Ollama usa el mismo estilo de mensajes
        return _ollama_chat(messages=msgs)
    else:
        raise ValueError(f"Proveedor no soportado: {provider}")
