# Integración con AIAvatarKit

Este documento describe cómo usar AIAvatarKit en el proyecto Avatar Virtual Interactivo.

## ¿Qué es AIAvatarKit?

[AIAvatarKit](https://github.com/uezo/aiavatarkit) es un framework de Speech-to-Speech para crear avatares conversacionales con IA. Proporciona:

- 🗣️ **STT (Speech-to-Text)**: OpenAI, Azure, Google
- 🤖 **LLM**: ChatGPT, Claude, Gemini, Dify, y más
- 🔊 **TTS (Text-to-Speech)**: VOICEVOX, OpenAI, Azure, SpeechGateway
- 🎙️ **VAD**: Detección de actividad de voz
- 😊 **Expresiones faciales**: Control de emociones del avatar
- 🌐 **APIs**: HTTP/SSE y WebSocket

## Instalación

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

O instalar AIAvatarKit directamente:

```bash
pip install aiavatar openai httpx pyaudio
```

### 2. Configurar VOICEVOX (opcional, para TTS en japonés/español)

AIAvatarKit usa VOICEVOX por defecto para TTS. Puedes descargarlo desde:
- https://voicevox.hiroshiba.jp/

Si no tienes VOICEVOX, AIAvatarKit usará otros proveedores de TTS.

### 3. Configurar variables de entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Requerido para AIAvatarKit (STT y LLM alternativo)
OPENAI_API_KEY=tu_openai_api_key

# Opcional: Para usar Claude como LLM
ANTHROPIC_API_KEY=tu_anthropic_api_key

# VOICEVOX (TTS) - opcional
VOICEVOX_BASE_URL=http://127.0.0.1:50021
VOICEVOX_SPEAKER=1

# Configuración de AIAvatarKit
AIAVATAR_ENABLED=true
AIAVATAR_DEBUG=true
AIAVATAR_LANGUAGE=es-ES
AIAVATAR_WAKEWORDS=Hola,Buenos días

# System prompt personalizado (opcional)
AIAVATAR_SYSTEM_PROMPT="Eres Facundo, un asistente virtual amigable..."
```

## Uso

### Modo 1: Servidor integrado

Ejecuta el servidor con AIAvatarKit habilitado:

```bash
# Habilitar AIAvatarKit
export AIAVATAR_ENABLED=true

# Iniciar servidor
python run_aiavatar.py --mode server
```

Esto expone:
- `http://localhost:8000/` - API original
- `http://localhost:8000/aiavatar/` - API de AIAvatarKit (HTTP/SSE)
- `ws://localhost:8000/aiavatar/ws` - WebSocket de AIAvatarKit

### Modo 2: Conversación local directa

Para conversación por voz sin servidor:

```bash
python run_aiavatar.py --mode local
```

Esto usa el micrófono y altavoces directamente.

### Modo 3: Servidor standalone

Servidor AIAvatarKit independiente:

```bash
python run_aiavatar.py --mode standalone --port 8001
```

## API HTTP (SSE)

### Iniciar conversación

```bash
curl -N -X POST http://localhost:8000/aiavatar/chat \
    -H "Content-Type: application/json" \
    -d '{
        "type": "start",
        "session_id": "mi-sesion-123",
        "user_id": "usuario1",
        "text": "Hola, ¿cómo estás?"
    }'
```

### Respuesta (streaming SSE)

```json
data: {"type": "start", "session_id": "mi-sesion-123", ...}
data: {"type": "chunk", "text": "[face:joy]¡Hola!", "audio_data": "BASE64...", ...}
data: {"type": "final", "text": "[face:joy]¡Hola! Estoy muy bien, gracias por preguntar.", ...}
```

### Enviar audio

```bash
curl -N -X POST http://localhost:8000/aiavatar/chat \
    -H "Content-Type: application/json" \
    -d '{
        "type": "start",
        "session_id": "mi-sesion-123",
        "user_id": "usuario1",
        "audio_data": "BASE64_ENCODED_AUDIO"
    }'
```

## API WebSocket

### Conexión

```javascript
const ws = new WebSocket('ws://localhost:8000/aiavatar/ws?session_id=123&user_id=user1');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'chunk') {
        // Reproducir audio
        playAudio(data.audio_data);
        // Mostrar texto
        displayText(data.voice_text);
        // Actualizar expresión facial
        if (data.avatar_control_request?.face_name) {
            setFace(data.avatar_control_request.face_name);
        }
    }
};

// Enviar audio del micrófono
ws.send(JSON.stringify({
    type: 'audio',
    audio: base64AudioData
}));
```

## Expresiones Faciales

AIAvatarKit soporta control de expresiones faciales. El LLM puede incluir tags como `[face:joy]` en sus respuestas.

Expresiones disponibles:
- `neutral` - 🙂
- `joy` - 😀
- `angry` - 😠
- `sorrow` - 😞
- `fun` - 🥳
- `thinking` - 🤔
- `surprised` - 😮

## Integración con Frontend

### React/Vue

```javascript
// services/aiavatarService.js
export class AIAvatarService {
    constructor(baseUrl = 'http://localhost:8000/aiavatar') {
        this.baseUrl = baseUrl;
        this.sessionId = crypto.randomUUID();
        this.userId = 'user1';
    }

    async chat(text) {
        const response = await fetch(`${this.baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'start',
                session_id: this.sessionId,
                user_id: this.userId,
                text: text
            })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    this.handleResponse(data);
                }
            }
        }
    }

    handleResponse(data) {
        if (data.type === 'chunk') {
            // Manejar respuesta
            console.log('Texto:', data.voice_text);
            if (data.audio_data) {
                this.playAudio(data.audio_data);
            }
        }
    }

    playAudio(base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
    }
}
```

## Configuración Avanzada

### Usar diferentes LLMs

```python
# En app/aiavatar_integration.py

# Claude
from aiavatar.sts.llm.claude import ClaudeService
llm = ClaudeService(
    anthropic_api_key=ANTHROPIC_API_KEY,
    model="claude-sonnet-4-5",
    system_prompt="Tu system prompt aquí"
)

# Gemini
from aiavatar.sts.llm.gemini import GeminiService
llm = GeminiService(
    gemini_api_key=GEMINI_API_KEY,
    model="gemini-2.0-flash",
    system_prompt="Tu system prompt aquí"
)
```

### Agregar herramientas (Tool Calls)

```python
# Definir herramienta
weather_tool_spec = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Obtiene el clima de una ubicación",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "Ciudad o ubicación"}
            },
            "required": ["location"]
        }
    }
}

# Registrar herramienta
@aiavatar_app.sts.llm.tool(weather_tool_spec)
async def get_weather(location: str):
    # Tu lógica aquí
    return {"weather": "soleado", "temperature": 25}
```

### Callbacks personalizados

```python
# Callback cuando inicia respuesta
@aiavatar_app.on_response("start")
async def on_start(response):
    print("Iniciando respuesta...")
    await aiavatar_app.face_controller.set_face("thinking", 2.0)

# Callback cuando termina
@aiavatar_app.sts.on_finish
async def on_finish(request, response):
    print(f"Respuesta completada: {response.text}")
```

## Troubleshooting

### "No se puede conectar a VOICEVOX"

Asegúrate de que VOICEVOX esté ejecutándose en el puerto configurado:

```bash
# Verificar VOICEVOX
curl http://127.0.0.1:50021/speakers
```

### "OPENAI_API_KEY no configurada"

AIAvatarKit requiere una API key de OpenAI para STT (Speech-to-Text):

```bash
export OPENAI_API_KEY=tu_api_key
```

### "Error de audio/micrófono"

Verifica los dispositivos de audio:

```python
from aiavatar import AudioDevice
AudioDevice().list_audio_devices()
```

### "Latencia alta en respuestas"

- Usa `SileroVAD` para mejor detección de voz
- Considera usar Azure STT (más rápido que OpenAI)
- Ajusta `silence_duration_threshold` para respuestas más rápidas

## Recursos

- [AIAvatarKit GitHub](https://github.com/uezo/aiavatarkit)
- [Documentación completa](https://github.com/uezo/aiavatarkit#readme)
- [VOICEVOX](https://voicevox.hiroshiba.jp/)
