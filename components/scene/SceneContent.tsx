import React, { useState, useEffect, useRef } from 'react';
import { useFrame, useThree, invalidate } from '@react-three/fiber';
import { ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SoccerPlayer from '../SoccerPlayer';
import Pitch, { LINE_SEGMENTS } from '../Pitch';
import Goal from '../Goal';
import { Ball3D } from './Ball3D';
import { CameraManager } from './CameraManager';
import { SlingshotController } from './SlingshotController';

import { GamePhase, Team, PlayerConfig, BallState, MovementState, Difficulty } from '../../types';
import { updateBallPhysics } from '../../PhysicsEngine';
import { useGameStateContext } from '../../GameStateContext';
import SoundManager from '../../SoundManager';

interface SceneContentProps {
  phase: GamePhase;
  difficulty: Difficulty;
  homePlayers: PlayerConfig[];
  awayPlayers: PlayerConfig[];
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
  ball: BallState;
  setBall: React.Dispatch<React.SetStateAction<BallState>>;
  turn: Team;
  shootBall: (vx: number, vz: number) => void;
  changePossession: (newPossession: Team, stoppedPosition: [number, number, number], isKickoff?: boolean) => void;
  scoreGoal: (scoringTeam: Team) => void;
  placePlayer: (playerId: string, slotId: string, customX?: number) => void;
  isIAThinking: boolean;
  setActionStatus: (status: string) => void;
  handleBallStopped: (stoppedPosition: [number, number, number]) => void;
  updateGoalkeeperPositions?: (homeX: number, homeZ: number, awayX: number, awayZ: number) => void;
  incrementGoalkeeperSaves?: (team: Team) => void;
  triggerFoul?: (e1: string, e2: string, stoppedPosition: [number, number, number]) => void;
  homeKitConfig?: any;
  awayKitConfig?: any;
  recenterTrigger: number;
  isCameraCentered: boolean;
  setIsCameraCentered: (val: boolean) => void;
}



export const SceneContent: React.FC<SceneContentProps> = ({
  phase,
  difficulty,
  homePlayers,
  awayPlayers,
  selectedPlayerId,
  setSelectedPlayerId,
  ball,
  setBall,
  turn,
  shootBall,
  changePossession,
  scoreGoal,
  placePlayer,
  isIAThinking,
  setActionStatus,
  handleBallStopped,
  updateGoalkeeperPositions,
  incrementGoalkeeperSaves,
  triggerFoul,
  homeKitConfig,
  awayKitConfig,
  recenterTrigger,
  isCameraCentered,
  setIsCameraCentered
}) => {
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [hoveredX, setHoveredX] = useState<number | null>(null);
  const [isDraggingBall, setIsDraggingBall] = useState(false);

  // Manage stadium crowd loop based on current phase
  useEffect(() => {
    if (phase === GamePhase.ACTION) {
      SoundManager.startCrowdAmbiance();
      SoundManager.setCrowdAmbianceVolume(1.0);
    } else if (phase === GamePhase.PREPARATION) {
      SoundManager.startCrowdAmbiance();
      SoundManager.setCrowdAmbianceVolume(0.35); 
    } else if (phase === GamePhase.MENU || phase === GamePhase.GAME_OVER) {
      SoundManager.stopCrowdAmbiance();
    }
  }, [phase]);
  
  // Touch/Drag to Rotate States and Listeners
  const { updatePlayerAngle, updatePlayerActionType, updatePlayerBlocking, setCaptain, isMultiplayer, myRole, roomId, captainMoveMode, addGameLog, gameMode, gkMoveActiveTeam, confirmGkPosition, setSwapPlayerId } = useGameStateContext();
  const [rotatingPlayerId, setRotatingPlayerId] = useState<string | null>(null);
  const [rotationTarget, setRotationTarget] = useState<THREE.Vector3 | null>(null);
  const { camera, raycaster, pointer, size } = useThree();

  const [isDraggingGK, setIsDraggingGK] = useState(false);
  const draggingGKTeamRef = useRef<Team | null>(null);

  const pendingPlayerIdRef = useRef<string | null>(null);
  const pointerStartPosRef = useRef<THREE.Vector2 | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  const handlePlayerRotateStart = (playerId: string, e: any) => {
    if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
    if (e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 1) return;
    const isCaptainMove = captainMoveMode !== null;
    if (!isCaptainMove && phase !== GamePhase.PREPARATION) return;

    if (isCaptainMove) {
      const playerTeam = playerId.startsWith('home') ? 'HOME' : 'AWAY';
      if (playerTeam !== captainMoveMode) return;
      if (isMultiplayer && myRole && myRole !== captainMoveMode) return;
      const allPlayers = playerId.startsWith('home') ? homePlayers : awayPlayers;
      const isCapt = allPlayers.find(p => p.id === playerId)?.isCaptain;
      if (!isCapt) return;
    } else {
      const isHomePlayer = playerId.startsWith('home');
      const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
      if (myControllingTeam === 'HOME' && !isHomePlayer) return;
      if (myControllingTeam === 'AWAY' && isHomePlayer) return;
    }

    e.stopPropagation();
    SoundManager.init(); 
    
    pendingPlayerIdRef.current = playerId;
    pointerStartPosRef.current = new THREE.Vector2(pointer.x, pointer.y);
    hasDraggedRef.current = false;
    setRotatingPlayerId(playerId); 
  };

  useEffect(() => {
    const handleWindowPointerMove = () => {
      if (draggingGKTeamRef.current) {
        const tempPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
        const target = new THREE.Vector3();
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(tempPlane, target)) {
          if (gameMode === 'manual') {
            const clampedX = THREE.MathUtils.clamp(target.x, -0.85, 0.85);
            if (draggingGKTeamRef.current === 'HOME') {
              const clampedZ = THREE.MathUtils.clamp(target.z, -7.4, -6.6);
              const currentAwayGK = awayPlayersRef.current.find(p => p.number === 1);
              if (updateGoalkeeperPositions) {
                updateGoalkeeperPositions(clampedX, clampedZ, currentAwayGK?.position[0] ?? 0, currentAwayGK?.position[2] ?? 7.2);
              }
            } else {
              const clampedZ = THREE.MathUtils.clamp(target.z, 6.6, 7.4);
              const currentHomeGK = homePlayersRef.current.find(p => p.number === 1);
              if (updateGoalkeeperPositions) {
                updateGoalkeeperPositions(currentHomeGK?.position[0] ?? 0, currentHomeGK?.position[2] ?? -7.2, clampedX, clampedZ);
              }
            }
          } else {
            const clampedX = THREE.MathUtils.clamp(target.x, -0.85, 0.85);
            if (updateGoalkeeperPositions) {
              if (draggingGKTeamRef.current === 'HOME') {
                const currentAwayGK = awayPlayersRef.current.find(p => p.number === 1);
                updateGoalkeeperPositions(clampedX, -7.2, currentAwayGK?.position[0] ?? 0, currentAwayGK?.position[2] ?? 7.2);
              } else {
                const currentHomeGK = homePlayersRef.current.find(p => p.number === 1);
                updateGoalkeeperPositions(currentHomeGK?.position[0] ?? 0, currentHomeGK?.position[2] ?? -7.2, clampedX, 7.2);
              }
            }
          }
        }
        return;
      }

      if (!pendingPlayerIdRef.current || !pointerStartPosRef.current) return;

      const dx = pointer.x - pointerStartPosRef.current.x;
      const dy = pointer.y - pointerStartPosRef.current.y;
      const dragDist = Math.hypot(dx, dy);

      if (!hasDraggedRef.current && dragDist > 0.03) {
        hasDraggedRef.current = true;
        setRotatingPlayerId(pendingPlayerIdRef.current);
        setSelectedPlayerId(pendingPlayerIdRef.current);
      }

      if (hasDraggedRef.current) {
        const player = homePlayers.find(p => p.id === pendingPlayerIdRef.current) || awayPlayers.find(p => p.id === pendingPlayerIdRef.current);
        if (!player) return;

        const tempPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
        const target = new THREE.Vector3();
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(tempPlane, target)) {
          setRotationTarget(target);

          const pdx = target.x - player.position[0];
          const pdz = target.z - player.position[2];
          const distance = Math.hypot(pdx, pdz);

          if (distance > 0.25) {
            const angle = Math.atan2(pdx, pdz);
            updatePlayerAngle(pendingPlayerIdRef.current, angle);
          }
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (draggingGKTeamRef.current) {
        setIsDraggingGK(false);
        const team = draggingGKTeamRef.current;
        draggingGKTeamRef.current = null;
        
        if (isMultiplayer && roomId && team) {
          import('../../firebase').then(({ db, ref, update }) => {
            update(ref(db, `rooms/${roomId}/gameState`), {
              homePlayers: homePlayersRef.current,
              awayPlayers: awayPlayersRef.current
            });
          });
        }
        return;
      }

      if (!pendingPlayerIdRef.current) return;

      if (!hasDraggedRef.current) {
        const pId = pendingPlayerIdRef.current;
        setSelectedPlayerId(selectedPlayerId === pId ? null : pId);
      }

      pendingPlayerIdRef.current = null;
      pointerStartPosRef.current = null;
      hasDraggedRef.current = false;
      setRotatingPlayerId(null);
      setRotationTarget(null);
    };

    const handleWindowTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        setIsDraggingBall(false);
        setIsDraggingGK(false);
        draggingGKTeamRef.current = null;
        pendingPlayerIdRef.current = null;
        pointerStartPosRef.current = null;
        hasDraggedRef.current = false;
        setRotatingPlayerId(null);
        setRotationTarget(null);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('touchstart', handleWindowTouchStart, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('touchstart', handleWindowTouchStart);
    };
  }, [homePlayers, awayPlayers, camera, raycaster, pointer, isMultiplayer, myRole, phase, selectedPlayerId, setSelectedPlayerId, updatePlayerAngle, gameMode]);

  const renderPlayerRotationIndicator = () => {
    if (phase !== GamePhase.PREPARATION || !rotatingPlayerId || !rotationTarget) return null;
    const player = homePlayers.find(p => p.id === rotatingPlayerId) || awayPlayers.find(p => p.id === rotatingPlayerId);
    if (!player) return null;

    const dx = rotationTarget.x - player.position[0];
    const dz = rotationTarget.z - player.position[2];
    const distance = Math.hypot(dx, dz);
    const color = player.actionType === 'SHOOT' ? '#ff3f34' : player.actionType === 'PASS' ? '#00d2ff' : '#ffcd38';

    return (
      <group position={player.position}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.5, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        
        {distance > 0.3 && (
          <group rotation={[0, Math.atan2(dx, dz), 0]}>
            {Array.from({ length: Math.min(Math.floor(distance * 3.5), 12) }).map((_, idx) => {
              const d = (idx + 1) * 0.25;
              if (d > distance) return null;
              return (
                <mesh key={idx} position={[0, 0.025, d]}>
                  <sphereGeometry args={[0.025, 8, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.8 - (d / distance) * 0.4} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>
    );
  };

  // Handle direct touch/click on the interactive 3D slider around the player
  const handleSliderPress = (playerId: string, e: any) => {
    e.stopPropagation();
    SoundManager.init();
    pendingPlayerIdRef.current = playerId;
    pointerStartPosRef.current = new THREE.Vector2(pointer.x, pointer.y);
    hasDraggedRef.current = true; // snap and drag immediately!
    setRotatingPlayerId(playerId);

    const tempPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
    const target = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(tempPlane, target)) {
      const player = homePlayers.find(p => p.id === playerId) || awayPlayers.find(p => p.id === playerId);
      if (player) {
        const pdx = target.x - player.position[0];
        const pdz = target.z - player.position[2];
        const angle = Math.atan2(pdx, pdz);
        updatePlayerAngle(playerId, angle);
        setRotationTarget(target);
      }
    }
  };

  // Render the interactive 3D slider around the selected player piece
  const renderInteractiveSlider = (player: PlayerConfig) => {
    if (player.number === 1) return null; // No action slider for goalkeeper

    const color = player.actionType === 'SHOOT' ? '#ff3f34' : player.actionType === 'PASS' ? '#00d2ff' : '#ffcd38';

    return (
      <group position={player.position}>
        {/* 1. Interactive Ring Area */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.015, 0]}
          onPointerDown={(e) => handleSliderPress(player.id, e)}
        >
          <ringGeometry args={[0.45, 0.9, 36]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
        </mesh>

        {/* 2. Inner and Outer border rings */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.88, 0.9, 36]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.47, 36]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </mesh>

        {/* 3. Angular ticks/dashes for premium dial aesthetic */}
        {Array.from({ length: 12 }).map((_, idx) => {
          const tickAngle = (idx * 30) * (Math.PI / 180);
          const cos = Math.cos(tickAngle);
          const sin = Math.sin(tickAngle);
          return (
            <mesh 
              key={idx} 
              position={[sin * 0.675, 0.022, cos * 0.675]}
              rotation={[0, -tickAngle, 0]}
            >
              <boxGeometry args={[0.015, 0.005, 0.1]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
            </mesh>
          );
        })}

        {/* 4. Beautiful current direction handle/arrow */}
        <group rotation={[0, player.angle, 0]}>
          {/* Direction vector line */}
          <mesh position={[0, 0.025, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
            <meshBasicMaterial color={color} depthWrite={false} />
          </mesh>
          {/* Arrow tip */}
          <mesh position={[0, 0.025, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.07, 0.2, 8]} />
            <meshBasicMaterial color={color} depthWrite={false} />
          </mesh>
        </group>
      </group>
    );
  };
  
  const cooldownPlayerIdRef = useRef<string | null>(null);
  const cooldownTimerRef = useRef<number>(0);

  const ballMeshRef = useRef<THREE.Group>(null);
  const ballStateRef = useRef<BallState>({ ...ball });

  const collisionHistoryRef = useRef<string[]>([]);
  const wasMovingRef = useRef<boolean>(false);

  const hasProcessedStopRef = useRef<boolean>(true);

  const homeGKRef = useRef<THREE.Group>(null);
  const awayGKRef = useRef<THREE.Group>(null);

  const homePlayersRef = useRef<PlayerConfig[]>(homePlayers);
  const awayPlayersRef = useRef<PlayerConfig[]>(awayPlayers);

  useEffect(() => {
    homePlayersRef.current = homePlayers;
  }, [homePlayers]);

  useEffect(() => {
    awayPlayersRef.current = awayPlayers;
  }, [awayPlayers]);

  useEffect(() => {
    const handleAIShot = (e: Event) => {
      const customEvent = e as CustomEvent<{ vx: number; vz: number }>;
      const { vx, vz } = customEvent.detail;
      
      ballStateRef.current = {
        ...ballStateRef.current,
        velocity: [vx, 0, vz]
      };
      hasProcessedStopRef.current = false;

      try {
        invalidate();
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.focus({ preventScroll: true });
        }
      } catch (err) {
        console.error("Failed to focus canvas inside Scene", err);
      }
    };

    window.addEventListener('dedoball-ai-shot', handleAIShot as EventListener);
    return () => {
      window.removeEventListener('dedoball-ai-shot', handleAIShot as EventListener);
    };
  }, []);
  
  useEffect(() => {
    const propPos = ball.position;
    const refPos = ballStateRef.current.position;
    const posDiff = Math.hypot(propPos[0] - refPos[0], propPos[2] - refPos[2]);
    const isPropMoving = Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.1;

    if (posDiff > 0.05 || isPropMoving) {
      ballStateRef.current = { ...ball };
      if (isPropMoving) {
        hasProcessedStopRef.current = false;
      }
      if (ballMeshRef.current) {
        ballMeshRef.current.position.set(ball.position[0], ball.position[1], ball.position[2]);
      }
    }
  }, [ball]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.03);

    if (cooldownPlayerIdRef.current) {
      cooldownTimerRef.current -= dt;
      if (cooldownTimerRef.current <= 0) {
        cooldownPlayerIdRef.current = null;
      }
    }

    if (phase !== GamePhase.ACTION) return;

    // --- GOALKEEPER sliding logic (Real-Time Tracking) ---
    if (gameMode === 'manual') {
      const homeGK = homePlayersRef.current.find(p => p.number === 1);
      if (homeGK && homeGKRef.current) {
        homeGKRef.current.position.x = homeGK.position[0];
        homeGKRef.current.position.z = homeGK.position[2];
      }
      const awayGK = awayPlayersRef.current.find(p => p.number === 1);
      if (awayGK && awayGKRef.current) {
        awayGKRef.current.position.x = awayGK.position[0];
        awayGKRef.current.position.z = awayGK.position[2];
      }
    } else {
      const ballX = ballStateRef.current.position[0];
      const ballZ = ballStateRef.current.position[2];
      const ballVx = ballStateRef.current.velocity[0];
      const ballVz = ballStateRef.current.velocity[2];
      const gkBallSpeed = Math.hypot(ballVx, ballVz);
      
      let baseGkSpeed = 6.0;
      if (difficulty === Difficulty.EASY) baseGkSpeed = 4.0;
      else if (difficulty === Difficulty.HARD) baseGkSpeed = 8.0;

      const homeGK = homePlayersRef.current.find(p => p.number === 1);
      if (homeGK) {
        const homeSaves = homeGK.gkSaves ?? 0;
        const homeSpeedMult = Math.max(0.1, 1 - homeSaves * 0.01);
        const currentHomeGkSpeed = baseGkSpeed * homeSpeedMult;

        let targetX = ballX;
        if (ballVz < -0.5) {
          const tGoal = (-7.2 - ballZ) / ballVz;
          if (tGoal > 0 && tGoal < 2.0) {
            const expectedXGoal = ballX + ballVx * tGoal;
            if (Math.abs(expectedXGoal) < 1.2) {
              targetX = expectedXGoal;
            }
          }
        }
        targetX = THREE.MathUtils.clamp(targetX, -0.85, 0.85);

        const currentX = homeGK.position[0];
        const dx = targetX - currentX;
        const step = Math.sign(dx) * Math.min(Math.abs(dx), currentHomeGkSpeed * dt);
        homeGK.position[0] = currentX + step;

        let isInterceptable = false;
        if (ballVz < -0.5 && gkBallSpeed > 0.5 && gkBallSpeed < 5.0) {
          const t = (-6.8 - ballZ) / ballVz;
          if (t > 0 && t < 1.2) {
            const expectedX = THREE.MathUtils.clamp(ballX + ballVx * t, -0.85, 0.85);
            if (Math.abs(expectedX) < 1.1) {
              const distX = Math.abs(expectedX - currentX);
              const timeToReach = distX / currentHomeGkSpeed;
              if (t >= timeToReach + 0.05) {
                isInterceptable = true;
              }
            }
          }
        }

        let targetZ = -7.2;
        if (isInterceptable) {
          targetZ = -6.6;
        } else {
          const ballDistanceZ = Math.max(0, ballZ + 8.0);
          const proximity = THREE.MathUtils.clamp(1 - ballDistanceZ / 5.0, 0, 1);
          const centrality = THREE.MathUtils.clamp(1 - Math.abs(ballX) / 2.5, 0, 1);
          targetZ = -7.2 - (0.2 * proximity * (1 - centrality));
        }

        const currentZ = homeGK.position[2];
        const dz = targetZ - currentZ;
        const stepZ = Math.sign(dz) * Math.min(Math.abs(dz), currentHomeGkSpeed * dt);
        homeGK.position[2] = currentZ + stepZ;
        
        if (homeGKRef.current) {
          homeGKRef.current.position.x = homeGK.position[0];
          homeGKRef.current.position.z = homeGK.position[2];
        }
      }

      const awayGK = awayPlayersRef.current.find(p => p.number === 1);
      if (awayGK) {
        const awaySaves = awayGK.gkSaves ?? 0;
        const awaySpeedMult = Math.max(0.1, 1 - awaySaves * 0.01);
        const currentAwayGkSpeed = baseGkSpeed * awaySpeedMult;

        let targetX = ballX;
        if (ballVz > 0.5) {
          const tGoal = (7.2 - ballZ) / ballVz;
          if (tGoal > 0 && tGoal < 2.0) {
            const expectedXGoal = ballX + ballVx * tGoal;
            if (Math.abs(expectedXGoal) < 1.2) {
              targetX = expectedXGoal;
            }
          }
        }
        targetX = THREE.MathUtils.clamp(targetX, -0.85, 0.85);

        const currentX = awayGK.position[0];
        const dx = targetX - currentX;
        const step = Math.sign(dx) * Math.min(Math.abs(dx), currentAwayGkSpeed * dt);
        awayGK.position[0] = currentX + step;

        let isInterceptable = false;
        if (ballVz > 0.5 && gkBallSpeed > 0.5 && gkBallSpeed < 5.0) {
          const t = (6.8 - ballZ) / ballVz;
          if (t > 0 && t < 1.2) {
            const expectedX = THREE.MathUtils.clamp(ballX + ballVx * t, -0.85, 0.85);
            if (Math.abs(expectedX) < 1.1) {
              const distX = Math.abs(expectedX - currentX);
              const timeToReach = distX / currentAwayGkSpeed;
              if (t >= timeToReach + 0.05) {
                isInterceptable = true;
              }
            }
          }
        }

        let targetZ = 7.2;
        if (isInterceptable) {
          targetZ = 6.6;
        } else {
          const ballDistanceZ = Math.max(0, 8.0 - ballZ);
          const proximity = THREE.MathUtils.clamp(1 - ballDistanceZ / 5.0, 0, 1);
          const centrality = THREE.MathUtils.clamp(1 - Math.abs(ballX) / 2.5, 0, 1);
          targetZ = 7.2 + (0.2 * proximity * (1 - centrality));
        }

        const currentZ = awayGK.position[2];
        const dz = targetZ - currentZ;
        const stepZ = Math.sign(dz) * Math.min(Math.abs(dz), currentAwayGkSpeed * dt);
        awayGK.position[2] = currentZ + stepZ;
        
        if (awayGKRef.current) {
          awayGKRef.current.position.x = awayGK.position[0];
          awayGKRef.current.position.z = awayGK.position[2];
        }
      }
    }

    const currentBall = ballStateRef.current;
    const ballSpeed = Math.hypot(currentBall.velocity[0], currentBall.velocity[2]);
    const isMoving = ballSpeed > 0.05;

    if (isMoving && !wasMovingRef.current) {
      collisionHistoryRef.current = [];
    }
    wasMovingRef.current = isMoving;
    
    if (ballSpeed > 0) {
      hasProcessedStopRef.current = false;

      const subSteps = 3;
      const subDt = dt / subSteps;
      let tempBall = currentBall;
      let finalBallState = currentBall;
      let collisionPlayerId: string | null = null;
      let collisionType: 'TEAMMATE' | 'OPPONENT' | null = null;
      let isGoal = false;
      let scoringTeam: Team | null = null;
      let isTackle = false;
      let tackleTeam: Team | null = null;
      let collisionWall = false;
      let collisionGoalpost = false;
      let collisionGround = false;
      let isGkDefense = false;
      let isGkEstouro = false;

      for (let step = 0; step < subSteps; step++) {
        const stepResult = updateBallPhysics(
          tempBall,
          homePlayersRef.current,
          awayPlayersRef.current,
          turn,
          subDt,
          cooldownPlayerIdRef.current,
          collisionHistoryRef.current,
          gameMode === 'manual'
        );
        tempBall = stepResult.nextBall;
        finalBallState = stepResult.nextBall;
        
        if (stepResult.collisionPlayerId) {
          cooldownPlayerIdRef.current = stepResult.collisionPlayerId;
          cooldownTimerRef.current = 0.4;
          collisionPlayerId = stepResult.collisionPlayerId;
          collisionType = stepResult.collisionType;
        }

        if (stepResult.collisionWall) collisionWall = true;
        if (stepResult.collisionGoalpost) collisionGoalpost = true;
        if (stepResult.collisionGround) collisionGround = true;

        if (stepResult.isGoal) {
          isGoal = true;
          scoringTeam = stepResult.scoringTeam;
        }

        if (stepResult.isTackle) {
          isTackle = true;
          tackleTeam = stepResult.tackleTeam;
        }

        if (stepResult.isGkDefense) isGkDefense = true;
        if (stepResult.isGkEstouro) isGkEstouro = true;

        if (stepResult.isGoal || stepResult.isTackle) {
          break;
        }
      }

      const result = {
        nextBall: finalBallState,
        collisionPlayerId,
        collisionType,
        isGoal,
        scoringTeam,
        isTackle,
        tackleTeam,
        collisionWall,
        collisionGoalpost,
        collisionGround,
        isGkDefense,
        isGkEstouro
      };

      let recordedCollision = false;
      if (result.collisionPlayerId) {
        cooldownPlayerIdRef.current = result.collisionPlayerId;
        cooldownTimerRef.current = 0.4; 
        
        const speed = Math.hypot(result.nextBall.velocity[0], result.nextBall.velocity[2]);
        const isGK = result.collisionPlayerId.endsWith('-p1');
        if (isGK) {
          SoundManager.playKeeperSave(speed);
          const gkTeam = result.collisionPlayerId.startsWith('home') ? 'HOME' : 'AWAY';
          if (incrementGoalkeeperSaves) {
            incrementGoalkeeperSaves(gkTeam);
          }

          if (result.isGkEstouro) {
            setActionStatus(
              gkTeam === 'HOME'
                ? 'Estouro! Seu goleiro isolou a bola para o campo de ataque!'
                : 'Estouro! O goleiro adversário deu um chutão para frente!'
            );
            if (addGameLog) {
              addGameLog(
                `🚀 Estouro! O goleiro do Time ${gkTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} deu um chutão isolando a bola para o ataque!`,
                'collision'
              );
            }
          }
        } else {
          SoundManager.playRebound(speed);
        }

        const history = collisionHistoryRef.current;
        const last = history[history.length - 1];
        if (last !== result.collisionPlayerId) {
          history.push(result.collisionPlayerId);
          recordedCollision = true;
        }
      } else if (result.collisionWall) {
        const speed = Math.hypot(result.nextBall.velocity[0], result.nextBall.velocity[2]);
        SoundManager.playWoodBorder(speed);

        const history = collisionHistoryRef.current;
        const last = history[history.length - 1];
        if (last !== 'WALL') {
          history.push('WALL');
          recordedCollision = true;
        }
      }

      if (result.collisionGround) {
        const vy = Math.abs(result.nextBall.velocity[1]);
        SoundManager.playGrassBounce(vy);
      }

      if (result.collisionGoalpost) {
        const speed = Math.hypot(result.nextBall.velocity[0], result.nextBall.velocity[1], result.nextBall.velocity[2]);
        SoundManager.playGoalpost(speed);
        
        setTimeout(() => {
          if (ballStateRef.current && Math.hypot(ballStateRef.current.velocity[0], ballStateRef.current.velocity[2]) < 0.8 && phase === GamePhase.ACTION) {
            SoundManager.playCrowdSigh();
          }
        }, 900);
      }

      if (recordedCollision) {
        const history = collisionHistoryRef.current;
        const N = history.length;
        if (N >= 6) {
          let isLoop = true;
          const e1 = history[N - 1];
          const e2 = history[N - 2];
          if (e1 === e2 || e1 === 'WALL' || e2 === 'WALL') {
            isLoop = false;
          } else {
            for (let i = 1; i <= 6; i++) {
              const expected = (i % 2 === 1) ? e1 : e2;
              if (history[N - i] !== expected) {
                isLoop = false;
                break;
              }
            }
          }
          
          if (isLoop) {
            ballStateRef.current = { ...result.nextBall, velocity: [0, 0, 0] };
            hasProcessedStopRef.current = true; 
            if (triggerFoul) triggerFoul(e1, e2, result.nextBall.position);
            return;
          }
        }
      }

      ballStateRef.current = result.nextBall;

      if (ballMeshRef.current) {
        ballMeshRef.current.position.set(
          result.nextBall.position[0],
          result.nextBall.position[1],
          result.nextBall.position[2]
        );
        ballMeshRef.current.rotation.x -= result.nextBall.velocity[2] * 0.1;
        ballMeshRef.current.rotation.z += result.nextBall.velocity[0] * 0.1;
      }

      if (result.isGoal && result.scoringTeam) {
        ballStateRef.current = { ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 };
        setBall({ ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 });
        hasProcessedStopRef.current = true; 
        scoreGoal(result.scoringTeam);
        return;
      }

      if (result.isTackle && result.tackleTeam) {
        ballStateRef.current = { ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 };
        setBall({ ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 });
        hasProcessedStopRef.current = true; 
        changePossession(result.tackleTeam, result.nextBall.position);
        
        if (result.isGkDefense) {
          setActionStatus(
            result.tackleTeam === 'HOME'
              ? 'Defesaça! Seu goleiro defendeu a bola e garantiu a posse.'
              : 'Defesaça! O goleiro adversário segurou a bola e retomou a posse.'
          );
          if (addGameLog) {
            addGameLog(
              `🧤 Defesaça! O goleiro do Time ${result.tackleTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} fez uma defesa espetacular e segurou a bola!`,
              'tackle'
            );
          }
        } else {
          setActionStatus(
            result.tackleTeam === 'HOME'
              ? 'Interceptado! Seu desarme parou a jogada.'
              : 'Interceptado! O desarme da IA parou a jogada.'
          );
        }
        return;
      }
    } else {
      if (!hasProcessedStopRef.current) {
        hasProcessedStopRef.current = true; 
        setBall(currentBall);
        
        const homeGK = homePlayersRef.current.find(p => p.number === 1);
        const awayGK = awayPlayersRef.current.find(p => p.number === 1);
        if (homeGK && awayGK && updateGoalkeeperPositions) {
          updateGoalkeeperPositions(homeGK.position[0], homeGK.position[2], awayGK.position[0], awayGK.position[2]);
        }
        
        handleBallStopped(currentBall.position);
      }
    }
  });

  const handleSlotClick = (slotId: string) => {
    if (selectedPlayerId) {
      SoundManager.init();
      SoundManager.playUIClick();
      pendingPlayerIdRef.current = null;
      placePlayer(selectedPlayerId, slotId);
    }
  };

  const handleLineClick = (slotId: string, clickX: number) => {
    if (selectedPlayerId) {
      SoundManager.init();
      SoundManager.playUIClick();
      pendingPlayerIdRef.current = null;
      placePlayer(selectedPlayerId, slotId, clickX);
    }
  };

  const isCaptainMoveActive = captainMoveMode !== null;
  const isMyTurn = isMultiplayer ? (turn === myRole) : (turn === 'HOME');
  const isFlickable = phase === GamePhase.ACTION && isMyTurn && !isIAThinking && Math.hypot(ball.velocity[0], ball.velocity[2]) < 0.1 && gkMoveActiveTeam === null;
  const activeBallPos = phase === GamePhase.ACTION && Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.05 
    ? ballStateRef.current.position 
    : ball.position;

  // Reactively synchronize the swap target player ID to the global game state context
  useEffect(() => {
    let activeSwapId: string | null = null;
    const playerA = selectedPlayerId ? (homePlayers.find(p => p.id === selectedPlayerId) || awayPlayers.find(p => p.id === selectedPlayerId)) : null;

    if ((phase === GamePhase.PREPARATION || captainMoveMode !== null) && hoveredSegmentId !== null && hoveredX !== null && selectedPlayerId && playerA) {
      const segment = LINE_SEGMENTS.find(s => s.id === hoveredSegmentId);
      if (segment) {
        const activeTeamPlayers = segment.team === 'HOME' ? homePlayers : awayPlayers;
        const otherPlayersOnLine = activeTeamPlayers.filter((pl: any) => 
          pl.id !== selectedPlayerId && 
          pl.number !== 1 && 
          Math.abs(pl.position[2] - segment.z) < 0.1
        );
        const previewX = Math.max(segment.xStart + 0.35, Math.min(segment.xEnd - 0.35, hoveredX));
        const swapTarget = otherPlayersOnLine.find((pl: any) => Math.abs(previewX - pl.position[0]) < 0.35);
        if (swapTarget) {
          activeSwapId = swapTarget.id;
        }
      }
    }
    setSwapPlayerId(activeSwapId);
  }, [hoveredSegmentId, hoveredX, selectedPlayerId, homePlayers, awayPlayers, phase, captainMoveMode, setSwapPlayerId]);

  // Dynamic calculation of swap target player and transparent preview position under cursor
  let swapPlayerId: string | null = null;
  let previewPosition: [number, number, number] | null = null;
  const playerA = selectedPlayerId ? (homePlayers.find(p => p.id === selectedPlayerId) || awayPlayers.find(p => p.id === selectedPlayerId)) : null;

  if ((phase === GamePhase.PREPARATION || captainMoveMode !== null) && hoveredSegmentId !== null && hoveredX !== null && selectedPlayerId && playerA) {
    const segment = LINE_SEGMENTS.find(s => s.id === hoveredSegmentId);
    if (segment) {
      const activeTeamPlayers = segment.team === 'HOME' ? homePlayers : awayPlayers;
      const otherPlayersOnLine = activeTeamPlayers.filter((pl: any) => 
        pl.id !== selectedPlayerId && 
        pl.number !== 1 && 
        Math.abs(pl.position[2] - segment.z) < 0.1
      );
      const previewX = Math.max(segment.xStart + 0.35, Math.min(segment.xEnd - 0.35, hoveredX));
      const swapTarget = otherPlayersOnLine.find((pl: any) => Math.abs(previewX - pl.position[0]) < 0.35);
      if (swapTarget) {
        swapPlayerId = swapTarget.id;
      }
      const overlaps = otherPlayersOnLine.some((pl: any) => Math.abs(previewX - pl.position[0]) < 0.7);
      const isBlocked = overlaps && !swapTarget; // Blocked only if not swapping!
      if (!isBlocked) {
        previewPosition = [previewX, 0.2, segment.z];
      }
    }
  }

  return (
    <>
      <color attach="background" args={['#070a0e']} />
      <Stars radius={90} depth={40} count={2000} factor={3} saturation={0.5} fade speed={0.5} />
      
      <ambientLight intensity={1.5} color="#eef7ff" />
      <spotLight 
        position={[0, 18, 0]} 
        angle={0.8} 
        penumbra={0.6} 
        intensity={30} 
        decay={1}
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={2.5} 
        color="#f6f9ff" 
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 4, 8.5]} intensity={15} decay={1.5} color="#ff3838" />
      <pointLight position={[0, 4, -8.5]} intensity={15} decay={1.5} color="#2e86de" />

      <ContactShadows 
        position={[0, 0.015, 0]} 
        opacity={0.5} 
        scale={20} 
        blur={1.5} 
        far={3} 
      />

      <group
        onClick={(e) => {
          if (!isCaptainMoveActive) setSelectedPlayerId(null);
        }}
      >
        <Pitch 
          phase={phase}
          captainMoveMode={captainMoveMode}
          onSlotClick={handleSlotClick}
          onLineClick={handleLineClick}
          selectedPlayerId={selectedPlayerId}
          hoveredSlotId={hoveredSlotId}
          setHoveredSlotId={setHoveredSlotId}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          hoveredSegmentId={hoveredSegmentId}
          setHoveredSegmentId={setHoveredSegmentId}
          hoveredX={hoveredX}
          setHoveredX={setHoveredX}
        />
      </group>

      <group position={[0, 0, -8]}>
        <Goal />
      </group>
      <group position={[0, 0, 8]} rotation={[0, Math.PI, 0]}>
        <Goal />
      </group>

      {/* Home Players */}
      {homePlayers.map(p => {
        const currentMove = phase === GamePhase.GOAL_CELEBRATION && ball.possession === 'HOME'
          ? MovementState.JUMPING_HEADING 
          : Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.2 && p.id === ball.lastTouchedByPlayerId
            ? MovementState.PASS_RIGHT
            : MovementState.STANDING;

        const isGK = p.number === 1;
        const isControllable = !isMultiplayer || myRole === 'HOME';

        return (
          <group 
            key={p.id} 
            ref={isGK ? homeGKRef : undefined}
            position={p.position}
          >
            <SoccerPlayer 
              currentMovement={currentMove}
              role={isGK ? 'goalkeeper' : 'player'}
              team="HOME"
              skinColor={p.skinColor}
              hairColor={p.hairColor}
              uniformConfig={homeKitConfig}
              angle={p.angle}
              actionType={p.actionType}
              isBlocking={p.isBlocking}
              isSelected={isControllable && selectedPlayerId === p.id}
              isCaptain={p.isCaptain}
              showCaptainGlow={isCaptainMoveActive && p.team === captainMoveMode}
              showSwapIndicator={swapPlayerId === p.id || (swapPlayerId !== null && selectedPlayerId === p.id)}
              swapIndicatorColor={swapPlayerId === p.id ? "#00e676" : "#ff3f34"}
              isGhost={false}
              number={p.number}
               onPointerDown={isControllable ? (e) => {
                if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
                const activeGKTeam = 
                  ((Math.hypot(ball.velocity[0], ball.velocity[2]) < 0.1 || phase !== GamePhase.ACTION) && isGK && (isMultiplayer ? p.team === myRole : p.team === 'HOME') && gameMode === 'manual' && captainMoveMode === null) ? p.team : (phase === GamePhase.PREPARATION && isGK && gameMode !== 'manual') ? p.team :
                  (captainMoveMode !== null && isGK && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode) && gameMode !== 'manual') ? p.team :
                  (gkMoveActiveTeam !== null && isGK && p.team === gkMoveActiveTeam && (!isMultiplayer || myRole === gkMoveActiveTeam) && gameMode !== 'manual') ? p.team : null;

                if (activeGKTeam) {
                  e.stopPropagation();
                  SoundManager.init();
                  draggingGKTeamRef.current = activeGKTeam;
                  setIsDraggingGK(true);
                  return;
                }

                if (isCaptainMoveActive) {
                  const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                  if (!allowInCaptainMode) return;
                }
                handlePlayerRotateStart(p.id, e);
              } : undefined}
              onClick={isControllable ? (e) => {
                const isGK = p.number === 1;
                if (isGK && gameMode !== 'manual') return;

                if (isCaptainMoveActive) {
                  const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                  if (!allowInCaptainMode) return;
                }
                e.stopPropagation();

                const playerA = selectedPlayerId ? (homePlayers.find(pl => pl.id === selectedPlayerId) || awayPlayers.find(pl => pl.id === selectedPlayerId)) : null;
                const isSwapTarget = selectedPlayerId && 
                  selectedPlayerId !== p.id && 
                  p.slotId && 
                  p.number !== 1 && 
                  playerA && 
                  playerA.team === p.team && 
                  playerA.slotId && 
                  playerA.number !== 1;

                if (isSwapTarget) {
                  SoundManager.init();
                  SoundManager.playUIClick();
                  pendingPlayerIdRef.current = null;
                  placePlayer(selectedPlayerId, p.slotId, p.position[0]);
                  return;
                }

                setSelectedPlayerId(selectedPlayerId === p.id ? null : p.id);
              } : undefined}
            />
          </group>
        );
      })}

      {/* Away Players */}
      {awayPlayers.map(p => {
        const currentMove = phase === GamePhase.GOAL_CELEBRATION && ball.possession === 'AWAY'
          ? MovementState.JUMPING_HEADING 
          : Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.2 && p.id === ball.lastTouchedByPlayerId
            ? MovementState.PASS_RIGHT
            : MovementState.STANDING;

        const isGK = p.number === 1;
        const isControllable = isMultiplayer && myRole === 'AWAY';

        return (
          <group 
            key={p.id} 
            ref={isGK ? awayGKRef : undefined}
            position={p.position}
          >
            <SoccerPlayer 
              currentMovement={currentMove}
              role={isGK ? 'goalkeeper' : 'player'}
              team="AWAY"
              skinColor={p.skinColor}
              hairColor={p.hairColor}
              uniformConfig={awayKitConfig}
              angle={p.angle}
              actionType={p.actionType}
              isBlocking={p.isBlocking}
              isSelected={isControllable && selectedPlayerId === p.id}
              isCaptain={p.isCaptain}
              showCaptainGlow={isCaptainMoveActive && p.team === captainMoveMode}
              showSwapIndicator={swapPlayerId === p.id || (swapPlayerId !== null && selectedPlayerId === p.id)}
              swapIndicatorColor={swapPlayerId === p.id ? "#00e676" : "#ff3f34"}
              isGhost={false}
              number={p.number}
               onPointerDown={isControllable ? (e) => {
                if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
                const activeGKTeam = 
                  ((Math.hypot(ball.velocity[0], ball.velocity[2]) < 0.1 || phase !== GamePhase.ACTION) && isGK && (isMultiplayer ? p.team === myRole : p.team === 'HOME') && gameMode === 'manual' && captainMoveMode === null) ? p.team : (phase === GamePhase.PREPARATION && isGK && gameMode !== 'manual') ? p.team :
                  (captainMoveMode !== null && isGK && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode) && gameMode !== 'manual') ? p.team :
                  (gkMoveActiveTeam !== null && isGK && p.team === gkMoveActiveTeam && (!isMultiplayer || myRole === gkMoveActiveTeam) && gameMode !== 'manual') ? p.team : null;

                if (activeGKTeam) {
                  e.stopPropagation();
                  SoundManager.init();
                  draggingGKTeamRef.current = activeGKTeam;
                  setIsDraggingGK(true);
                  return;
                }

                if (isCaptainMoveActive) {
                  const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                  if (!allowInCaptainMode) return;
                }
                handlePlayerRotateStart(p.id, e);
              } : undefined}
              onClick={isControllable ? (e) => {
                const isGK = p.number === 1;
                if (isGK && gameMode !== 'manual') return;

                if (isCaptainMoveActive) {
                  const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                  if (!allowInCaptainMode) return;
                }
                e.stopPropagation();

                const playerA = selectedPlayerId ? (homePlayers.find(pl => pl.id === selectedPlayerId) || awayPlayers.find(pl => pl.id === selectedPlayerId)) : null;
                const isSwapTarget = selectedPlayerId && 
                  selectedPlayerId !== p.id && 
                  p.slotId && 
                  p.number !== 1 && 
                  playerA && 
                  playerA.team === p.team && 
                  playerA.slotId && 
                  playerA.number !== 1;

                if (isSwapTarget) {
                  SoundManager.init();
                  SoundManager.playUIClick();
                  pendingPlayerIdRef.current = null;
                  placePlayer(selectedPlayerId, p.slotId, p.position[0]);
                  return;
                }

                setSelectedPlayerId(selectedPlayerId === p.id ? null : p.id);
              } : undefined}
            />
          </group>
        );
      })}





      <Ball3D 
        ref={ballMeshRef} 
        position={ball.position} 
        velocity={ball.velocity} 
        isSelected={selectedPlayerId === 'ball'}
        onClick={(e) => {
          if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
          if (!isFlickable) return;
          e.stopPropagation();
          setSelectedPlayerId(selectedPlayerId === 'ball' ? null : 'ball');
        }}
        onPointerDown={(e) => {
          if (typeof window !== 'undefined' && (window as any).activeTouchesCount > 1) return;
          if (!isFlickable) return;
          setSelectedPlayerId('ball');
        }}
      />

      <SlingshotController 
        ballPos={ball.position}
        onFlick={(vx, vz) => {
          const force = Math.hypot(vx, vz);
          SoundManager.playKick(force);
          shootBall(vx, vz);
          setSelectedPlayerId(null);
        }}
        enabled={isFlickable}
        onDragStart={() => setIsDraggingBall(true)}
        onDragEnd={() => setIsDraggingBall(false)}
        onSelectBall={() => {
          if (selectedPlayerId !== 'ball') {
            setSelectedPlayerId('ball');
          }
        }}
      />

      {phase === GamePhase.PREPARATION && rotatingPlayerId && renderPlayerRotationIndicator()}

      {/* Interactive 3D Angle Slider for the selected controllable player */}
      {(() => {
        if (!selectedPlayerId || selectedPlayerId === 'ball') return null;
        const p = homePlayers.find(pl => pl.id === selectedPlayerId) || awayPlayers.find(pl => pl.id === selectedPlayerId);
        if (!p) return null;
        const isHomePlayer = p.id.startsWith('home');
        const isControllable = !isMultiplayer || (myRole === 'HOME' && isHomePlayer) || (myRole === 'AWAY' && !isHomePlayer);
        if (!isControllable) return null;
        if (p.number === 1) return null; // No action slider for goalkeepers
        if (phase === GamePhase.PREPARATION || isCaptainMoveActive) {
          return renderInteractiveSlider(p);
        }
        return null;
      })()}



      <CameraManager 
        phase={phase} 
        ballPos={activeBallPos} 
        turn={turn} 
        controlsEnabled={!isDraggingBall && !isDraggingGK && !rotatingPlayerId} 
        recenterTrigger={recenterTrigger}
        isCameraCentered={isCameraCentered}
        setIsCameraCentered={setIsCameraCentered}
        captainMoveMode={captainMoveMode}
        ballMeshRef={ballMeshRef}
      />
    </>
  );
};
