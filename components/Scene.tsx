import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Stars, Plane } from '@react-three/drei';
import * as THREE from 'three';
import SoccerPlayer from './SoccerPlayer';
import Pitch from './Pitch';
import Goal from './Goal';
import { GamePhase, Team, PlayerConfig, BallState, MovementState, Difficulty } from '../types';
import { updateBallPhysics } from '../PhysicsEngine';
import { useGameStateContext } from '../GameStateContext';
import SoundManager from '../SoundManager';

interface SceneProps {
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
  placePlayer: (playerId: string, slotId: string) => void;
  isIAThinking: boolean;
  setActionStatus: (status: string) => void;
  handleBallStopped: (stoppedPosition: [number, number, number]) => void;
  updateGoalkeeperPositions?: (homeX: number, awayX: number) => void;
  triggerFoul?: (e1: string, e2: string, stoppedPosition: [number, number, number]) => void;
  homeKitConfig?: any;
  awayKitConfig?: any;
  recenterTrigger: number;
  isCameraCentered: boolean;
  setIsCameraCentered: (val: boolean) => void;
}

interface Ball3DProps {
  position: [number, number, number];
  velocity: [number, number, number];
  isSelected?: boolean;
  onClick?: (e: any) => void;
  onPointerDown?: (e: any) => void;
}

const BallSelectionRing = () => {
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

// 1. Separate Ball component with dynamic position and rotation, using forwardRef
const Ball3D = React.forwardRef<THREE.Group, Ball3DProps>(({
  position,
  velocity,
  isSelected = false,
  onClick,
  onPointerDown
}, ref) => {
  // Rotations for 6 caps aligned to the cardinal axes (+Y, -Y, +Z, -Z, +X, -X)
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

// 2. Camera Manager for smooth cinematics
const CameraManager: React.FC<{ 
  phase: GamePhase;
  ballPos: [number, number, number]; 
  turn: Team;
  controlsEnabled?: boolean;
  recenterTrigger: number;
  isCameraCentered: boolean;
  setIsCameraCentered: (val: boolean) => void;
  captainMoveMode?: string | null;
  ballMeshRef: React.RefObject<THREE.Group | null>;
}> = ({ 
  phase, 
  ballPos, 
  turn, 
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

  useFrame(() => {
    if (!controlsRef.current) return;

    // Get the real-time ball position from the 3D mesh ref, falling back to the static prop
    const currentBallPos = ballMeshRef.current 
      ? [ballMeshRef.current.position.x, ballMeshRef.current.position.y, ballMeshRef.current.position.z]
      : ballPos;

    let desiredLookAt = new THREE.Vector3(currentBallPos[0], 0.2, currentBallPos[2]);
    
    // Detect ball movement inside the frame loop to auto-track it in real-time
    const isBallMoving = Math.hypot(currentBallPos[0] - lastBallPos.current[0], currentBallPos[2] - lastBallPos.current[2]) > 0.05;
    if (isBallMoving && isUserControlled.current) {
      isUserControlled.current = false;
    }
    lastBallPos.current = [currentBallPos[0], currentBallPos[1], currentBallPos[2]];

    // Smooth camera tracking if not user controlled
    if (!isUserControlled.current) {
      targetLookAt.current.lerp(desiredLookAt, 0.08);
      controlsRef.current.target.copy(targetLookAt.current);

      // Auto reposition camera depending on game phase (only if user is not manually orbiting/zooming)
      if (phase === GamePhase.PREPARATION || captainMoveMode !== null) {
        // Top down taptic view for placing players
        const destPos = new THREE.Vector3(0, 11, -2);
        camera.position.lerp(destPos, 0.03);
      } else if (phase === GamePhase.GOAL_CELEBRATION) {
        // Dramatic orbit
        const t = Date.now() * 0.001;
        const destPos = new THREE.Vector3(Math.sin(t) * 5, 2.5, currentBallPos[2] + Math.cos(t) * 4);
        camera.position.lerp(destPos, 0.05);
      }
    } else {
      // If user controlled, apply lock boundaries to controls target
      const target = controlsRef.current.target;
      target.x = THREE.MathUtils.clamp(target.x, -5, 5);
      target.z = THREE.MathUtils.clamp(target.z, -5.5, 3.93);
      target.y = THREE.MathUtils.clamp(target.y, 0, 1.5);
    }

    // Check if camera target has deviated from desired look at to toggle centered state
    const currentTarget = controlsRef.current.target;
    const distance = currentTarget.distanceTo(desiredLookAt);
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
      enablePan={controlsEnabled} 
      enableRotate={controlsEnabled} 
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

// 3. Slingshot/Flick drag controller
const SlingshotController: React.FC<{
  ballPos: [number, number, number];
  onFlick: (vx: number, vz: number) => void;
  enabled: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onSelectBall?: () => void;
}> = ({ ballPos, onFlick, enabled, onDragStart, onDragEnd, onSelectBall }) => {
  const [dragStart, setDragStart] = useState<THREE.Vector3 | null>(null);
  const [dragCurrent, setDragCurrent] = useState<THREE.Vector3 | null>(null);
  const { camera, raycaster, pointer } = useThree();
  
  const getGroundIntersection = (): THREE.Vector3 | null => {
    // Cast ray to Z = 0 floor
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
    const pt = getGroundIntersection();
    if (pt) {
      const dist = Math.hypot(pt.x - ballPos[0], pt.z - ballPos[2]);
      // Only initiate slingshot drag if the user touches/clicks near the ball (comfortable 1.5 unit radius)
      if (dist < 1.5) {
        e.stopPropagation();
        SoundManager.init(); // Initialize audio context on first user drag!
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

    // Calculate flick vector (Slingshot: Pull back, shoot forward)
    const diffX = dragStart.x - dragCurrent.x;
    const diffZ = dragStart.z - dragCurrent.z;
    
    // Clamp pull force
    const pullDist = Math.hypot(diffX, diffZ);
    const maxPull = 3.5;
    const intensity = Math.min(pullDist, maxPull) / maxPull;
    
    const forceFactor = intensity * 30.0; // max velocity is 30.0
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

  // Render 3D slingshot arrow
  const renderSlingshotIndicator = () => {
    if (!dragStart || !dragCurrent) return null;
    
    // Slingshot shoots opposite to the pull
    const dx = dragStart.x - dragCurrent.x;
    const dz = dragStart.z - dragCurrent.z;
    const dist = Math.hypot(dx, dz);
    const maxPull = 3.5;
    const clampedDist = Math.min(dist, maxPull);
    
    const angle = Math.atan2(dx, dz);
    
    // Dynamic color depending on force: Green -> Yellow -> Red
    const ratio = clampedDist / maxPull;
    const color = ratio < 0.4 ? '#2ecc71' : ratio < 0.75 ? '#f1c40f' : '#e74c3c';

    return (
      <group position={ballPos}>
        {/* Draw a gorgeous glowing cylinder in the release direction */}
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
      {/* Invisible plane for dragging input across the whole field */}
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

// 4. SCENE CONTENT COMPONENT (Internal R3F hook consumer)
const SceneContent: React.FC<SceneProps> = ({
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
  triggerFoul,
  homeKitConfig,
  awayKitConfig,
  recenterTrigger,
  isCameraCentered,
  setIsCameraCentered
}) => {
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [isDraggingBall, setIsDraggingBall] = useState(false);

  // Manage stadium crowd loop based on current phase
  useEffect(() => {
    if (phase === GamePhase.ACTION) {
      SoundManager.startCrowdAmbiance();
      SoundManager.setCrowdAmbianceVolume(1.0);
    } else if (phase === GamePhase.PREPARATION) {
      SoundManager.startCrowdAmbiance();
      SoundManager.setCrowdAmbianceVolume(0.35); // Softer murmurs during preparation
    } else if (phase === GamePhase.MENU || phase === GamePhase.GAME_OVER) {
      SoundManager.stopCrowdAmbiance();
    }
  }, [phase]);
  
  // Touch/Drag to Rotate States and Listeners
  const { updatePlayerAngle, isMultiplayer, myRole, captainMoveMode } = useGameStateContext();
  const [rotatingPlayerId, setRotatingPlayerId] = useState<string | null>(null);
  const [rotationTarget, setRotationTarget] = useState<THREE.Vector3 | null>(null);
  const { camera, raycaster, pointer } = useThree();

  const pendingPlayerIdRef = useRef<string | null>(null);
  const pointerStartPosRef = useRef<THREE.Vector2 | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  const handlePlayerRotateStart = (playerId: string, e: any) => {
    const isCaptainMove = captainMoveMode !== null;
    if (!isCaptainMove && phase !== GamePhase.PREPARATION) return;
    // During captain move, only allow the captain of the conceding team
    if (isCaptainMove) {
      const playerTeam = playerId.startsWith('home') ? 'HOME' : 'AWAY';
      if (playerTeam !== captainMoveMode) return;
      // In multiplayer, block if not local team
      if (isMultiplayer && myRole && myRole !== captainMoveMode) return;
      const allPlayers = playerId.startsWith('home') ? homePlayers : awayPlayers;
      const isCapt = allPlayers.find(p => p.id === playerId)?.isCaptain;
      if (!isCapt) return;
    } else {
      // Normal preparation rules
      if (isMultiplayer && myRole) {
        const isHomePlayer = playerId.startsWith('home');
        if (myRole === 'HOME' && !isHomePlayer) return;
        if (myRole === 'AWAY' && isHomePlayer) return;
      }
    }

    e.stopPropagation();
    SoundManager.init(); // Initialize audio context on gesture!
    
    pendingPlayerIdRef.current = playerId;
    pointerStartPosRef.current = new THREE.Vector2(pointer.x, pointer.y);
    hasDraggedRef.current = false;
    setRotatingPlayerId(playerId); // Freeze OrbitControls instantly on pointerdown!
  };

  useEffect(() => {
    const handleWindowPointerMove = () => {
      if (!pendingPlayerIdRef.current || !pointerStartPosRef.current) return;

      // Calculate distance dragged in normalized screen space
      const dx = pointer.x - pointerStartPosRef.current.x;
      const dy = pointer.y - pointerStartPosRef.current.y;
      const dragDist = Math.hypot(dx, dy);

      if (!hasDraggedRef.current && dragDist > 0.03) {
        // Flag as drag once threshold is exceeded
        hasDraggedRef.current = true;
        setRotatingPlayerId(pendingPlayerIdRef.current);
        setSelectedPlayerId(pendingPlayerIdRef.current);
      }

      if (hasDraggedRef.current) {
        const player = homePlayers.find(p => p.id === pendingPlayerIdRef.current) || awayPlayers.find(p => p.id === pendingPlayerIdRef.current);
        if (!player) return;

        // Cast ray to Z = 0 floor (same height as pitch)
        const tempPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
        const target = new THREE.Vector3();
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(tempPlane, target)) {
          setRotationTarget(target);

          const pdx = target.x - player.position[0];
          const pdz = target.z - player.position[2];
          const distance = Math.hypot(pdx, pdz);

          // Dead-zone logic: only rotate if pointer dragged sufficiently far from the piece center
          if (distance > 0.25) {
            const angle = Math.atan2(pdx, pdz);
            updatePlayerAngle(pendingPlayerIdRef.current, angle);
          }
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (!pendingPlayerIdRef.current) return;

      // Click to select logic if they didn't drag
      if (!hasDraggedRef.current) {
        const pId = pendingPlayerIdRef.current;
        setSelectedPlayerId(selectedPlayerId === pId ? null : pId);
      }

      // Cleanup
      pendingPlayerIdRef.current = null;
      pointerStartPosRef.current = null;
      hasDraggedRef.current = false;
      setRotatingPlayerId(null);
      setRotationTarget(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [homePlayers, awayPlayers, camera, raycaster, pointer, isMultiplayer, myRole, phase, selectedPlayerId, setSelectedPlayerId, updatePlayerAngle]);

  // Render visual guides for player rotation in Preparation Phase
  const renderPlayerRotationIndicator = () => {
    if (phase !== GamePhase.PREPARATION || !rotatingPlayerId || !rotationTarget) return null;
    const player = homePlayers.find(p => p.id === rotatingPlayerId) || awayPlayers.find(p => p.id === rotatingPlayerId);
    if (!player) return null;

    const dx = rotationTarget.x - player.position[0];
    const dz = rotationTarget.z - player.position[2];
    const distance = Math.hypot(dx, dz);
    
    // Direction line pointing towards cursor if dragged sufficiently
    const color = player.actionType === 'SHOOT' ? '#ff3f34' : player.actionType === 'PASS' ? '#00d2ff' : '#ffcd38';

    return (
      <group position={player.position}>
        {/* Glowing dotted base ring on the floor around the player */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.5, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        
        {/* Sleek connection line to the pointer */}
        {distance > 0.3 && (
          <group rotation={[0, Math.atan2(dx, dz), 0]}>
            {/* Draw beautiful guiding dots or dashes */}
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
  
  // Track collision cooldowns to avoid immediate double-collisions
  const cooldownPlayerIdRef = useRef<string | null>(null);
  const cooldownTimerRef = useRef<number>(0);

  // References for direct 3D ball manipulation to prevent state flickering
  const ballMeshRef = useRef<THREE.Group>(null);
  const ballStateRef = useRef<BallState>({ ...ball });

  // Track collision history to detect loop fouls
  const collisionHistoryRef = useRef<string[]>([]);
  const wasMovingRef = useRef<boolean>(false);

  // Synchronous ref to prevent duplicate handleBallStopped calls
  const hasProcessedStopRef = useRef<boolean>(true);

  // Goalkeeper mesh references for direct 3D sliding movement
  const homeGKRef = useRef<THREE.Group>(null);
  const awayGKRef = useRef<THREE.Group>(null);

  // References for player lists to allow fast, direct goalkeeper position updates
  const homePlayersRef = useRef<PlayerConfig[]>(homePlayers);
  const awayPlayersRef = useRef<PlayerConfig[]>(awayPlayers);

  // Keep player list references in sync with props
  useEffect(() => {
    homePlayersRef.current = homePlayers;
  }, [homePlayers]);

  useEffect(() => {
    awayPlayersRef.current = awayPlayers;
  }, [awayPlayers]);

  // Listen for the AI shot custom event to force wake up the physics loop immediately
  useEffect(() => {
    const handleAIShot = (e: Event) => {
      const customEvent = e as CustomEvent<{ vx: number; vz: number }>;
      const { vx, vz } = customEvent.detail;
      console.log(`%c[Scene] 🤖 AI Shot event received! Force unlocking physics with vx=${vx.toFixed(2)}, vz=${vz.toFixed(2)}`, "color: #e55039; font-weight: bold;");
      
      // Wake up physics instantly by setting the velocity in the direct 3D reference
      ballStateRef.current = {
        ...ballStateRef.current,
        velocity: [vx, 0, vz]
      };
      hasProcessedStopRef.current = false;

      // Safely wake up the R3F Canvas render scheduler and ensure active loop tick
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

  const triggerFoulLocal = (e1: string, e2: string, currentBallState: BallState) => {
    // 1. Stop the ball instantly
    const stoppedBall: BallState = {
      ...currentBallState,
      velocity: [0, 0, 0],
      isKickoff: true,
      speedMultiplier: 1
    };
    ballStateRef.current = stoppedBall;
    setBall(stoppedBall);
    hasProcessedStopRef.current = true; // Stop is processed via foul

    if (triggerFoul) {
      // Delegate to robust hook-level foul tracker which decrements flicks and checks rounds
      triggerFoul(e1, e2, currentBallState.position);
      return;
    }

    // 2. Identify the teams involved
    const playersInLoop = [e1, e2].filter(e => e !== 'WALL');
    const teamsInLoop = playersInLoop.map(id => id.startsWith('home') ? 'HOME' : 'AWAY');

    let recipientTeam: Team;
    if (teamsInLoop.every(t => t === 'HOME')) {
      recipientTeam = 'AWAY';
    } else if (teamsInLoop.every(t => t === 'AWAY')) {
      recipientTeam = 'HOME';
    } else {
      // Direct dispute. Opponent of the current active player who took the shot gets possession.
      recipientTeam = turn === 'HOME' ? 'AWAY' : 'HOME';
    }

    // 3. Apply foul and transfer possession (with isKickoff = true)
    changePossession(recipientTeam, stoppedBall.position, true);

    // 4. Set premium descriptive message
    const e1Name = e1 === 'WALL' ? 'parede' : e1.startsWith('home') ? 'jogador da Casa' : 'jogador da IA';
    const e2Name = e2 === 'WALL' ? 'parede' : e2.startsWith('home') ? 'jogador da Casa' : 'jogador da IA';
    setActionStatus(`Falta! Bola presa em loop entre ${e1Name} e ${e2Name}. Posse para ${recipientTeam === 'HOME' ? 'Casa' : 'IA'}!`);
  };
  
  // Synchronize incoming ball prop when it changes significantly or when it isn't moving
  useEffect(() => {
    const propPos = ball.position;
    const refPos = ballStateRef.current.position;
    const posDiff = Math.hypot(propPos[0] - refPos[0], propPos[2] - refPos[2]);
    const isPropMoving = Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.1;

    // Sync only when there's an external trigger (like reset, goal or initial possession)
    // or when the ball was flicked (velocity becomes non-zero)
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

  // Main Action loop for custom ball physics
  useFrame((state, delta) => {
    // Clamp delta time to avoid large physics jumps during lag spikes
    const dt = Math.min(delta, 0.03);



    // Physics cooldown timer
    if (cooldownPlayerIdRef.current) {
      cooldownTimerRef.current -= dt;
      if (cooldownTimerRef.current <= 0) {
        cooldownPlayerIdRef.current = null;
      }
    }

    if (phase !== GamePhase.ACTION) return;

    // --- GOALKEEPER sliding logic (Real-Time Tracking) ---
    const ballX = ballStateRef.current.position[0];
    
    let gkSpeed = 4.275; // -5% (era 4.5)
    if (difficulty === Difficulty.EASY) gkSpeed = 1.9; // -5% (era 2.0)
    else if (difficulty === Difficulty.HARD) gkSpeed = 7.125; // -5% (era 7.5)

    // Home Goalkeeper (number 1)
    const homeGK = homePlayersRef.current.find(p => p.number === 1);
    if (homeGK) {
      const targetX = THREE.MathUtils.clamp(ballX, -0.85, 0.85);
      const currentX = homeGK.position[0];
      const dx = targetX - currentX;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), gkSpeed * dt);
      homeGK.position[0] = currentX + step;
      
      if (homeGKRef.current) {
        homeGKRef.current.position.x = homeGK.position[0];
      }
    }

    // Away Goalkeeper (number 1)
    const awayGK = awayPlayersRef.current.find(p => p.number === 1);
    if (awayGK) {
      const targetX = THREE.MathUtils.clamp(ballX, -0.85, 0.85);
      const currentX = awayGK.position[0];
      const dx = targetX - currentX;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), gkSpeed * dt);
      awayGK.position[0] = currentX + step;
      
      if (awayGKRef.current) {
        awayGKRef.current.position.x = awayGK.position[0];
      }
    }
    // --- END GOALKEEPER sliding logic ---

    const currentBall = ballStateRef.current;
    const ballSpeed = Math.hypot(currentBall.velocity[0], currentBall.velocity[2]);
    const isMoving = ballSpeed > 0.05;

    // Reset history when a new flick starts (stationary to moving)
    if (isMoving && !wasMovingRef.current) {
      collisionHistoryRef.current = [];
    }
    wasMovingRef.current = isMoving;
    
    if (ballSpeed > 0) {
      // Ball is moving, so we haven't processed its next stop yet
      hasProcessedStopRef.current = false;

      // 1. Tick Physics using local ref state with 3 sub-steps for high precision integration
      // to prevent the ball from tunneling or clipping at 75% higher speeds.
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

      for (let step = 0; step < subSteps; step++) {
        const stepResult = updateBallPhysics(
          tempBall,
          homePlayersRef.current,
          awayPlayersRef.current,
          turn,
          subDt,
          cooldownPlayerIdRef.current,
          collisionHistoryRef.current
        );
        tempBall = stepResult.nextBall;
        finalBallState = stepResult.nextBall;
        
        // Handle immediate player collision cooldown so it works between sub-steps
        if (stepResult.collisionPlayerId) {
          cooldownPlayerIdRef.current = stepResult.collisionPlayerId;
          cooldownTimerRef.current = 0.4;

          // Accumulate collision details
          collisionPlayerId = stepResult.collisionPlayerId;
          collisionType = stepResult.collisionType;
        }

        if (stepResult.collisionWall) {
          collisionWall = true;
        }

        if (stepResult.collisionGoalpost) {
          collisionGoalpost = true;
        }

        if (stepResult.collisionGround) {
          collisionGround = true;
        }

        if (stepResult.isGoal) {
          isGoal = true;
          scoringTeam = stepResult.scoringTeam;
        }

        if (stepResult.isTackle) {
          isTackle = true;
          tackleTeam = stepResult.tackleTeam;
        }

        // Break early if goal or tackle happens mid-frame
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
        collisionGround
      };

      // Handle collision events
      let recordedCollision = false;
      if (result.collisionPlayerId) {
        cooldownPlayerIdRef.current = result.collisionPlayerId;
        cooldownTimerRef.current = 0.4; // 400ms collision immune
        console.log(`%c[Physics Engine] Ball collided with player ID: ${result.collisionPlayerId} (${result.collisionPlayerId.startsWith('home') ? 'HOME' : 'AWAY'})`, "color: #9b59b6;");
        
        const speed = Math.hypot(result.nextBall.velocity[0], result.nextBall.velocity[2]);
        const isGK = result.collisionPlayerId.endsWith('-p1');
        if (isGK) {
          SoundManager.playKeeperSave(speed);
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
        console.log(`%c[Physics Engine] Ball collided with wall/table boundary`, "color: #7f8c8d;");
        
        const speed = Math.hypot(result.nextBall.velocity[0], result.nextBall.velocity[2]);
        SoundManager.playWoodBorder(speed);

        const history = collisionHistoryRef.current;
        const last = history[history.length - 1];
        if (last !== 'WALL') {
          history.push('WALL');
          recordedCollision = true;
        }
      }

      // Handle ground bounces
      if (result.collisionGround) {
        const vy = Math.abs(result.nextBall.velocity[1]);
        SoundManager.playGrassBounce(vy);
      }

      // Handle goalpost hits
      if (result.collisionGoalpost) {
        const speed = Math.hypot(result.nextBall.velocity[0], result.nextBall.velocity[1], result.nextBall.velocity[2]);
        SoundManager.playGoalpost(speed);
        
        // Trigger a crowd sigh if a near miss happens (the ball hit the post and didn't result in a goal)
        setTimeout(() => {
          if (ballStateRef.current && Math.hypot(ballStateRef.current.velocity[0], ballStateRef.current.velocity[2]) < 0.8 && phase === GamePhase.ACTION) {
            SoundManager.playCrowdSigh();
          }
        }, 900);
      }

      // Check if loop foul occurred
      if (recordedCollision) {
        const history = collisionHistoryRef.current;
        const N = history.length;
        if (N >= 10) {
          let isLoop = true;
          const e1 = history[N - 1];
          const e2 = history[N - 2];
          if (e1 === e2 || e1 === 'WALL' || e2 === 'WALL') {
            isLoop = false;
          } else {
            for (let i = 1; i <= 10; i++) {
              const expected = (i % 2 === 1) ? e1 : e2;
              if (history[N - i] !== expected) {
                isLoop = false;
                break;
              }
            }
          }
          
          if (isLoop) {
            console.log(`%c[Physics Engine] Loop Foul detected between ${e1} and ${e2}!`, "color: #e67e22; font-weight: bold;");
            // Loop detected! Trigger foul and halt physics simulation
            ballStateRef.current = { ...result.nextBall, velocity: [0, 0, 0] };
            hasProcessedStopRef.current = true; // Prevents handleBallStopped override
            triggerFoul(e1, e2, result.nextBall.position);
            return;
          }
        }
      }

      // Update local ref immediately
      ballStateRef.current = result.nextBall;

      // Update mesh position directly in Three.js
      if (ballMeshRef.current) {
        ballMeshRef.current.position.set(
          result.nextBall.position[0],
          result.nextBall.position[1],
          result.nextBall.position[2]
        );
        // Rotate ball based on ground speed
        ballMeshRef.current.rotation.x -= result.nextBall.velocity[2] * 0.1;
        ballMeshRef.current.rotation.z += result.nextBall.velocity[0] * 0.1;
      }

      // Handle Goal Scored
      if (result.isGoal && result.scoringTeam) {
        console.log(`%c[Physics Engine] Goal detected! Scoring team: ${result.scoringTeam}`, "color: #e74c3c; font-weight: bold; background: #fadbd8; padding: 2px 4px;");
        ballStateRef.current = { ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 };
        setBall({ ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 });
        hasProcessedStopRef.current = true; // Stop processed via goal
        scoreGoal(result.scoringTeam);
        return;
      }

      // Handle Tackle (Desarme)
      if (result.isTackle && result.tackleTeam) {
        console.log(`%c[Physics Engine] Tackle detected! Team: ${result.tackleTeam}`, "color: #9b59b6; font-weight: bold;");
        ballStateRef.current = { ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 };
        setBall({ ...result.nextBall, velocity: [0, 0, 0], speedMultiplier: 1 });
        hasProcessedStopRef.current = true; // Stop processed via tackle
        changePossession(result.tackleTeam, result.nextBall.position);
        setActionStatus(
          result.tackleTeam === 'HOME'
            ? 'Interceptado! Seu desarme parou a jogada.'
            : 'Interceptado! O desarme da IA parou a jogada.'
        );
        return;
      }
    } else {
      // 2. Ball is stationary. Check if possession needs to transfer
      // We only run this logic once when transitioning from moving to stopped
      if (!hasProcessedStopRef.current) {
        console.log(`%c[Physics Engine] Ball stopped physically at [${currentBall.position.map(n=>n.toFixed(2)).join(', ')}]. Transitioning state...`, "color: #1abc9c; font-weight: bold;");
        hasProcessedStopRef.current = true; // Mark as processed immediately
        
        // Sync final stationary state to React state
        setBall(currentBall);
        
        // Sync goalkeeper positions to React state
        const homeGK = homePlayersRef.current.find(p => p.number === 1);
        const awayGK = awayPlayersRef.current.find(p => p.number === 1);
        if (homeGK && awayGK && updateGoalkeeperPositions) {
          updateGoalkeeperPositions(homeGK.position[0], awayGK.position[0]);
        }
        
        handleBallStopped(currentBall.position);
      }
    }
  });

  const handleSlotClick = (slotId: string) => {
    if (selectedPlayerId) {
      SoundManager.init();
      SoundManager.playUIClick();
      placePlayer(selectedPlayerId, slotId);
    }
  };

  const isCaptainMoveActive = captainMoveMode !== null;

  const isMyTurn = isMultiplayer ? (turn === myRole) : (turn === 'HOME');
  const isFlickable = phase === GamePhase.ACTION && isMyTurn && !isIAThinking && Math.hypot(ball.velocity[0], ball.velocity[2]) < 0.1;

  // Use the real-time position from reference during physics tick, or the state when static
  const activeBallPos = phase === GamePhase.ACTION && Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.05 
    ? ballStateRef.current.position 
    : ball.position;

  return (
    <>
      <color attach="background" args={['#070a0e']} />
      <Stars radius={90} depth={40} count={2000} factor={3} saturation={0.5} fade speed={0.5} />
      
      <Suspense fallback={null}>
        {/* Lights */}
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

        {/* Pitch / Table */}
        <group
          onClick={(e) => {
            // Allow deselect during captain move mode too
            if (!isCaptainMoveActive) setSelectedPlayerId(null);
          }}
        >
          <Pitch 
            phase={phase}
            captainMoveMode={captainMoveMode}
            onSlotClick={handleSlotClick}
            hoveredSlotId={hoveredSlotId}
            setHoveredSlotId={setHoveredSlotId}
            homePlayers={homePlayers}
          />
        </group>

        {/* Goals */}
        <group position={[0, 0, -8]}>
          <Goal />
        </group>
        <group position={[0, 0, 8]} rotation={[0, Math.PI, 0]}>
          <Goal />
        </group>

        {/* Home Players */}
        {homePlayers.map(p => {
          const isPlaced = p.slotId !== null;
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
                number={p.number}
                onPointerDown={isControllable ? (e) => {
                  if (isCaptainMoveActive) {
                    const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                    if (!allowInCaptainMode) return;
                  } else if (phase !== GamePhase.PREPARATION) {
                    return;
                  }
                  handlePlayerRotateStart(p.id, e);
                } : undefined}
                onClick={isControllable ? (e) => {
                  if (isCaptainMoveActive) {
                    const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                    if (!allowInCaptainMode) return;
                  } else if (phase !== GamePhase.PREPARATION) {
                    return;
                  }
                  e.stopPropagation();
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
                number={p.number}
                onPointerDown={isControllable ? (e) => {
                  if (isCaptainMoveActive) {
                    const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                    if (!allowInCaptainMode) return;
                  } else if (phase !== GamePhase.PREPARATION) {
                    return;
                  }
                  handlePlayerRotateStart(p.id, e);
                } : undefined}
                onClick={isControllable ? (e) => {
                  if (isCaptainMoveActive) {
                    const allowInCaptainMode = p.isCaptain && p.team === captainMoveMode && (!isMultiplayer || myRole === captainMoveMode);
                    if (!allowInCaptainMode) return;
                  } else if (phase !== GamePhase.PREPARATION) {
                    return;
                  }
                  e.stopPropagation();
                  setSelectedPlayerId(selectedPlayerId === p.id ? null : p.id);
                } : undefined}
              />
            </group>
          );
        })}

        {/* The 3D Ball */}
        <Ball3D 
          ref={ballMeshRef} 
          position={ball.position} 
          velocity={ball.velocity} 
          isSelected={selectedPlayerId === 'ball'}
          onClick={(e) => {
            if (!isFlickable) return;
            e.stopPropagation();
            setSelectedPlayerId(selectedPlayerId === 'ball' ? null : 'ball');
          }}
          onPointerDown={(e) => {
            if (!isFlickable) return;
            setSelectedPlayerId('ball');
          }}
        />

        {/* Slingshot drag controller */}
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

        {/* Player Rotation drag indicators */}
        {phase === GamePhase.PREPARATION && rotatingPlayerId && renderPlayerRotationIndicator()}

        {/* Cinematics camera manager */}
        <CameraManager 
          phase={phase} 
          ballPos={activeBallPos} 
          turn={turn} 
          controlsEnabled={!isDraggingBall && !rotatingPlayerId && selectedPlayerId !== 'ball'} 
          recenterTrigger={recenterTrigger}
          isCameraCentered={isCameraCentered}
          setIsCameraCentered={setIsCameraCentered}
          captainMoveMode={captainMoveMode}
          ballMeshRef={ballMeshRef}
        />
      </Suspense>
    </>
  );
};

// 5. MAIN SCENE EXPORT (Canvas Wrapper)
const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas shadows camera={{ position: [0, 6, -9], fov: 45 }}>
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;
