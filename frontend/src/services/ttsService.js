// Servicio de Text-to-Speech con voces dinámicas

/**
 * Mapeo de rangos de tiempo (minutos) a configuraciones de voz
 * Basado en las fases de PROMPT_PHASES del backend
 */
const VOICE_PROFILES = [
  {
    minTime: 0,
    maxTime: 10,
    name: 'Facundo (6-8 años)',
    config: {
      // Voz más aguda y rápida para simular niñez
      pitch: 1.8,
      rate: 1.1,
      volume: 1.0,
      voicePattern: ['es-MX', 'es-ES', 'es-AR'], // Preferencia de voces
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
    
    // Algunos navegadores cargan las voces de forma asíncrona
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices()
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices()
    this.voicesLoaded = this.voices.length > 0
    console.log('Voces disponibles:', this.voices.map(v => `${v.name} (${v.lang})`))
  }

  /**
   * Selecciona la mejor voz según el tiempo transcurrido
   */
  selectVoiceByTime(elapsedMin) {
    if (!this.voicesLoaded || this.voices.length === 0) {
      this.loadVoices()
      return null
    }

    // Encontrar el perfil de voz correspondiente
    const profile = VOICE_PROFILES.find(
      p => elapsedMin >= p.minTime && elapsedMin < p.maxTime
    ) || VOICE_PROFILES[0]

    console.log(`Seleccionando voz para ${profile.name} (${elapsedMin.toFixed(1)} min)`)

    // Buscar voces en español según el patrón de preferencia
    for (const langPattern of profile.config.voicePattern) {
      const matchingVoice = this.voices.find(voice => 
        voice.lang.startsWith(langPattern) || voice.lang.includes(langPattern)
      )
      if (matchingVoice) {
        return { voice: matchingVoice, config: profile.config, profileName: profile.name }
      }
    }

    // Fallback: cualquier voz en español
    const spanishVoice = this.voices.find(voice => 
      voice.lang.startsWith('es')
    )
    
    return spanishVoice 
      ? { voice: spanishVoice, config: profile.config, profileName: profile.name }
      : null
  }

  /**
   * Lee un texto en voz alta con la configuración según el tiempo
   */
  speak(text, elapsedMin = 0, onEnd = null, onStart = null) {
    // Cancelar cualquier lectura en curso
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
      console.log(`🔊 Reproduciendo con voz: ${profileName} (${voice.name})`)
      if (onStart) onStart()
    }

    utterance.onend = () => {
      console.log('✅ Reproducción finalizada')
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

  /**
   * Cancela la lectura actual
   */
  cancel() {
    if (this.synth.speaking) {
      this.synth.cancel()
    }
    this.currentUtterance = null
  }

  /**
   * Pausa la lectura
   */
  pause() {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause()
    }
  }

  /**
   * Reanuda la lectura
   */
  resume() {
    if (this.synth.paused) {
      this.synth.resume()
    }
  }

  /**
   * Verifica si está hablando
   */
  isSpeaking() {
    return this.synth.speaking
  }

  /**
   * Habilita/deshabilita TTS
   */
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

// Exportar instancia singleton
export const ttsService = new TTSService()

// Hook personalizado para usar TTS en componentes
export const useTTS = () => {
  return ttsService
}
