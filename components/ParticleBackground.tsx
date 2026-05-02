"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AsciiRenderer } from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// 1. CONFIGURATION & STATE DEFINITIONS
// ==========================================

// These constants control the simulation's basic rules. 
// Play around with these numbers to see how they affect the scene!
const PARTICLE_COUNT = 100;   // Total number of wandering particles
const BOUNDARY = 20;         // The size of the invisible "box" they bounce around inside
const SPEED = 4;             // Base movement speed
const PARTICLE_RADIUS = 0.2; // How large each particle is (used for collision detection)

// This interface defines the properties of a single "star" in an explosion.
// TypeScript uses this to make sure we don't accidentally use the wrong variable names.
interface ExplosionParticle {
  id: number;
  position: THREE.Vector3;    // Current 3D position (x, y, z)
  velocity: THREE.Vector3;    // Current movement direction and speed
  life: number;               // How long it has been alive
  maxLife: number;            // How long it will live before disappearing
  scale: number;              // Current size multiplier
  rotationSpeed: number;      // How fast it spins
}

// ==========================================
// 2. GEOMETRY & MATERIALS
// ==========================================

// Three.js builds 3D objects out of Geometry (the shape) and Material (the look/color).
// Creating these *outside* of the React component is an important optimization!
// If we created them inside the component, React would recreate them every single frame,
// which would ruin performance and cause lag.

// Simple star geometry using ExtrudeGeometry
// This creates a 2D star shape and "extrudes" it into a 3D object (like a cookie cutter)
function getStarGeometry() {
  const s = new THREE.Shape();
  const radius = 1;
  const innerRadius = 0.4;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : innerRadius;
    const x = Math.sin(angle) * r;
    const y = Math.cos(angle) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  // Extrude settings give the 2D shape depth and smooth edges (bevels)
  const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 };
  return new THREE.ExtrudeGeometry(s, extrudeSettings);
}

const starGeometry = getStarGeometry();
// Icosahedron is a sphere made out of triangles. The '1' means low detail (good for performance).
const particleGeometry = new THREE.IcosahedronGeometry(PARTICLE_RADIUS, 1);

// MeshStandardMaterial reacts to light. Without lights in the scene, these would be totally black!
const particleMaterial = new THREE.MeshStandardMaterial({ color: "cyan" });

// Add emissive so the stars glow brightly, making them much more visible to the AsciiRenderer
const starMaterial = new THREE.MeshStandardMaterial({
  color: "magenta",
  emissive: "magenta",
  emissiveIntensity: 2
});

// ==========================================
// 3. THE PHYSICS SCENE COMPONENT
// ==========================================
function PhysicsScene() {
  // InstancedMesh is Three.js's secret weapon for performance!
  // Instead of drawing 50 separate particles, we draw 1 particle 50 times in a single "draw call".
  // The 'ref' allows us to directly access and modify the underlying Three.js object later.
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  // State for wandering particles
  // useMemo remembers this data so it's only generated ONCE when the component first loads.
  const particlesData = useMemo(() => {
    const data = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * BOUNDARY,
          (Math.random() - 0.5) * BOUNDARY,
          (Math.random() - 0.5) * BOUNDARY
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * SPEED,
          (Math.random() - 0.5) * SPEED,
          (Math.random() - 0.5) * SPEED
        ),
      });
    }
    return data;
  }, []);

  // State for explosions
  const MAX_EXPLOSION_PARTICLES = 200;
  const explosionsRef = useRef<THREE.InstancedMesh>(null);

  // We use useRef instead of useState for explosionsData because changing useState 
  // causes a React re-render, which is too slow for 60 Frames-Per-Second (FPS) logic.
  const explosionsData = useRef<ExplosionParticle[]>([]);
  let nextExplosionId = 0;

  // This function is called whenever two particles collide
  const spawnExplosion = (position: THREE.Vector3) => {
    // Increase from 4-7 to 8-12 stars per explosion for a denser effect
    const numStars = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numStars; i++) {
      // Prevent crashing if we have too many particles on screen at once
      if (explosionsData.current.length >= MAX_EXPLOSION_PARTICLES) break;

      // Make the explosion burst outward faster
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25
      );

      explosionsData.current.push({
        id: nextExplosionId++,
        position: position.clone(), // Must clone() so they don't all share the same exact position object in memory!
        velocity: velocity,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8, // Slightly longer lifespan
        scale: 0.6 + Math.random() * 0.6,   // Much larger scale so they are easily picked up by ASCII
        rotationSpeed: (Math.random() - 0.5) * 15
      });
    }
  };

  // A "dummy" invisible object. We use this to calculate math (position, rotation, scale)
  // for a single instance, and then copy that math over to the InstancedMesh.
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // ==========================================
  // 4. THE GAME LOOP (useFrame)
  // ==========================================
  // useFrame runs every single frame (e.g., 60 times a second).
  // 'delta' is the time (in seconds) since the last frame. Multiplying by delta 
  // ensures movement speed stays the same even if the computer's framerate drops.
  useFrame((state, delta) => {

    // --- Step 1: Move Wandering Particles ---
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particlesData[i];
      // Move by adding velocity * time_passed
      p.position.addScaledVector(p.velocity, delta);

      // Bounce off invisible walls
      // Math.sign() tells us if it's hitting the positive or negative wall.
      if (Math.abs(p.position.x) > BOUNDARY / 2) { p.position.x = Math.sign(p.position.x) * BOUNDARY / 2; p.velocity.x *= -1; }
      if (Math.abs(p.position.y) > BOUNDARY / 2) { p.position.y = Math.sign(p.position.y) * BOUNDARY / 2; p.velocity.y *= -1; }
      if (Math.abs(p.position.z) > BOUNDARY / 2) { p.position.z = Math.sign(p.position.z) * BOUNDARY / 2; p.velocity.z *= -1; }
    }

    // --- Step 2: Check for Collisions ---
    // A nested loop compares every particle against every *other* particle.
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const p1 = particlesData[i];
        const p2 = particlesData[j];
        // DistanceSquared is mathematically faster for computers to calculate than regular Distance
        const distSq = p1.position.distanceToSquared(p2.position);

        const min_dist = PARTICLE_RADIUS * 2;
        if (distSq < min_dist * min_dist) {
          // Collision Detected!

          // Swap velocities (simple elastic physics bounce)
          const temp = p1.velocity.clone();
          p1.velocity.copy(p2.velocity);
          p2.velocity.copy(temp);

          // PUSH THEM APART: If we don't do this, they might get stuck inside each other
          // and constantly trigger collisions forever.
          const diff = p1.position.clone().sub(p2.position).normalize();
          const dist = Math.sqrt(distSq);
          const overlap = (min_dist - dist) / 2;
          p1.position.addScaledVector(diff, overlap);
          p2.position.addScaledVector(diff, -overlap);

          // Spawn an explosion exactly between the two colliding particles
          const midPoint = p1.position.clone().add(p2.position).multiplyScalar(0.5);
          spawnExplosion(midPoint);
        }
      }
    }

    // --- Step 3: Draw Wandering Particles ---
    // We calculated their new positions in pure math, now we have to tell the 3D Engine.
    if (particlesRef.current) {
      // Reset scale and rotation from the previous frame's explosion drawing
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        dummy.position.copy(particlesData[i].position);
        dummy.updateMatrix(); // Converts position/rotation into a mathematically readable format for the GPU
        particlesRef.current.setMatrixAt(i, dummy.matrix); // Tell instance 'i' where to be
      }
      // This flag tells Three.js "Hey, I changed the positions, please re-draw this on the screen!"
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Step 4: Update Explosions ---
    // We loop backwards because we are removing items from the array using `.splice()`
    // Looping forwards while deleting items causes bugs where items get skipped.
    for (let i = explosionsData.current.length - 1; i >= 0; i--) {
      const exp = explosionsData.current[i];
      exp.life += delta;

      // If it's too old, delete it from the array and skip the rest of the loop
      if (exp.life >= exp.maxLife) {
        explosionsData.current.splice(i, 1);
        continue;
      }

      exp.position.addScaledVector(exp.velocity, delta);
      // Friction / Drag: Multiply velocity by a number < 1 so it slows down over time
      exp.velocity.multiplyScalar(0.95);
    }

    // --- Step 5: Draw Explosions ---
    if (explosionsRef.current) {
      // First, we "hide" ALL possible explosion instances by scaling them to 0.
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      for (let i = 0; i < MAX_EXPLOSION_PARTICLES; i++) {
        explosionsRef.current.setMatrixAt(i, dummy.matrix);
      }

      // Then, we only show the ones that are currently active in our explosionsData array
      for (let i = 0; i < explosionsData.current.length; i++) {
        const exp = explosionsData.current[i];

        // progress goes from 0.0 (just born) to 1.0 (about to die)
        const progress = exp.life / exp.maxLife;
        // This math makes it shrink as it dies
        const currentScale = exp.scale * (1 - progress * progress);

        dummy.position.copy(exp.position);
        dummy.scale.set(currentScale, currentScale, currentScale);

        // Add some rotation
        const rotOffset = exp.rotationSpeed * exp.life;
        dummy.rotation.set(rotOffset, rotOffset, 0);

        dummy.updateMatrix();
        explosionsRef.current.setMatrixAt(i, dummy.matrix);
      }
      explosionsRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Step 6: Camera Movement ---
    // Create a parallax effect by moving the camera slightly based on mouse position
    const targetX = (state.pointer.x * 8);
    const targetY = (state.pointer.y * 8);

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  // ==========================================
  // 5. RENDERING THE JSX
  // ==========================================
  // React Three Fiber lets us write 3D objects as HTML-like tags!
  return (
    <>
      <color attach="background" args={["black"]} />

      {/* Lighting is required to see colors on MeshStandardMaterials */}
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* These are the InstancedMeshes we control in useFrame */}
      <instancedMesh ref={particlesRef} args={[particleGeometry, particleMaterial, PARTICLE_COUNT]} />
      <instancedMesh ref={explosionsRef} args={[starGeometry, starMaterial, MAX_EXPLOSION_PARTICLES]} />

      {/* Keeping bgColor transparent so it overlays the CSS background */}
      <AsciiRenderer fgColor="#00ff88" bgColor="transparent" />
    </>
  );
}

// This is the actual React component we export to the rest of the app.
export default function ParticleBackground() {
  return (
    // 'pointer-events-none' ensures the background doesn't block clicking on buttons!
    <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-40">
      {/* The Canvas creates a WebGL context for Three.js to render inside */}
      <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
        <PhysicsScene />
      </Canvas>
    </div>
  );
}
