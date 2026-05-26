import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GamePhase, Team } from '../../types';
import { useGameStateContext } from '../../GameStateContext';

interface CameraManagerProps {
  phase: GamePhase;
  ballPos: [number, number, number]; 
  turn: Team;
  controlsEnabled?: boolean;
  recenterTrigger: number;
  isCameraCentered: boolean;
  setIsCameraCentered: (val: boolean) => void;
  captainMoveMode?: string | null;
  ballMeshRef: React.RefObject<THREE.Group | null>;
}

export const CameraManager: React.FC<CameraManagerProps> = ({ 
  phase, 
  ballPos, 
  controlsEnabled = true, 
  recenterTrigger, 
  isCameraCentered, 
  setIsCameraCentered,
  captainMoveMode = null,
  ballMeshRef
}) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(0, 0.2, 0));
  const isUserControlled = useRef(false);
  const lastPhase = useRef<GamePhase | null>(null);
  const lastBallPos = useRef<[number, number, number]>(ballPos);
  const lastRecenterTrigger = useRef(recenterTrigger);

  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Retrieve cameraMode and myRole from the GameStateContext
  const { cameraMode, myRole } = useGameStateContext();

  // Reset automatic tracking mode when game phase changes
  if (phase !== lastPhase.current) {
    isUserControlled.current = false;
    lastPhase.current = phase;
  }

  // Detect recenter trigger click
  if (recenterTrigger !== lastRecenterTrigger.current) {
    isUserControlled.current = false;
    lastRecenterTrigger.current = recenterTrigger;
  }

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.buttons === 3) {
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        isUserControlled.current = true;
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPanningRef.current && controlsRef.current) {
        if (e.buttons !== 3) {
          isPanningRef.current = false;
          controlsRef.current.enabled = true;
          return;
        }

        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: e.clientX, y: e.clientY };

        const controls = controlsRef.current;
        const offset = new THREE.Vector3();
        const vX = new THREE.Vector3();
        const vY = new THREE.Vector3();
        const vZ = new THREE.Vector3();

        camera.matrix.extractBasis(vX, vY, vZ);

        const factor = camera.position.distanceTo(controls.target) * 0.0015;
        vX.multiplyScalar(-dx * factor);
        vY.multiplyScalar(dy * factor);
        offset.addVectors(vX, vY);

        camera.position.add(offset);
        controls.target.add(offset);
        controls.update();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.buttons !== 3) {
        isPanningRef.current = false;
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera]);

  useFrame(() => {
    if (!controlsRef.current) return;

    // Get the real-time ball position from the 3D mesh ref, falling back to the static prop
    const currentBallPos = ballMeshRef.current 
      ? [ballMeshRef.current.position.x, ballMeshRef.current.position.y, ballMeshRef.current.position.z]
      : ballPos;

    let desiredLookAt = new THREE.Vector3(currentBallPos[0], 0.2, currentBallPos[2]);
    
    // Detect ball movement inside the frame loop to auto-track it in real-time
    const isBallMoving = Math.hypot(currentBallPos[0] - lastBallPos.current[0], currentBallPos[2] - lastBallPos.current[2]) > 0.05;
    if (isBallMoving && isUserControlled.current && cameraMode === 'dynamic') {
      isUserControlled.current = false;
    }
    lastBallPos.current = [currentBallPos[0], currentBallPos[1], currentBallPos[2]];

    // Smooth camera tracking if not user controlled
    if (!isUserControlled.current) {
      if (cameraMode === 'fixed') {
        const centerLookAt = new THREE.Vector3(0, 0.2, 0);
        targetLookAt.current.lerp(centerLookAt, 0.03);
        controlsRef.current.target.copy(targetLookAt.current);

        if (phase === GamePhase.PREPARATION || captainMoveMode !== null) {
          const destPos = new THREE.Vector3(0, 11, myRole === 'AWAY' ? 2 : -2);
          camera.position.lerp(destPos, 0.03);
        } else {
          const destPos = new THREE.Vector3(0, 7, myRole === 'AWAY' ? 10 : -10);
          camera.position.lerp(destPos, 0.03);
        }
      } else {
        targetLookAt.current.lerp(desiredLookAt, 0.035);
        controlsRef.current.target.copy(targetLookAt.current);

        if (phase === GamePhase.PREPARATION || captainMoveMode !== null) {
          const destPos = new THREE.Vector3(0, 11, myRole === 'AWAY' ? 2 : -2);
          camera.position.lerp(destPos, 0.03);
        } else if (phase === GamePhase.GOAL_CELEBRATION) {
          const t = Date.now() * 0.001;
          const destPos = new THREE.Vector3(Math.sin(t) * 5, 2.5, currentBallPos[2] + Math.cos(t) * 4);
          camera.position.lerp(destPos, 0.05);
        }
      }
    } else {
      const target = controlsRef.current.target;
      target.x = THREE.MathUtils.clamp(target.x, -5, 5);
      target.z = THREE.MathUtils.clamp(target.z, myRole === 'AWAY' ? -3.93 : -7.2, myRole === 'AWAY' ? 7.2 : 3.93);
      target.y = THREE.MathUtils.clamp(target.y, 0, 1.5);
    }

    const currentTarget = controlsRef.current.target;
    const checkTarget = cameraMode === 'fixed' ? new THREE.Vector3(0, 0.2, 0) : desiredLookAt;
    const distance = currentTarget.distanceTo(checkTarget);
    const centered = distance < 0.5;
    if (centered !== isCameraCentered) {
      setTimeout(() => setIsCameraCentered(centered), 0);
    }

    controlsRef.current.update();
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      enabled={true}
      enablePan={true} 
      enableRotate={controlsEnabled} 
      enableZoom={true}
      screenSpacePanning={true}
      minPolarAngle={Math.PI / 8} 
      maxPolarAngle={Math.PI / 2.1} 
      minDistance={3}
      maxDistance={25}
      makeDefault
      onStart={() => {
        isUserControlled.current = true;
      }}
      mouseButtons={{
        LEFT: controlsEnabled ? THREE.MOUSE.ROTATE : null as any,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
      touches={{
        ONE: controlsEnabled ? THREE.TOUCH.ROTATE : null as any,
        TWO: THREE.TOUCH.DOLLY_PAN
      }}
    />
  );
};
