# Guía de Inicio Rápido

## Pasos para ejecutar el proyecto

### 1. Configurar el Backend

```bash
# 1.1 Crear entorno virtual de Python
python -m venv .venv

# 1.2 Activar el entorno virtual
# En macOS/Linux:
source .venv/bin/activate
# En Windows:
# .venv\Scripts\activate

# 1.3 Instalar dependencias de Python
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env y agregar tu ANTHROPIC_API_KEY
# ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
```

### 3. Instalar dependencias del Frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Ejecutar el proyecto

#### Opción A: Usando el script de inicio (Recomendado)

**macOS/Linux:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

#### Opción B: Manual (dos terminales)

**Terminal 1 - Backend:**
```bash
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.server:app --reload --port 5175
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Abrir la aplicación

Abre tu navegador en: **http://localhost:5173**

## Verificación

- Backend API: http://localhost:5175
- Documentación interactiva: http://localhost:5175/docs
- Frontend: http://localhost:5173

## Uso

1. **Permite acceso al micrófono** cuando el navegador lo solicite
2. **Presiona "Iniciar Grabación"** y habla
3. **Presiona "Detener Grabación"** cuando termines
4. El sistema automáticamente:
   - Transcribe tu audio
   - Procesa con el LLM
   - Muestra la respuesta en el chat

También puedes escribir mensajes de texto directamente en el input del chat.

## Problemas comunes

### "No module named 'app'"
- Asegúrate de estar en la raíz del proyecto
- Activa el entorno virtual: `source .venv/bin/activate`

### "ANTHROPIC_API_KEY not found"
- Verifica que el archivo `.env` existe
- Verifica que contiene una clave válida
- La clave debe empezar con `sk-ant-`
