
from __future__ import annotations
import sounddevice as sd
import soundfile as sf
import numpy as np
from faster_whisper import WhisperModel
from .config import SAMPLE_RATE
import logging
import os

logger = logging.getLogger("app.asr")

# On Windows, ensure cuDNN DLLs are visible.
_CUDNN_DIRS = [
    # Torch-bundled cuDNN (already present)
    r"C:\Users\Usuario\AppData\Local\Programs\Python\Python312\Lib\site-packages\torch\lib",
    # NVIDIA cuDNN install paths (root bin and versioned bin)
    r"C:\Program Files\NVIDIA\CUDNN\v9.8\bin",
    r"C:\Program Files\NVIDIA\CUDNN\v9.8\bin\12.8",
    r"C:\Program Files\NVIDIA\CUDNN\v9.10\bin",
    r"C:\Program Files\NVIDIA\CUDNN\v9.10\bin\12.9",
]

if os.name == "nt":
    for _path in _CUDNN_DIRS:
        if os.path.isdir(_path):
            try:
                os.add_dll_directory(_path)
                logger.info("Added cuDNN DLL directory: %s", _path)
            except Exception as e:
                logger.warning("Failed to add cuDNN DLL directory %s: %s", _path, e)
            # Prepend to PATH as well for child processes/FFI lookups
            os.environ["PATH"] = _path + os.pathsep + os.environ.get("PATH", "")

_model_cache = {}

# Prefer CUDA when available; fall back to CPU if CUDA/cuDNN fails.
CUDA_DEVICE = "cuda"
CPU_DEVICE = "cpu"
CUDA_COMPUTE_TYPE = "float16"
CPU_COMPUTE_TYPE = "int8"

def _load_model(size: str, device: str, compute_type: str):
    key = (size, device, compute_type)
    if key not in _model_cache:
        logger.info("Loading Whisper model size=%s device=%s compute=%s", size, device, compute_type)
        _model_cache[key] = WhisperModel(size, device=device, compute_type=compute_type)
    return _model_cache[key]

def get_model(size: str = "small", prefer_cuda: bool = True):
    if prefer_cuda:
        try:
            return _load_model(size, CUDA_DEVICE, CUDA_COMPUTE_TYPE)
        except Exception as e:
            logger.warning("CUDA Whisper load failed, falling back to CPU: %s", e)
    # CPU fallback
    return _load_model(size, CPU_DEVICE, CPU_COMPUTE_TYPE)

def record_mic(seconds: float, samplerate: int = SAMPLE_RATE, channels: int = 1, out_path: str = "record.wav"):
    print(f"🎤 Grabando {seconds}s...")
    audio = sd.rec(int(seconds * samplerate), samplerate=samplerate, channels=channels, dtype="float32")
    sd.wait()
    sf.write(out_path, audio, samplerate)
    print(f"💾 Guardado en {out_path}")
    return out_path

def transcribe_file(path: str, language: str = "es", size: str = "small", prefer_cuda: bool = True):
    """
    Transcribe using faster-whisper.
    prefer_cuda: try GPU first; if CUDA/cuDNN missing, auto-fallback to CPU.
    """
    model = get_model(size=size, prefer_cuda=prefer_cuda)
    segs, info = model.transcribe(path, language=language, vad_filter=True, beam_size=1)
    parts, out = [], []
    for s in segs:
        parts.append((s.start, s.end, s.text))
        out.append(s.text)
    text = " ".join(out).strip()
    return {"text": text, "segments": parts}
