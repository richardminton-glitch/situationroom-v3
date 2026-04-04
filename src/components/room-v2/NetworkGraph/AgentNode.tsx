'use client';

/**
 * Single agent node — sphere with glow, label, and pulsing ring.
 * Reacts to threat level and animation state.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentId } from '@/lib/room/agentDomains';
import { AGENTS } from '@/lib/room/agentDomains';
import type { ThreatState } from '@/lib/room/threatEngine';

// Threat state -> pulse rate (Hz)
const PULSE_RATES: Record<ThreatState, number> = {
  QUIET: 0.3,
  MONITORING: 0.5,
  ELEVATED: 1.0,
  ALERT: 2.0,
  CRITICAL: 4.0,
};

interface AgentNodeProps {
  agentId: AgentId;
  position: [number, number, number];
  threatState: ThreatState;
  activation: number;   // 0-1 from animation queue
  scale: number;         // 1.0 default, >1 during events
}

// Simple 2D noise approximation for drift
function noise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export default function AgentNode({
  agentId,
  position,
  threatState,
  activation,
  scale: targetScale,
}: AgentNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const agent = AGENTS[agentId];
  const baseColor = useMemo(() => new THREE.Color(agent.color), [agent.color]);
  const dimColor = useMemo(() => new THREE.Color(agent.dimColor), [agent.dimColor]);

  // Animated values
  const currentScale = useRef(1);
  const currentGlow = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulseRate = PULSE_RATES[threatState];

    // ── Perlin-ish drift ──
    const driftX = (noise(t * 0.2, position[1]) - 0.5) * 0.08;
    const driftY = (noise(position[0], t * 0.15) - 0.5) * 0.06;
    const driftZ = (noise(t * 0.18, position[2]) - 0.5) * 0.08;

    // ── Pulse ──
    const pulse = Math.sin(t * pulseRate * Math.PI * 2) * 0.5 + 0.5;

    // ── Scale interpolation ──
    const target = targetScale + pulse * 0.05;
    currentScale.current += (target - currentScale.current) * 0.08;

    // ── Glow interpolation ──
    const glowTarget = Math.max(activation, pulse * 0.3);
    currentGlow.current += (glowTarget - currentGlow.current) * 0.1;

    // Apply transforms
    if (meshRef.current) {
      meshRef.current.position.set(
        position[0] + driftX,
        position[1] + driftY,
        position[2] + driftZ,
      );
      meshRef.current.scale.setScalar(currentScale.current);

      // Color: lerp between dim and bright based on activation + pulse
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.copy(dimColor).lerp(baseColor, currentGlow.current);
        mat.emissiveIntensity = 0.5 + currentGlow.current * 2;
      }
    }

    // Pulsing ring
    if (ringRef.current) {
      ringRef.current.position.set(
        position[0] + driftX,
        position[1] + driftY,
        position[2] + driftZ,
      );
      const ringScale = 1.6 + pulse * 0.4 + activation * 0.3;
      ringRef.current.scale.setScalar(ringScale * currentScale.current);
      ringRef.current.rotation.z = t * 0.3;
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (ringMat) {
        ringMat.opacity = 0.1 + pulse * 0.15 + activation * 0.3;
      }
    }

    // Glow sphere
    if (glowRef.current) {
      glowRef.current.position.set(
        position[0] + driftX,
        position[1] + driftY,
        position[2] + driftZ,
      );
      glowRef.current.scale.setScalar(2.0 + currentGlow.current * 1.5);
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      if (glowMat) {
        glowMat.opacity = 0.04 + currentGlow.current * 0.12;
      }
    }
  });

  return (
    <group>
      {/* Outer glow */}
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color={agent.color}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={ringRef} position={position}>
        <torusGeometry args={[0.3, 0.015, 8, 32]} />
        <meshBasicMaterial
          color={agent.color}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Core sphere */}
      <mesh ref={meshRef} position={position}>
        {agentId === 'COORDINATOR' ? (
          <icosahedronGeometry args={[0.25, 1]} />
        ) : (
          <sphereGeometry args={[0.2, 24, 24]} />
        )}
        <meshStandardMaterial
          color={agent.dimColor}
          emissive={agent.dimColor}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[position[0], position[1] - 0.5, position[2]]}
        fontSize={0.12}
        color={agent.color}
        anchorX="center"
        anchorY="top"
        outlineWidth={0.005}
        outlineColor="#090d12"
      >
        {agent.label}
      </Text>
    </group>
  );
}
