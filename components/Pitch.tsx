import React from 'react';
import * as THREE from 'three';
import { Slot } from '../types';
import { ALL_SLOTS } from '../useGameState';

interface PitchProps {
  phase: string;
  captainMoveMode?: string | null;
  onSlotClick?: (slotId: string) => void;
  hoveredSlotId: string | null;
  setHoveredSlotId: (id: string | null) => void;
  homePlayers: any[];
}

// --- STATIC OPTIMIZED THREE.JS MATERIALS & GEOMETRIES ---
const woodMaterial = new THREE.MeshStandardMaterial({
  color: '#8b5a2b', // beautiful mahogany/walnut wood
  roughness: 0.25,
  metalness: 0.1,
  flatShading: true
});

const woodBaseMaterial = new THREE.MeshStandardMaterial({
  color: '#5c3818',
  roughness: 0.4,
  metalness: 0.0
});

const darkGrassMaterial = new THREE.MeshStandardMaterial({
  color: '#224d17',
  roughness: 0.7,
  flatShading: true
});

const lightGrassMaterial = new THREE.MeshStandardMaterial({
  color: '#2c611f',
  roughness: 0.7,
  flatShading: true
});

const chalkMaterial = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide
});

const chalkLineMaterial = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.6
});

const penaltyBoxMaterial = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.5
});

// Alternating lawn grass stripes
const stripes = Array.from({ length: 16 }, (_, i) => {
  const isDark = i % 2 === 0;
  const color = isDark ? '#224d17' : '#2c611f';
  const zPos = -7.5 + i * 1.0;
  return { id: i, color, zPos };
});

const Pitch: React.FC<PitchProps> = ({ 
  phase, 
  captainMoveMode = null,
  onSlotClick, 
  hoveredSlotId, 
  setHoveredSlotId,
  homePlayers 
}) => {
  return (
    <group>
      {/* 1. Wood Table Base */}
      <mesh receiveShadow position={[0, -0.15, 0]} material={woodBaseMaterial}>
        <boxGeometry args={[11.5, 0.3, 17.5]} />
      </mesh>

      {/* 2. Grass Lawn Fields (Alternating Stripes) */}
      <group position={[0, 0.01, 0]}>
        {stripes.map((stripe) => (
          <mesh key={stripe.id} position={[0, 0, stripe.zPos]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[10, 1.0]} />
            <primitive object={stripe.id % 2 === 0 ? darkGrassMaterial : lightGrassMaterial} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 3. Wooden Frame Borders (Peteleco wooden wall) */}
      {/* Left Wall */}
      <mesh position={[-5.1, 0.25, 0]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[0.2, 0.5, 16.2]} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[5.1, 0.25, 0]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[0.2, 0.5, 16.2]} />
      </mesh>

      {/* Back Wall - Player side (Z = -8), leaving a gap in the center [-1.1, 1.1] for the goal */}
      <mesh position={[-3.05, 0.25, -8.1]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[3.9, 0.5, 0.2]} />
      </mesh>
      <mesh position={[3.05, 0.25, -8.1]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[3.9, 0.5, 0.2]} />
      </mesh>

      {/* Back Wall - Opponent side (Z = 8), leaving a gap for the goal */}
      <mesh position={[-3.05, 0.25, 8.1]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[3.9, 0.5, 0.2]} />
      </mesh>
      <mesh position={[3.05, 0.25, 8.1]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[3.9, 0.5, 0.2]} />
      </mesh>

      {/* Corner wooden pegs for aesthetic finish */}
      {[-5.1, 5.1].map((x, xi) => 
        [-8.1, 8.1].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, 0.4, z]} castShadow material={woodMaterial}>
            <cylinderGeometry args={[0.15, 0.15, 0.8, 8]} />
          </mesh>
        ))
      )}

      {/* 4. White Chalk Markings */}
      <group position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Center circle */}
        <mesh position={[0, 0, 0]} material={chalkMaterial}>
          <ringGeometry args={[1.5, 1.55, 32]} />
        </mesh>
        {/* Center spot */}
        <mesh position={[0, 0, 0]} material={chalkLineMaterial}>
          <circleGeometry args={[0.15, 16]} />
        </mesh>
        {/* Center line */}
        <mesh position={[0, 0, 0]} material={chalkLineMaterial}>
          <planeGeometry args={[10, 0.05]} />
        </mesh>
        {/* Goal line chalk border */}
        <mesh position={[0, 7.8, 0]} material={chalkLineMaterial}>
          <planeGeometry args={[10, 0.05]} />
        </mesh>
        <mesh position={[0, -7.8, 0]} material={chalkLineMaterial}>
          <planeGeometry args={[10, 0.05]} />
        </mesh>
        {/* Penalty Area outlines */}
        {/* Player Penalty Box (depth 3.0, from goal line Z=-7.8 to front Z=-4.8) */}
        <group position={[0, -6.3, 0]}>
          <mesh position={[0, 1.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[6.0, 0.05]} /></mesh>
          <mesh position={[-3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
          <mesh position={[3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
        </group>
        {/* Opponent Penalty Box (depth 3.0, from goal line Z=7.8 to front Z=4.8) */}
        <group position={[0, 6.3, 0]}>
          <mesh position={[0, -1.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[6.0, 0.05]} /></mesh>
          <mesh position={[-3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
          <mesh position={[3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
        </group>

        {/* Goal Area (Pequena Área) */}
        {/* Player Goal Area */}
        <group position={[0, -7.3, 0]}>
          <mesh position={[0, 0.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[3.0, 0.05]} /></mesh>
          <mesh position={[-1.5, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 1.0]} /></mesh>
          <mesh position={[1.5, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 1.0]} /></mesh>
        </group>
        {/* Opponent Goal Area */}
        <group position={[0, 7.3, 0]}>
          <mesh position={[0, -0.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[3.0, 0.05]} /></mesh>
          <mesh position={[-1.5, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 1.0]} /></mesh>
          <mesh position={[1.5, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 1.0]} /></mesh>
        </group>

        {/* Penalty Spots */}
        <mesh position={[0, -5.8, 0]} material={chalkLineMaterial}>
          <circleGeometry args={[0.08, 16]} />
        </mesh>
        <mesh position={[0, 5.8, 0]} material={chalkLineMaterial}>
          <circleGeometry args={[0.08, 16]} />
        </mesh>

        {/* Penalty Arcs (Meias Luas) */}
        {/* Player Penalty Arc (centered at penalty spot [0, -5.8, 0], arches outside penalty box [which ends at Y = -4.8]) */}
        <mesh position={[0, -5.8, 0]} material={penaltyBoxMaterial}>
          <ringGeometry args={[1.5, 1.55, 32, 1, Math.PI / 2 - Math.acos(1.0 / 1.5), 2 * Math.acos(1.0 / 1.5)]} />
        </mesh>
        {/* Opponent Penalty Arc (centered at penalty spot [0, 5.8, 0], arches outside penalty box [which ends at Y = 4.8]) */}
        <mesh position={[0, 5.8, 0]} material={penaltyBoxMaterial}>
          <ringGeometry args={[1.5, 1.55, 32, 1, 3 * Math.PI / 2 - Math.acos(1.0 / 1.5), 2 * Math.acos(1.0 / 1.5)]} />
        </mesh>
      </group>

      {/* 5. Placement Slots (Preparation Phase or Captain Repositioning Mode) */}
      {(phase === 'PREPARATION' || captainMoveMode !== null) && ALL_SLOTS.map((slot) => {
        // Show all field slots on the entire pitch (excluding Goalkeeper slots)
        if (slot.lineType === 'GK') return null;

        const isHovered = hoveredSlotId === slot.id;
        const isOccupied = homePlayers.some(p => p.slotId === slot.id);
        const isHomeSlot = slot.team === 'HOME';

        let ringColor = '#ffffff';
        let ringOpacity = 0.3;

        if (isHomeSlot) {
          if (isHovered) {
            ringColor = '#00d2ff'; // cyan highlight
            ringOpacity = 0.9;
          } else if (isOccupied) {
            ringColor = '#f39c12'; // orange occupied
            ringOpacity = 0.5;
          } else {
            ringColor = '#3498db'; // blue empty home slot
            ringOpacity = 0.35;
          }
        } else {
          // Opponent slot (AWAY)
          if (isHovered) {
            ringColor = '#ff3f34'; // crimson forbidden highlight
            ringOpacity = 0.6;
          } else {
            ringColor = '#e55039'; // red/orange opponent slot
            ringOpacity = 0.15;
          }
        }

        return (
          <group 
            key={slot.id} 
            position={[slot.position[0], 0.025, slot.position[2]]}
          >
            {/* Base Ring Ring */}
            <mesh 
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                if (isHomeSlot && onSlotClick) {
                  onSlotClick(slot.id);
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredSlotId(slot.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredSlotId(null);
              }}
            >
              <ringGeometry args={[0.3, 0.38, 32]} />
              <meshBasicMaterial 
                color={ringColor} 
                transparent 
                opacity={ringOpacity} 
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Inner disc indicating line type */}
            <mesh 
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                if (isHomeSlot && onSlotClick) {
                  onSlotClick(slot.id);
                }
              }}
              onPointerOver={() => setHoveredSlotId(slot.id)}
              onPointerOut={() => setHoveredSlotId(null)}
            >
              <circleGeometry args={[0.29]} />
              <meshBasicMaterial 
                color={
                  !isHomeSlot ? '#ff3f34' :
                  slot.lineType === 'DEF' ? '#3498db' : 
                  slot.lineType === 'MID' ? '#f1c40f' : '#e74c3c'
                } 
                transparent 
                opacity={isHovered ? (isHomeSlot ? 0.45 : 0.25) : 0.1} 
              />
            </mesh>

            {/* Pulsating animation overlay for hovered slot */}
            {isHovered && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.38, 0.45, 32]} />
                <meshBasicMaterial 
                  color={isHomeSlot ? '#00d2ff' : '#ff3f34'} 
                  transparent 
                  opacity={0.4 + Math.sin(Date.now() * 0.01) * 0.2} 
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default React.memo(Pitch);
