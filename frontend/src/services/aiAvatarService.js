/**
 * AIAvatarKit Service
 * 
 * Servicio para comunicarse con la API de AIAvatarKit.
 * Soporta chat con streaming (SSE) y obtiene datos de control del avatar
 * como expresiones faciales y animaciones.
 */

class AIAvatarService {
  constructor(baseUrl = 'http://localhost:5175/aiavatar') {
    this.baseUrl = baseUrl
    this.sessionId = this.generateSessionId()
    this.userId = 'web_user'
    this.contextId = null
    this.onChunk = null
    this.onFinal = null
    this.onAvatarControl = null
    this.onAudio = null
    this.onError = null
    this.abortController = null
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Configura los callbacks para los eventos de streaming
   */
  setCallbacks({ onChunk, onFinal, onAvatarControl, onAudio, onError }) {
    if (onChunk) this.onChunk = onChunk
    if (onFinal) this.onFinal = onFinal
    if (onAvatarControl) this.onAvatarControl = onAvatarControl
    if (onAudio) this.onAudio = onAudio
    if (onError) this.onError = onError
  }

  /**
   * Envía un mensaje de texto y recibe respuesta por streaming (SSE)
   * 
   * @param {string} text - Texto del mensaje
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Respuesta final
   */
  async chat(text, options = {}) {
    // Cancelar request anterior si existe
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    const requestBody = {
      type: 'start',
      session_id: this.sessionId,
      user_id: this.userId,
      context_id: this.contextId,
      text: text,
      metadata: options.metadata || {}
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let lastAvatarControl = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Actualizar context_id para continuar la conversación
              if (data.context_id) {
                this.contextId = data.context_id
              }

              // Procesar según el tipo de mensaje
              if (data.type === 'start') {
                // Inicio del streaming
                console.log('AIAvatar streaming started', data)
              } 
              else if (data.type === 'chunk') {
                // Chunk de respuesta
                if (data.voice_text) {
                  fullText += data.voice_text
                }

                // Procesar control de avatar (expresiones, animaciones)
                if (data.avatar_control_request) {
                  lastAvatarControl = data.avatar_control_request
                  if (this.onAvatarControl) {
                    this.onAvatarControl(data.avatar_control_request)
                  }
                }

                // Procesar audio si está disponible
                if (data.audio_data && this.onAudio) {
                  this.onAudio(data.audio_data)
                }

                // Callback de chunk
                if (this.onChunk) {
                  this.onChunk({
                    text: data.voice_text || data.text,
                    fullText: fullText,
                    avatarControl: data.avatar_control_request,
                    isFirstChunk: data.metadata?.is_first_chunk
                  })
                }
              }
              else if (data.type === 'final') {
                // Respuesta final
                if (this.onFinal) {
                  this.onFinal({
                    text: data.voice_text || data.text,
                    fullText: fullText,
                    avatarControl: lastAvatarControl,
                    contextId: data.context_id
                  })
                }
              }
            } catch (parseError) {
              console.warn('Error parsing SSE data:', parseError, line)
            }
          }
        }
      }

      return {
        success: true,
        text: fullText,
        avatarControl: lastAvatarControl,
        contextId: this.contextId
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled')
        return { success: false, cancelled: true }
      }
      
      console.error('AIAvatar chat error:', error)
      if (this.onError) {
        this.onError(error)
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * Envía audio y recibe respuesta (para integración futura con STT)
   * 
   * @param {string} audioBase64 - Audio codificado en base64
   * @returns {Promise<Object>} - Respuesta
   */
  async chatWithAudio(audioBase64) {
    const requestBody = {
      type: 'start',
      session_id: this.sessionId,
      user_id: this.userId,
      context_id: this.contextId,
      audio_data: audioBase64,
      metadata: {}
    }

    // Similar al chat pero con audio
    return this.chat(null, { 
      metadata: { has_audio: true },
      customBody: requestBody 
    })
  }

  /**
   * Verifica el estado de AIAvatarKit
   */
  async checkStatus() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/aiavatar', '')}/aiavatar/status`)
      return await response.json()
    } catch (error) {
      console.error('Error checking AIAvatar status:', error)
      return { enabled: false, error: error.message }
    }
  }

  /**
   * Cancela el request actual
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Reinicia la sesión
   */
  resetSession() {
    this.sessionId = this.generateSessionId()
    this.contextId = null
  }
}

// Instancia singleton del servicio
export const aiAvatarService = new AIAvatarService()

export default AIAvatarService
