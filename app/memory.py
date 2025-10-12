
from __future__ import annotations
import json, os
from pathlib import Path
from typing import Any, Dict, List
from .config import MEMORY_PATH

def ensure_parent(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)

def load_memory() -> Dict[str, Any]:
    if MEMORY_PATH.exists():
        try:
            return json.loads(MEMORY_PATH.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {"facts": [], "history": []}

def save_memory(mem: Dict[str, Any]):
    ensure_parent(MEMORY_PATH)
    MEMORY_PATH.write_text(json.dumps(mem, ensure_ascii=False, indent=2), encoding='utf-8')

def update_history(mem: Dict[str, Any], user_text: str, assistant_text: str):
    mem.setdefault("history", []).append({"user": user_text[:500], "assistant": assistant_text[:500]})
    return mem

def append_fact(mem: Dict[str, Any], fact: str | None):
    if fact and fact.lower() != "n/a":
        mem.setdefault("facts", []).append(fact.strip())
    return mem

def clear_memory():
    """Limpia completamente la memoria persistente"""
    mem = {"facts": [], "history": []}
    save_memory(mem)
    return mem
