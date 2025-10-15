#!/bin/bash

# Script para iniciar el backend y frontend simultáneamente

echo " Iniciando Avatar Virtual Interactivo..."

# Iniciar backend
echo "🔧 Iniciando backend en puerto 5175..."
source venv/bin/activate
uvicorn app.server:app --reload --port 5175 &
BACKEND_PID=$!

# Esperar un momento para que el backend inicie
sleep 2

# Iniciar frontend
echo "🎨 Iniciando frontend en puerto 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servicios iniciados:"
echo "   Backend PID: $BACKEND_PID (http://localhost:5175)"
echo "   Frontend PID: $FRONTEND_PID (http://localhost:5173)"
echo ""
echo "🌐 Abre tu navegador en: http://localhost:5173"
echo "📚 Documentación API: http://localhost:5175/docs"
echo ""
echo "⚠️  Presiona Ctrl+C para detener ambos servicios"

# Manejar Ctrl+C para detener ambos procesos
trap "echo ''; echo '🛑 Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Esperar indefinidamente
wait
