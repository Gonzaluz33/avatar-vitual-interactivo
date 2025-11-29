"""
AIAvatarKit Integration Module

Este módulo integra AIAvatarKit con el sistema Avatar Virtual Interactivo existente.
AIAvatarKit proporciona capacidades avanzadas de Speech-to-Speech para avatares conversacionales.

Características incluidas:
- Múltiples LLMs (ChatGPT, Claude, Gemini)
- STT (Speech-to-Text) con OpenAI, Azure, Google
- TTS (Text-to-Speech) con VOICEVOX, OpenAI, Azure
- VAD (Voice Activity Detection)
- Control de expresiones faciales
- API HTTP/SSE y WebSocket

NOTA: Este proyecto usa Gemini como proveedor principal (no requiere OpenAI API key)
"""

from __future__ import annotations
import os
import logging
from typing import Optional, Dict, Any

from .config import (
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    VOICEVOX_BASE_URL,
    VOICEVOX_SPEAKER,
    AIAVATAR_SYSTEM_PROMPT,
    AIAVATAR_DEBUG,
    AIAVATAR_WAKEWORDS,
    AIAVATAR_LANGUAGE,
    AIAVATAR_LLM_PROVIDER,
)

logger = logging.getLogger(__name__)


def create_aiavatar_app(
    llm_provider: str = None,
    use_custom_system_prompt: bool = True,
    debug: bool = None,
):
    """
    Crea y configura una instancia de AIAvatar.
    
    Args:
        llm_provider: Proveedor de LLM ("gemini", "claude", "openai"). Default usa AIAVATAR_LLM_PROVIDER
        use_custom_system_prompt: Si usar el system prompt personalizado
        debug: Modo debug (None para usar config)
    
    Returns:
        Instancia configurada de AIAvatar
    """
    from aiavatar import AIAvatar
    
    debug = debug if debug is not None else AIAVATAR_DEBUG
    llm_provider = llm_provider or AIAVATAR_LLM_PROVIDER
    
    # Configuración base - NO requiere openai_api_key si usamos Gemini
    config = {
        "debug": debug,
    }
    
    # Solo agregar openai_api_key si está disponible (para STT con OpenAI)
    if OPENAI_API_KEY:
        config["openai_api_key"] = OPENAI_API_KEY
    
    # Configurar system prompt
    if use_custom_system_prompt and AIAVATAR_SYSTEM_PROMPT:
        config["system_prompt"] = AIAVATAR_SYSTEM_PROMPT
    
    # Configurar wakewords si están definidas
    if AIAVATAR_WAKEWORDS:
        config["wakewords"] = AIAVATAR_WAKEWORDS
    
    # Configurar VOICEVOX TTS
    if VOICEVOX_BASE_URL:
        from aiavatar.sts.tts.voicevox import VoicevoxSpeechSynthesizer
        tts = VoicevoxSpeechSynthesizer(
            base_url=VOICEVOX_BASE_URL,
            speaker=VOICEVOX_SPEAKER,
        )
        config["tts"] = tts
    
    # Configurar LLM según proveedor
    llm = None
    if llm_provider == "gemini" and GEMINI_API_KEY:
        from aiavatar.sts.llm.gemini import GeminiService
        llm = GeminiService(
            gemini_api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            system_prompt=config.get("system_prompt", ""),
        )
        config["llm"] = llm
        config.pop("system_prompt", None)
        logger.info(f"Usando Gemini ({GEMINI_MODEL}) como LLM")
    elif llm_provider == "claude" and ANTHROPIC_API_KEY:
        from aiavatar.sts.llm.claude import ClaudeService
        llm = ClaudeService(
            anthropic_api_key=ANTHROPIC_API_KEY,
            model="claude-sonnet-4-5",
            system_prompt=config.get("system_prompt", ""),
        )
        config["llm"] = llm
        config.pop("system_prompt", None)
        logger.info("Usando Claude como LLM")
    elif llm_provider == "openai" and OPENAI_API_KEY:
        from aiavatar.sts.llm.chatgpt import ChatGPTService
        llm = ChatGPTService(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o",
            system_prompt=config.get("system_prompt", ""),
        )
        config["llm"] = llm
        config.pop("system_prompt", None)
        logger.info("Usando OpenAI GPT-4o como LLM")
    else:
        # Fallback: intentar con el proveedor disponible
        if GEMINI_API_KEY:
            from aiavatar.sts.llm.gemini import GeminiService
            llm = GeminiService(
                gemini_api_key=GEMINI_API_KEY,
                model=GEMINI_MODEL,
                system_prompt=config.get("system_prompt", ""),
            )
            config["llm"] = llm
            config.pop("system_prompt", None)
            logger.info(f"Fallback a Gemini ({GEMINI_MODEL})")
        elif ANTHROPIC_API_KEY:
            from aiavatar.sts.llm.claude import ClaudeService
            llm = ClaudeService(
                anthropic_api_key=ANTHROPIC_API_KEY,
                model="claude-sonnet-4-5",
                system_prompt=config.get("system_prompt", ""),
            )
            config["llm"] = llm
            config.pop("system_prompt", None)
            logger.info("Fallback a Claude")
    
    # Crear AIAvatar
    aiavatar_app = AIAvatar(**config)
    
    logger.info(f"AIAvatar creado con proveedor LLM: {llm_provider}")
    
    return aiavatar_app


def _configure_llm(llm_provider: str, system_prompt: str = ""):
    """
    Configura el servicio LLM según el proveedor especificado.
    
    Args:
        llm_provider: Proveedor ("gemini", "claude", "openai")
        system_prompt: System prompt a usar
    
    Returns:
        Tuple (llm_service, provider_name)
    """
    llm_provider = llm_provider or AIAVATAR_LLM_PROVIDER
    
    if llm_provider == "gemini" and GEMINI_API_KEY:
        from aiavatar.sts.llm.gemini import GeminiService
        llm = GeminiService(
            gemini_api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            system_prompt=system_prompt,
        )
        return llm, "gemini"
    elif llm_provider == "claude" and ANTHROPIC_API_KEY:
        from aiavatar.sts.llm.claude import ClaudeService
        llm = ClaudeService(
            anthropic_api_key=ANTHROPIC_API_KEY,
            model="claude-sonnet-4-5",
            system_prompt=system_prompt,
        )
        return llm, "claude"
    elif llm_provider == "openai" and OPENAI_API_KEY:
        from aiavatar.sts.llm.chatgpt import ChatGPTService
        llm = ChatGPTService(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o",
            system_prompt=system_prompt,
        )
        return llm, "openai"
    
    # Fallback: buscar cualquier proveedor disponible
    if GEMINI_API_KEY:
        from aiavatar.sts.llm.gemini import GeminiService
        llm = GeminiService(
            gemini_api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            system_prompt=system_prompt,
        )
        return llm, "gemini (fallback)"
    elif ANTHROPIC_API_KEY:
        from aiavatar.sts.llm.claude import ClaudeService
        llm = ClaudeService(
            anthropic_api_key=ANTHROPIC_API_KEY,
            model="claude-sonnet-4-5",
            system_prompt=system_prompt,
        )
        return llm, "claude (fallback)"
    elif OPENAI_API_KEY:
        from aiavatar.sts.llm.chatgpt import ChatGPTService
        llm = ChatGPTService(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o",
            system_prompt=system_prompt,
        )
        return llm, "openai (fallback)"
    
    raise RuntimeError("No hay API keys configuradas para ningún LLM (GEMINI_API_KEY, ANTHROPIC_API_KEY, o OPENAI_API_KEY)")


def create_aiavatar_http_server(
    llm_provider: str = None,
    use_custom_system_prompt: bool = True,
    debug: bool = None,
    api_key: str = None,
):
    """
    Crea un servidor HTTP de AIAvatar para integración con FastAPI.
    
    Args:
        llm_provider: Proveedor de LLM ("gemini", "claude", "openai")
        use_custom_system_prompt: Si usar el system prompt personalizado
        debug: Modo debug
        api_key: API key para proteger endpoints
    
    Returns:
        Instancia de AIAvatarHttpServer
    """
    from aiavatar.adapter.http.server import AIAvatarHttpServer
    
    debug = debug if debug is not None else AIAVATAR_DEBUG
    llm_provider = llm_provider or AIAVATAR_LLM_PROVIDER
    
    config = {
        "debug": debug,
    }
    
    # Solo agregar openai_api_key si está disponible
    if OPENAI_API_KEY:
        config["openai_api_key"] = OPENAI_API_KEY
    
    if api_key:
        config["api_key"] = api_key
    
    system_prompt = AIAVATAR_SYSTEM_PROMPT if use_custom_system_prompt else ""
    
    # Configurar VOICEVOX TTS
    if VOICEVOX_BASE_URL:
        from aiavatar.sts.tts.voicevox import VoicevoxSpeechSynthesizer
        tts = VoicevoxSpeechSynthesizer(
            base_url=VOICEVOX_BASE_URL,
            speaker=VOICEVOX_SPEAKER,
        )
        config["tts"] = tts
    
    # Configurar LLM
    llm, provider_name = _configure_llm(llm_provider, system_prompt)
    config["llm"] = llm
    
    server = AIAvatarHttpServer(**config)
    
    logger.info(f"AIAvatarHttpServer creado con proveedor LLM: {provider_name}")
    
    return server


def create_aiavatar_websocket_server(
    llm_provider: str = "openai",
    use_custom_system_prompt: bool = True,
    debug: bool = None,
    volume_db_threshold: float = -30.0,
):
    """
    Crea un servidor WebSocket de AIAvatar.
    
    Args:
        llm_provider: Proveedor de LLM ("gemini", "claude", "openai")
        use_custom_system_prompt: Si usar el system prompt personalizado
        debug: Modo debug
        volume_db_threshold: Umbral de volumen para VAD
    
    Returns:
        Instancia de AIAvatarWebSocketServer
    """
    from aiavatar.adapter.websocket.server import AIAvatarWebSocketServer
    
    debug = debug if debug is not None else AIAVATAR_DEBUG
    llm_provider = llm_provider or AIAVATAR_LLM_PROVIDER
    
    config = {
        "volume_db_threshold": volume_db_threshold,
        "debug": debug,
    }
    
    # Solo agregar openai_api_key si está disponible
    if OPENAI_API_KEY:
        config["openai_api_key"] = OPENAI_API_KEY
    
    system_prompt = AIAVATAR_SYSTEM_PROMPT if use_custom_system_prompt else ""
    
    # Configurar VOICEVOX TTS
    if VOICEVOX_BASE_URL:
        from aiavatar.sts.tts.voicevox import VoicevoxSpeechSynthesizer
        tts = VoicevoxSpeechSynthesizer(
            base_url=VOICEVOX_BASE_URL,
            speaker=VOICEVOX_SPEAKER,
        )
        config["tts"] = tts
    
    # Configurar LLM usando la función helper
    llm, provider_name = _configure_llm(llm_provider, system_prompt)
    config["llm"] = llm
    
    server = AIAvatarWebSocketServer(**config)
    
    logger.info(f"AIAvatarWebSocketServer creado con proveedor LLM: {provider_name}")
    
    return server


def setup_face_expressions(aiavatar_app, faces: Dict[str, Any] = None):
    """
    Configura las expresiones faciales del avatar.
    
    Args:
        aiavatar_app: Instancia de AIAvatar
        faces: Diccionario de expresiones {nombre: valor}
    """
    default_faces = {
        "neutral": "🙂",
        "joy": "😀",
        "angry": "😠",
        "sorrow": "😞",
        "fun": "🥳",
        "thinking": "🤔",
        "surprised": "😮",
    }
    
    aiavatar_app.face_controller.faces = faces or default_faces
    
    # Agregar instrucciones de expresiones al system prompt
    face_instruction = """
# Expresiones Faciales

* Tienes las siguientes expresiones disponibles:
- joy (alegría)
- angry (enojo)
- sorrow (tristeza)
- fun (diversión)
- thinking (pensando)
- surprised (sorprendido)

* Si quieres expresar una emoción particular, insértala al inicio de la oración como [face:joy].

Ejemplo:
[face:joy]¡Hola! ¡Qué bueno verte! [face:fun]¡Vamos a divertirnos!
"""
    
    if hasattr(aiavatar_app.sts, 'llm') and hasattr(aiavatar_app.sts.llm, 'system_prompt'):
        current_prompt = aiavatar_app.sts.llm.system_prompt or ""
        aiavatar_app.sts.llm.system_prompt = current_prompt + "\n" + face_instruction
    
    logger.info("Expresiones faciales configuradas")


def register_custom_tool(aiavatar_app, tool_spec: dict, tool_func):
    """
    Registra una herramienta personalizada en AIAvatar.
    
    Args:
        aiavatar_app: Instancia de AIAvatar
        tool_spec: Especificación de la herramienta (formato OpenAI function)
        tool_func: Función async que implementa la herramienta
    """
    aiavatar_app.sts.llm.tool(tool_spec)(tool_func)
    logger.info(f"Herramienta registrada: {tool_spec.get('function', {}).get('name', 'unknown')}")


def setup_callbacks(aiavatar_app):
    """
    Configura callbacks personalizados para AIAvatar.
    """
    # Callback cuando inicia una respuesta
    @aiavatar_app.on_response("start")
    async def on_start_response(response):
        logger.debug(f"Iniciando respuesta para sesión")
        if hasattr(aiavatar_app, 'face_controller'):
            await aiavatar_app.face_controller.set_face("thinking", 3.0)
    
    # Callback cuando llega un chunk de respuesta
    @aiavatar_app.on_response("chunk")
    async def on_chunk_response(response):
        if response.metadata.get("is_first_chunk"):
            if hasattr(aiavatar_app, 'face_controller'):
                aiavatar_app.face_controller.reset()
    
    # Callback cuando termina una respuesta
    @aiavatar_app.sts.on_finish
    async def on_finish(request, response):
        logger.debug(f"Respuesta completada")
    
    logger.info("Callbacks configurados")
