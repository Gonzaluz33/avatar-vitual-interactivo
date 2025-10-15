
from __future__ import annotations
from typing import List, Tuple

def pick_system_prompt(elapsed_min: float, turn: int, phases: List[Tuple[float, str]]) -> str:
    selected = phases[0][1] if phases else ""
    for minute, prompt in phases:
        if elapsed_min >= minute:
            selected = prompt
        else:
            break
    if turn >= 8:
        selected += " Prioriza síntesis (bullet points cortos)."
    return selected
