#!/bin/bash

# Script de instalación completa
# Ejecuta este script desde la raíz del proyecto

echo "🚀 Instalando Avatar Virtual Interactivo..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}[PASO $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Paso 1: Verificar Python
print_step 1 "Verificando Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python encontrado: $PYTHON_VERSION"
else
    print_error "Python 3 no encontrado. Por favor instala Python 3.10+"
    exit 1
fi

# Paso 2: Crear entorno virtual
print_step 2 "Creando entorno virtual de Python..."
if [ -d ".venv" ]; then
    print_success "Entorno virtual ya existe"
else
    python3 -m venv .venv
    print_success "Entorno virtual creado"
fi

# Paso 3: Activar entorno virtual e instalar dependencias
print_step 3 "Instalando dependencias de Python..."
source .venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    print_success "Dependencias de Python instaladas"
else
    print_error "Error instalando dependencias de Python"
    exit 1
fi

# Paso 4: Verificar Node.js
print_step 4 "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js encontrado: $NODE_VERSION"
else
    print_error "Node.js no encontrado. Por favor instala Node.js 18+"
    exit 1
fi

# Paso 5: Instalar dependencias del frontend
print_step 5 "Instalando dependencias del frontend..."
cd frontend
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencias del frontend instaladas"
else
    print_error "Error instalando dependencias del frontend"
    exit 1
fi
cd ..

# Paso 6: Verificar archivo .env
print_step 6 "Verificando configuración..."
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  Archivo .env no encontrado"
    read -p "¿Deseas crear uno desde .env.example? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        cp .env.example .env
        print_success "Archivo .env creado"
        echo ""
        echo "📝 IMPORTANTE: Edita el archivo .env y agrega tu ANTHROPIC_API_KEY"
        echo "   Abre .env y reemplaza: ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx"
        echo ""
    fi
else
    print_success "Archivo .env encontrado"
fi

# Paso 7: Verificar ffmpeg (necesario para Whisper)
print_step 7 "Verificando ffmpeg..."
if command -v ffmpeg &> /dev/null; then
    print_success "ffmpeg instalado"
else
    echo "⚠️  ffmpeg no encontrado (necesario para transcripción de audio)"
    echo "   Instala con: brew install ffmpeg (macOS)"
    echo "               sudo apt-get install ffmpeg (Linux)"
fi

# Resumen final
echo ""
echo "=========================================="
echo "✨ Instalación completada"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Configura tu API key:"
echo "   Edita el archivo .env y agrega tu ANTHROPIC_API_KEY"
echo ""
echo "2. Inicia el proyecto:"
echo "   ./start.sh"
echo ""
echo "3. Abre tu navegador en:"
echo "   http://localhost:5173"
echo ""
echo "📚 Consulta README.md para instalación, configuración y uso"
echo ""
