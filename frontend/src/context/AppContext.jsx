import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { ttsService } from '../services/ttsService'
import { aiAvatarService } from '../services/aiAvatarService'

const AppContext = createContext(null)

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider')
  }
  return context
}

export const AppProvider = ({ children }) => {
  const [messages, setMessages] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [wsStatus, setWsStatus] = useState('disconnected') // disconnected, connecting, connected
  const [systemInfo, setSystemInfo] = useState({ turn: 0, elapsed_min: 0 })
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // Estado del avatar AIAvatarKit
  const [avatarExpression, setAvatarExpression] = useState('neutral')
  const [avatarAnimation, setAvatarAnimation] = useState(null)
  const [aiAvatarEnabled, setAiAvatarEnabled] = useState(false)
  const [useAiAvatar, setUseAiAvatar] = useState(true) // Preferir AIAvatarKit si está disponible
  
  const wsRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Verificar si AIAvatarKit está disponible al montar
  useEffect(() => {
    const checkAiAvatar = async () => {
      try {
        const status = await aiAvatarService.checkStatus()
        setAiAvatarEnabled(status.enabled)
        console.log('AIAvatarKit status:', status)
        
        if (status.enabled) {
          // Configurar callbacks de AIAvatarKit
          aiAvatarService.setCallbacks({
            onChunk: handleAiAvatarChunk,
            onFinal: handleAiAvatarFinal,
            onAvatarControl: handleAvatarControl,
            onAudio: handleAiAvatarAudio,
            onError: handleAiAvatarError
          })
        }
      } catch (error) {
        console.log('AIAvatarKit not available:', error)
        setAiAvatarEnabled(false)
      }
    }
    checkAiAvatar()
  }, [])

  // Callbacks de AIAvatarKit
  const handleAvatarControl = useCallback((control) => {
    if (control.face_name) {
      setAvatarExpression(control.face_name)
      
      // Resetear expresión después del tiempo especificado
      if (control.face_duration) {
        setTimeout(() => {
          setAvatarExpression('neutral')
        }, control.face_duration * 1000)
      }
    }
    
    if (control.animation_name) {
      setAvatarAnimation(control.animation_name)
      
      if (control.animation_duration) {
        setTimeout(() => {
          setAvatarAnimation(null)
        }, control.animation_duration * 1000)
      }
    }
  }, [])

  const handleAiAvatarChunk = useCallback((data) => {
    // Actualizar mensajes en streaming
    console.log('AIAvatar chunk:', data)
  }, [])

  const handleAiAvatarFinal = useCallback((data) => {
    console.log('AIAvatar final:', data)
    
    // Agregar mensaje del asistente
    const assistantMessage = {
      role: 'assistant',
      content: data.text,
      timestamp: new Date().toISOString(),
      avatarControl: data.avatarControl
    }
    
    setMessages(prev => [...prev, assistantMessage])
    setIsProcessing(false)
    
    // TTS si está habilitado
    if (ttsEnabled && data.text) {
      ttsService.speak(
        data.text,
        0,
        () => setIsSpeaking(false),
        () => setIsSpeaking(true)
      )
    }
  }, [ttsEnabled])

  const handleAiAvatarAudio = useCallback((audioBase64) => {
    // Reproducir audio del servidor (si VOICEVOX está configurado)
    if (audioBase64) {
      try {
        const audioBlob = base64ToBlob(audioBase64, 'audio/wav')
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        setIsSpeaking(true)
        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
        }
        audio.play()
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    }
  }, [])

  const handleAiAvatarError = useCallback((error) => {
    console.error('AIAvatar error:', error)
    setMessages(prev => [...prev, {
      role: 'system',
      content: `Error AIAvatar: ${error.message}`,
      timestamp: new Date().toISOString()
    }])
    setIsProcessing(false)
  }, [])

  // Helper para convertir base64 a Blob
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Ya conectado al WebSocket')
      return
    }

    setWsStatus('connecting')
    const ws = new WebSocket('ws://localhost:5175/ws/voice')

    ws.onopen = () => {
      console.log('Conectado al WebSocket')
      setWsStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Mensaje recibido:', data)

        if (data.type === 'transcript') {
          setMessages(prev => [...prev, {
            role: 'user',
            content: data.text,
            timestamp: new Date().toISOString()
          }])
        } else if (data.type === 'response') {
          const assistantMessage = {
            role: 'assistant',
            content: data.text,
            timestamp: new Date().toISOString(),
            systemPrompt: data.system_prompt
          }
          
          setMessages(prev => [...prev, assistantMessage])
          setSystemInfo({
            turn: data.turn,
            elapsed_min: data.elapsed_min
          })
          setIsProcessing(false)
          
          if (ttsEnabled) {
            ttsService.speak(
              data.text,
              data.elapsed_min,
              () => setIsSpeaking(false),
              () => setIsSpeaking(true)
            )
          }
        } else if (data.type === 'error') {
          console.error('Error del servidor:', data.message)
          setMessages(prev => [...prev, {
            role: 'system',
            content: `Error: ${data.message}`,
            timestamp: new Date().toISOString()
          }])
          setIsProcessing(false)
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('Error de WebSocket:', error)
      setWsStatus('disconnected')
    }

    ws.onclose = () => {
      console.log('WebSocket cerrado')
      setWsStatus('disconnected')
    }

    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setWsStatus('disconnected')
    }
  }, [])

  const sendTextMessage = useCallback(async (text) => {
    // Agregar mensaje del usuario
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }])
    
    setIsProcessing(true)
    setAvatarExpression('thinking') // Mostrar expresión de "pensando"

    // Usar AIAvatarKit si está habilitado y preferido
    if (aiAvatarEnabled && useAiAvatar) {
      try {
        const result = await aiAvatarService.chat(text)
        // El resultado se maneja en los callbacks
        if (!result.success && !result.cancelled) {
          console.error('AIAvatar chat failed, falling back to WebSocket')
          // Fallback a WebSocket
          sendTextViaWebSocket(text)
        }
      } catch (error) {
        console.error('AIAvatar error, falling back:', error)
        sendTextViaWebSocket(text)
      }
    } else {
      sendTextViaWebSocket(text)
    }
  }, [aiAvatarEnabled, useAiAvatar])

  const sendTextViaWebSocket = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket no conectado')
      setIsProcessing(false)
      return
    }

    wsRef.current.send(JSON.stringify({
      type: 'text',
      text: text
    }))
  }, [])

  const sendAudio = useCallback((audioBlob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket no conectado')
      return
    }

    setIsProcessing(true)
    
    const reader = new FileReader()
    reader.onload = () => {
      const base64Audio = reader.result.split(',')[1]
      wsRef.current.send(JSON.stringify({
        type: 'audio',
        audio: base64Audio
      }))
    }
    reader.readAsDataURL(audioBlob)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        sendAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
    } catch (error) {
      console.error('Error al iniciar grabación:', error)
      alert('Error al acceder al micrófono. Por favor, permite el acceso al micrófono.')
    }
  }, [sendAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
    }
  }, [isRecording])

  const clearMessages = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5175/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Sesión reiniciada:', data)
        
        setMessages([])
        setSystemInfo({ turn: 0, elapsed_min: 0 })
        
        setMessages([{
          role: 'system',
          content: '✨ Conversación limpiada. Memoria reiniciada.',
          timestamp: new Date().toISOString()
        }])
        
        setTimeout(() => {
          setMessages([])
        }, 3000)
      }
    } catch (error) {
      console.error('Error al limpiar la memoria del backend:', error)
      setMessages([{
        role: 'system',
        content: '⚠️ Error al limpiar la memoria. Intenta de nuevo.',
        timestamp: new Date().toISOString()
      }])
    }
  }, [])

  const toggleTTS = useCallback(() => {
    const newState = !ttsEnabled
    setTtsEnabled(newState)
    ttsService.setEnabled(newState)
    if (!newState) {
      ttsService.cancel()
      setIsSpeaking(false)
    }
  }, [ttsEnabled])

  const stopSpeaking = useCallback(() => {
    ttsService.cancel()
    setIsSpeaking(false)
  }, [])

  const pauseSpeaking = useCallback(() => {
    ttsService.pause()
  }, [])

  const resumeSpeaking = useCallback(() => {
    ttsService.resume()
  }, [])

  const value = {
    messages,
    isRecording,
    isProcessing,
    wsStatus,
    systemInfo,
    ttsEnabled,
    isSpeaking,
    // Estados del avatar AIAvatarKit
    avatarExpression,
    avatarAnimation,
    aiAvatarEnabled,
    useAiAvatar,
    // Funciones
    connect,
    disconnect,
    sendTextMessage,
    sendAudio,
    startRecording,
    stopRecording,
    clearMessages,
    toggleTTS,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    // Control del avatar
    setAvatarExpression,
    setUseAiAvatar
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
