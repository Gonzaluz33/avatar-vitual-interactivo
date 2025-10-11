
from __future__ import annotations
import sounddevice as sd
import soundfile as sf
import numpy as np
from faster_whisper import WhisperModel
from .config import SAMPLE_RATE

# Cargar modelo en el primer uso (lazy)
_model_cache = {}

def get_model(size: str = "small", device: str = "auto", compute_type: str = "auto"):
    key = (size, device, compute_type)
    if key not in _model_cache:
        _model_cache[key] = WhisperModel(size, device=device, compute_type=compute_type)
    return _model_cache[key]

def record_mic(seconds: float, samplerate: int = SAMPLE_RATE, channels: int = 1, out_path: str = "record.wav"):
    print(f"🎤 Grabando {seconds}s...")
    audio = sd.rec(int(seconds * samplerate), samplerate=samplerate, channels=channels, dtype="float32")
    sd.wait()
    sf.write(out_path, audio, samplerate)
    print(f"💾 Guardado en {out_path}")
    return out_path

def transcribe_file(path: str, language: str = "es", size: str = "small", device: str = "cuda" if False else "cpu", compute_type: str = "float16" if False else "int8"):
    # device/compute_type auto: faster-whisper detecta; para CPU usar int8
    model = get_model(size=size, device="auto", compute_type="auto")
    segs, info = model.transcribe(path, language=language, vad_filter=True, beam_size=1)
    parts, out = [], []
    for s in segs:
        parts.append((s.start, s.end, s.text))
        out.append(s.text)
    text = " ".join(out).strip()
    return {"text": text, "segments": parts}
