import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MovementState, ActionType, Team, UniformConfig } from '../types';
import { useGameStateContext } from '../GameStateContext';
import { usePlayerMaterials } from './player/SoccerPlayerUniformShader';
import { SoccerPlayerGeometry } from './player/SoccerPlayerGeometry';

interface SoccerPlayerProps {
  currentMovement: MovementState;
  role?: 'player' | 'goalkeeper';
  skinColor?: string;
  hairColor?: string;
  team: Team;
  angle?: number;
  actionType?: ActionType;
  isBlocking?: boolean;
  isSelected?: boolean;
  isCaptain?: boolean;
  number?: number;
  onPointerDown?: (e: any) => void;
  onClick?: (e: any) => void;
  uniformConfig?: UniformConfig;
  showCaptainGlow?: boolean;
  showSwapIndicator?: boolean;
  isGhost?: boolean;
  swapIndicatorColor?: string;
  raycast?: any;
}

const SoccerPlayer: React.FC<SoccerPlayerProps> = ({ 
  currentMovement, 
  role = 'player', 
  skinColor = '#dcb898',
  hairColor,
  team,
  angle = 0,
  actionType = 'PASS',
  isBlocking = false,
  isSelected = false,
  isCaptain = false,
  onPointerDown,
  onClick,
  uniformConfig,
  showCaptainGlow = false,
  showSwapIndicator = false,
  isGhost = false,
  swapIndicatorColor,
  raycast
}) => {
  const { gameMode } = useGameStateContext();
  
  const group = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  
  const captainGlowRef = useRef<THREE.Group>(null);
  const captainBeamRef = useRef<THREE.Mesh>(null);
  const captainDiamondRef = useRef<THREE.Mesh>(null);
  
  const swapIndicatorRef = useRef<THREE.Group>(null);
  
  // Limbs
  const leftUpperArm = useRef<THREE.Group>(null);
  const leftLowerArm = useRef<THREE.Group>(null);
  const rightUpperArm = useRef<THREE.Group>(null);
  const rightLowerArm = useRef<THREE.Group>(null);
  
  const leftUpperLeg = useRef<THREE.Group>(null);
  const leftLowerLeg = useRef<THREE.Group>(null);
  const rightUpperLeg = useRef<THREE.Group>(null);
  const rightLowerLeg = useRef<THREE.Group>(null);

  const isKeeper = role === 'goalkeeper';
  const scaleValue = (isKeeper && gameMode === 'manual') ? 1.35 : 1.0;

  // Load materials from shader/helper hook
  const mats = usePlayerMaterials({
    uniformConfig,
    team,
    isKeeper,
    skinColor,
    hairColor,
    actionType,
    isGhost
  });

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!group.current) return;

    group.current.position.set(0, 0, 0);
    group.current.rotation.set(0, 0, 0);
    
    if (torso.current) {
      torso.current.rotation.set(0, 0, 0);
      torso.current.position.set(0, 0.98, 0);
      torso.current.scale.set(1, 1, 1);
    }
    
    if (headGroup.current) headGroup.current.rotation.set(0, 0, 0);
    [leftUpperArm, rightUpperArm, leftLowerArm, rightLowerArm, leftUpperLeg, rightUpperLeg, leftLowerLeg, rightLowerLeg].forEach(r => r.current?.rotation.set(0,0,0));

    if (leftUpperArm.current) leftUpperArm.current.rotation.z = -0.15; 
    if (rightUpperArm.current) rightUpperArm.current.rotation.z = 0.15;

    if (isKeeper && currentMovement === MovementState.STANDING) {
      const bounce = Math.sin(t * 3) * 0.015;
      group.current.position.y = -0.05 + bounce;
      if (torso.current) torso.current.rotation.x = 0.25; 
      if (leftUpperLeg.current) { leftUpperLeg.current.rotation.x = 0.3; leftUpperLeg.current.rotation.z = -0.1; leftLowerLeg.current!.rotation.x = 0.5; }
      if (rightUpperLeg.current) { rightUpperLeg.current.rotation.x = 0.3; rightUpperLeg.current.rotation.z = 0.1; rightLowerLeg.current!.rotation.x = 0.5; }
      if (leftUpperArm.current) { leftUpperArm.current.rotation.z = -0.5; leftUpperArm.current.rotation.x = -0.3; leftLowerArm.current!.rotation.x = -1.0; }
      if (rightUpperArm.current) { rightUpperArm.current.rotation.z = 0.5; rightUpperArm.current.rotation.x = -0.3; rightLowerArm.current!.rotation.x = -1.0; }
      if (headGroup.current) {
        headGroup.current.rotation.y = Math.sin(t * 1.5) * 0.15;
      }
      return;
    }

    switch (currentMovement) {
      case MovementState.STANDING: {
        const breathing = Math.sin(t * 1.2) * 0.01;
        if (torso.current) torso.current.position.y += breathing;
        if (headGroup.current) {
          headGroup.current.rotation.y = Math.sin(t * 0.4) * 0.08;
          headGroup.current.rotation.x = Math.sin(t) * 0.01;
        }
        if (rightUpperLeg.current) { rightUpperLeg.current.rotation.x = 0.1; rightUpperLeg.current.rotation.z = 0.05; }
        if (rightLowerLeg.current) rightLowerLeg.current.rotation.x = 0.2;
        break;
      }

      case MovementState.WALKING: {
        const speed = 4;
        const swing = 0.3;
        group.current.position.y = Math.abs(Math.sin(t * speed)) * 0.03;
        if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = Math.sin(t * speed) * swing;
        if (leftLowerLeg.current) leftLowerLeg.current.rotation.x = Math.max(0, -Math.sin(t * speed) * swing * 1.2);
        if (rightUpperLeg.current) rightUpperLeg.current.rotation.x = -Math.sin(t * speed) * swing;
        if (rightLowerLeg.current) rightLowerLeg.current.rotation.x = Math.max(0, Math.sin(t * speed) * swing * 1.2);
        break;
      }

      case MovementState.RUNNING: {
        const speed = 10;
        const swing = 0.8; 
        group.current.position.y = Math.abs(Math.sin(t * speed)) * 0.1;
        if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = Math.sin(t * speed) * swing;
        if (leftLowerLeg.current) leftLowerLeg.current.rotation.x = Math.max(0.2, -Math.sin(t * speed) * 1.5);
        break;
      }
    }

    // Animate captain glow elements if active
    if (showCaptainGlow) {
      if (captainGlowRef.current) {
        const pulse = Math.sin(t * 5) * 0.08 + 1.08;
        captainGlowRef.current.scale.set(pulse, 1, pulse);
        captainGlowRef.current.rotation.y = t * 1.2;
      }
      if (captainBeamRef.current) {
        const pulseBeam = Math.sin(t * 8) * 0.05 + 0.95;
        captainBeamRef.current.scale.set(pulseBeam, 1, pulseBeam);
        const beamMat = captainBeamRef.current.material as THREE.MeshBasicMaterial;
        if (beamMat) {
          beamMat.opacity = 0.25 + Math.sin(t * 6) * 0.1;
        }
      }
      if (captainDiamondRef.current) {
        captainDiamondRef.current.rotation.y = t * 2.5;
        captainDiamondRef.current.position.y = 1.85 + Math.sin(t * 4) * 0.08;
      }
    }

    if (showSwapIndicator && swapIndicatorRef.current) {
      const swapY = isCaptain ? 2.15 : 1.85;
      swapIndicatorRef.current.rotation.y = t * 3.0;
      swapIndicatorRef.current.position.y = swapY + Math.sin(t * 5) * 0.05;
    }
  });

  return (
    <group ref={group} onPointerDown={onPointerDown} onClick={onClick} scale={[scaleValue, scaleValue, scaleValue]} raycast={raycast}>
      {/* 1. SELECTION GLOW RING */}
      {isSelected && (
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
          <ringGeometry args={[0.42, 0.48, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8 + Math.sin(Date.now() * 0.01) * 0.2} depthWrite={false} />
        </mesh>
      )}

      {/* 2. DIRECTIONAL ARROW / ACTION VISUAL RING */}
      {(role === 'player' || gameMode === 'manual') && !isKeeper && team === 'HOME' && (
        <>
          {/* Action Visual Ring */}
          <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
            <ringGeometry args={[0.38, 0.44, 32]} />
            <primitive object={mats.arrowMat} attach="material" />
          </mesh>

          {/* Blocker Visual Shield Ring */}
          {isBlocking && (
            <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
              <ringGeometry args={[0.44, 0.52, 64]} />
              <primitive object={mats.tackleGuardMat} attach="material" />
            </mesh>
          )}

          {/* Directional arrow */}
          {actionType !== 'TACKLE' && (
            <group position={[0, 0.05, 0]} rotation={[0, angle, 0]}>
              <mesh position={[0, 0.04, 0.5]} rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
                <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
                <primitive object={mats.arrowMat} attach="material" />
              </mesh>
              <mesh position={[0, 0.04, 0.85]} rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
                <coneGeometry args={[0.12, 0.25, 6]} />
                <primitive object={mats.arrowMat} attach="material" />
              </mesh>
            </group>
          )}
        </>
      )}

      {/* 3. CAPTAIN GOLD RING */}
      {isCaptain && (
        <>
          <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
            <ringGeometry args={[0.36, 0.4, 32]} />
            <meshStandardMaterial color="#f1c40f" roughness={0.1} metalness={1.0} />
          </mesh>

          {showCaptainGlow && (
            <>
              {/* Dynamic glowing floor aura and grids */}
              <group ref={captainGlowRef}>
                <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
                  <ringGeometry args={[0.42, 0.55, 32]} />
                  <meshBasicMaterial color="#f1c40f" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
                  <ringGeometry args={[0.58, 0.62, 32]} />
                  <meshBasicMaterial color="#f39c12" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                {/* Rotating octagonal grid */}
                <mesh position={[0, 0.037, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
                  <ringGeometry args={[0.66, 0.68, 8]} />
                  <meshBasicMaterial color="#f1c40f" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              </group>

              {/* Holographic light cylinder spotlight */}
              <mesh ref={captainBeamRef} position={[0, 0.6, 0]} castShadow={false} receiveShadow={false}>
                <cylinderGeometry args={[0.38, 0.52, 1.2, 16, 1, true]} />
                <meshBasicMaterial 
                  color="#f1c40f" 
                  transparent 
                  opacity={0.25} 
                  side={THREE.DoubleSide} 
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>

              {/* Floating, rotating premium diamond indicator over head */}
              <mesh ref={captainDiamondRef} position={[0, 1.85, 0]}>
                <octahedronGeometry args={[0.09, 0]} />
                <meshStandardMaterial 
                  color="#f1c40f" 
                  emissive="#f1c40f" 
                  emissiveIntensity={2.0} 
                  roughness={0.1} 
                  metalness={1.0} 
                />
              </mesh>
              {/* Halos above head */}
              <mesh position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.15, 0.18, 16]} />
                <meshBasicMaterial color="#f1c40f" transparent opacity={0.6} />
              </mesh>
            </>
          )}
        </>
      )}

      {/* 4. BUTTON WOODEN BASE */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow renderOrder={10}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 64]} />
        <primitive object={mats.baseWoodMat} attach="material" />
      </mesh>

      {/* 5. TACKLE BASE SHIELD GUARD */}
      {isBlocking && (
        <mesh position={[0, 0.07, 0]} renderOrder={10}>
          <cylinderGeometry args={[0.44, 0.44, 0.04, 64, 1, true]} />
          <primitive object={mats.tackleGuardMat} attach="material" />
        </mesh>
      )}

      {/* 6. PROCEDURAL 3D ANATOMY */}
      <SoccerPlayerGeometry
        torsoRef={torso}
        headGroupRef={headGroup}
        leftUpperArmRef={leftUpperArm}
        leftLowerArmRef={leftLowerArm}
        rightUpperArmRef={rightUpperArm}
        rightLowerArmRef={rightLowerArm}
        leftUpperLegRef={leftUpperLeg}
        leftLowerLegRef={leftLowerLeg}
        rightUpperLegRef={rightUpperLeg}
        rightLowerLegRef={rightLowerLeg}
        skinMat={mats.skinMat}
        hairMat={mats.hairMat}
        shirtMat={mats.shirtMat}
        shirtLightMat={mats.shirtLightMat}
        shortsMat={mats.shortsMat}
        shortsDetailMat={mats.shortsDetailMat}
        socksMat={mats.socksMat}
        socksBandMat={mats.socksBandMat}
        bootsMat={mats.bootsMat}
        gloveMat={mats.gloveMat}
        isKeeper={isKeeper}
        angle={angle}
      />

      {/* 7. FLOATING SWAP INDICATOR */}
      {showSwapIndicator && (
        <group ref={swapIndicatorRef} position={[0, isCaptain ? 2.15 : 1.85, 0]}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            {/* Glowing neon ring segment 1 (Curved Arrow 1 Body) */}
            <mesh renderOrder={15}>
              <ringGeometry args={[0.13, 0.16, 32, 1, 0, Math.PI * 0.7]} />
              <meshBasicMaterial color={swapIndicatorColor || "#00e676"} transparent opacity={0.85} depthWrite={false} />
            </mesh>
            {/* Arrowhead 1 (Cone at the end of Segment 1) */}
            <mesh 
              position={[0.145 * Math.cos(Math.PI * 0.7), 0.145 * Math.sin(Math.PI * 0.7), 0]} 
              rotation={[0, 0, Math.PI * 0.7]} 
              renderOrder={15}
            >
              <coneGeometry args={[0.026, 0.07, 4]} />
              <meshBasicMaterial color={swapIndicatorColor || "#00e676"} depthWrite={false} />
            </mesh>

            {/* Glowing neon ring segment 2 (Curved Arrow 2 Body) */}
            <mesh renderOrder={15}>
              <ringGeometry args={[0.13, 0.16, 32, 1, Math.PI, Math.PI * 0.7]} />
              <meshBasicMaterial color={swapIndicatorColor || "#00e676"} transparent opacity={0.85} depthWrite={false} />
            </mesh>
            {/* Arrowhead 2 (Cone at the end of Segment 2) */}
            <mesh 
              position={[0.145 * Math.cos(Math.PI * 1.7), 0.145 * Math.sin(Math.PI * 1.7), 0]} 
              rotation={[0, 0, Math.PI * 1.7]} 
              renderOrder={15}
            >
              <coneGeometry args={[0.026, 0.07, 4]} />
              <meshBasicMaterial color={swapIndicatorColor || "#00e676"} depthWrite={false} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

export default SoccerPlayer;
