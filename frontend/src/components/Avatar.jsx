import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

/**
 * Componente Avatar Visual
 * 
 * Este componente muestra un avatar animado que responde a las expresiones
 * faciales enviadas por AIAvatarKit. El avatar cambia su expresión basándose
 * en los datos de avatar_control_request del servidor.
 * 
 * Expresiones soportadas: neutral, joy, angry, sorrow, fun, thinking
 */

// Mapeo de expresiones a emojis/estilos visuales
const EXPRESSIONS = {
  neutral: {
    emoji: '🙂',
    eyeStyle: 'normal',
    mouthStyle: 'normal',
    color: 'from-blue-400 to-blue-600',
    animation: '',
    label: 'Neutral'
  },
  joy: {
    emoji: '😊',
    eyeStyle: 'happy',
    mouthStyle: 'smile',
    color: 'from-yellow-400 to-orange-500',
    animation: 'animate-bounce-slow',
    label: 'Feliz'
  },
  angry: {
    emoji: '😠',
    eyeStyle: 'angry',
    mouthStyle: 'frown',
    color: 'from-red-400 to-red-600',
    animation: 'animate-shake',
    label: 'Enojado'
  },
  sorrow: {
    emoji: '😢',
    eyeStyle: 'sad',
    mouthStyle: 'sad',
    color: 'from-blue-300 to-indigo-500',
    animation: '',
    label: 'Triste'
  },
  fun: {
    emoji: '🥳',
    eyeStyle: 'excited',
    mouthStyle: 'laugh',
    color: 'from-pink-400 to-purple-500',
    animation: 'animate-wiggle',
    label: 'Divertido'
  },
  thinking: {
    emoji: '🤔',
    eyeStyle: 'thinking',
    mouthStyle: 'thinking',
    color: 'from-gray-400 to-gray-600',
    animation: 'animate-pulse',
    label: 'Pensando'
  }
}

// Componente de ojos del avatar
const AvatarEyes = ({ style, isSpeaking }) => {
  const [blinking, setBlinking] = useState(false)

  // Efecto de parpadeo aleatorio
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setBlinking(true)
        setTimeout(() => setBlinking(false), 150)
      }
    }, 2000)
    return () => clearInterval(blinkInterval)
  }, [])

  const getEyeClass = () => {
    if (blinking) return 'h-1'
    
    switch (style) {
      case 'happy':
        return 'h-1 rounded-b-full' // Ojos sonrientes (arcos)
      case 'angry':
        return 'h-4 -rotate-12' // Ojos entrecerrados
      case 'sad':
        return 'h-4 rounded-t-full' // Ojos tristes
      case 'excited':
        return 'h-5 w-5 animate-pulse' // Ojos grandes emocionados
      case 'thinking':
        return 'h-4 translate-x-1' // Mirando a un lado
      default:
        return 'h-4' // Normal
    }
  }

  return (
    <div className="flex gap-6 mb-4">
      <div className={`w-4 bg-gray-800 dark:bg-white rounded-full transition-all duration-200 ${getEyeClass()}`} />
      <div className={`w-4 bg-gray-800 dark:bg-white rounded-full transition-all duration-200 ${getEyeClass()}`} />
    </div>
  )
}

// Componente de boca del avatar
const AvatarMouth = ({ style, isSpeaking }) => {
  const getMouthClass = () => {
    if (isSpeaking) {
      // Animación de hablar
      return 'w-8 h-4 bg-gray-800 dark:bg-white rounded-full animate-talk'
    }
    
    switch (style) {
      case 'smile':
        return 'w-12 h-6 border-b-4 border-gray-800 dark:border-white rounded-b-full'
      case 'frown':
        return 'w-10 h-4 border-t-4 border-gray-800 dark:border-white rounded-t-full mt-2'
      case 'sad':
        return 'w-8 h-3 border-t-4 border-gray-800 dark:border-white rounded-t-full mt-2'
      case 'laugh':
        return 'w-14 h-8 bg-gray-800 dark:bg-white rounded-full'
      case 'thinking':
        return 'w-6 h-2 bg-gray-800 dark:bg-white rounded-full translate-x-2'
      default:
        return 'w-10 h-2 bg-gray-800 dark:bg-white rounded-full'
    }
  }

  return (
    <div className={`transition-all duration-300 ${getMouthClass()}`} />
  )
}

// Indicador de estado de voz
const VoiceIndicator = ({ isListening, isSpeaking, isProcessing }) => {
  if (isProcessing) {
    return (
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  if (isSpeaking) {
    return (
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-0.5 items-end h-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-green-500 rounded-full animate-sound-wave"
              style={{
                animationDelay: `${i * 100}ms`,
                height: `${Math.random() * 12 + 4}px`
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (isListening) {
    return (
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      </div>
    )
  }

  return null
}

const Avatar = () => {
  const { 
    avatarExpression = 'neutral',
    isSpeaking,
    isRecording,
    isProcessing
  } = useApp()

  const [currentExpression, setCurrentExpression] = useState('neutral')
  const [expressionTimeout, setExpressionTimeout] = useState(null)
  const avatarRef = useRef(null)

  // Actualizar expresión cuando cambia
  useEffect(() => {
    if (avatarExpression && EXPRESSIONS[avatarExpression]) {
      setCurrentExpression(avatarExpression)
      
      // Limpiar timeout anterior
      if (expressionTimeout) {
        clearTimeout(expressionTimeout)
      }
      
      // Volver a neutral después de un tiempo (si no es thinking mientras procesa)
      if (avatarExpression !== 'neutral' && avatarExpression !== 'thinking') {
        const timeout = setTimeout(() => {
          setCurrentExpression('neutral')
        }, 5000) // Duración de la expresión: 5 segundos
        setExpressionTimeout(timeout)
      }
    }
  }, [avatarExpression])

  // Mostrar "thinking" mientras procesa
  useEffect(() => {
    if (isProcessing) {
      setCurrentExpression('thinking')
    } else if (!avatarExpression || avatarExpression === 'neutral') {
      setCurrentExpression('neutral')
    }
  }, [isProcessing])

  const expression = EXPRESSIONS[currentExpression] || EXPRESSIONS.neutral

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col items-center">
        {/* Título */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Avatar Virtual
        </h3>

        {/* Contenedor del Avatar */}
        <div 
          ref={avatarRef}
          className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${expression.color} 
            flex flex-col items-center justify-center shadow-lg
            transition-all duration-500 ${expression.animation}`}
        >
          {/* Cara del Avatar */}
          <AvatarEyes style={expression.eyeStyle} isSpeaking={isSpeaking} />
          <AvatarMouth style={expression.mouthStyle} isSpeaking={isSpeaking} />
          
          {/* Indicador de voz */}
          <VoiceIndicator 
            isListening={isRecording} 
            isSpeaking={isSpeaking} 
            isProcessing={isProcessing}
          />
        </div>

        {/* Emoji de expresión */}
        <div className="mt-4 text-4xl transition-all duration-300">
          {expression.emoji}
        </div>

        {/* Etiqueta de estado */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isProcessing ? 'Pensando...' : 
           isSpeaking ? 'Hablando...' : 
           isRecording ? 'Escuchando...' : 
           expression.label}
        </div>

        {/* Indicador de conexión AIAvatarKit */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-500 dark:text-gray-400">AIAvatarKit conectado</span>
        </div>
      </div>
    </div>
  )
}

export default Avatar
