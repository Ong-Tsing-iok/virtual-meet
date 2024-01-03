/* eslint-disable react/no-unknown-property */
import { useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useHelper, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import useKeyboard from './helpers/useKeyboard'

function App() {

  const Plane = () => {
    return (
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshBasicMaterial color="hotpink" side={THREE.DoubleSide} />
      </mesh>
    )
  }

  const Pov = () => {
    const povRef = useRef()
    useHelper(povRef, THREE.CameraHelper)
    const keyMap = useKeyboard()

    useFrame((_, delta) => {
      keyMap['KeyA'] && (povRef.current.translateX(-delta))
      keyMap['KeyD'] && (povRef.current.translateX(delta))
      keyMap['KeyW'] && (povRef.current.translateZ(-delta))
      keyMap['KeyS'] && (povRef.current.translateZ(delta))
      povRef.current.position.y = 0.2
    })

    return (
      <>
        <PerspectiveCamera ref={povRef} position={[0, 0.2, 2]} rotation={[0, 0, 0]} makeDefault  />
        <PointerLockControls />
      </>
    )
  }


  return (
    <div className='h-screen w-screen'>
      <Canvas camera={{position: [0, 0.5, 0.3]}}>
        <Plane />
        <Pov />
        {/* <OrbitControls /> */}
      </Canvas>
    </div>
  )
}

export default App
