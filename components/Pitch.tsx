import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Slot, Team } from '../types';
import { ALL_SLOTS } from '../useGameState';

export interface PitchProps {
  phase: string;
  captainMoveMode?: Team | null;
  onSlotClick?: (slotId: string) => void;
  onLineClick?: (slotId: string, clickX: number) => void;
  selectedPlayerId?: string | null;
  hoveredSlotId: string | null;
  setHoveredSlotId: (id: string | null) => void;
  homePlayers: any[];
  awayPlayers?: any[];
  hoveredSegmentId?: string | null;
  setHoveredSegmentId?: (id: string | null) => void;
  hoveredX?: number | null;
  setHoveredX?: (x: number | null) => void;
}

export interface LineSegment {
  id: string;
  z: number;
  xStart: number;
  xEnd: number;
  team: Team;
  color: string;
}

// Static definition of line segments to avoid re-creations
export const LINE_SEGMENTS: LineSegment[] = [
  // HOME side Extra line (z = -6.7) - divided
  { id: 'home-extra-l1', z: -6.7, xStart: -4.5, xEnd: -3.0, team: 'AWAY', color: '#ff3f34' },
  { id: 'home-extra-l2', z: -6.7, xStart: -3.0, xEnd: -1.0, team: 'HOME', color: '#3498db' },
  { id: 'home-extra-r1', z: -6.7, xStart: 1.0, xEnd: 3.0, team: 'HOME', color: '#3498db' },
  { id: 'home-extra-r2', z: -6.7, xStart: 3.0, xEnd: 4.5, team: 'AWAY', color: '#ff3f34' },

  // HOME side Defender line (z = -5.5)
  { id: 'home-def', z: -5.5, xStart: -4.5, xEnd: 4.5, team: 'HOME', color: '#3498db' },

  // HOME side Midfielders 1 line (z = -2.36)
  { id: 'home-mid1', z: -2.36, xStart: -4.5, xEnd: 4.5, team: 'HOME', color: '#3498db' },

  // HOME side Midfielders 2 line (z = 0.79)
  { id: 'home-mid2', z: 0.79, xStart: -4.5, xEnd: 4.5, team: 'HOME', color: '#3498db' },

  // HOME side Attacker line (z = 3.93)
  { id: 'home-att', z: 3.93, xStart: -4.5, xEnd: 4.5, team: 'HOME', color: '#3498db' },

  // AWAY side Extra line (z = 6.7) - divided
  { id: 'away-extra-l1', z: 6.7, xStart: -4.5, xEnd: -3.0, team: 'HOME', color: '#3498db' },
  { id: 'away-extra-l2', z: 6.7, xStart: -3.0, xEnd: -1.0, team: 'AWAY', color: '#ff3f34' },
  { id: 'away-extra-r1', z: 6.7, xStart: 1.0, xEnd: 3.0, team: 'AWAY', color: '#ff3f34' },
  { id: 'away-extra-r2', z: 6.7, xStart: 3.0, xEnd: 4.5, team: 'HOME', color: '#3498db' },

  // AWAY side Defender line (z = 5.5)
  { id: 'away-def', z: 5.5, xStart: -4.5, xEnd: 4.5, team: 'AWAY', color: '#ff3f34' },

  // AWAY side Midfielders 1 line (z = 2.36)
  { id: 'away-mid1', z: 2.36, xStart: -4.5, xEnd: 4.5, team: 'AWAY', color: '#ff3f34' },

  // AWAY side Midfielders 2 line (z = -0.79)
  { id: 'away-mid2', z: -0.79, xStart: -4.5, xEnd: 4.5, team: 'AWAY', color: '#ff3f34' },

  // AWAY side Attacker line (z = -3.93)
  { id: 'away-att', z: -3.93, xStart: -4.5, xEnd: 4.5, team: 'AWAY', color: '#ff3f34' }
];

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
  onLineClick,
  selectedPlayerId = null,
  hoveredSlotId, 
  setHoveredSlotId,
  homePlayers,
  awayPlayers = [],
  hoveredSegmentId: propHoveredSegmentId,
  setHoveredSegmentId: propSetHoveredSegmentId,
  hoveredX: propHoveredX,
  setHoveredX: propSetHoveredX
}) => {
  const [localHoveredSegmentId, localSetHoveredSegmentId] = React.useState<string | null>(null);
  const [localHoveredX, localSetHoveredX] = React.useState<number | null>(null);

  const hoveredSegmentId = propHoveredSegmentId !== undefined ? propHoveredSegmentId : localHoveredSegmentId;
  const setHoveredSegmentId = propSetHoveredSegmentId !== undefined ? propSetHoveredSegmentId : localSetHoveredSegmentId;
  const hoveredX = propHoveredX !== undefined ? propHoveredX : localHoveredX;
  const setHoveredX = propSetHoveredX !== undefined ? propSetHoveredX : localSetHoveredX;

  // Keep references for reactive useFrame updates
  const hoveredSegmentIdRef = React.useRef<string | null>(null);
  hoveredSegmentIdRef.current = hoveredSegmentId;

  const segmentRefs = React.useRef<{[key: string]: THREE.Mesh}>({});

  // 1. Procedural texture with complete solid band and soft external glow extending after the ends (Blue)
  const homeTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Set canvas shadow to project a gorgeous soft light glow beyond the borders of the band
      ctx.shadowColor = '#3498db';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(16, 12, 480, 40, 16); // centered solid rounded rect
      } else {
        ctx.rect(16, 12, 480, 40);
      }
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  // 2. Procedural texture with complete solid band and soft external glow extending after the ends (Red)
  const awayTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Set canvas shadow for red soft-light external glow radiating after the ends
      ctx.shadowColor = '#ff3f34';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff3f34';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(16, 12, 480, 40, 16); // centered solid rounded rect
      } else {
        ctx.rect(16, 12, 480, 40);
      }
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  const activeTeam = captainMoveMode !== null 
    ? captainMoveMode 
    : (selectedPlayerId?.startsWith('home') ? 'HOME' : (selectedPlayerId?.startsWith('away') ? 'AWAY' : null));

  const activeTeamRef = React.useRef<Team | null>(null);
  activeTeamRef.current = activeTeam;

  // Perform continuous 60fps pulsating opacity changes directly on materials to prevent re-renders
  useFrame((state) => {
    const isPrep = phase === 'PREPARATION' || captainMoveMode !== null;
    if (!isPrep) return;

    const t = state.clock.getElapsedTime();
    // Smooth cosine breathing wave between 0.78 and 1.12
    const pulseFactor = 0.95 + Math.cos(t * 4.5) * 0.17; 

    LINE_SEGMENTS.forEach((segment) => {
      const mesh = segmentRefs.current[segment.id];
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) {
          const isHovered = hoveredSegmentIdRef.current === segment.id;
          const isValid = activeTeamRef.current !== null && segment.team === activeTeamRef.current;
          const baseOpacity = isHovered ? 0.75 : (isValid ? 0.42 : 0.08);
          mat.opacity = baseOpacity * (isValid || isHovered ? pulseFactor : 1.0);
        }
      }
    });
  });

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

      {/* Back Wall - Player side (Z = -8), leaving a gap for the goal */}
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
        <group position={[0, -6.3, 0]}>
          <mesh position={[0, 1.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[6.0, 0.05]} /></mesh>
          <mesh position={[-3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
          <mesh position={[3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
        </group>
        <group position={[0, 6.3, 0]}>
          <mesh position={[0, -1.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[6.0, 0.05]} /></mesh>
          <mesh position={[-3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
          <mesh position={[3.0, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 3.0]} /></mesh>
        </group>

        {/* Goal Area (Pequena Área) */}
        <group position={[0, -7.3, 0]}>
          <mesh position={[0, 0.5, 0]} material={penaltyBoxMaterial}><planeGeometry args={[3.0, 0.05]} /></mesh>
          <mesh position={[-1.5, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 1.0]} /></mesh>
          <mesh position={[1.5, 0, 0]} material={penaltyBoxMaterial}><planeGeometry args={[0.05, 1.0]} /></mesh>
        </group>
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

        {/* Penalty Arcs */}
        <mesh position={[0, -5.8, 0]} material={penaltyBoxMaterial}>
          <ringGeometry args={[1.5, 1.55, 32, 1, Math.PI / 2 - Math.acos(1.0 / 1.5), 2 * Math.acos(1.0 / 1.5)]} />
        </mesh>
        <mesh position={[0, 5.8, 0]} material={penaltyBoxMaterial}>
          <ringGeometry args={[1.5, 1.55, 32, 1, 3 * Math.PI / 2 - Math.acos(1.0 / 1.5), 2 * Math.acos(1.0 / 1.5)]} />
        </mesh>
      </group>

      {/* 5. Placement Bands (Preparation Phase or Captain Repositioning Mode) */}
      {(phase === 'PREPARATION' || captainMoveMode !== null) && (
        <group>
          {LINE_SEGMENTS.map((segment) => {
            const isHovered = hoveredSegmentId === segment.id;
            const isValid = activeTeam !== null && segment.team === activeTeam;

            const length = segment.xEnd - segment.xStart;
            const centerX = (segment.xStart + segment.xEnd) / 2;

            const activeTeamPlayers = segment.team === 'HOME' ? homePlayers : (awayPlayers || []);
            const otherPlayersOnLine = activeTeamPlayers.filter((p: any) => 
              p.id !== selectedPlayerId && 
              p.number !== 1 && // exclude GK
              Math.abs(p.position[2] - segment.z) < 0.1
            );

            const getPositionState = (x: number) => {
              const basePX = Math.max(segment.xStart + 0.35, Math.min(segment.xEnd - 0.35, x));
              const swapTarget = otherPlayersOnLine.find((p: any) => Math.abs(basePX - p.position[0]) < 0.35);
              if (swapTarget) {
                return {
                  previewX: swapTarget.position[0],
                  isSwap: true,
                  isBlocked: false,
                  swapPlayerId: swapTarget.id
                };
              }
              const overlaps = otherPlayersOnLine.some((p: any) => Math.abs(basePX - p.position[0]) < 0.7);
              if (overlaps) {
                return {
                  previewX: basePX,
                  isSwap: false,
                  isBlocked: true,
                  swapPlayerId: null
                };
              }
              return {
                previewX: basePX,
                isSwap: false,
                isBlocked: false,
                swapPlayerId: null
              };
            };

            return (
              <group key={segment.id}>
                {/* Wide visible positioning band flat on the ground with rounded corners and feathered soft-light edges */}
                <mesh 
                  ref={el => { if (el) segmentRefs.current[segment.id] = el; }}
                  position={[centerX, 0.02, segment.z]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  renderOrder={2}
                >
                  <planeGeometry args={[length, 0.8]} />
                  <meshBasicMaterial 
                    map={segment.color === '#3498db' ? homeTexture : awayTexture}
                    transparent
                    opacity={isHovered ? 0.75 : (isValid ? 0.42 : 0.08)}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>

                {/* Wide invisible interaction plane (perfect hit-testing / high tolerance clicking) */}
                <mesh 
                  position={[centerX, 0.025, segment.z]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  onPointerOver={(e) => {
                    if ((e.nativeEvent as any).pointerType === 'mouse' && (e.buttons & 2)) return;
                    if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
                    if (!isValid) return;
                    e.stopPropagation();
                    setHoveredSegmentId(segment.id);
                    setHoveredX(e.point.x);
                  }}
                  onPointerMove={(e) => {
                    if ((e.nativeEvent as any).pointerType === 'mouse' && (e.buttons & 2)) return;
                    if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
                    if (!isValid) return;
                    e.stopPropagation();
                    setHoveredX(e.point.x);
                  }}
                  onPointerOut={(e) => {
                    if ((e.nativeEvent as any).pointerType === 'mouse' && (e.buttons & 2)) return;
                    if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
                    e.stopPropagation();
                    setHoveredSegmentId(null);
                    setHoveredX(null);
                  }}
                  onClick={isValid ? (e) => {
                    if ((e.nativeEvent as any).pointerType === 'mouse' && e.button !== 0) return;
                    if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
                    e.stopPropagation();
                    const state = getPositionState(e.point.x);
                    if (state.isBlocked) return; // Block click if space is tight!

                    const clampedX = state.previewX;
                    const sameLineSlots = ALL_SLOTS.filter(s => 
                      s.team === segment.team && 
                      Math.abs(s.position[2] - segment.z) < 0.05
                    );
                    let nearestSlot = sameLineSlots[0];
                    let minDistance = Infinity;
                    sameLineSlots.forEach(s => {
                      const dist = Math.abs(s.position[0] - clampedX);
                      if (dist < minDistance) {
                        minDistance = dist;
                        nearestSlot = s;
                      }
                    });

                    if (nearestSlot) {
                      if (onLineClick) {
                        onLineClick(nearestSlot.id, clampedX);
                      } else if (onSlotClick) {
                        onSlotClick(nearestSlot.id);
                      }
                    }
                  } : undefined}
                >
                  <planeGeometry args={[length, 1.2]} />
                  <meshBasicMaterial 
                    transparent
                    opacity={0}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                {/* Improved, high-end white & team-colored positioning preview circle */}
                {isHovered && hoveredX !== null && selectedPlayerId && (() => {
                  const state = getPositionState(hoveredX);

                  if (state.isBlocked) {
                    return (
                      <group position={[state.previewX, 0.235, segment.z]}>
                        {/* Red warning ring */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                          <ringGeometry args={[0.3, 0.38, 32]} />
                          <meshBasicMaterial 
                            color="#ff3f34" 
                            transparent 
                            opacity={0.95}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            depthTest={false}
                          />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                          <circleGeometry args={[0.29]} />
                          <meshBasicMaterial 
                            color="#ff3f34" 
                            transparent 
                            opacity={0.25}
                            depthWrite={false}
                            depthTest={false}
                          />
                        </mesh>
                        {/* Red crossed planes forming a beautiful flat "X" inside the circle */}
                        <group position={[0, 0.005, 0]}>
                          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} renderOrder={101} raycast={() => null}>
                            <planeGeometry args={[0.26, 0.05]} />
                            <meshBasicMaterial color="#ff3f34" side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
                          </mesh>
                          <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]} renderOrder={101} raycast={() => null}>
                            <planeGeometry args={[0.26, 0.05]} />
                            <meshBasicMaterial color="#ff3f34" side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
                          </mesh>
                        </group>
                      </group>
                    );
                  }

                  if (state.isSwap) {
                    return (
                      <group position={[state.previewX, 0.235, segment.z]}>
                        {/* Enlarged green ring indicating swap target */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                          <ringGeometry args={[0.36, 0.44, 32]} />
                          <meshBasicMaterial 
                            color="#00e676" 
                            transparent 
                            opacity={0.95}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            depthTest={false}
                          />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                          <circleGeometry args={[0.35]} />
                          <meshBasicMaterial 
                            color="#00e676" 
                            transparent 
                            opacity={0.2}
                            depthWrite={false}
                            depthTest={false}
                          />
                        </mesh>
                      </group>
                    );
                  }

                  return (
                    <group position={[state.previewX, 0.235, segment.z]}>
                      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                        <ringGeometry args={[0.3, 0.38, 32]} />
                        <meshBasicMaterial 
                          color="#ffffff" 
                          transparent 
                          opacity={0.95}
                          side={THREE.DoubleSide}
                          depthWrite={false}
                          depthTest={false}
                        />
                      </mesh>
                      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                        <circleGeometry args={[0.29]} />
                        <meshBasicMaterial 
                          color={segment.color} 
                          transparent 
                          opacity={0.4}
                          depthWrite={false}
                          depthTest={false}
                        />
                      </mesh>
                      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100} raycast={() => null}>
                        <ringGeometry args={[0.38, 0.45, 32]} />
                        <meshBasicMaterial 
                          color="#ffffff" 
                          transparent 
                          opacity={0.4 + Math.sin(Date.now() * 0.015) * 0.25} 
                          depthWrite={false}
                          depthTest={false}
                        />
                      </mesh>
                    </group>
                  );
                })()}
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

export default React.memo(Pitch);
