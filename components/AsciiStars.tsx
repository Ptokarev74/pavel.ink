"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AsciiRenderer } from "@react-three/drei";
import * as THREE from "three";

function StarShape({ position, scale = 1, rotationSpeed = 1 }: { position: [number, number, number], scale?: number, rotationSpeed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const radius = 2;
    const innerRadius = 0.8;

    // Outer shape
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const r = i % 2 === 0 ? radius : innerRadius;
      const x = Math.sin(angle) * r;
      const y = Math.cos(angle) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();

    // Inner hole (drawn in reverse order to ensure correct subtraction)
    const hole = new THREE.Path();
    const holeScale = 0.8; // How big the hole is relative to the star
    for (let i = 9; i >= 0; i--) {
      const angle = (i * Math.PI) / 5;
      const r = (i % 2 === 0 ? radius : innerRadius) * holeScale;
      const x = Math.sin(angle) * r;
      const y = Math.cos(angle) * r;
      if (i === 9) hole.moveTo(x, y);
      else hole.lineTo(x, y);
    }
    hole.closePath();
    s.holes.push(hole);

    return s;
  }, []);

  const extrudeSettings = {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  };

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += (delta * rotationSpeed) / 2;
      meshRef.current.rotation.x += (delta * rotationSpeed) / 4;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale, scale]}>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

function StarScene() {
  return (
    <>
      <color attach="background" args={["black"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <group>
        <StarShape position={[-15, 10, -25]} scale={3} rotationSpeed={1.5} />
        <StarShape position={[-6, -2, -5]} scale={1} rotationSpeed={1.0} />
        <StarShape position={[6, -2, -5]} scale={1.0} rotationSpeed={0.8} />
      </group>

      {/* Background scene keeps the black background */}
      <AsciiRenderer fgColor="#ff00ff" bgColor="transparent" />
    </>
  );
}

export default function AsciiStars() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 12] }}>
        <StarScene />
      </Canvas>
    </div>
  );
}
