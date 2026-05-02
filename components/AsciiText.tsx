"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Text3D, AsciiRenderer } from "@react-three/drei";
import * as THREE from "three";

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  // Mouse reactive rotation
  useFrame((state) => {
    if (groupRef.current) {
      // Rotate the text slightly based on mouse position
      const targetX = (state.pointer.y * Math.PI) / 8;
      const targetY = (state.pointer.x * Math.PI) / 8;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.1);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.1);
    }
  });

  return (
    <>
      <color attach="background" args={["black"]} />

      {/* We use transparent background for the ASCII CSS, but the WebGL scene MUST be black 
          so the ASCII effect knows to render empty space as ' ' instead of '#' */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <group ref={groupRef} position={[0, 0, 0]}>
        <Center>
          <Text3D
            font="https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json"
            size={3}
            height={2}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.1}
            bevelSize={0.05}
            bevelOffset={0}
            bevelSegments={5}
          >
            pavel
            <meshStandardMaterial color="white" />
          </Text3D>
        </Center>
      </group>

      {/* AsciiRenderer is transparent so the stars behind it can show through */}
      <AsciiRenderer fgColor="#00ffff" bgColor="transparent" />
    </>
  );
}

export default function AsciiText() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 30], fov: 70 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
