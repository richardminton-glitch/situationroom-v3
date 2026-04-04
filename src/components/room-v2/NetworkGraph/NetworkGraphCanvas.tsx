'use client';

/**
 * R3F Canvas wrapper — mounts the network graph with camera, lighting,
 * and post-processing. Full-bleed background for the members room.
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GraphScene from './GraphScene';
import type { ThreatState } from '@/lib/room/threatEngine';
import type { AnimationState } from '@/hooks/useAnimationQueue';

interface NetworkGraphCanvasProps {
  threatState: ThreatState;
  animationState: AnimationState;
}

export default function NetworkGraphCanvas({
  threatState,
  animationState,
}: NetworkGraphCanvasProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 10],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'default',
        }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Ambient lighting */}
          <ambientLight intensity={0.15} color="#1a3a3a" />
          <pointLight position={[0, 0, 8]} intensity={0.4} color="#00e5c8" />
          <pointLight position={[5, 5, 5]} intensity={0.2} color="#f0a500" />
          <pointLight position={[-5, -3, 5]} intensity={0.15} color="#5b9bd5" />

          {/* Network graph */}
          <GraphScene
            threatState={threatState}
            animationState={animationState}
          />

          {/* Camera controls — subtle, restricted */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={true}
            autoRotate
            autoRotateSpeed={0.15}
            maxPolarAngle={Math.PI * 0.65}
            minPolarAngle={Math.PI * 0.35}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
