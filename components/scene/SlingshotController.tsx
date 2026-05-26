import React, { useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane } from '@react-three/drei';
import * as THREE from 'three';
import SoundManager from '../../SoundManager';

interface SlingshotControllerProps {
  ballPos: [number, number, number];
  onFlick: (vx: number, vz: number) => void;
  enabled: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onSelectBall?: () => void;
}

export const SlingshotController: React.FC<SlingshotControllerProps> = ({ 
  ballPos, 
  onFlick, 
  enabled, 
  onDragStart, 
  onDragEnd, 
  onSelectBall 
}) => {
  const [dragStart, setDragStart] = useState<THREE.Vector3 | null>(null);
  const [dragCurrent, setDragCurrent] = useState<THREE.Vector3 | null>(null);
  const { camera, raycaster, pointer } = useThree();
  
  const getGroundIntersection = (): THREE.Vector3 | null => {
    const tempPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(tempPlane, target)) {
      return target;
    }
    return null;
  };

  const handlePointerDown = (e: any) => {
    if (!enabled) return;
    if (e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 1) return;
    const pt = getGroundIntersection();
    if (pt) {
      const dist = Math.hypot(pt.x - ballPos[0], pt.z - ballPos[2]);
      if (dist < 1.5) {
        e.stopPropagation();
        SoundManager.init(); 
        setDragStart(new THREE.Vector3(ballPos[0], ballPos[1], ballPos[2]));
        setDragCurrent(pt);
        if (onSelectBall) onSelectBall();
        if (onDragStart) onDragStart();
      }
    }
  };

  const handlePointerMove = (e: any) => {
    if (!dragStart) return;
    const pt = getGroundIntersection();
    if (pt) {
      setDragCurrent(pt);
    }
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent) return;

    const diffX = dragStart.x - dragCurrent.x;
    const diffZ = dragStart.z - dragCurrent.z;
    
    const pullDist = Math.hypot(diffX, diffZ);
    const maxPull = 3.5;
    const intensity = Math.min(pullDist, maxPull) / maxPull;
    
    const forceFactor = intensity * 30.0; 
    const angle = Math.atan2(diffX, diffZ);
    
    const vx = Math.sin(angle) * forceFactor;
    const vz = Math.cos(angle) * forceFactor;

    setDragStart(null);
    setDragCurrent(null);
    if (onDragEnd) onDragEnd();

    if (forceFactor > 0.5) {
      onFlick(vx, vz);
    }
  };

  const renderSlingshotIndicator = () => {
    if (!dragStart || !dragCurrent) return null;
    
    const dx = dragStart.x - dragCurrent.x;
    const dz = dragStart.z - dragCurrent.z;
    const dist = Math.hypot(dx, dz);
    const maxPull = 3.5;
    const clampedDist = Math.min(dist, maxPull);
    
    const angle = Math.atan2(dx, dz);
    
    const ratio = clampedDist / maxPull;
    const color = ratio < 0.4 ? '#2ecc71' : ratio < 0.75 ? '#f1c40f' : '#e74c3c';

    return (
      <group position={ballPos}>
        <group rotation={[0, angle, 0]}>
          <mesh position={[0, 0.05, clampedDist * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.04, clampedDist, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0.05, clampedDist + 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.1, 0.25, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
        </group>
      </group>
    );
  };

  return (
    <>
      <Plane 
        args={[30, 30]} 
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {renderSlingshotIndicator()}
    </>
  );
};
