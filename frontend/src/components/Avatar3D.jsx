import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'

// URL del avatar de Ready Player Me proporcionado
const AVATAR_URL = 'https://models.readyplayer.me/69346d21347390125d33e7ae.glb?morphTargets=ARKit,Oculus Visemes'

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
      speakTimer.current += delta * 10
      
      const dict = headMesh.current.morphTargetDictionary
      
      // Animación de boca basada en visemas o simulación
      if (visemeData && visemeData.currentViseme) {
        applyViseme(dict, visemeData.currentViseme, visemeData.intensity || 0.7)
      } else {
        // Simulación simple de habla
        const jawOpenIdx = dict?.['jawOpen']
        const mouthOpenIdx = dict?.['mouthOpen']
        
        const openAmount = (Math.sin(speakTimer.current) * 0.5 + 0.5) * 0.6
        
        if (jawOpenIdx !== undefined) {
          headMesh.current.morphTargetInfluences[jawOpenIdx] = openAmount
        }
        if (mouthOpenIdx !== undefined) {
          headMesh.current.morphTargetInfluences[mouthOpenIdx] = openAmount * 0.5
        }
      }
    } else {
      // Resetear boca cuando no habla
      resetMouth()
    }
  })

  // Aplicar visema específico
  const applyViseme = useCallback((dict, viseme, intensity) => {
    if (!dict) return
    
    const visemeToMorphs = {
      'sil': [],
      'PP': ['mouthPressLeft', 'mouthPressRight', 'mouthClose'],
      'FF': ['mouthFunnel'],
      'TH': ['mouthOpen', 'jawOpen'],
      'DD': ['mouthOpen', 'jawOpen'],
      'kk': ['mouthOpen', 'mouthShrugUpper'],
      'CH': ['mouthFunnel', 'jawOpen'],
      'SS': ['mouthSmileLeft', 'mouthSmileRight'],
      'nn': ['mouthClose'],
      'RR': ['mouthRollLower', 'mouthRollUpper'],
      'aa': ['jawOpen', 'mouthOpen'],
      'E': ['mouthSmileLeft', 'mouthSmileRight', 'jawOpen'],
      'ih': ['mouthSmileLeft', 'mouthSmileRight'],
      'oh': ['mouthFunnel', 'jawOpen'],
      'ou': ['mouthPucker', 'mouthFunnel'],
    }
    
    // Resetear todos los morphs de boca primero (fade out)
    const allMouthMorphs = ['jawOpen', 'mouthOpen', 'mouthFunnel', 'mouthPucker',
      'mouthSmileLeft', 'mouthSmileRight', 'mouthPressLeft', 'mouthPressRight',
      'mouthClose', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugUpper']
    
    allMouthMorphs.forEach(morph => {
      const idx = dict[morph]
      if (idx !== undefined) {
        headMesh.current.morphTargetInfluences[idx] *= 0.7
      }
    })
    
    // Aplicar visema actual
    const morphs = visemeToMorphs[viseme] || visemeToMorphs['aa']
    morphs.forEach(morph => {
      const idx = dict[morph]
      if (idx !== undefined) {
        headMesh.current.morphTargetInfluences[idx] = intensity * 0.8
      }
    })
  }, [])

  // Resetear boca
  const resetMouth = useCallback(() => {
    if (!headMesh.current) return
    
    const dict = headMesh.current.morphTargetDictionary
    const mouthMorphs = ['jawOpen', 'mouthOpen', 'mouthFunnel', 'mouthPucker',
      'mouthSmileLeft', 'mouthSmileRight', 'mouthClose']
    
    mouthMorphs.forEach(morph => {
      const idx = dict?.[morph]
      if (idx !== undefined) {
        headMesh.current.morphTargetInfluences[idx] *= 0.85
      }
    })
  }, [])

  return (
    <group ref={group} position={[0, -1.55, 0]} scale={1}>
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
        minDistance={0.4}
        maxDistance={1.5}
        minPolarAngle={Math.PI / 2.5}
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
        camera={{ position: [0, 0, 0.6], fov: 30 }}
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
