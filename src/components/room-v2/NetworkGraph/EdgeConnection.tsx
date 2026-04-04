'use client';

/**
 * Edge between two agent nodes — animated line with flowing particles.
 * Brightness and particle speed driven by threat level and activation state.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreatState } from '@/lib/room/threatEngine';

// Threat state -> edge brightness multiplier
const EDGE_BRIGHTNESS: Record<ThreatState, number> = {
  QUIET: 0.10,
  MONITORING: 0.20,
  ELEVATED: 0.40,
  ALERT: 0.70,
  CRITICAL: 1.00,
};

// Threat state -> particle speed
const PARTICLE_SPEED: Record<ThreatState, number> = {
  QUIET: 0.02,
  MONITORING: 0.04,
  ELEVATED: 0.08,
  ALERT: 0.15,
  CRITICAL: 0.25,
};

interface EdgeConnectionProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  threatState: ThreatState;
  active: boolean;         // true during event animation
  edgeBrightness: number;  // 0-1 override from animation queue
}

const PARTICLE_COUNT = 8;

export default function EdgeConnection({
  from,
  to,
  color,
  threatState,
  active,
  edgeBrightness: activeBrightness,
}: EdgeConnectionProps) {
  const lineRef = useRef<THREE.Line>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const baseColor = useMemo(() => new THREE.Color(color), [color]);

  // Line geometry
  const lineGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array([
      from[0], from[1], from[2],
      to[0], to[1], to[2],
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [from, to]);

  // Particle positions (instanced along the edge)
  const particlePositions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    return pos;
  }, []);

  const particleGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    return geom;
  }, [particlePositions]);

  // Per-particle phase offsets
  const phaseOffsets = useMemo(() => {
    const offsets = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      offsets[i] = Math.random();
    }
    return offsets;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const baseBrightness = EDGE_BRIGHTNESS[threatState];
    const speed = PARTICLE_SPEED[threatState];
    const brightness = active ? Math.max(baseBrightness, activeBrightness) : baseBrightness;

    // Flicker the edge line
    const flicker = 0.7 + Math.sin(t * 0.3 * Math.PI * 2 + from[0] * 10) * 0.3;
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = brightness * flicker;
    }

    // Animate particles along the edge
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.getAttribute('position');
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const phase = (phaseOffsets[i] + t * speed) % 1;
        arr[i * 3] = from[0] + (to[0] - from[0]) * phase;
        arr[i * 3 + 1] = from[1] + (to[1] - from[1]) * phase;
        arr[i * 3 + 2] = from[2] + (to[2] - from[2]) * phase;
      }
      posAttr.needsUpdate = true;

      const pMat = pointsRef.current.material as THREE.PointsMaterial;
      pMat.opacity = brightness * 0.8;
      pMat.size = active ? 0.06 : 0.03;
    }
  });

  // Build line material
  const lineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });
  }, [baseColor]);

  const pointMat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: baseColor,
      size: 0.03,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      sizeAttenuation: true,
    });
  }, [baseColor]);

  return (
    <group>
      {/* Edge line */}
      <primitive
        ref={lineRef}
        object={new THREE.Line(lineGeom, lineMat)}
      />

      {/* Flowing particles */}
      <primitive
        ref={pointsRef}
        object={new THREE.Points(particleGeom, pointMat)}
      />
    </group>
  );
}
