
from __future__ import annotations
import time
from typing import Dict, Any, List
import logging
from .config import PROMPT_PHASES, now, elapsed_to_age
from .scheduler import pick_system_prompt
from .memory import load_memory, save_memory, update_history, append_fact, clear_memory
from .llm import chat

logger = logging.getLogger("app.pipeline")

def extract_fact(llm_text: str) -> str | None:
    return None

class Pipeline:
    def __init__(self):
        self.session_start = now()
        self.turn = 0
        self.memory = load_memory()
        self.history: List[Dict[str, str]] = []

    def current_elapsed_min(self) -> float:
        return (now() - self.session_start) / 60.0

    def current_age(self) -> int:
        return elapsed_to_age(self.current_elapsed_min())

    def run(self, user_text: str, provider: str | None = None) -> Dict[str, Any]:
        elapsed = self.current_elapsed_min()
        age = elapsed_to_age(elapsed)
        logger.info("🎂 Edad actual: %s (elapsed %.2f min)", age, elapsed)
        system_prompt = pick_system_prompt(elapsed, self.turn, PROMPT_PHASES)
        response = chat(system_prompt, user_text, history=self.history, provider=provider)
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
            "elapsed_min": elapsed,
            "age": age,
            "memory_path": str(self.memory_path if hasattr(self, "memory_path") else "data/prompt_memory.json")
        }

    def reset(self):
        self.session_start = now()
        self.turn = 0
        self.history = []
        self.memory = clear_memory()
        return {
            "message": "Sesión reiniciada",
            "turn": self.turn,
            "elapsed_min": 0.0
        }
