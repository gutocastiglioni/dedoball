import { useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { GamePhase, Difficulty, Team, PlayerConfig, BallState, ActionType, GameLogEntry } from '../types';
import { ALL_SLOTS } from '../gameConstants';
import SoundManager from '../SoundManager';

interface UseGameAIParams {
  phase: GamePhase;
  phaseRef: React.MutableRefObject<GamePhase>;
  turn: Team;
  turnRef: React.MutableRefObject<Team>;
  difficulty: Difficulty;
  isIAThinking: boolean;
  setIsIAThinking: React.Dispatch<React.SetStateAction<boolean>>;
  isIAThinkingRef: React.MutableRefObject<boolean>;
  isBallMoving: boolean;
  isMultiplayer: boolean;
  ball: BallState;
  ballRef: React.MutableRefObject<BallState>;
  setBall: React.Dispatch<React.SetStateAction<BallState>>;
  awayPlayers: PlayerConfig[];
  setAwayPlayers: React.Dispatch<React.SetStateAction<PlayerConfig[]>>;
  awayPlayersRef: React.MutableRefObject<PlayerConfig[]>;
  gameMode: 'standard' | 'manual';
  gkMoveActiveTeam: Team | null;
  addGameLog: (message: string, type: GameLogEntry['type']) => void;
  awayFlicksRemainingRef: React.MutableRefObject<number>;
  setAwayFlicksRemaining: React.Dispatch<React.SetStateAction<number>>;
  lastGoalScorerRef: React.MutableRefObject<Team | null>;
  consecutiveGoalsCountRef: React.MutableRefObject<number>;
  getTeamMaxBlockers: (team: Team, currentScorer: Team | null, currentCount: number) => number;
  isBannerActive: boolean;
}

export const useGameAI = ({
  phase,
  phaseRef,
  turn,
  turnRef,
  difficulty,
  isIAThinking,
  setIsIAThinking,
  isIAThinkingRef,
  isBallMoving,
  isMultiplayer,
  ball,
  ballRef,
  setBall,
  awayPlayers,
  setAwayPlayers,
  awayPlayersRef,
  gameMode,
  gkMoveActiveTeam,
  addGameLog,
  awayFlicksRemainingRef,
  setAwayFlicksRemaining,
  lastGoalScorerRef,
  consecutiveGoalsCountRef,
  getTeamMaxBlockers,
  isBannerActive
}: UseGameAIParams) => {

  // IA Setup (Preparation Phase)
  const setupIAPreparation = useCallback(() => {
    const availableNonGkSlots = ALL_SLOTS.filter(s => s.lineType !== 'GK' && s.team === 'AWAY');
    const gkSlot = ALL_SLOTS.find(s => s.id === 'away-gk')!;
    
    let selectedSlotIds: string[] = [];
    let attempts = 0;
    
    while (attempts < 200) {
      const shuffled = [...availableNonGkSlots].sort(() => Math.random() - 0.5);
      const candidates = shuffled.slice(0, 10);
      
      const attCount = candidates.filter(s => s.lineType === 'ATT' || (s.position[2] < -6.0 && s.team === 'AWAY')).length;
      const midCount = candidates.filter(s => s.lineType === 'MID').length;
      const extraDefCount = candidates.filter(s => s.position[2] === 6.7).length; // Defensive extra line for AWAY
      
      if (attCount >= 1 && attCount <= 3 && midCount >= 1 && extraDefCount <= 2) {
        selectedSlotIds = candidates.map(s => s.id);
        break;
      }
      attempts++;
    }
    
    // Fallback if loop didn't find one (extremely unlikely, but for safety)
    if (selectedSlotIds.length === 0) {
      const atts = availableNonGkSlots.filter(s => s.lineType === 'ATT' || (s.position[2] < -6.0 && s.team === 'AWAY')).sort(() => Math.random() - 0.5).slice(0, 2);
      const mids = availableNonGkSlots.filter(s => s.lineType === 'MID').sort(() => Math.random() - 0.5).slice(0, 3);
      const defs = availableNonGkSlots.filter(s => s.lineType === 'DEF' && s.position[2] !== 6.7).sort(() => Math.random() - 0.5).slice(0, 5);
      selectedSlotIds = [...atts, ...mids, ...defs].map(s => s.id);
    }

    setAwayPlayers(prev => {
      let tackleCount = 0;
      const maxTackles = getTeamMaxBlockers('AWAY', lastGoalScorerRef.current, consecutiveGoalsCountRef.current);

      return prev.map((p, i) => {
        if (i === 0) {
          return { ...p, slotId: gkSlot.id, position: gkSlot.position, angle: Math.PI, actionType: 'PASS' as ActionType, isBlocking: false };
        }
        
        const slotId = selectedSlotIds[i - 1];
        const slot = ALL_SLOTS.find(s => s.id === slotId)!;
        
        let angle = Math.PI;
        let actionType: ActionType = 'PASS';

        if (difficulty === Difficulty.EASY) {
          angle = Math.PI + (Math.random() - 0.5) * 1.5;
        } else {
          const dx = 0 - slot.position[0];
          const dz = -8 - slot.position[2];
          angle = Math.atan2(dx, dz);
          if (difficulty === Difficulty.MEDIUM) {
            angle += (Math.random() - 0.5) * 0.4;
          }
        }

        let isBlocking = false;
        const rand = Math.random();
        if (rand < 0.25 && tackleCount < maxTackles && slot.lineType !== 'GK') {
          isBlocking = true;
          tackleCount++;
        }

        if (slot.lineType === 'ATT') {
          actionType = 'SHOOT';
        } else if (slot.lineType === 'MID') {
          actionType = Math.random() < 0.6 ? 'PASS' : 'CROSS';
        } else {
          actionType = Math.random() < 0.4 ? 'PASS' : 'CROSS';
        }

        return { ...p, slotId, position: slot.position, angle, actionType, isBlocking };
      });
    });
  }, [difficulty, getTeamMaxBlockers, setAwayPlayers]);

  // IA Turn calculation
  useEffect(() => {
    if (isMultiplayer) return; // IA doesn't play in multiplayer mode!
    
    console.log(
      `%c[Dedoball IA] Evaluation: phase=${phase}, turn=${turn}, isIAThinking=${isIAThinkingRef.current}, isBallMoving=${isBallMoving}, ballVelocity=[${ball.velocity.map(n=>n.toFixed(2)).join(', ')}]`,
      "color: #e55039; font-weight: bold;"
    );

    if (phase === GamePhase.ACTION && turn === 'AWAY' && !isIAThinkingRef.current && !isBallMoving && gkMoveActiveTeam === null && !isBannerActive) {
      console.log("%c[Dedoball IA] Conditions met! IA starts planning shot...", "color: #e55039; font-weight: bold; background: #2d1f18; padding: 2px 4px;");
      isIAThinkingRef.current = true;
      setIsIAThinking(true);
      const thinkTime = difficulty === Difficulty.EASY ? 1500 : difficulty === Difficulty.MEDIUM ? 2000 : 2500;
      
      const timer = setTimeout(() => {
        // Bulletproof Guard: ensure it is still the AI's turn in Action phase before shooting!
        if (turnRef.current !== 'AWAY' || phaseRef.current !== GamePhase.ACTION) {
          console.warn("%c[Dedoball IA] Aborting planned shot: turn or phase changed during thinking!", "color: #e55039; font-weight: bold;");
          isIAThinkingRef.current = false;
          setIsIAThinking(false);
          return;
        }

        const [bx, by, bz] = ballRef.current.position;
        let vx = 0;
        let vz = 0;

        console.log(`%c[Dedoball IA] Calculating shot... Ball Pos=[${bx.toFixed(2)}, ${bz.toFixed(2)}], difficulty=${difficulty}`, "color: #e55039;");

        if (difficulty === Difficulty.EASY) {
          const angle = Math.PI * (1.1 + Math.random() * 0.8);
          const speed = 30.0; // Standardized maximum game ball speed
          vx = Math.sin(angle) * speed;
          vz = Math.cos(angle) * speed;
        } else if (difficulty === Difficulty.MEDIUM) {
          const dx = 0 - bx;
          const dz = -8 - bz;
          const angle = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.3;
          const speed = 30.0; // Standardized maximum game ball speed
          vx = Math.sin(angle) * speed;
          vz = Math.cos(angle) * speed;
        } else {
          const dx = 0 - bx;
          const dz = -8 - bz;
          const dist = Math.hypot(dx, dz);
          
          const teammates = awayPlayersRef.current.filter(p => p.slotId !== null);
          let bestPeg: PlayerConfig | null = null;
          let minDistanceToPeg = Infinity;

          for (const p of teammates) {
            const px = p.position[0];
            const pz = p.position[2];
            const distToPeg = Math.hypot(px - bx, pz - bz);
            if (distToPeg < 6 && distToPeg > 1) {
              const pegAngle = p.angle;
              const pegToGoalDx = 0 - px;
              const pegToGoalDz = -8 - pz;
              const targetAngle = Math.atan2(pegToGoalDx, pegToGoalDz);
              const angleDiff = Math.abs(Math.atan2(Math.sin(pegAngle - targetAngle), Math.cos(pegAngle - targetAngle)));
              
              if (angleDiff < 0.4 && distToPeg < minDistanceToPeg) {
                bestPeg = p;
                minDistanceToPeg = distToPeg;
              }
            }
          }

          if (bestPeg) {
            const tdx = bestPeg.position[0] - bx;
            const tdz = bestPeg.position[2] - bz;
            const angle = Math.atan2(tdx, tdz);
            const speed = 30.0; // Standardized maximum game ball speed
            vx = Math.sin(angle) * speed;
            vz = Math.cos(angle) * speed;
          } else {
            const angle = Math.atan2(dx, dz);
            const speed = 30.0; // Standardized maximum game ball speed
            vx = Math.sin(angle) * speed;
            vz = Math.cos(angle) * speed;
          }
        }

        console.log(`%c[Dedoball IA] Planned velocity: vx=${vx.toFixed(2)}, vz=${vz.toFixed(2)}. Firing now!`, "color: #e55039; font-weight: bold;");

        // Play premium visual kick sound for the AI shot to match human shooter feedback
        SoundManager.playKick(Math.hypot(vx, vz));

        const isKickoff = ballRef.current.isKickoff;
        let finalVx = vx;
        let finalVz = vz;
        if (isKickoff) {
          const kickMultiplier = gameMode === 'manual' ? 1.6 : 1.0;
          finalVx *= kickMultiplier;
          finalVz *= kickMultiplier;
        }

        // Dispatch a custom event to notify SceneContent of the AI shot instantly
        window.dispatchEvent(new CustomEvent('dedoball-ai-shot', { detail: { vx: finalVx, vz: finalVz } }));

        flushSync(() => {
          if (isKickoff) {
            console.log("%c[Dedoball IA] Kickoff shot! This flick does NOT count.", "color: #2ecc71; font-weight: bold;");
            addGameLog(`Saída de bola (Kickoff) executada pela IA. (Sem custo de peteleco)`, 'flick');
            setBall(prev => ({ ...prev, velocity: [finalVx, 0, finalVz], isKickoff: false }));
          } else {
            const oldFlicks = awayFlicksRemainingRef.current;
            const newFlicks = Math.max(0, oldFlicks - 1);
            awayFlicksRemainingRef.current = newFlicks;
            setAwayFlicksRemaining(newFlicks);
            addGameLog(`Peteleco executado pelo Time Visitante/IA. Restantes na rodada: ${newFlicks}/3.`, 'flick');
            setBall(prev => ({ ...prev, velocity: [finalVx, 0, finalVz] }));
          }
          
          isIAThinkingRef.current = false;
          setIsIAThinking(false);
        });
      }, thinkTime);

      return () => {
        console.log("%c[Dedoball IA] Cleaning up pending AI shot timer due to dependency change.", "color: #e55039;");
        clearTimeout(timer);
        isIAThinkingRef.current = false;
        setIsIAThinking(false);
      };
    }
  }, [phase, turn, difficulty, isBallMoving, isMultiplayer, setBall, setAwayFlicksRemaining, addGameLog, isIAThinkingRef, setIsIAThinking, turnRef, phaseRef, ballRef, awayPlayersRef, gameMode, gkMoveActiveTeam, awayFlicksRemainingRef, isBannerActive]);

  return {
    setupIAPreparation
  };
};
