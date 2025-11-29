#!/usr/bin/env python3
"""
AIAvatarKit Runner - Ejecuta el sistema con AIAvatarKit habilitado

Este script inicia el Avatar Virtual Interactivo con las capacidades de AIAvatarKit:
- Speech-to-Speech en tiempo real
- Múltiples proveedores de LLM (OpenAI, Claude)
- TTS con VOICEVOX
- API HTTP/SSE y WebSocket

Uso:
    python run_aiavatar.py [--mode local|server] [--provider openai|claude]
    
Ejemplos:
    # Modo local con conversación por voz directa
    python run_aiavatar.py --mode local
    
    # Modo servidor HTTP/WebSocket
    python run_aiavatar.py --mode server
    
    # Usar Claude como LLM
    python run_aiavatar.py --mode server --provider claude
"""

import asyncio
import argparse
import os
import sys
from pathlib import Path

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent))

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv()


def check_requirements():
    """Verifica que las dependencias estén instaladas"""
    missing = []
    
    try:
        import aiavatar
    except ImportError:
        missing.append("aiavatar")
    
    if missing:
        print("❌ Faltan dependencias. Instala con:")
        print(f"   pip install {' '.join(missing)}")
        print("\n   O ejecuta: pip install -r requirements.txt")
        return False
    
    # Verificar que al menos un LLM esté configurado
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_claude = bool(os.getenv("ANTHROPIC_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    
    if not (has_gemini or has_claude or has_openai):
        print("❌ No hay API keys configuradas para ningún LLM")
        print("   Configura al menos una de estas en tu .env:")
        print("   - GEMINI_API_KEY (recomendado)")
        print("   - ANTHROPIC_API_KEY")
        print("   - OPENAI_API_KEY")
        return False
    
    # Mostrar qué proveedores están disponibles
    print("✅ Proveedores LLM disponibles:")
    if has_gemini:
        print("   - Gemini ✓")
    if has_claude:
        print("   - Claude ✓")
    if has_openai:
        print("   - OpenAI ✓")
    
    return True


def run_local_mode(provider: str = "gemini"):
    """
    Ejecuta AIAvatarKit en modo local (conversación por voz directa)
    """
    print("🎤 Iniciando modo local de AIAvatarKit...")
    
    from app.config import (
        OPENAI_API_KEY,
        ANTHROPIC_API_KEY,
        GEMINI_API_KEY,
        GEMINI_MODEL,
        VOICEVOX_BASE_URL,
        VOICEVOX_SPEAKER,
        AIAVATAR_SYSTEM_PROMPT,
        AIAVATAR_WAKEWORDS,
    )
    
    from aiavatar import AIAvatar
    
    # Configurar LLM según proveedor
    llm = None
    if provider == "gemini" and GEMINI_API_KEY:
        from aiavatar.sts.llm.gemini import GeminiService
        llm = GeminiService(
            gemini_api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            system_prompt=AIAVATAR_SYSTEM_PROMPT,
        )
        print(f"📚 Usando Gemini ({GEMINI_MODEL}) como LLM")
    elif provider == "claude" and ANTHROPIC_API_KEY:
        from aiavatar.sts.llm.claude import ClaudeService
        llm = ClaudeService(
            anthropic_api_key=ANTHROPIC_API_KEY,
            model="claude-sonnet-4-5",
            system_prompt=AIAVATAR_SYSTEM_PROMPT,
        )
        print(f"📚 Usando Claude como LLM")
    elif provider == "openai" and OPENAI_API_KEY:
        from aiavatar.sts.llm.chatgpt import ChatGPTService
        llm = ChatGPTService(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o",
            system_prompt=AIAVATAR_SYSTEM_PROMPT,
        )
        print(f"📚 Usando OpenAI GPT-4o como LLM")
    else:
        # Fallback: usar el que esté disponible
        if GEMINI_API_KEY:
            from aiavatar.sts.llm.gemini import GeminiService
            llm = GeminiService(
                gemini_api_key=GEMINI_API_KEY,
                model=GEMINI_MODEL,
                system_prompt=AIAVATAR_SYSTEM_PROMPT,
            )
            print(f"📚 Usando Gemini ({GEMINI_MODEL}) como LLM (fallback)")
        elif ANTHROPIC_API_KEY:
            from aiavatar.sts.llm.claude import ClaudeService
            llm = ClaudeService(
                anthropic_api_key=ANTHROPIC_API_KEY,
                model="claude-sonnet-4-5",
                system_prompt=AIAVATAR_SYSTEM_PROMPT,
            )
            print(f"📚 Usando Claude como LLM (fallback)")
    
    if not llm:
        print("❌ No se pudo configurar ningún LLM")
        return
    
    # Configurar TTS
    tts = None
    if VOICEVOX_BASE_URL:
        try:
            from aiavatar.sts.tts.voicevox import VoicevoxSpeechSynthesizer
            tts = VoicevoxSpeechSynthesizer(
                base_url=VOICEVOX_BASE_URL,
                speaker=VOICEVOX_SPEAKER,
            )
            print(f"🔊 VOICEVOX TTS habilitado en {VOICEVOX_BASE_URL}")
        except Exception as e:
            print(f"⚠️ VOICEVOX no disponible: {e}")
            print("   Usando TTS por defecto")
    
    # Crear AIAvatar - NO requiere openai_api_key si usamos Gemini
    config = {
        "llm": llm,
        "debug": True,
    }
    
    # Solo agregar openai_api_key si está disponible (para STT opcional)
    if OPENAI_API_KEY:
        config["openai_api_key"] = OPENAI_API_KEY
    
    if tts:
        config["tts"] = tts
    
    if AIAVATAR_WAKEWORDS:
        config["wakewords"] = AIAVATAR_WAKEWORDS
        print(f"🗣️ Wakewords: {AIAVATAR_WAKEWORDS}")
    
    aiavatar_app = AIAvatar(**config)
    
    # Configurar expresiones faciales
    aiavatar_app.face_controller.faces = {
        "neutral": "🙂",
        "joy": "😀",
        "angry": "😠",
        "sorrow": "😞",
        "fun": "🥳",
        "thinking": "🤔",
    }
    
    print("\n" + "="*50)
    print("🎙️ AIAvatar listo para conversación")
    if AIAVATAR_WAKEWORDS:
        print(f"   Di '{AIAVATAR_WAKEWORDS[0]}' para comenzar")
    else:
        print("   La conversación comenzará automáticamente")
    print("   Presiona Ctrl+C para salir")
    print("="*50 + "\n")
    
    # Iniciar escucha
    asyncio.run(aiavatar_app.start_listening())


def run_server_mode(provider: str = "openai", host: str = "0.0.0.0", port: int = 8000):
    """
    Ejecuta AIAvatarKit como servidor HTTP/WebSocket
    """
    print("🌐 Iniciando servidor AIAvatarKit...")
    
    import uvicorn
    
    # Establecer variable de entorno para habilitar AIAvatarKit
    os.environ["AIAVATAR_ENABLED"] = "true"
    os.environ["LLM_PROVIDER"] = provider
    
    print(f"\n" + "="*50)
    print(f"🚀 Servidor iniciando en http://{host}:{port}")
    print(f"   📡 API original:    http://{host}:{port}/")
    print(f"   🤖 AIAvatarKit HTTP: http://{host}:{port}/aiavatar/")
    print(f"   🔌 AIAvatarKit WS:   ws://{host}:{port}/aiavatar/ws")
    print(f"   📊 Estado AIAvatar:  http://{host}:{port}/aiavatar/status")
    print("="*50 + "\n")
    
    # Importar y ejecutar la app
    uvicorn.run(
        "app.server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
    )


def run_standalone_server(provider: str = "openai", host: str = "0.0.0.0", port: int = 8001):
    """
    Ejecuta un servidor AIAvatarKit standalone (sin la API original)
    """
    print("🌐 Iniciando servidor AIAvatarKit standalone...")
    
    from fastapi import FastAPI
    import uvicorn
    
    from app.config import (
        OPENAI_API_KEY,
        ANTHROPIC_API_KEY,
        GEMINI_API_KEY,
        GEMINI_MODEL,
        VOICEVOX_BASE_URL,
        VOICEVOX_SPEAKER,
        AIAVATAR_SYSTEM_PROMPT,
    )
    from aiavatar.adapter.http.server import AIAvatarHttpServer
    from aiavatar.adapter.websocket.server import AIAvatarWebSocketServer
    
    # Configurar LLM según proveedor
    llm = None
    if provider == "gemini" and GEMINI_API_KEY:
        from aiavatar.sts.llm.gemini import GeminiService
        llm = GeminiService(
            gemini_api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            system_prompt=AIAVATAR_SYSTEM_PROMPT,
        )
        print(f"📚 Usando Gemini ({GEMINI_MODEL}) como LLM")
    elif provider == "claude" and ANTHROPIC_API_KEY:
        from aiavatar.sts.llm.claude import ClaudeService
        llm = ClaudeService(
            anthropic_api_key=ANTHROPIC_API_KEY,
            model="claude-sonnet-4-5",
            system_prompt=AIAVATAR_SYSTEM_PROMPT,
        )
        print(f"📚 Usando Claude como LLM")
    elif provider == "openai" and OPENAI_API_KEY:
        from aiavatar.sts.llm.chatgpt import ChatGPTService
        llm = ChatGPTService(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o",
            system_prompt=AIAVATAR_SYSTEM_PROMPT,
        )
        print(f"📚 Usando OpenAI GPT-4o como LLM")
    else:
        # Fallback
        if GEMINI_API_KEY:
            from aiavatar.sts.llm.gemini import GeminiService
            llm = GeminiService(
                gemini_api_key=GEMINI_API_KEY,
                model=GEMINI_MODEL,
                system_prompt=AIAVATAR_SYSTEM_PROMPT,
            )
            print(f"📚 Usando Gemini ({GEMINI_MODEL}) como LLM (fallback)")
        elif ANTHROPIC_API_KEY:
            from aiavatar.sts.llm.claude import ClaudeService
            llm = ClaudeService(
                anthropic_api_key=ANTHROPIC_API_KEY,
                model="claude-sonnet-4-5",
                system_prompt=AIAVATAR_SYSTEM_PROMPT,
            )
            print(f"📚 Usando Claude como LLM (fallback)")
    
    if not llm:
        print("❌ No se pudo configurar ningún LLM")
        return
    
    # Configurar TTS
    tts = None
    if VOICEVOX_BASE_URL:
        try:
            from aiavatar.sts.tts.voicevox import VoicevoxSpeechSynthesizer
            tts = VoicevoxSpeechSynthesizer(
                base_url=VOICEVOX_BASE_URL,
                speaker=VOICEVOX_SPEAKER,
            )
        except:
            pass
    
    # Crear servidores - NO requieren openai_api_key si usamos Gemini
    http_config = {
        "llm": llm,
        "debug": True,
    }
    if OPENAI_API_KEY:
        http_config["openai_api_key"] = OPENAI_API_KEY
    if tts:
        http_config["tts"] = tts
    
    aiavatar_http = AIAvatarHttpServer(**http_config)
    
    ws_config = {
        "llm": llm,
        "volume_db_threshold": -30.0,
        "debug": True,
    }
    if OPENAI_API_KEY:
        ws_config["openai_api_key"] = OPENAI_API_KEY
    if tts:
        ws_config["tts"] = tts
    
    aiavatar_ws = AIAvatarWebSocketServer(**ws_config)
    
    # Crear app FastAPI
    app = FastAPI(
        title="AIAvatarKit Standalone Server",
        description="Servidor Speech-to-Speech para Avatar Virtual Interactivo",
        version="1.0.0",
    )
    
    @app.get("/")
    async def root():
        return {
            "service": "AIAvatarKit Standalone",
            "status": "running",
            "provider": provider,
        }
    
    @app.get("/health")
    async def health():
        return {"status": "ok"}
    
    # Incluir routers
    app.include_router(aiavatar_http.get_api_router(), prefix="/chat", tags=["Chat HTTP"])
    app.include_router(aiavatar_ws.get_websocket_router(), tags=["WebSocket"])
    
    print(f"\n" + "="*50)
    print(f"🚀 AIAvatarKit Standalone en http://{host}:{port}")
    print(f"   💬 Chat HTTP (SSE): http://{host}:{port}/chat/")
    print(f"   🔌 WebSocket:       ws://{host}:{port}/ws")
    print(f"   🏥 Health:          http://{host}:{port}/health")
    print("="*50 + "\n")
    
    uvicorn.run(app, host=host, port=port)


def main():
    parser = argparse.ArgumentParser(
        description="AIAvatarKit Runner para Avatar Virtual Interactivo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Modos disponibles:
  local      - Conversación por voz directa (requiere micrófono/altavoces)
  server     - Servidor integrado con la API original
  standalone - Servidor AIAvatarKit standalone

Proveedores LLM:
  gemini     - Google Gemini (RECOMENDADO - no requiere OpenAI API key)
  claude     - Anthropic Claude
  openai     - OpenAI GPT-4o

Ejemplos:
  python run_aiavatar.py --mode local --provider gemini
  python run_aiavatar.py --mode server --port 8000
  python run_aiavatar.py --mode standalone --provider claude
        """
    )
    
    parser.add_argument(
        "--mode", "-m",
        choices=["local", "server", "standalone"],
        default="server",
        help="Modo de ejecución (default: server)"
    )
    
    parser.add_argument(
        "--provider", "-p",
        choices=["gemini", "claude", "openai"],
        default="gemini",
        help="Proveedor de LLM (default: gemini)"
    )
    
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host del servidor (default: 0.0.0.0)"
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Puerto del servidor (default: 8000)"
    )
    
    args = parser.parse_args()
    
    print("🤖 Avatar Virtual Interactivo + AIAvatarKit")
    print("="*50)
    
    if not check_requirements():
        sys.exit(1)
    
    try:
        if args.mode == "local":
            run_local_mode(args.provider)
        elif args.mode == "server":
            run_server_mode(args.provider, args.host, args.port)
        elif args.mode == "standalone":
            run_standalone_server(args.provider, args.host, args.port)
    except KeyboardInterrupt:
        print("\n\n👋 ¡Hasta luego!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
