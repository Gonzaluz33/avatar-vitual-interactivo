
from __future__ import annotations
import time
from typing import Dict, Any, List
from .config import PROMPT_PHASES, now
from .scheduler import pick_system_prompt
from .memory import load_memory, save_memory, update_history, append_fact, clear_memory
from .llm import chat

def extract_fact(llm_text: str) -> str | None:
    # Implementación mínima: heurística (opcionalmente podrías llamar al LLM para extraer un hecho)
    return None

class Pipeline:
    def __init__(self):
        self.session_start = now()
        self.turn = 0
        self.memory = load_memory()
        self.history: List[Dict[str, str]] = []

    def current_elapsed_min(self) -> float:
        return (now() - self.session_start) / 60.0

    def run(self, user_text: str, provider: str | None = None) -> Dict[str, Any]:
        system_prompt = pick_system_prompt(self.current_elapsed_min(), self.turn, PROMPT_PHASES)
        response = chat(system_prompt, user_text, history=self.history, provider=provider)
        # update state
        self.history.extend([{"role": "user", "content": user_text}, {"role": "assistant", "content": response}])
        self.memory = update_history(self.memory, user_text, response)
        fact = extract_fact(user_text)
        if fact:
            self.memory = append_fact(self.memory, fact)
        save_memory(self.memory)
        self.turn += 1
        return {
            "system_prompt": system_prompt,
            "response": response,
            "turn": self.turn,
            "elapsed_min": self.current_elapsed_min(),
            "memory_path": str(self.memory_path if hasattr(self, "memory_path") else "data/prompt_memory.json")
        }

    def reset(self):
        """Reinicia completamente la sesión y limpia la memoria"""
        self.session_start = now()
        self.turn = 0
        self.history = []
        self.memory = clear_memory()
        return {
            "message": "Sesión reiniciada",
            "turn": self.turn,
            "elapsed_min": 0.0
        }
