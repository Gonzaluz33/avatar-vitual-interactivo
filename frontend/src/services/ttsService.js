// Backend base URL for TTS streaming
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5175'

const VOICE_PROFILES = [
  { minTime: 0, maxTime: 10, name: 'Facundo (6-8 años)', pitch: 1.2 },
  { minTime: 10, maxTime: 20, name: 'Rodrigo (9-12 años)', pitch: 1.5 },
  { minTime: 20, maxTime: 35, name: 'Javier (13-15 años)', pitch: 1.2 },
  { minTime: 35, maxTime: 50, name: 'Marcelo (16-18 años)', pitch: 1.0 },
  { minTime: 50, maxTime: Infinity, name: 'Ricardo (Adulto)', pitch: 0.9 },
]

class TTSService {
  constructor() {
    this.isEnabled = true
    this.currentSource = null
    this.audioContext = null
    this.gainNode = null
    this.abortController = null
  }

  _ensureAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      this.audioContext = new AudioCtx()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
    }
  }

  _pitchToSpeed(pitch) {
    // Map pitch range [0.9, 1.5] to speed range [0.9, 1.2]
    const minPitch = 0.9
    const maxPitch = 1.5
    const minSpeed = 0.9
    const maxSpeed = 1.2
    const clamped = Math.min(Math.max(pitch, minPitch), maxPitch)
    const ratio = (clamped - minPitch) / (maxPitch - minPitch)
    return minSpeed + ratio * (maxSpeed - minSpeed)
  }

  _profileForTime(elapsedMin = 0) {
    const profile =
      VOICE_PROFILES.find(p => elapsedMin >= p.minTime && elapsedMin < p.maxTime) ||
      VOICE_PROFILES[0]
    const speed = this._pitchToSpeed(profile.pitch)
    return { profile, speed }
  }

  async speak(text, elapsedMin = 0, onEnd = null, onStart = null) {
    this.cancel()

    if (!this.isEnabled || !text) return

    this._ensureAudioContext()
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    const { profile, speed } = this._profileForTime(elapsedMin)
    console.log(`Solicitando TTS (${profile.name}) speed=${speed.toFixed(2)}`)

    // Trigger loading state immediately (keeps "pensando" while request/decoding)
    let started = false
    if (onStart) {
      onStart()
      started = true
    }

    try {
      this.abortController = new AbortController()
      const response = await fetch(`${API_BASE}/tts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, elapsed_min: elapsedMin }),
        signal: this.abortController.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`TTS HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const chunks = []
      let received = 0

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.length
        }
      }

      const audioBytes = new Uint8Array(received)
      let offset = 0
      for (const chunk of chunks) {
        audioBytes.set(chunk, offset)
        offset += chunk.length
      }

      const arrayBuffer = audioBytes.buffer
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.gainNode)

      source.onended = () => {
        this.currentSource = null
        if (onEnd) onEnd()
      }

      this.currentSource = source
      if (onStart && !started) onStart()
      source.start(0)
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('TTS cancelado')
      } else {
        console.error('Error en TTS:', err)
      }
      this.currentSource = null
      if (onEnd) onEnd()
    }
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (e) {
        // ignore
      }
      this.currentSource = null
    }
  }

  pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend()
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  isSpeaking() {
    return !!this.currentSource
  }

  setEnabled(enabled) {
    this.isEnabled = enabled
    if (!enabled) {
      this.cancel()
    }
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      speaking: !!this.currentSource,
      paused: this.audioContext ? this.audioContext.state === 'suspended' : false,
      voicesAvailable: true,
      voiceCount: 1,
    }
  }
}

export const ttsService = new TTSService()

export const useTTS = () => ttsService
