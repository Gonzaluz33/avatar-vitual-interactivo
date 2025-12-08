<!-- a24c8f70-7138-4e08-a8d8-63aab81dd55c b247bd0e-2680-4f8f-8440-e8742c8d80d1 -->
# Integrate Coqui TTS Backend with Streaming

## Backend Implementation

### 1. Add TTS Dependencies

- Add to `requirements.txt`:
  - `TTS>=0.22.0` (Coqui TTS library)
  - `pydub>=0.25.1` (audio processing)

### 2. Create TTS Service Module

Create `app/tts.py`:

- Load Coqui TTS model: `tts_models/es/css10/vits`
- Implement `generate_speech(text, speed=1.0)` function
- Return audio as WAV format chunks for streaming
- Support speed parameter to adapt voice profiles (rate)

### 3. Add Streaming TTS Endpoint

Modify `app/server.py`:

- Add POST endpoint `/tts/stream` that:
  - Accepts: `{text: string, elapsed_min: number}`
  - Maps elapsed_min to voice profile (speed adjustment)
  - Generates audio with Coqui TTS
  - Streams audio chunks as binary WebSocket messages or SSE
- Use chunked encoding for real-time streaming

### 4. Add TTS Configuration

Update `app/config.py`:

- Add `TTS_MODEL = "tts_models/es/css10/vits"`
- Add `TTS_CACHE_DIR` for model storage
- Add speed profile mappings (0-10min: 1.1x, 10-20min: 1.05x, etc.)

## Frontend Implementation

### 5. Replace TTS Service

Modify `frontend/src/services/ttsService.js`:

- Remove `window.speechSynthesis` implementation
- Implement audio streaming client:
  - Fetch from `/tts/stream` endpoint
  - Receive audio chunks via fetch streaming or WebSocket
  - Use Web Audio API for playback
  - Buffer chunks and play seamlessly
- Keep same interface: `speak()`, `cancel()`, `pause()`, `resume()`
- Maintain voice profile logic (map elapsed_min to speed parameter)

### 6. Update Audio Playback

- Use `AudioContext` and `AudioBuffer` for chunk playback
- Implement queue system for smooth audio streaming
- Handle onStart/onEnd callbacks
- Support pause/resume functionality

## Configuration

### 7. Update Environment Template

Add to `env_template.txt`:

```
# TTS Configuration
TTS_MODEL=tts_models/es/css10/vits
TTS_CACHE_DIR=.cache/tts
```

### 8. Voice Profile Mapping

Preserve existing voice profiles in `ttsService.js`:

- Map pitch (1.0-1.5) to speed parameter (0.9-1.2)
- Higher pitch → faster speed
- Lower pitch → slower speed
- Maintain age-based profile selection

## Technical Notes

- Coqui TTS generates 22050Hz WAV audio by default
- Streaming will use chunked transfer encoding
- Frontend buffers ~200ms of audio before playback starts
- Total latency: ~1-2 seconds (generation + buffering)

### To-dos

- [ ] Add TTS and pydub to requirements.txt
- [ ] Create app/tts.py with Coqui TTS integration
- [ ] Add /tts/stream endpoint to app/server.py
- [ ] Add TTS configuration to app/config.py
- [ ] Replace speechSynthesis with streaming client in ttsService.js
- [ ] Add TTS config to env_template.txt
- [ ] Test end-to-end TTS streaming with voice profiles