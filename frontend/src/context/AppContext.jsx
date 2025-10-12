import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { ttsService } from '../services/ttsService'

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
  
  const wsRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Conectar al WebSocket
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
          // Agregar transcripción del usuario
          setMessages(prev => [...prev, {
            role: 'user',
            content: data.text,
            timestamp: new Date().toISOString()
          }])
        } else if (data.type === 'response') {
          // Agregar respuesta del asistente
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
          
          // Leer la respuesta en voz alta con la voz apropiada
          if (ttsEnabled) {
            ttsService.speak(
              data.text,
              data.elapsed_min,
              () => setIsSpeaking(false), // onEnd
              () => setIsSpeaking(true)   // onStart
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

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setWsStatus('disconnected')
    }
  }, [])

  // Enviar mensaje de texto
  const sendTextMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket no conectado')
      return
    }

    setIsProcessing(true)
    wsRef.current.send(JSON.stringify({
      type: 'text',
      text: text
    }))
  }, [])

  // Enviar audio
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

  // Iniciar grabación de audio
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
        
        // Detener el stream
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

  // Detener grabación
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
    }
  }, [isRecording])

  // Limpiar conversación
  const clearMessages = useCallback(async () => {
    try {
      // Llamar al backend para reiniciar la sesión y limpiar la memoria
      const response = await fetch('http://localhost:5175/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Sesión reiniciada:', data)
        
        // Limpiar estado del frontend
        setMessages([])
        setSystemInfo({ turn: 0, elapsed_min: 0 })
        
        // Mensaje de confirmación
        setMessages([{
          role: 'system',
          content: '✨ Conversación limpiada. Memoria reiniciada.',
          timestamp: new Date().toISOString()
        }])
        
        // Limpiar el mensaje del sistema después de 3 segundos
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

  // Control de TTS
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
    resumeSpeaking
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
