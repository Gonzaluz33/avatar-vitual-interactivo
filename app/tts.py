from __future__ import annotations

import io
import os
from typing import Generator, Optional

import numpy as np
import soundfile as sf

from .config import TTS_CACHE_DIR, TTS_MODEL, TTS_FEMININE_SPEED, TTS_SPEAKER, TTS_LANGUAGE


class TTSService:
    """
    Simple Coqui TTS wrapper that generates WAV audio and yields it in chunks
    suitable for streaming responses.
    """

    def __init__(self, model_name: str = TTS_MODEL, cache_dir: str | None = TTS_CACHE_DIR):
        self.model_name = model_name
        self.cache_dir = cache_dir
        self._model: Optional[object] = None
        self.speaker_override = TTS_SPEAKER.strip() or None
        self.language = TTS_LANGUAGE.strip() or None

    def _pick_speaker(self, model) -> Optional[str]:
        # For single-speaker models, there may be no speaker list; return None
        try:
            speaker_manager = getattr(model, "speaker_manager", None)
            speakers_dict = getattr(speaker_manager, "speakers", None) if speaker_manager else None
            if not speakers_dict:
                return None
            keys = list(speakers_dict.keys())
            if not keys:
                return None
            return keys[0]
        except Exception:
            return None

    def _load_model(self):
        if self._model is None:
            try:
                from TTS.api import TTS as CoquiTTS
                import torch
                from TTS.utils.radam import RAdam
                from TTS.utils.manage import ModelManager

                # Accept Coqui model download TOS non-interactively
                os.environ.setdefault("COQUI_TOS_AGREEMENT", "1")
                os.environ.setdefault("COQUI_STUDIO_TOS_AGREEMENT", "1")
                # Bypass interactive prompt
                ModelManager.ask_tos = lambda self, output_path: True

                # Allow RAdam class during checkpoint load and force weights_only=False for torch>=2.6
                try:
                    torch.serialization.add_safe_globals([RAdam])
                except Exception:
                    pass

                _orig_torch_load = torch.load

                def _torch_load_weights_only_false(*args, **kwargs):
                    kwargs.setdefault("weights_only", False)
                    return _orig_torch_load(*args, **kwargs)

                torch.load = _torch_load_weights_only_false

            except ImportError as e:
                raise RuntimeError("Coqui TTS no instalado. Instala con: pip install --no-deps TTS==0.22.0") from e
            try:
                # TTS 0.22.0 does not accept cache_dir; it downloads to the default user cache.
                self._model = CoquiTTS(model_name=self.model_name, progress_bar=False)
            except KeyError as e:
                raise RuntimeError(
                    f"Modelo TTS no encontrado ({self.model_name}). "
                    "Prueba con otro, p.ej.: tts_models/es/mai/tacotron2-DDC "
                    "o configura TTS_MODEL con un nombre válido."
                ) from e
        return self._model

    def generate_wav_bytes(self, text: str, speed: float = 1.0) -> bytes:
        """
        Generate WAV audio for the given text and return raw bytes.
        """
        model = self._load_model()
        # Bias towards a more feminine tone by slightly increasing speed
        effective_speed = speed * TTS_FEMININE_SPEED
        # Allow explicit speaker override; fallback to first speaker if provided by model
        speaker = self.speaker_override or self._pick_speaker(model)

        # XTTS supports language argument; single-speaker models generally ignore it
        use_language = self.language if "xtts" in self.model_name.lower() else None

        if speaker is None and use_language:
            # XTTS and other multi-speaker models require an explicit speaker
            raise ValueError(
                "El modelo TTS es multi-speaker y requiere un speaker. "
                "Configura TTS_SPEAKER (nombre/id) o usa un modelo de una sola voz "
                "(ej: tts_models/es/mai/vits)."
            )

        if use_language:
            wav: np.ndarray = model.tts(
                text=text,
                speed=effective_speed,
                speaker=speaker,
                language=use_language,
            )
        else:
            wav: np.ndarray = model.tts(
                text=text,
                speed=effective_speed,
                speaker=speaker,
            )
        with io.BytesIO() as buffer:
            # 22050 Hz is the default output for this model
            sf.write(buffer, wav, 22050, format="WAV", subtype="PCM_16")
            return buffer.getvalue()

    def stream_wav(self, text: str, speed: float = 1.0, chunk_size: int = 4096) -> Generator[bytes, None, None]:
        """
        Generate audio and yield it in chunks so FastAPI can stream it.
        """
        data = self.generate_wav_bytes(text, speed)
        for i in range(0, len(data), chunk_size):
            yield data[i : i + chunk_size]


# Singleton instance used by the API
tts_service = TTSService()

