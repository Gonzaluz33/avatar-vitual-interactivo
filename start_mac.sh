#!/bin/bash

# ============================================================
# Avatar Virtual Interactivo - Script de Inicio para macOS
# ============================================================
# 
# Uso:
#   ./start_mac.sh              - Inicio normal (backend + frontend)
#   ./start_mac.sh --aiavatar   - Inicio con AIAvatarKit habilitado
#   ./start_mac.sh --local      - Modo conversación local (solo voz)
#   ./start_mac.sh --help       - Mostrar ayuda
#
# ============================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Variables por defecto
MODE="normal"
BACKEND_PORT=5175
FRONTEND_PORT=5173
AIAVATAR_PORT=8000

# Función de ayuda
show_help() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     Avatar Virtual Interactivo - Script de Inicio         ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Uso:${NC}"
    echo "  ./start_mac.sh [opciones]"
    echo ""
    echo -e "${GREEN}Opciones:${NC}"
    echo "  --help, -h        Mostrar esta ayuda"
    echo "  --aiavatar, -a    Iniciar con AIAvatarKit (Speech-to-Speech)"
    echo "  --local, -l       Modo conversación local (solo voz, sin servidor)"
    echo "  --standalone, -s  Servidor AIAvatarKit standalone"
    echo "  --provider, -p    Proveedor LLM: gemini (default), claude, openai"
    echo ""
    echo -e "${GREEN}Ejemplos:${NC}"
    echo "  ./start_mac.sh                          # Backend + Frontend normal"
    echo "  ./start_mac.sh --aiavatar               # Con AIAvatarKit habilitado"
    echo "  ./start_mac.sh --local -p gemini        # Conversación local con Gemini"
    echo "  ./start_mac.sh --standalone -p claude   # Servidor standalone con Claude"
    echo ""
    echo -e "${GREEN}Puertos:${NC}"
    echo "  Backend:    http://localhost:$BACKEND_PORT"
    echo "  Frontend:   http://localhost:$FRONTEND_PORT"
    echo "  AIAvatar:   http://localhost:$AIAVATAR_PORT"
    echo ""
}

# Función para verificar dependencias
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
    
    # Verificar Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 no encontrado. Instala Python 3.10+${NC}"
        exit 1
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no encontrado. Instala Node.js 18+${NC}"
        exit 1
    fi
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm no encontrado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencias verificadas${NC}"
}

# Función para verificar/crear entorno virtual
setup_venv() {
    echo -e "${BLUE}🐍 Configurando entorno virtual...${NC}"
    
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}   Creando entorno virtual...${NC}"
        python3 -m venv venv
    fi
    
    # Activar entorno virtual
    source venv/bin/activate
    
    # Verificar si hay que instalar dependencias
    if [ ! -f "venv/.deps_installed" ] || [ "requirements.txt" -nt "venv/.deps_installed" ]; then
        echo -e "${YELLOW}   Instalando dependencias Python...${NC}"
        pip install --upgrade pip -q
        pip install -r requirements.txt -q
        touch venv/.deps_installed
    fi
    
    echo -e "${GREEN}✅ Entorno Python listo${NC}"
}

# Función para configurar frontend
setup_frontend() {
    echo -e "${BLUE}📦 Configurando frontend...${NC}"
    
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${YELLOW}   Instalando dependencias npm...${NC}"
        cd frontend
        npm install --silent
        cd ..
    fi
    
    echo -e "${GREEN}✅ Frontend listo${NC}"
}

# Función para verificar archivo .env
check_env() {
    echo -e "${BLUE}⚙️  Verificando configuración...${NC}"
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}   ⚠️  Archivo .env no encontrado${NC}"
        
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}   Copiando .env.example a .env...${NC}"
            cp .env.example .env
            echo -e "${YELLOW}   ⚠️  Por favor configura las API keys en .env${NC}"
        else
            echo -e "${RED}   ❌ No se encontró .env.example${NC}"
            exit 1
        fi
    fi
    
    # Verificar API keys según el modo
    source .env 2>/dev/null || true
    
    if [ "$MODE" = "aiavatar" ] || [ "$MODE" = "local" ] || [ "$MODE" = "standalone" ]; then
        if [ -z "$GEMINI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
            echo -e "${RED}   ❌ No hay API keys configuradas para LLM${NC}"
            echo -e "${YELLOW}   Configura al menos una en .env:${NC}"
            echo -e "${YELLOW}   - GEMINI_API_KEY (recomendado)${NC}"
            echo -e "${YELLOW}   - ANTHROPIC_API_KEY${NC}"
            echo -e "${YELLOW}   - OPENAI_API_KEY${NC}"
            exit 1
        fi
        
        # Mostrar proveedores disponibles
        echo -e "${GREEN}   Proveedores LLM disponibles:${NC}"
        [ -n "$GEMINI_API_KEY" ] && echo -e "${GREEN}   ✓ Gemini${NC}"
        [ -n "$ANTHROPIC_API_KEY" ] && echo -e "${GREEN}   ✓ Claude${NC}"
        [ -n "$OPENAI_API_KEY" ] && echo -e "${GREEN}   ✓ OpenAI${NC}"
    else
        if [ -z "$ANTHROPIC_API_KEY" ]; then
            echo -e "${YELLOW}   ⚠️  ANTHROPIC_API_KEY no configurada${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Configuración verificada${NC}"
}

# Función para matar procesos previos en los puertos
kill_existing() {
    echo -e "${BLUE}🧹 Limpiando procesos previos...${NC}"
    
    # Matar procesos en los puertos usados
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$AIAVATAR_PORT | xargs kill -9 2>/dev/null || true
    
    sleep 1
}

# Función para iniciar modo normal
start_normal() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           🚀 Iniciando Avatar Virtual Interactivo          ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Iniciar backend
    echo -e "${BLUE}🔧 Iniciando backend en puerto $BACKEND_PORT...${NC}"
    uvicorn app.server:app --reload --port $BACKEND_PORT --host 0.0.0.0 &
    BACKEND_PID=$!
    
    sleep 3
    
    # Iniciar frontend
    echo -e "${BLUE}🎨 Iniciando frontend en puerto $FRONTEND_PORT...${NC}"
    cd frontend
    npm run dev -- --port $FRONTEND_PORT &
    FRONTEND_PID=$!
    cd ..
    
    sleep 2
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ Servicios Iniciados                  ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  🌐 Frontend:  ${CYAN}http://localhost:$FRONTEND_PORT${GREEN}                   ║${NC}"
    echo -e "${GREEN}║  🔧 Backend:   ${CYAN}http://localhost:$BACKEND_PORT${GREEN}                   ║${NC}"
    echo -e "${GREEN}║  📚 API Docs:  ${CYAN}http://localhost:$BACKEND_PORT/docs${GREEN}              ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  ${YELLOW}⚠️  Presiona Ctrl+C para detener${GREEN}                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Abrir navegador automáticamente
    sleep 2
    open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true
    
    # Manejar Ctrl+C
    trap "echo ''; echo -e '${YELLOW}🛑 Deteniendo servicios...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
    
    wait
}

# Función para iniciar con AIAvatarKit
start_aiavatar() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║      🤖 Iniciando con AIAvatarKit (Speech-to-Speech)       ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Habilitar AIAvatarKit
    export AIAVATAR_ENABLED=true
    
    # Iniciar backend con AIAvatarKit
    echo -e "${BLUE}🔧 Iniciando backend + AIAvatarKit en puerto $BACKEND_PORT...${NC}"
    uvicorn app.server:app --reload --port $BACKEND_PORT --host 0.0.0.0 &
    BACKEND_PID=$!
    
    sleep 3
    
    # Iniciar frontend
    echo -e "${BLUE}🎨 Iniciando frontend en puerto $FRONTEND_PORT...${NC}"
    cd frontend
    npm run dev -- --port $FRONTEND_PORT &
    FRONTEND_PID=$!
    cd ..
    
    sleep 2
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ Servicios + AIAvatarKit Iniciados          ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  🌐 Frontend:      ${CYAN}http://localhost:$FRONTEND_PORT${GREEN}               ║${NC}"
    echo -e "${GREEN}║  🔧 Backend:       ${CYAN}http://localhost:$BACKEND_PORT${GREEN}               ║${NC}"
    echo -e "${GREEN}║  🤖 AIAvatar HTTP: ${CYAN}http://localhost:$BACKEND_PORT/aiavatar/${GREEN}     ║${NC}"
    echo -e "${GREEN}║  🔌 AIAvatar WS:   ${CYAN}ws://localhost:$BACKEND_PORT/aiavatar/ws${GREEN}     ║${NC}"
    echo -e "${GREEN}║  📚 API Docs:      ${CYAN}http://localhost:$BACKEND_PORT/docs${GREEN}          ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  ${YELLOW}⚠️  Presiona Ctrl+C para detener${GREEN}                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Abrir navegador
    sleep 2
    open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true
    
    trap "echo ''; echo -e '${YELLOW}🛑 Deteniendo servicios...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
    
    wait
}

# Función para modo local (conversación por voz directa)
start_local() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          🎤 Modo Conversación Local (Solo Voz)             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BLUE}Iniciando AIAvatarKit en modo local...${NC}"
    echo -e "${YELLOW}Este modo usa micrófono y altavoces directamente.${NC}"
    echo ""
    
    python run_aiavatar.py --mode local --provider "$PROVIDER"
}

# Función para servidor standalone
start_standalone() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          🌐 Servidor AIAvatarKit Standalone                ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    python run_aiavatar.py --mode standalone --provider "$PROVIDER" --port $AIAVATAR_PORT
}

# ============================================================
# MAIN
# ============================================================

# Parsear argumentos
PROVIDER="gemini"

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --aiavatar|-a)
            MODE="aiavatar"
            shift
            ;;
        --local|-l)
            MODE="local"
            shift
            ;;
        --standalone|-s)
            MODE="standalone"
            shift
            ;;
        --provider|-p)
            PROVIDER="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Opción desconocida: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║        🤖 Avatar Virtual Interactivo                       ║${NC}"
echo -e "${CYAN}║        Sistema de Conversación con IA                      ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Ejecutar verificaciones
check_dependencies
setup_venv
check_env

# Solo configurar frontend si no es modo local
if [ "$MODE" != "local" ]; then
    setup_frontend
fi

kill_existing

# Ejecutar según el modo
case $MODE in
    normal)
        start_normal
        ;;
    aiavatar)
        start_aiavatar
        ;;
    local)
        start_local
        ;;
    standalone)
        start_standalone
        ;;
esac
