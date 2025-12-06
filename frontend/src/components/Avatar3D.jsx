import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'

// URL del avatar de Ready Player Me
const AVATAR_URL = 'https://models.readyplayer.me/69346d21347390125d33e7ae.glb'

// Componente del modelo de avatar
function AvatarModel({ isSpeaking, visemeData, onLoaded }) {
  const group = useRef()
  const { scene } = useGLTF(AVATAR_URL)
  const headMesh = useRef(null)
  const teethMesh = useRef(null)
  
  // Timers para animaciones
  const blinkTimer = useRef(0)
  const speakTimer = useRef(0)
  
  // Encontrar meshes con morph targets
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        const name = child.name.toLowerCase()
        if (name.includes('head') || name.includes('wolf3d_head')) {
          headMesh.current = child
          console.log('Head mesh encontrado:', child.name)
          console.log('MorphTargets disponibles:', Object.keys(child.morphTargetDictionary))
        }
        if (name.includes('teeth') || name.includes('wolf3d_teeth')) {
          teethMesh.current = child
        }
      }
    })
    
    if (onLoaded) onLoaded()
  }, [scene, onLoaded])

  // Animación de parpadeo
  const blink = useCallback(() => {
    if (!headMesh.current) return
    
    const dict = headMesh.current.morphTargetDictionary
    const blinkLeftIdx = dict?.['eyeBlinkLeft']
    const blinkRightIdx = dict?.['eyeBlinkRight']
    
    if (blinkLeftIdx !== undefined && blinkRightIdx !== undefined) {
      headMesh.current.morphTargetInfluences[blinkLeftIdx] = 1
      headMesh.current.morphTargetInfluences[blinkRightIdx] = 1
      
      setTimeout(() => {
        if (headMesh.current) {
          headMesh.current.morphTargetInfluences[blinkLeftIdx] = 0
          headMesh.current.morphTargetInfluences[blinkRightIdx] = 0
        }
      }, 150)
    }
  }, [])

  // Frame loop para animaciones
  useFrame((state, delta) => {
    if (!headMesh.current) return
    
    blinkTimer.current += delta
    
    // Parpadeo aleatorio cada 3-6 segundos
    if (blinkTimer.current > 3 + Math.random() * 3) {
      blink()
      blinkTimer.current = 0
    }
    
    // Animación de lip-sync cuando está hablando
    if (isSpeaking) {
      speakTimer.current += delta * 6
      
      const dict = headMesh.current.morphTargetDictionary
      const teethDict = teethMesh.current?.morphTargetDictionary
      
      // Animación de boca basada en visemas o simulación
      if (visemeData && visemeData.currentViseme) {
        applyViseme(dict, teethDict, visemeData.currentViseme, visemeData.intensity || 0.4)
      } else {
        // Simulación más sutil usando Oculus Visemes
        const visemes = ['viseme_aa', 'viseme_O', 'viseme_E']
        const time = speakTimer.current
        
        // Crear movimiento más suave entre visemas
        visemes.forEach((viseme, i) => {
          const idx = dict?.[viseme]
          if (idx !== undefined) {
            const phase = time + i * 0.8
            const value = Math.max(0, Math.sin(phase) * 0.25) // Reducido de 0.5 a 0.25
            headMesh.current.morphTargetInfluences[idx] = value
          }
        })
        
        // Movimiento de mandíbula más sutil
        const jawValue = (Math.sin(time * 1.2) * 0.5 + 0.5) * 0.15 // Reducido de 0.35 a 0.15
        
        const jawIdx = dict?.['jawOpen']
        if (jawIdx !== undefined) {
          headMesh.current.morphTargetInfluences[jawIdx] = jawValue
        }
        
        // Mover dientes con la mandíbula
        if (teethMesh.current && teethDict) {
          const teethJawIdx = teethDict['jawOpen']
          if (teethJawIdx !== undefined) {
            teethMesh.current.morphTargetInfluences[teethJawIdx] = jawValue
          }
        }
      }
    } else {
      // Resetear boca cuando no habla
      resetMouth()
    }
  })

  // Aplicar visema específico - Usando Oculus Visemes de Ready Player Me
  const applyViseme = useCallback((dict, teethDict, viseme, intensity) => {
    if (!dict || !headMesh.current) return
    
    // Reducir intensidad general para movimientos más naturales
    const reducedIntensity = intensity * 0.5
    
    // Mapeo a Oculus Visemes (viseme_XX)
    const visemeToOculus = {
      'sil': 'viseme_sil',   // Silencio
      'PP': 'viseme_PP',     // p, b, m
      'FF': 'viseme_FF',     // f, v
      'TH': 'viseme_TH',     // th
      'DD': 'viseme_DD',     // t, d
      'kk': 'viseme_kk',     // k, g
      'CH': 'viseme_CH',     // ch, j, sh
      'SS': 'viseme_SS',     // s, z
      'nn': 'viseme_nn',     // n, l
      'RR': 'viseme_RR',     // r
      'aa': 'viseme_aa',     // a
      'E': 'viseme_E',       // e
      'ih': 'viseme_I',      // i
      'oh': 'viseme_O',      // o
      'ou': 'viseme_U',      // u
    }
    
    // Lista de todos los visemas de Oculus
    const allVisemes = [
      'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
      'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
      'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'
    ]
    
    // Fade out todos los visemas más rápido
    allVisemes.forEach(v => {
      const idx = dict[v]
      if (idx !== undefined) {
        headMesh.current.morphTargetInfluences[idx] *= 0.6
      }
    })
    
    // Aplicar visema actual con intensidad reducida
    const oculusViseme = visemeToOculus[viseme] || 'viseme_aa'
    const idx = dict[oculusViseme]
    if (idx !== undefined) {
      headMesh.current.morphTargetInfluences[idx] = reducedIntensity
    }
    
    // Mover mandíbula para vocales abiertas (con intensidad reducida)
    const needsJaw = ['aa', 'oh', 'E', 'DD', 'TH'].includes(viseme)
    const jawValue = needsJaw ? reducedIntensity * 0.3 : 0
    
    const jawIdx = dict['jawOpen']
    if (jawIdx !== undefined) {
      headMesh.current.morphTargetInfluences[jawIdx] = jawValue
    }
    
    // Mover dientes con la mandíbula
    if (teethMesh.current && teethDict) {
      const teethJawIdx = teethDict['jawOpen']
      if (teethJawIdx !== undefined) {
        teethMesh.current.morphTargetInfluences[teethJawIdx] = jawValue
      }
    }
  }, [])

  // Resetear boca y dientes
  const resetMouth = useCallback(() => {
    if (!headMesh.current) return
    
    const dict = headMesh.current.morphTargetDictionary
    const teethDict = teethMesh.current?.morphTargetDictionary
    
    // Resetear Oculus Visemes
    const visemes = [
      'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
      'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
      'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'jawOpen'
    ]
    
    visemes.forEach(viseme => {
      const idx = dict?.[viseme]
      if (idx !== undefined) {
        headMesh.current.morphTargetInfluences[idx] *= 0.85
      }
    })
    
    // Resetear dientes también
    if (teethMesh.current && teethDict) {
      const teethJawIdx = teethDict['jawOpen']
      if (teethJawIdx !== undefined) {
        teethMesh.current.morphTargetInfluences[teethJawIdx] *= 0.85
      }
    }
  }, [])

  return (
    <group ref={group} position={[0, -1.62, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  )
}

// Escena 3D completa
function AvatarScene({ isSpeaking, visemeData, onLoaded }) {
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[0, 2, 3]} intensity={1.5} />
      <directionalLight position={[-2, 1, 2]} intensity={0.5} />
      <directionalLight position={[2, 1, 2]} intensity={0.5} />
      <spotLight position={[0, 3, 1]} intensity={0.8} angle={0.6} penumbra={1} />
      
      <AvatarModel 
        isSpeaking={isSpeaking}
        visemeData={visemeData}
        onLoaded={onLoaded}
      />
      
      <Environment preset="studio" />
      
      <OrbitControls 
        target={[0, 0, 0]}
        enablePan={false}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={0.5}
        minPolarAngle={Math.PI / 2.1}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  )
}

// Componente principal exportado
const Avatar3D = forwardRef(({ 
  isSpeaking = false,
  className = '',
  onLoaded
}, ref) => {
  const [visemeData, setVisemeData] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const visemeIntervalRef = useRef(null)
  
  // Exponer métodos al componente padre
  useImperativeHandle(ref, () => ({
    startLipSync: (text) => {
      startSimulatedLipSync(text)
    },
    stopLipSync: () => {
      stopLipSync()
    },
    setViseme: (viseme, intensity) => {
      setVisemeData({ currentViseme: viseme, intensity })
    }
  }))
  
  // Simulación de lip sync basada en texto
  const startSimulatedLipSync = useCallback((text) => {
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current)
    }
    
    const charToViseme = {
      'a': 'aa', 'á': 'aa',
      'e': 'E', 'é': 'E',
      'i': 'ih', 'í': 'ih',
      'o': 'oh', 'ó': 'oh',
      'u': 'ou', 'ú': 'ou',
      'p': 'PP', 'b': 'PP', 'm': 'PP',
      'f': 'FF', 'v': 'FF',
      't': 'DD', 'd': 'DD',
      'k': 'kk', 'g': 'kk', 'c': 'kk',
      's': 'SS', 'z': 'SS',
      'n': 'nn', 'l': 'nn',
      'r': 'RR',
      ' ': 'sil', '.': 'sil', ',': 'sil'
    }
    
    const chars = text.toLowerCase().split('')
    let charIndex = 0
    const msPerChar = 80
    
    visemeIntervalRef.current = setInterval(() => {
      if (charIndex >= chars.length) {
        stopLipSync()
        return
      }
      
      const char = chars[charIndex]
      const viseme = charToViseme[char] || 'sil'
      const intensity = char === ' ' ? 0.2 : 0.5 + Math.random() * 0.4
      
      setVisemeData({ currentViseme: viseme, intensity })
      charIndex++
    }, msPerChar)
  }, [])
  
  const stopLipSync = useCallback(() => {
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current)
      visemeIntervalRef.current = null
    }
    setVisemeData(null)
  }, [])
  
  useEffect(() => {
    return () => {
      if (visemeIntervalRef.current) {
        clearInterval(visemeIntervalRef.current)
      }
    }
  }, [])
  
  const handleLoaded = useCallback(() => {
    setIsLoaded(true)
    if (onLoaded) onLoaded()
  }, [onLoaded])

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Indicador de carga */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white text-lg">Cargando avatar...</p>
          </div>
        </div>
      )}
      
      {/* Canvas 3D */}
      <Canvas
        camera={{ position: [0, 0, 0.38], fov: 22 }}
        style={{ background: 'transparent' }}
        shadows
        dpr={[1, 2]}
      >
        <AvatarScene 
          isSpeaking={isSpeaking}
          visemeData={visemeData}
          onLoaded={handleLoaded}
        />
      </Canvas>
    </div>
  )
})

Avatar3D.displayName = 'Avatar3D'

export default Avatar3D
