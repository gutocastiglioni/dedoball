import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneContent } from './scene/SceneContent';
import { useGameStateContext } from '../GameStateContext';
import { GamePhase, Team, PlayerConfig, BallState, Difficulty } from '../types';

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

const Scene: React.FC<SceneProps> = (props) => {
  const { myRole } = useGameStateContext();
  const cameraPos: [number, number, number] = myRole === 'AWAY' ? [0, 6, 9] : [0, 6, -9];
  return (
    <Canvas 
      shadows 
      camera={{ position: cameraPos, fov: 45 }} 
      style={{ touchAction: 'none' }} 
      onContextMenu={(e) => e.preventDefault()}
    >
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;
