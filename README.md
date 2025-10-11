
# Avatar Virtual Interactivo

Sistema de conversación por voz en tiempo real con **FastAPI** (backend) y **React** (frontend). 

Pipeline local para **transcribir audio con Whisper** y **consultar un LLM** (Anthropic Claude vía API; fallback opcional Ollama). 

## ✨ Características

- 🎤 **Grabación de voz en tiempo real** desde el navegador
- 🔄 **WebSocket** para comunicación bidireccional instantánea
- 🤖 **Transcripción automática** con Whisper (faster-whisper)
- 💬 **Chat con LLM** (Claude/Ollama) con contexto conversacional
- 🎨 **Interfaz moderna** en React con Tailwind CSS
- 🌓 **Dark mode** integrado
- 📊 **System prompt adaptativo** según tiempo y turnos de conversación
- 💾 **Memoria persistente** de la conversación

## 📋 Requisitos

### Backend (Python)
- Python 3.10+ (recomendado 3.11)
- [ffmpeg](https://ffmpeg.org/) en PATH
- **macOS**: `brew install portaudio ffmpeg`
- **Linux**: `sudo apt-get install -y portaudio19-dev ffmpeg`
- **Windows**: instalar `ffmpeg` y PortAudio

### Frontend (Node.js)
- Node.js 18+ y npm/yarn

## 🚀 Instalación

### 1. Backend (Python)

```bash
# Crear y activar entorno virtual
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Frontend (React)

```bash
# Navegar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install
```

## ⚙️ Configuración

Crea `.env` en la raíz del proyecto (copiá de `.env.example`):

```env
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-5-20250929
LLM_PROVIDER=anthropic
MEMORY_PATH=data/prompt_memory.json
```

> Ver modelos disponibles en la [documentación oficial de Anthropic](https://docs.anthropic.com/claude/docs/models-overview).

## 🎯 Ejecución

### Opción 1: Ejecutar Backend y Frontend por separado

**Terminal 1 - Backend:**
```bash
# Desde la raíz del proyecto
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.server:app --reload --port 5175
```

**Terminal 2 - Frontend:**
```bash
# Desde la carpeta frontend
cd frontend
npm run dev
```

Abre tu navegador en: **http://localhost:5173**

### Opción 2: Script de inicio rápido (macOS/Linux)

Crea un archivo `start.sh` en la raíz:

```bash
#!/bin/bash

# Iniciar backend
source .venv/bin/activate
uvicorn app.server:app --reload --port 5175 &
BACKEND_PID=$!

# Iniciar frontend
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Presiona Ctrl+C para detener ambos servicios"

# Esperar y manejar Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
```

Dale permisos y ejecútalo:
```bash
chmod +x start.sh
./start.sh
```

## 🔌 API Endpoints

### HTTP Endpoints

- **GET** `/` - Información de la API
- **GET** `/health` - Estado del sistema y sesión
- **POST** `/transcribe` - Transcribir archivo de audio
  - Multipart form-data con campo `file`
  - Retorna: `{ text, segments }`
  
- **POST** `/chat` - Chat de texto con el LLM
  - Body JSON: `{ text: string, history: [] }`
  - Retorna: `{ response, system_prompt, turn, elapsed_min }`
  
- **POST** `/run` - Pipeline completo (audio → transcripción → LLM)
  - Multipart form-data con campo `file`
  - Retorna: `{ transcript, response, system_prompt, turn, elapsed_min }`

### WebSocket

- **WS** `/ws/voice` - Comunicación en tiempo real

**Mensajes del cliente:**
```json
// Enviar audio
{
  "type": "audio",
  "audio": "base64_encoded_audio"
}

// Enviar texto
{
  "type": "text",
  "text": "mensaje de texto"
}

// Ping
{
  "type": "ping"
}
```

**Mensajes del servidor:**
```json
// Transcripción
{
  "type": "transcript",
  "text": "texto transcrito"
}

// Respuesta del LLM
{
  "type": "response",
  "text": "respuesta",
  "system_prompt": "prompt usado",
  "turn": 3,
  "elapsed_min": 2.5
}

// Error
{
  "type": "error",
  "message": "descripción del error"
}
```

## 🎨 Uso del Frontend

1. **Conecta al backend**: El frontend se conecta automáticamente al WebSocket
2. **Graba tu voz**: Presiona el botón "Iniciar Grabación" y habla
3. **Detén la grabación**: Presiona "Detener Grabación" cuando termines
4. **Recibe la respuesta**: El sistema transcribe, procesa y responde automáticamente
5. **Chat de texto**: También puedes escribir mensajes en el input de texto

### Características de la interfaz

- 💬 **Panel de conversación**: Muestra todo el historial
- 🎤 **Control de voz**: Botón para grabar audio con visualizador
- 📊 **Barra de estado**: Turnos y tiempo transcurrido
- 🔄 **Indicadores**: Estado de conexión y procesamiento
- 🌓 **Dark mode**: Alterna entre modo claro y oscuro

## 🎛️ System Prompt Scheduler

El sistema ajusta automáticamente el tono según el tiempo transcurrido y el número de turnos. Editá `app/config.py` → `PROMPT_PHASES`:

```python
PROMPT_PHASES = [
  (0,  "Claro y directo. Responde en español con precisión y concisión."),
  (10, "Adopta un tono didáctico: explica brevemente el porqué."),
  (20, "Sé creativo y propositivo: sugiere variantes y mejoras."),
  (35, "Modo escénico: respuestas breves con metáforas suaves."),
]
```

## 🔄 Fallback a Ollama (opcional)

Si querés usar Ollama en vez de Claude:

1. Instala y ejecuta **Ollama**: `ollama serve`
2. Descarga un modelo: `ollama pull qwen2.5:0.5b`
3. Cambia en `.env`: `LLM_PROVIDER=ollama`

## 📝 CLI (Línea de comandos)

Además del frontend web, podés usar la CLI:

```bash
# Transcribir un archivo
python -m app.cli asr path/a/audio.wav

# Grabar micrófono y transcribir
python -m app.cli mic --seconds 8

# Chat de texto
python -m app.cli chat --text "¿Qué es machine learning?"

# Pipeline completo con audio
python -m app.cli run --audio audio.wav

# Pipeline con grabación de micrófono
python -m app.cli run --mic-seconds 6 --tts
```

## 🛠️ Estructura del Proyecto

```
avatar-vitual-interactivo/
├── app/                      # Backend Python
│   ├── server.py            # FastAPI + WebSocket
│   ├── asr.py               # Transcripción (Whisper)
│   ├── llm.py               # LLM (Claude/Ollama)
│   ├── pipeline.py          # Orquestación
│   ├── memory.py            # Persistencia
│   ├── scheduler.py         # System prompt adaptativo
│   ├── config.py            # Configuración
│   └── cli.py               # Interfaz CLI
├── frontend/                # Frontend React
│   ├── src/
│   │   ├── components/      # Componentes UI
│   │   │   ├── Header.jsx
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── VoiceRecorder.jsx
│   │   │   └── StatusBar.jsx
│   │   ├── context/         # Estado global
│   │   │   └── AppContext.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── data/                    # Datos persistentes
│   └── prompt_memory.json
├── requirements.txt         # Dependencias Python
├── .env                     # Configuración (crear desde .env.example)
└── README.md
```

## 🐛 Troubleshooting

### Error al acceder al micrófono
- Asegúrate de dar permisos al navegador para usar el micrófono
- En Chrome/Edge: Settings → Privacy and Security → Site Settings → Microphone

### WebSocket no conecta
- Verifica que el backend esté corriendo en el puerto 5175
- Revisa la consola del navegador para errores de conexión
- Asegúrate de que no haya firewall bloqueando el puerto

### Whisper lento en CPU
- faster-whisper optimiza para CPU, pero GPU es más rápido
- Usa modelo `small` o `tiny` para CPU: edita `app/asr.py`

### Error de ANTHROPIC_API_KEY
- Verifica que el archivo `.env` existe y tiene la key correcta
- La key debe empezar con `sk-ant-`

## 📄 Licencia

Este proyecto es de código abierto. Siéntete libre de usarlo y modificarlo.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

**Desarrollado con ❤️ usando FastAPI, React y Whisper**


- La memoria queda en `data/prompt_memory.json`.
- Para micrófono: en macOS, otorgar permisos a **Terminal/VSCode** en *Privacy → Microphone*.
- Si PortAudio da error: reinstalá `sounddevice` luego de instalar `portaudio`.
