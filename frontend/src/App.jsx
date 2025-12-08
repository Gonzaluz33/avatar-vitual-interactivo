import { useState, useEffect, useRef } from 'react'
import { useApp } from './context/AppContext'

import Avatar3D from './components/Avatar3D'


function App() {
  const { 
    wsStatus, 
    connect, 
    isRecording, 
    isProcessing, 
    isSpeaking,
    startRecording, 
    stopRecording,
    messages 
  } = useApp()
  
  const avatarRef = useRef(null)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState('')

  useEffect(() => {
    connect()
  }, [connect])

  // Mostrar subtítulo cuando el avatar habla
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        setCurrentSubtitle(lastMessage.content)
        setShowSubtitle(true)
        
        // Iniciar lip sync
        if (avatarRef.current && isSpeaking) {
          avatarRef.current.startLipSync(lastMessage.content)
        }
      }
    }
  }, [messages, isSpeaking])

  // Ocultar subtítulo cuando deja de hablar
  useEffect(() => {
    if (!isSpeaking && showSubtitle) {
      const timer = setTimeout(() => {
        setShowSubtitle(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSpeaking, showSubtitle])

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const getStatusText = () => {
    if (wsStatus !== 'connected') return 'Conectando...'
    if (isProcessing) return 'Pensando...'
    if (isSpeaking) return 'Hablando...'
    if (isRecording) return 'Escuchando...'
    return 'Toca para hablar'
  }

  const getButtonStyle = () => {
    if (isRecording) {
      return 'bg-red-500 hover:bg-red-600 shadow-red-500/50 scale-110'
    }
    if (isProcessing) {
      return 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/50 animate-pulse'
    }
    if (isSpeaking) {
      return 'bg-green-500 hover:bg-green-600 shadow-green-500/50'
    }
    return 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/50'
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900">
      {/* Avatar 3D en pantalla completa */}
      <div className="absolute inset-0">
        <Avatar3D 
          ref={avatarRef}
          isSpeaking={isSpeaking}
          className="w-full h-full"
        />
      </div>

      {/* Overlay gradiente inferior para mejor contraste */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Estado de conexión */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-md rounded-full">
        <div className={`w-2 h-2 rounded-full ${
          wsStatus === 'connected' ? 'bg-green-400' : 
          wsStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
          'bg-red-400'
        }`} />
        <span className="text-white/80 text-sm">
          {wsStatus === 'connected' ? 'Conectado' : 
           wsStatus === 'connecting' ? 'Conectando...' : 
           'Desconectado'}
        </span>
      </div>

      {/* Subtítulo de lo que dice el avatar */}
      

      {/* Botón de micrófono y estado */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4">
        {/* Texto de estado */}
        <p className="text-white/80 text-sm font-medium">
          {getStatusText()}
        </p>
        
        {/* Botón de micrófono */}
        <button
          onClick={handleMicClick}
          disabled={wsStatus !== 'connected' || isProcessing || isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform shadow-lg ${getButtonStyle()} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            // Icono de stop
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : isProcessing ? (
            // Icono de loading
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isSpeaking ? (
            // Icono de ondas de audio
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          ) : (
            // Icono de micrófono
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>

        {/* Indicador de grabación */}
        {isRecording && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 16}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>

        )}

      </div>
    </div>
  )
}

export default App
