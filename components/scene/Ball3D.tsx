import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Ball3DProps {
  position: [number, number, number];
  velocity: [number, number, number];
  isSelected?: boolean;
  onClick?: (e: any) => void;
  onPointerDown?: (e: any) => void;
}

const BallSelectionRing: React.FC = () => {
  const ringMesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringMesh.current) {
      const t = state.clock.getElapsedTime();
      const scale = 1.0 + Math.sin(t * 6) * 0.08;
      ringMesh.current.scale.set(scale, scale, 1);
      
      const mat = ringMesh.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.6 + Math.sin(t * 6) * 0.3;
      }
    }
  });

  return (
    <mesh ref={ringMesh} position={[0, -0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.18, 0.23, 32]} />
      <meshBasicMaterial color="#00d2ff" transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
};

export const Ball3D = React.forwardRef<THREE.Group, Ball3DProps>(({
  position,
  isSelected = false,
  onClick,
  onPointerDown
}, ref) => {
  const rotations: [number, number, number][] = [
    [0, 0, 0],
    [Math.PI, 0, 0],
    [Math.PI / 2, 0, 0],
    [-Math.PI / 2, 0, 0],
    [0, 0, -Math.PI / 2],
    [0, 0, Math.PI / 2]
  ];

  return (
    <group 
      ref={ref} 
      position={position}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {/* 1. SELECTION GLOW RING */}
      {isSelected && <BallSelectionRing />}

      {/* Main perfectly round white sphere */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>
      
      {/* Perfectly flush black panel caps */}
      {rotations.map((rot, i) => (
        <group key={i} rotation={rot}>
          <mesh>
            <sphereGeometry args={[0.1102, 32, 8, 0, Math.PI * 2, 0, 0.35]} />
            <meshStandardMaterial color="#192026" roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

Ball3D.displayName = 'Ball3D';
