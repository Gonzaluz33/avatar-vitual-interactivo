
from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile, os, json, base64, logging, time
from typing import List, Dict, Any, Optional
from .asr import transcribe_file
from .pipeline import Pipeline
from .config import elapsed_to_age
from .config import TTS_SPEED_PROFILES
from .tts import tts_service

# Importación condicional de AIAvatarKit
AIAVATAR_ENABLED = os.getenv("AIAVATAR_ENABLED", "false").lower() == "true"
aiavatar_http_server = None
aiavatar_ws_server = None

logger = logging.getLogger("app.server")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

if AIAVATAR_ENABLED:
    try:
        from .aiavatar_integration import (
            create_aiavatar_http_server,
            create_aiavatar_websocket_server,
            setup_face_expressions,
            setup_callbacks,
        )
        from .config import AIAVATAR_LLM_PROVIDER
        
        # Crear servidor HTTP de AIAvatarKit (usa el proveedor configurado, por defecto Gemini)
        aiavatar_http_server = create_aiavatar_http_server(
            llm_provider=AIAVATAR_LLM_PROVIDER,
            use_custom_system_prompt=True,
            debug=True,
        )
        
        # Crear servidor WebSocket de AIAvatarKit
        aiavatar_ws_server = create_aiavatar_websocket_server(
            llm_provider=AIAVATAR_LLM_PROVIDER,
            use_custom_system_prompt=True,
            debug=True,
        )
        
        print(f"✅ AIAvatarKit habilitado con proveedor: {AIAVATAR_LLM_PROVIDER}")
    except ImportError as e:
        print(f"⚠️ AIAvatarKit no disponible: {e}")
        AIAVATAR_ENABLED = False
    except Exception as e:
        print(f"⚠️ Error al configurar AIAvatarKit: {e}")
        AIAVATAR_ENABLED = False

app = FastAPI(title="Avatar Virtual Interactivo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = Pipeline()

class ChatRequest(BaseModel):
    text: str
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    response: str
    system_prompt: str
    turn: int
    elapsed_min: float
    age: int


class TTSRequest(BaseModel):
    text: str
    elapsed_min: float = 0.0

@app.get("/")
async def root():
    return {"message": "Avatar Virtual Interactivo API", "status": "running"}

@app.get("/health")
async def health():
    elapsed = pipeline.current_elapsed_min()
    return {
        "status": "ok",
        "turn": pipeline.turn,
        "elapsed_min": elapsed,
        "age": elapsed_to_age(elapsed),
    }

@app.post("/reset")
async def reset():
    result = pipeline.reset()
    return JSONResponse(result)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[-1]) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    res = transcribe_file(tmp_path, language="es")
    os.unlink(tmp_path)
    return JSONResponse({"text": res["text"], "segments": res["segments"]})

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    out = pipeline.run(request.text)
    return ChatResponse(
        response=out["response"],
        system_prompt=out["system_prompt"],
        turn=out["turn"],
        elapsed_min=out["elapsed_min"],
        age=out["age"],
    )

@app.post("/run")
async def run(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[-1]) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    asr = transcribe_file(tmp_path, language="es")
    os.unlink(tmp_path)
    out = pipeline.run(asr["text"])
    out["transcript"] = asr["text"]
    return JSONResponse(out)


def _pick_speed(elapsed_min: float) -> float:
    for start, end, speed in TTS_SPEED_PROFILES:
        if start <= elapsed_min < end:
            return speed
    return 1.0


@app.post("/tts/stream")
async def tts_stream(request: TTSRequest):
    """
    Streams TTS audio as audio/wav using Coqui TTS.
    """
    speed = _pick_speed(request.elapsed_min or 0.0)
    generator = tts_service.stream_wav(request.text, speed=speed)
    headers = {"X-TTS-Speed": str(speed)}
    return StreamingResponse(generator, media_type="audio/wav", headers=headers)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    logger.info("🔌 WebSocket connection opened from %s", websocket.client)
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            logger.info("📨 WS message received type=%s keys=%s", msg_type, list(data.keys()))
            
            if msg_type == "audio":
                audio_b64 = data.get("audio")
                start_ts = time.time()
                logger.info("🎙️  Processing audio message (len=%s)", len(audio_b64) if audio_b64 else 0)

                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                    tmp.write(base64.b64decode(audio_b64))
                    tmp_path = tmp.name
                
                try:
                    asr = transcribe_file(tmp_path, language="es")
                    transcript = asr["text"]
                    logger.info("✅ ASR complete in %.2fs text='%s'", time.time() - start_ts, transcript)
                    
                    await manager.send_personal_message({
                        "type": "transcript",
                        "text": transcript
                    }, websocket)
                    
                    run_start = time.time()
                    logger.info("⚙️  pipeline.run start (voice)")
                    out = pipeline.run(transcript)
                    logger.info("✅ pipeline.run end (voice) in %.2fs", time.time() - run_start)
                    
                    await manager.send_personal_message({
                        "type": "response",
                        "text": out["response"],
                        "system_prompt": out["system_prompt"],
                        "turn": out["turn"],
                        "elapsed_min": out["elapsed_min"],
                        "age": out.get("age"),
                    }, websocket)
                    
                except Exception as e:
                    logger.exception("❌ Error handling audio message")
                    await manager.send_personal_message({
                        "type": "error",
                        "message": str(e)
                    }, websocket)
                finally:
                    os.unlink(tmp_path)
            
            elif msg_type == "text":
                text = data.get("text")
                try:
                    run_start = time.time()
                    logger.info("💬 pipeline.run start (text) text='%s'", text)
                    out = pipeline.run(text)
                    logger.info("✅ pipeline.run end (text) in %.2fs", time.time() - run_start)
                    await manager.send_personal_message({
                        "type": "response",
                        "text": out["response"],
                        "system_prompt": out["system_prompt"],
                        "turn": out["turn"],
                        "elapsed_min": out["elapsed_min"],
                        "age": out.get("age"),
                    }, websocket)
                except Exception as e:
                    logger.exception("❌ Error handling text message")
                    await manager.send_personal_message({
                        "type": "error",
                        "message": str(e)
                    }, websocket)
            
            elif msg_type == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
                logger.info("🏓 pong sent")
            else:
                logger.warning("⚠️  Unknown WS message type=%s payload=%s", msg_type, data)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("🔌 WebSocket disconnected %s", websocket.client)


# ============================================================================
# AIAvatarKit Integration Routes
# ============================================================================

@app.get("/aiavatar/status")
async def aiavatar_status():
    """Verifica el estado de AIAvatarKit"""
    return {
        "enabled": AIAVATAR_ENABLED,
        "http_server": aiavatar_http_server is not None,
        "websocket_server": aiavatar_ws_server is not None,
    }


# Incluir routers de AIAvatarKit si está habilitado
if AIAVATAR_ENABLED and aiavatar_http_server:
    # Router HTTP para chat con streaming (SSE)
    aiavatar_router = aiavatar_http_server.get_api_router()
    app.include_router(aiavatar_router, prefix="/aiavatar", tags=["AIAvatarKit"])
    print("📡 AIAvatarKit HTTP router incluido en /aiavatar")

if AIAVATAR_ENABLED and aiavatar_ws_server:
    # Router WebSocket para comunicación en tiempo real
    aiavatar_ws_router = aiavatar_ws_server.get_websocket_router()
    app.include_router(aiavatar_ws_router, prefix="/aiavatar", tags=["AIAvatarKit WebSocket"])
    print("🔌 AIAvatarKit WebSocket router incluido en /aiavatar/ws")
