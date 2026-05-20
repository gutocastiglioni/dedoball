import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MovementState, ActionType, Team, UniformConfig } from '../types';

interface SoccerPlayerProps {
  currentMovement: MovementState;
  role?: 'player' | 'goalkeeper';
  skinColor?: string;
  hairColor?: string;
  team: Team;
  angle?: number;
  actionType?: ActionType;
  isSelected?: boolean;
  isCaptain?: boolean;
  number?: number;
  onPointerDown?: (e: any) => void;
  onClick?: (e: any) => void;
  uniformConfig?: UniformConfig;
}

const SoccerPlayer: React.FC<SoccerPlayerProps> = ({ 
  currentMovement, 
  role = 'player', 
  skinColor = '#dcb898',
  hairColor,
  team,
  angle = 0,
  actionType = 'PASS',
  isSelected = false,
  isCaptain = false,
  number = 10,
  onPointerDown,
  onClick,
  uniformConfig
}) => {
  const group = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  
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

  // --- RETRO REALISTIC MATERIALS ---
  const matConfig = { flatShading: true, roughness: 0.5 };
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: skinColor, ...matConfig }), [skinColor]);
  
  const hairCol = hairColor || (team === 'HOME' ? '#2c3e50' : '#d35400');
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: hairCol, ...matConfig }), [hairCol]);

  // Active Kit configuration
  const activeKit = useMemo(() => {
    if (uniformConfig) return uniformConfig;
    
    // Default fallback kits
    return {
      primaryColor: team === 'HOME' ? (isKeeper ? '#16a085' : '#1e3799') : (isKeeper ? '#27ae60' : '#e55039'),
      secondaryColor: team === 'HOME' ? (isKeeper ? '#1abc9c' : '#4a69bd') : (isKeeper ? '#2ecc71' : '#f6b93b'),
      pattern: 'solid' as const,
      shortsColor: team === 'HOME' ? '#ffffff' : '#1e272e',
      socksColor: team === 'HOME' ? '#1e3799' : '#e55039'
    };
  }, [uniformConfig, team, isKeeper]);

  // Dynamic canvas texture for patterns
  const kitTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base background
    ctx.fillStyle = activeKit.primaryColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = activeKit.secondaryColor;
    
    const pattern = activeKit.pattern;
    if (pattern === 'vertical') {
      // 2 stripes alternating
      const numStripes = 8;
      const stripeWidth = 256 / numStripes;
      for (let i = 0; i < numStripes; i++) {
        if (i % 2 === 1) ctx.fillRect(i * stripeWidth, 0, stripeWidth, 256);
      }
    } else if (pattern === 'three-stripes-v') {
      // 3 evenly spaced vertical stripes
      const w = 34;
      ctx.fillRect(32,  0, w, 256);
      ctx.fillRect(111, 0, w, 256);
      ctx.fillRect(190, 0, w, 256);
    } else if (pattern === 'horizontal') {
      const numStripes = 8;
      const stripeHeight = 256 / numStripes;
      for (let i = 0; i < numStripes; i++) {
        if (i % 2 === 1) ctx.fillRect(0, i * stripeHeight, 256, stripeHeight);
      }
    } else if (pattern === 'three-stripes-h') {
      // 3 evenly spaced horizontal stripes
      const h = 34;
      ctx.fillRect(0, 32,  256, h);
      ctx.fillRect(0, 111, 256, h);
      ctx.fillRect(0, 190, 256, h);
    } else if (pattern === 'center-band') {
      ctx.fillRect(96, 0, 64, 256);
      ctx.fillRect(0, 0, 32, 256);
      ctx.fillRect(224, 0, 32, 256);
    } else if (pattern === 'side-stripes') {
      ctx.fillRect(48, 0, 32, 256);
      ctx.fillRect(176, 0, 32, 256);
    } else if (pattern === 'x') {
      ctx.lineWidth = 20;
      ctx.strokeStyle = activeKit.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(64, 0); ctx.lineTo(192, 256);
      ctx.moveTo(192, 0); ctx.lineTo(64, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(64, 128);
      ctx.moveTo(256, 0); ctx.lineTo(192, 128);
      ctx.moveTo(64, 128); ctx.lineTo(0, 256);
      ctx.moveTo(192, 128); ctx.lineTo(256, 256);
      ctx.stroke();
    } else if (pattern === 'sash') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(256, 0); ctx.lineTo(96, 0);
      ctx.lineTo(0, 256);  ctx.lineTo(160, 256);
      ctx.closePath();
      ctx.fillStyle = activeKit.secondaryColor;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    } else if (pattern === 'cross') {
      // Vertical + Horizontal band forming a + shape
      ctx.fillStyle = activeKit.secondaryColor;
      // Vertical band (center column)
      ctx.fillRect(96, 0, 64, 256);
      // Horizontal band (chest area, upper quarter)
      ctx.fillRect(0, 48, 256, 60);
    } else if (pattern === 'sash-cross') {
      // Draw sash
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(256, 0); ctx.lineTo(96, 0);
      ctx.lineTo(0, 256);  ctx.lineTo(160, 256);
      ctx.closePath();
      ctx.fillStyle = activeKit.secondaryColor;
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.restore();

      // Draw red Maltese-style cross on the chest
      ctx.save();
      ctx.fillStyle = '#ff3f34'; // Classic Vasco Red Cross
      const cx = 110;
      const cy = 80;
      const r = 18;
      
      ctx.beginPath();
      // Left arm
      ctx.moveTo(cx - 3, cy - 3);
      ctx.quadraticCurveTo(cx - 10, cy - 8, cx - r, cy - r + 5);
      ctx.lineTo(cx - r, cy + r - 5);
      ctx.quadraticCurveTo(cx - 10, cy + 8, cx - 3, cy + 3);
      
      // Bottom arm
      ctx.lineTo(cx - 3, cy + 3);
      ctx.quadraticCurveTo(cx - 8, cy + 10, cx - r + 5, cy + r);
      ctx.lineTo(cx + r - 5, cy + r);
      ctx.quadraticCurveTo(cx + 8, cy + 10, cx + 3, cy + 3);
      
      // Right arm
      ctx.lineTo(cx + 3, cy + 3);
      ctx.quadraticCurveTo(cx + 10, cy + 8, cx + r, cy + r - 5);
      ctx.lineTo(cx + r, cy - r + 5);
      ctx.quadraticCurveTo(cx + 10, cy - 8, cx + 3, cy - 3);
      
      // Top arm
      ctx.lineTo(cx + 3, cy - 3);
      ctx.quadraticCurveTo(cx + 8, cy - 10, cx + r - 5, cy - r);
      ctx.lineTo(cx - r + 5, cy - r);
      ctx.quadraticCurveTo(cx - 8, cy - 10, cx - 3, cy - 3);
      
      ctx.fill();
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, [activeKit.primaryColor, activeKit.secondaryColor, activeKit.pattern]);

  // Canvas texture for SHORTS
  const shortsTexture = useMemo(() => {
    const c1 = activeKit.shortsColor;
    const c2 = activeKit.shortsSecondaryColor || c1;
    const pat = activeKit.shortsPattern || 'solid';
    if (pat === 'solid' || c1 === c2) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = c2;
    if (pat === 'side-stripes') {
      ctx.fillRect(8,  0, 22, 128);
      ctx.fillRect(98, 0, 22, 128);
    } else if (pat === 'three-stripes') {
      // 3 thin stripes on the left side
      ctx.fillRect(8,  0, 5, 128);
      ctx.fillRect(16, 0, 5, 128);
      ctx.fillRect(24, 0, 5, 128);
      // 3 thin stripes on the right side
      ctx.fillRect(98, 0, 5, 128);
      ctx.fillRect(106, 0, 5, 128);
      ctx.fillRect(114, 0, 5, 128);
    } else if (pat === 'two-tone') {
      ctx.fillRect(64, 0, 64, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, [activeKit.shortsColor, activeKit.shortsSecondaryColor, activeKit.shortsPattern]);

  // Canvas texture for SOCKS
  const socksTexture = useMemo(() => {
    const c1 = activeKit.socksColor;
    const c2 = activeKit.socksSecondaryColor || c1;
    const pat = activeKit.socksPattern || 'solid';
    if (pat === 'solid' || c1 === c2) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, 64, 128);
    ctx.fillStyle = c2;
    if (pat === 'hoops') {
      // 3 horizontal bands
      ctx.fillRect(0, 8,  64, 14);
      ctx.fillRect(0, 44, 64, 14);
      ctx.fillRect(0, 80, 64, 14);
    } else if (pat === 'three-stripes') {
      // 3 clean horizontal stripes near the top of the sock
      ctx.fillRect(0, 6,  64, 6);
      ctx.fillRect(0, 18, 64, 6);
      ctx.fillRect(0, 30, 64, 6);
    } else if (pat === 'two-tone') {
      ctx.fillRect(0, 64, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, [activeKit.socksColor, activeKit.socksSecondaryColor, activeKit.socksPattern]);

  // MeshStandardMaterial definitions using CanvasTexture
  const shirtMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({ 
      map: kitTexture || undefined, 
      color: kitTexture ? '#ffffff' : activeKit.primaryColor,
      roughness: 0.5, 
      flatShading: true 
    });
  }, [kitTexture, activeKit.primaryColor]);

  const shirtLightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: activeKit.secondaryColor, ...matConfig }), [activeKit.secondaryColor]);
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: shortsTexture || undefined,
    color: shortsTexture ? '#ffffff' : activeKit.shortsColor,
    roughness: 0.5, flatShading: true
  }), [shortsTexture, activeKit.shortsColor]);
  const shortsDetailMat = useMemo(() => new THREE.MeshStandardMaterial({ color: activeKit.shortsSecondaryColor || activeKit.shortsColor, ...matConfig }), [activeKit.shortsSecondaryColor, activeKit.shortsColor]);
  const socksMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: socksTexture || undefined,
    color: socksTexture ? '#ffffff' : activeKit.socksColor,
    roughness: 0.5, flatShading: true
  }), [socksTexture, activeKit.socksColor]);
  const socksBandMat = useMemo(() => new THREE.MeshStandardMaterial({ color: activeKit.socksSecondaryColor || activeKit.secondaryColor, ...matConfig }), [activeKit.socksSecondaryColor, activeKit.secondaryColor]); 
  const bootsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e272e', ...matConfig }), []);
  const gloveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f6fa', ...matConfig }), []);

  // Wooden Button Base Material (Peg base)
  const baseWoodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: team === 'HOME' ? '#2980b9' : '#d35400',
    roughness: 0.15,
    metalness: 0.1,
    flatShading: true
  }), [team]);

  // Arrow Material (Red/Crimson for Shoot, Yellow for Cross, Blue/Cyan for Pass)
  const arrowMat = useMemo(() => {
    let color = '#ffcd38'; // Default: Amarelo para Cruzar (CROSS)
    let emissive = '#5c4308'; // Deep Gold/Amber glow
    
    if (actionType === 'SHOOT') {
      color = '#ff3f34'; // Vermelho para Chutar
      emissive = '#800000';
    } else if (actionType === 'PASS') {
      color = '#00d2ff'; // Azul Ciano para Passar (PASS)
      emissive = '#004080';
    }
    
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.8,
      emissive,
      emissiveIntensity: 0.5
    });
  }, [actionType]);

  // Tackle Guard Base Material (Steel/Silver for Desarme)
  const tackleGuardMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#bdc3c7',
    roughness: 0.1,
    metalness: 1.0
  }), []);

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
  });

  const LimbSegment = ({ 
    widthTop, widthBottom, length, color, position, rotation, segments = 4 
  }: any) => (
    <mesh position={position} rotation={rotation} material={color}>
      <cylinderGeometry args={[widthTop, widthBottom, length, segments]} />
    </mesh>
  );

  const Joint = ({ size, color, position }: any) => (
    <mesh position={position} material={color}>
       <sphereGeometry args={[size, 6, 6]} />
    </mesh>
  );

  return (
    <group ref={group} onPointerDown={onPointerDown} onClick={onClick}>
      {/* 1. SELECTION GLOW RING */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.48, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8 + Math.sin(Date.now() * 0.01) * 0.2} />
        </mesh>
      )}

      {/* 2. DIRECTIONAL ARROW / ACTION VISUAL RING */}
      {/* Arrows and rings are ONLY visible for player team (HOME) and hidden for opponent (AWAY) to maintain taptic secrecy */}
      {role === 'player' && team === 'HOME' && (
        <>
          {/* Action Visual Ring */}
          {actionType === 'TACKLE' ? (
            // Desarme visual shield ring flutuante (octogonal, mantido inalterado)
            <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.38, 0.44, 8]} />
              <primitive object={tackleGuardMat} attach="material" />
            </mesh>
          ) : (
            // Outras ações: anel circular redondo suave e elegante flutuante com a cor da ação
            <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.38, 0.44, 32]} />
              <primitive object={arrowMat} attach="material" />
            </mesh>
          )}

          {/* Seta direcional normal (não mostrada para o desarme) */}
          {actionType !== 'TACKLE' && (
            <group position={[0, 0.05, 0]} rotation={[0, angle, 0]}>
              <mesh position={[0, 0.04, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
                <primitive object={arrowMat} attach="material" />
              </mesh>
              <mesh position={[0, 0.04, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.12, 0.25, 6]} />
                <primitive object={arrowMat} attach="material" />
              </mesh>
            </group>
          )}
        </>
      )}

      {/* 3. CAPTAIN GOLD RING */}
      {isCaptain && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.4, 32]} />
          <meshStandardMaterial color="#f1c40f" roughness={0.1} metalness={1.0} />
        </mesh>
      )}

      {/* 4. BUTTON WOODEN BASE */}
      <mesh 
        position={[0, 0.05, 0]} 
        castShadow 
        receiveShadow
      >
        <cylinderGeometry args={[0.35, 0.35, 0.1, 12]} />
        <primitive object={baseWoodMat} attach="material" />
      </mesh>

      {/* 5. TACKLE BASE SHIELD GUARD (For all Tackle players, shows their peg shape in action) */}
      {actionType === 'TACKLE' && (
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.04, 8, 1, true]} />
          <primitive object={tackleGuardMat} attach="material" />
        </mesh>
      )}

      {/* 6. PROCEDURAL 3D ANATOMY */}
      <group scale={[0.85, 0.85, 0.85]} position={[0, 0.08, 0]} rotation={[0, angle, 0]}>
        
        {/* A. TORSO */}
        <group ref={torso}>
          <mesh material={shirtMat} position={[0, 0.22, 0]}>
               <cylinderGeometry args={[0.22, 0.15, 0.28, 4]} />
          </mesh>
          
          <mesh material={shirtMat} position={[0, 0.0, 0]}>
               <cylinderGeometry args={[0.14, 0.13, 0.22, 4]} />
          </mesh>
          
          <mesh material={shortsMat} position={[0, -0.15, 0]}>
               <cylinderGeometry args={[0.13, 0.18, 0.15, 4]} />
          </mesh>
          
          <mesh material={shirtLightMat} position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.07, 0.11, 0.05, 4]} />
          </mesh>

          {/* B. HEAD */}
          <group position={[0, 0.38, 0]}>
             <mesh material={skinMat} position={[0, 0.02, 0]}>
                 <cylinderGeometry args={[0.045, 0.06, 0.12, 6]} />
             </mesh>
             
             <group ref={headGroup} position={[0, 0.15, 0]}>
                <mesh material={skinMat} position={[0, 0.04, -0.02]}>
                    <boxGeometry args={[0.13, 0.15, 0.14]} />
                </mesh>
                <mesh material={skinMat} position={[0, -0.06, 0]}>
                    <boxGeometry args={[0.11, 0.08, 0.13]} />
                </mesh>
                <mesh material={skinMat} position={[0, -0.01, 0.07]} rotation={[-0.2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.02, 0.05, 3]} />
                </mesh>
                
                <mesh material={hairMat} position={[0, 0.11, -0.02]}>
                     <boxGeometry args={[0.14, 0.05, 0.15]} />
                </mesh>
                <mesh material={hairMat} position={[0, 0.02, -0.1]} rotation={[-0.2, 0, 0]}>
                     <boxGeometry args={[0.13, 0.14, 0.05]} />
                </mesh>
             </group>
          </group>

          {/* C. ARMS */}
          <group ref={leftUpperArm} position={[-0.22, 0.26, 0]}>
             <Joint size={0.065} color={shirtMat} position={[0, 0, 0]} />
             <LimbSegment widthTop={0.055} widthBottom={0.045} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
             
             <group ref={leftLowerArm} position={[0, -0.24, 0]}>
                 <Joint size={0.045} color={skinMat} position={[0, 0, 0]} />
                 <LimbSegment widthTop={0.045} widthBottom={0.035} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
                 <mesh material={isKeeper ? gloveMat : skinMat} position={[0, -0.25, 0]}>
                     <boxGeometry args={[0.045, 0.07, 0.05]} />
                 </mesh>
             </group>
          </group>

          <group ref={rightUpperArm} position={[0.22, 0.26, 0]}>
             <Joint size={0.065} color={shirtMat} position={[0, 0, 0]} />
             <LimbSegment widthTop={0.055} widthBottom={0.045} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
             
             <group ref={rightLowerArm} position={[0, -0.24, 0]}>
                 <Joint size={0.045} color={skinMat} position={[0, 0, 0]} />
                 <LimbSegment widthTop={0.045} widthBottom={0.035} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
                 <mesh material={isKeeper ? gloveMat : skinMat} position={[0, -0.25, 0]}>
                     <boxGeometry args={[0.045, 0.07, 0.05]} />
                 </mesh>
             </group>
          </group>
        </group>

        {/* D. LEGS */}
        <group position={[0, 0.68, 0]}>
          <group ref={leftUpperLeg} position={[-0.09, -0.1, 0]}>
            <Joint size={0.08} color={shortsMat} position={[0, 0, 0]} />
            <LimbSegment widthTop={0.11} widthBottom={0.09} length={0.22} color={shortsMat} position={[0, -0.09, 0]} />
            <mesh material={shortsDetailMat} position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.03, 6]} />
            </mesh>
            <LimbSegment widthTop={0.09} widthBottom={0.08} length={0.12} color={skinMat} position={[0, -0.24, 0]} />

            <group ref={leftLowerLeg} position={[0, -0.32, 0]}>
               <Joint size={0.065} color={skinMat} position={[0, 0, 0]} />
               <LimbSegment widthTop={0.08} widthBottom={0.055} length={0.3} color={socksMat} position={[0, -0.15, 0]} />
               <mesh material={socksBandMat} position={[0, -0.02, 0]}>
                   <cylinderGeometry args={[0.085, 0.082, 0.03, 6]} />
               </mesh>
               <group position={[0, -0.32, 0.03]}>
                  <mesh material={bootsMat}>
                      <boxGeometry args={[0.08, 0.07, 0.17]} />
                  </mesh>
                  <mesh material={bootsMat} position={[0, -0.02, 0.1]} rotation={[0.2, 0, 0]}>
                       <boxGeometry args={[0.075, 0.045, 0.07]} />
                  </mesh>
               </group>
            </group>
          </group>

          <group ref={rightUpperLeg} position={[0.09, -0.1, 0]}>
            <Joint size={0.08} color={shortsMat} position={[0, 0, 0]} />
            <LimbSegment widthTop={0.11} widthBottom={0.09} length={0.22} color={shortsMat} position={[0, -0.09, 0]} />
            <mesh material={shortsDetailMat} position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.03, 6]} />
            </mesh>
            <LimbSegment widthTop={0.09} widthBottom={0.08} length={0.12} color={skinMat} position={[0, -0.24, 0]} />

            <group ref={rightLowerLeg} position={[0, -0.32, 0]}>
               <Joint size={0.065} color={skinMat} position={[0, 0, 0]} />
               <LimbSegment widthTop={0.08} widthBottom={0.055} length={0.3} color={socksMat} position={[0, -0.15, 0]} />
               <mesh material={socksBandMat} position={[0, -0.02, 0]}>
                   <cylinderGeometry args={[0.085, 0.082, 0.03, 6]} />
               </mesh>
               <group position={[0, -0.32, 0.03]}>
                  <mesh material={bootsMat}>
                      <boxGeometry args={[0.08, 0.07, 0.17]} />
                  </mesh>
                  <mesh material={bootsMat} position={[0, -0.02, 0.1]} rotation={[0.2, 0, 0]}>
                       <boxGeometry args={[0.075, 0.045, 0.07]} />
                  </mesh>
               </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export default SoccerPlayer;
