import { useMemo } from 'react';
import * as THREE from 'three';
import { Team, UniformConfig, ActionType } from '../../types';

interface MaterialConfigInputs {
  uniformConfig?: UniformConfig;
  team: Team;
  isKeeper: boolean;
  skinColor: string;
  hairColor?: string;
  actionType: ActionType;
  isGhost?: boolean;
}

export const usePlayerMaterials = ({
  uniformConfig,
  team,
  isKeeper,
  skinColor,
  hairColor,
  actionType,
  isGhost = false
}: MaterialConfigInputs) => {
  const matConfig = useMemo(() => ({ 
    flatShading: true, 
    roughness: 0.5,
    transparent: isGhost,
    opacity: isGhost ? 0.35 : 1.0 
  }), [isGhost]);

  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: skinColor, ...matConfig }), [skinColor, matConfig]);
  
  const hairCol = useMemo(() => hairColor || (team === 'HOME' ? '#2c3e50' : '#d35400'), [hairColor, team]);
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: hairCol, ...matConfig }), [hairCol, matConfig]);

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
      const numStripes = 8;
      const stripeWidth = 256 / numStripes;
      for (let i = 0; i < numStripes; i++) {
        if (i % 2 === 1) ctx.fillRect(i * stripeWidth, 0, stripeWidth, 256);
      }
    } else if (pattern === 'three-stripes-v') {
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
      ctx.fillStyle = activeKit.secondaryColor;
      ctx.fillRect(96, 0, 64, 256);
      ctx.fillRect(0, 48, 256, 60);
    } else if (pattern === 'sash-cross') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(256, 0); ctx.lineTo(96, 0);
      ctx.lineTo(0, 256);  ctx.lineTo(160, 256);
      ctx.closePath();
      ctx.fillStyle = activeKit.secondaryColor;
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ff3f34'; 
      const cx = 110;
      const cy = 80;
      const r = 18;
      
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 3);
      ctx.quadraticCurveTo(cx - 10, cy - 8, cx - r, cy - r + 5);
      ctx.lineTo(cx - r, cy + r - 5);
      ctx.quadraticCurveTo(cx - 10, cy + 8, cx - 3, cy + 3);
      
      ctx.lineTo(cx - 3, cy + 3);
      ctx.quadraticCurveTo(cx - 8, cy + 10, cx - r + 5, cy + r);
      ctx.lineTo(cx + r - 5, cy + r);
      ctx.quadraticCurveTo(cx + 8, cy + 10, cx + 3, cy + 3);
      
      ctx.lineTo(cx + 3, cy + 3);
      ctx.quadraticCurveTo(cx + 10, cy + 8, cx + r, cy + r - 5);
      ctx.lineTo(cx + r, cy - r + 5);
      ctx.quadraticCurveTo(cx + 10, cy - 8, cx + 3, cy - 3);
      
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
      ctx.fillRect(8,  0, 5, 128);
      ctx.fillRect(16, 0, 5, 128);
      ctx.fillRect(24, 0, 5, 128);
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
      ctx.fillRect(0, 8,  64, 14);
      ctx.fillRect(0, 44, 64, 14);
      ctx.fillRect(0, 80, 64, 14);
    } else if (pat === 'three-stripes') {
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
      flatShading: true,
      transparent: isGhost,
      opacity: isGhost ? 0.35 : 1.0
    });
  }, [kitTexture, activeKit.primaryColor, isGhost]);

  const shirtLightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: activeKit.secondaryColor, ...matConfig }), [activeKit.secondaryColor, matConfig]);
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: shortsTexture || undefined,
    color: shortsTexture ? '#ffffff' : activeKit.shortsColor,
    roughness: 0.5, flatShading: true,
    transparent: isGhost,
    opacity: isGhost ? 0.35 : 1.0
  }), [shortsTexture, activeKit.shortsColor, isGhost]);
  const shortsDetailMat = useMemo(() => new THREE.MeshStandardMaterial({ color: activeKit.shortsSecondaryColor || activeKit.shortsColor, ...matConfig }), [activeKit.shortsSecondaryColor, activeKit.shortsColor, matConfig]);
  const socksMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: socksTexture || undefined,
    color: socksTexture ? '#ffffff' : activeKit.socksColor,
    roughness: 0.5, flatShading: true,
    transparent: isGhost,
    opacity: isGhost ? 0.35 : 1.0
  }), [socksTexture, activeKit.socksColor, isGhost]);
  const socksBandMat = useMemo(() => new THREE.MeshStandardMaterial({ color: activeKit.socksSecondaryColor || activeKit.secondaryColor, ...matConfig }), [activeKit.socksSecondaryColor, activeKit.secondaryColor, matConfig]); 
  const bootsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e272e', ...matConfig }), [matConfig]);
  const gloveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f6fa', ...matConfig }), [matConfig]);

  // Wooden Button Base Material (Peg base)
  const baseWoodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: team === 'HOME' ? '#2980b9' : '#d35400',
    roughness: 0.15,
    metalness: 0.1,
    flatShading: true,
    transparent: isGhost,
    opacity: isGhost ? 0.35 : 1.0
  }), [team, isGhost]);

  // Arrow Material (Red/Crimson for Shoot, Yellow for Cross, Blue/Cyan for Pass)
  const arrowMat = useMemo(() => {
    let color = '#ffcd38'; 
    let emissive = '#5c4308'; 
    
    if (actionType === 'SHOOT') {
      color = '#ff3f34'; 
      emissive = '#800000';
    } else if (actionType === 'PASS') {
      color = '#00d2ff'; 
      emissive = '#004080';
    }
    
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.8,
      emissive,
      emissiveIntensity: 0.5,
      transparent: isGhost,
      opacity: isGhost ? 0.35 : 1.0
    });
  }, [actionType, isGhost]);

  // Tackle Guard Base Material (Glossy Premium Black Obsidian for Desarme)
  const tackleGuardMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0c0d12',
    roughness: 0.15,
    metalness: 0.9,
    transparent: isGhost,
    opacity: isGhost ? 0.35 : 0.9
  }), [isGhost]);

  return {
    skinMat,
    hairMat,
    shirtMat,
    shirtLightMat,
    shortsMat,
    shortsDetailMat,
    socksMat,
    socksBandMat,
    bootsMat,
    gloveMat,
    baseWoodMat,
    arrowMat,
    tackleGuardMat
  };
};
