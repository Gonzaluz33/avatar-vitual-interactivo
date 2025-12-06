from __future__ import annotations

import math
import struct
import uuid
import wave
from pathlib import Path
from typing import Dict, List

AUDIO_DIR = Path("data/avatar_audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Visema base inspirado en ARKit/MetaHuman; se escala en el tiempo según la duración del audio
DEFAULT_VISEME_SEQUENCE: List[Dict[str, float | str]] = [
    {"t": 0.00, "code": "sil", "blendshape": "jawOpen", "weight": 0.05},
    {"t": 0.10, "code": "M", "blendshape": "mouthClose", "weight": 0.65},
    {"t": 0.28, "code": "AA", "blendshape": "jawOpen", "weight": 0.9},
    {"t": 0.45, "code": "IY", "blendshape": "mouthSmile_L", "weight": 0.8},
    {"t": 0.63, "code": "UH", "blendshape": "mouthPucker", "weight": 0.82},
    {"t": 0.82, "code": "FV", "blendshape": "mouthShrugLower", "weight": 0.75},
    {"t": 1.00, "code": "EH", "blendshape": "mouthDimple_L", "weight": 0.7},
    {"t": 1.20, "code": "OW", "blendshape": "mouthPucker", "weight": 0.78},
    {"t": 1.35, "code": "IY", "blendshape": "mouthSmile_R", "weight": 0.72},
    {"t": 1.55, "code": "sil", "blendshape": "jawOpen", "weight": 0.05},
]


def generate_placeholder_audio(duration_sec: float = 2.4, sample_rate: int = 16000) -> Path:
    """Genera un WAV simple (senoidal) para pruebas de sincronización labial."""
    safe_duration = max(duration_sec, 0.6)
    filename = AUDIO_DIR / f"avatar_{uuid.uuid4().hex}.wav"
    num_samples = int(safe_duration * sample_rate)

    with wave.open(str(filename), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16 bits
        wf.setframerate(sample_rate)

        # Tono suave de 440 Hz para referencia; el frontend puede reemplazarlo por TTS real
        amplitude = 16000
        frequency = 440.0
        for i in range(num_samples):
            value = int(amplitude * math.sin(2 * math.pi * frequency * (i / sample_rate)))
            wf.writeframes(struct.pack("<h", value))

    return filename


def build_viseme_timeline(text: str, duration_sec: float = 2.4) -> List[Dict[str, float | str]]:
    """
    Construye una línea de tiempo simple de visemas a partir de una secuencia predefinida.

    Escala la secuencia base en el tiempo según la duración del audio. El frontend
    puede mapear `code` a blendshapes propios; `blendshape` ya sugiere nombres ARKit.
    """
    base_duration = DEFAULT_VISEME_SEQUENCE[-1]["t"] if DEFAULT_VISEME_SEQUENCE else 1.0
    scale = duration_sec / base_duration if base_duration else 1.0

    # Pequeña heurística: si el texto es largo, incrementa duración para dar más aire
    scaled_duration = duration_sec + max(0.0, (len(text) - 120) / 120.0)
    scale = scaled_duration / base_duration if base_duration else 1.0

    return [
        {
            "t": round(item["t"] * scale, 3),
            "code": str(item["code"]),
            "blendshape": str(item["blendshape"]),
            "weight": float(item["weight"]),
        }
        for item in DEFAULT_VISEME_SEQUENCE
    ]


def prepare_avatar_payload(text: str, duration_sec: float = 2.4) -> Dict[str, object]:
    """Genera audio temporal y visemas para una respuesta de avatar."""
    audio_path = generate_placeholder_audio(duration_sec=duration_sec)
    visemes = build_viseme_timeline(text, duration_sec=duration_sec)
    return {
        "audio_path": audio_path,
        "visemes": visemes,
    }
