
from __future__ import annotations
import typer, subprocess, sys, os
from rich import print
from .asr import record_mic, transcribe_file
from .pipeline import Pipeline

app = typer.Typer(help="CLI – ASR Whisper + LLM (Anthropic/Ollama)")

@app.command()
def asr(path: str):
    """Transcribe un archivo de audio (wav/mp3/m4a...)."""
    out = transcribe_file(path, language="es")
    print("[bold green]TRANSCRIPCIÓN:[/bold green]", out['text'])

@app.command()
def mic(seconds: float = typer.Option(6, help="Segundos a grabar")):
    """Graba el micrófono N segundos y transcribe."""
    wav = record_mic(seconds, out_path="record.wav")
    out = transcribe_file(wav, language="es")
    print("[bold green]TRANSCRIPCIÓN:[/bold green]", out['text'])

@app.command()
def chat(text: str = typer.Option(..., help="Texto a enviar al LLM")):
    """Envía texto directo al LLM con prompt variable + memoria."""
    p = Pipeline()
    out = p.run(text)
    print("[bold blue]SYSTEM PROMPT:[/bold blue]", out["system_prompt"])
    print("\n[bold green]LLM:[/bold green]", out["response"])

@app.command()
def run(audio: str = typer.Option(None, help="Ruta a archivo de audio"),
        mic_seconds: float = typer.Option(None, help="Si se especifica, graba micrófono N segundos"),
        tts: bool = typer.Option(False, help="Leer respuesta con 'say' (macOS)")):
    """Pipeline completo (ASR -> prompt variable -> LLM -> memoria)."""
    p = Pipeline()
    if mic_seconds:
        audio = record_mic(mic_seconds, out_path="record.wav")
    if not audio:
        print("[red]Debes pasar --audio RUTA o --mic-seconds N[/red]")
        raise typer.Exit(code=1)
    tr = transcribe_file(audio, language="es")
    out = p.run(tr["text"])
    print("[bold yellow]TRANSCRIPCIÓN:[/bold yellow]", tr["text"])    
    print("\n[bold blue]SYSTEM PROMPT:[/bold blue]", out["system_prompt"])    
    print("\n[bold green]LLM:[/bold green]", out["response"])    
    if tts and sys.platform == "darwin":
        try:
            subprocess.run(["say", out["response"][:1000]])
        except Exception:
            print("[red]No se pudo usar 'say'[/red]")

if __name__ == "__main__":
    app()
