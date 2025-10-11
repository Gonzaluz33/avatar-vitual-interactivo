
# Local ASR + LLM Starter

Pipeline local para **transcribir audio con Whisper** y **consultar un LLM** (Anthropic Claude vía API; fallback opcional Ollama). Incluye:
- CLI con `typer`
- **Memoria persistente** (JSON) y **variación del system prompt** por tiempo/turno
- **FastAPI** para exponer `/transcribe`, `/chat`, `/run`
- Grabación de micrófono simple (bloques de N segundos)

> Probado en macOS. En Windows/Linux funciona, pero revisa PortAudio/ffmpeg.

## 1) Requisitos

- Python 3.10+ (recomendado)
- [ffmpeg](https://ffmpeg.org/) en PATH
- **macOS**: `brew install portaudio ffmpeg`
- **Linux**: `sudo apt-get install -y portaudio19-dev ffmpeg`
- **Windows**: instalar `ffmpeg` y PortAudio (sounddevice trae binarios en la mayoría de casos)

## 2) Crear venv e instalar dependencias

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 3) Configurar variables de entorno

Crea `.env` (copiá de `.env.example`) y coloca tu **Anthropic API Key**:

```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-5-20250929   # o el que prefieras
```

> Ver modelos disponibles en la doc oficial de Anthropic. También podés usar `CLAUDE_MODEL=claude-3-5-sonnet-latest` si tu cuenta lo expone.

## 4) Usos rápidos

### 4.1 CLI

**Transcribir un archivo**:
```bash
python -m app.cli asr path/a/audio.wav
```

**Grabar micrófono 8s y transcribir**:
```bash
python -m app.cli mic --seconds 8
```

**Preguntar al LLM** (texto directo):
```bash
python -m app.cli chat --text "Explicá qué es aliasing en DSP"
```

**Ejecutar pipeline completo** (transcribe -> elige system prompt -> LLM -> memoria):
```bash
# Con archivo de audio
python -m app.cli run --audio path/a/audio.wav

# O grabando desde micrófono 6s
python -m app.cli run --mic-seconds 6

# Leer la respuesta con TTS del sistema (macOS 'say')
python -m app.cli run --mic-seconds 6 --tts
```

### 4.2 API (FastAPI)

```bash
uvicorn app.server:app --reload --port 5175
```

- `POST /transcribe` (multipart `file`)
- `POST /chat` JSON: `{ "text": "...", "history": [] }`
- `POST /run`  multipart `file`  (pipeline completo)

## 5) Prompt scheduler

Editá `app/config.py` → `PROMPT_PHASES` para controlar el **tono** según el tiempo transcurrido (minutos) y el número de turnos. Ejemplo:

```python
PROMPT_PHASES = [
  (0,  "Claro y directo."),
  (10, "Más didáctico, explica el porqué."),
  (20, "Más creativo, sugiere variantes."),
  (35, "Modo escénico (metáforas suaves)."),
]
```

## 6) Fallback a Ollama (opcional)

- Tener **Ollama** corriendo (`ollama serve`) y un modelo bajado (`ollama pull qwen2.5:0.5b` o el que quieras).
- En `app/llm.py` podés pasar `provider="ollama"` o usar la variable `LLM_PROVIDER=ollama` en `.env`.

## 7) Notas

- La memoria queda en `data/prompt_memory.json`.
- Para micrófono: en macOS, otorgar permisos a **Terminal/VSCode** en *Privacy → Microphone*.
- Si PortAudio da error: reinstalá `sounddevice` luego de instalar `portaudio`.
