
from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
import tempfile, os
from .asr import transcribe_file
from .pipeline import Pipeline

app = FastAPI(title="Local ASR + LLM API")
pipeline = Pipeline()

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[-1]) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    res = transcribe_file(tmp_path, language="es")
    os.unlink(tmp_path)
    return JSONResponse({"text": res["text"], "segments": res["segments"]})

@app.post("/chat")
async def chat(text: str = Form(...)):
    out = pipeline.run(text)
    return JSONResponse(out)

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
