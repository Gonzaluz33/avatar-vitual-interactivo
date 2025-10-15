const VOICE_PROFILES = [
  {
    minTime: 0,
    maxTime: 10,
    name: 'Facundo (6-8 años)',
    config: {
      
      pitch: 1.2,
      rate: 1.1,
      volume: 1.0,
      voicePattern: ['es-MX', 'es-ES', 'es-AR'], 
    }
  },
  {
    minTime: 10,
    maxTime: 20,
    name: 'Rodrigo (9-12 años)',
    config: {
      pitch: 1.5,
      rate: 1.05,
      volume: 1.0,
      voicePattern: ['es-MX', 'es-ES', 'es-AR'],
    }
  },
  {
    minTime: 20,
    maxTime: 35,
    name: 'Javier (13-15 años)',
    config: {
      pitch: 1.2,
      rate: 1.0,
      volume: 1.0,
      voicePattern: ['es-MX', 'es-ES', 'es-AR'],
    }
  },
  {
    minTime: 35,
    maxTime: 50,
    name: 'Marcelo (16-18 años)',
    config: {
      pitch: 1.0,
      rate: 0.95,
      volume: 1.0,
      voicePattern: ['es-ES', 'es-MX', 'es-AR'],
    }
  },
  {
    minTime: 50,
    maxTime: Infinity,
    name: 'Ricardo (Adulto)',
    config: {
      pitch: 0.9,
      rate: 0.9,
      volume: 1.0,
      voicePattern: ['es-ES', 'es-MX', 'es-AR'],
    }
  }
]

class TTSService {
  constructor() {
    this.synth = window.speechSynthesis
    this.currentUtterance = null
    this.isEnabled = true
    this.voices = []
    this.voicesLoaded = false
    
    // Cargar voces disponibles
    this.loadVoices()
    
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices()
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices()
    this.voicesLoaded = this.voices.length > 0
    console.log('Voces disponibles:', this.voices.map(v => `${v.name} (${v.lang})`))
  }

  selectVoiceByTime(elapsedMin) {
    if (!this.voicesLoaded || this.voices.length === 0) {
      this.loadVoices()
      return null
    }

    const profile = VOICE_PROFILES.find(
      p => elapsedMin >= p.minTime && elapsedMin < p.maxTime
    ) || VOICE_PROFILES[0]

    console.log(`Seleccionando voz para ${profile.name} (${elapsedMin.toFixed(1)} min)`)

    for (const langPattern of profile.config.voicePattern) {
      const matchingVoice = this.voices.find(voice => 
        voice.lang.startsWith(langPattern) || voice.lang.includes(langPattern)
      )
      if (matchingVoice) {
        return { voice: matchingVoice, config: profile.config, profileName: profile.name }
      }
    }

    const spanishVoice = this.voices.find(voice => 
      voice.lang.startsWith('es')
    )
    
    return spanishVoice 
      ? { voice: spanishVoice, config: profile.config, profileName: profile.name }
      : null
  }

  speak(text, elapsedMin = 0, onEnd = null, onStart = null) {
    this.cancel()

    if (!this.isEnabled || !text) {
      return
    }

    const voiceSelection = this.selectVoiceByTime(elapsedMin)
    
    if (!voiceSelection) {
      console.warn('No hay voces disponibles para TTS')
      return
    }

    const { voice, config, profileName } = voiceSelection

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.pitch = config.pitch
    utterance.rate = config.rate
    utterance.volume = config.volume
    utterance.lang = voice.lang

    utterance.onstart = () => {
      console.log(` Reproduciendo con voz: ${profileName} (${voice.name})`)
      if (onStart) onStart()
    }

    utterance.onend = () => {
      console.log(' Reproducción finalizada')
      this.currentUtterance = null
      if (onEnd) onEnd()
    }

    utterance.onerror = (event) => {
      console.error('Error en TTS:', event)
      this.currentUtterance = null
      if (onEnd) onEnd()
    }

    this.currentUtterance = utterance
    this.synth.speak(utterance)
  }

  cancel() {
    if (this.synth.speaking) {
      this.synth.cancel()
    }
    this.currentUtterance = null
  }

  pause() {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause()
    }
  }

  resume() {
    if (this.synth.paused) {
      this.synth.resume()
    }
  }

  isSpeaking() {
    return this.synth.speaking
  }

  setEnabled(enabled) {
    this.isEnabled = enabled
    if (!enabled) {
      this.cancel()
    }
  }

  /**
   * Obtiene el estado actual
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      speaking: this.synth.speaking,
      paused: this.synth.paused,
      voicesAvailable: this.voicesLoaded,
      voiceCount: this.voices.length
    }
  }
}

export const ttsService = new TTSService()

export const useTTS = () => {
  return ttsService
}
