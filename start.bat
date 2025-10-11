@echo off
REM Script para iniciar el backend y frontend en Windows

echo Iniciando Avatar Virtual Interactivo...

REM Verificar que el entorno virtual existe
if not exist ".venv" (
    echo Error: No se encuentra el entorno virtual .venv
    echo Por favor ejecuta: python -m venv .venv
    echo Luego: .venv\Scripts\activate
    echo Y finalmente: pip install -r requirements.txt
    exit /b 1
)

REM Verificar que node_modules existe en frontend
if not exist "frontend\node_modules" (
    echo Instalando dependencias del frontend...
    cd frontend
    call npm install
    cd ..
)

REM Iniciar backend en una nueva ventana
echo Iniciando backend en puerto 5175...
start "Avatar Backend" cmd /k ".venv\Scripts\activate && uvicorn app.server:app --reload --port 5175"

REM Esperar un momento
timeout /t 3 /nobreak > nul

REM Iniciar frontend en una nueva ventana
echo Iniciando frontend en puerto 5173...
start "Avatar Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Servicios iniciados:
echo    Backend: http://localhost:5175
echo    Frontend: http://localhost:5173
echo.
echo Abre tu navegador en: http://localhost:5173
echo Documentacion API: http://localhost:5175/docs
echo.
echo Cierra las ventanas para detener los servicios
