import { createContext, useContext, useState, useCallback, useRef } from 'react'

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
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.text,
            timestamp: new Date().toISOString(),
            systemPrompt: data.system_prompt
          }])
          setSystemInfo({
            turn: data.turn,
            elapsed_min: data.elapsed_min
          })
          setIsProcessing(false)
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
  const clearMessages = useCallback(() => {
    setMessages([])
    setSystemInfo({ turn: 0, elapsed_min: 0 })
  }, [])

  const value = {
    messages,
    isRecording,
    isProcessing,
    wsStatus,
    systemInfo,
    connect,
    disconnect,
    sendTextMessage,
    sendAudio,
    startRecording,
    stopRecording,
    clearMessages
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
