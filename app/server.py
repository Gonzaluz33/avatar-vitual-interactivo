
from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile, os, json, base64
from typing import List, Dict, Any
from .asr import transcribe_file
from .pipeline import Pipeline

app = FastAPI(title="Local ASR + LLM API")

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia del pipeline (una por sesión de servidor)
pipeline = Pipeline()

# Modelos Pydantic para request/response
class ChatRequest(BaseModel):
    text: str
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    response: str
    system_prompt: str
    turn: int
    elapsed_min: float

# Endpoints HTTP existentes
@app.get("/")
async def root():
    return {"message": "Avatar Virtual Interactivo API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "turn": pipeline.turn, "elapsed_min": pipeline.current_elapsed_min()}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Transcribe un archivo de audio a texto"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[-1]) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    res = transcribe_file(tmp_path, language="es")
    os.unlink(tmp_path)
    return JSONResponse({"text": res["text"], "segments": res["segments"]})

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Chat con el LLM usando texto"""
    out = pipeline.run(request.text)
    return ChatResponse(
        response=out["response"],
        system_prompt=out["system_prompt"],
        turn=out["turn"],
        elapsed_min=out["elapsed_min"]
    )

@app.post("/run")
async def run(file: UploadFile = File(...)):
    """Pipeline completo: transcribe audio -> LLM -> respuesta"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[-1]) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    asr = transcribe_file(tmp_path, language="es")
    os.unlink(tmp_path)
    out = pipeline.run(asr["text"])
    out["transcript"] = asr["text"]
    return JSONResponse(out)

# WebSocket para comunicación en tiempo real
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
    """WebSocket para streaming de audio en tiempo real"""
    await manager.connect(websocket)
    try:
        while True:
            # Recibir data del cliente
            data = await websocket.receive_json()
            
            if data.get("type") == "audio":
                # Audio en base64
                audio_b64 = data.get("audio")
                
                # Guardar temporalmente y procesar
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                    tmp.write(base64.b64decode(audio_b64))
                    tmp_path = tmp.name
                
                # Transcribir
                try:
                    asr = transcribe_file(tmp_path, language="es")
                    transcript = asr["text"]
                    
                    # Enviar transcripción
                    await manager.send_personal_message({
                        "type": "transcript",
                        "text": transcript
                    }, websocket)
                    
                    # Procesar con LLM
                    out = pipeline.run(transcript)
                    
                    # Enviar respuesta
                    await manager.send_personal_message({
                        "type": "response",
                        "text": out["response"],
                        "system_prompt": out["system_prompt"],
                        "turn": out["turn"],
                        "elapsed_min": out["elapsed_min"]
                    }, websocket)
                    
                except Exception as e:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": str(e)
                    }, websocket)
                finally:
                    os.unlink(tmp_path)
            
            elif data.get("type") == "text":
                # Chat de texto directo
                text = data.get("text")
                try:
                    out = pipeline.run(text)
                    await manager.send_personal_message({
                        "type": "response",
                        "text": out["response"],
                        "system_prompt": out["system_prompt"],
                        "turn": out["turn"],
                        "elapsed_min": out["elapsed_min"]
                    }, websocket)
                except Exception as e:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": str(e)
                    }, websocket)
            
            elif data.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Cliente desconectado")
