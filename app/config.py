
from __future__ import annotations
import os, time
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env si existe
load_dotenv()

# --- LLM ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-latest")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic").lower()  # anthropic | ollama

# --- Memory ---
MEMORY_PATH = Path(os.getenv("MEMORY_PATH", "data/prompt_memory.json"))

# --- Audio ---
SAMPLE_RATE = 16000  # Hz
CHANNELS = 1

# --- Prompt scheduling ---
# min_desde_inicio : prompt
PROMPT_PHASES = [
    (0,  "Eres claro y directo. Responde en español con precisión y concisión."),
    (10, "Adopta un tono didáctico: explica brevemente el porqué de tus respuestas."),
    (20, "Sé creativo y propositivo: sugiere variantes y mejoras si son útiles."),
    (35, "Modo escénico: respuestas breves con metáforas suaves."),
]

def now() -> float:
    return time.time()
