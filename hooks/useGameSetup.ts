import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Team, PlayerConfig, ActionType, GamePhase, BallState, GameLogEntry, UniformConfig } from '../types';
import { ALL_SLOTS, ETHNICITIES, INITIAL_BALL } from '../gameConstants';
import { db, ref, set, update } from '../firebase';

interface UseGameSetupParams {
  isMultiplayer: boolean;
  roomId: string | null;
  myRole: Team | null;
  myRoleRef: React.MutableRefObject<Team | null>;
  gameMode: 'standard' | 'manual';
  phase: GamePhase;
  phaseRef: React.MutableRefObject<GamePhase>;
  turn: Team;
  turnRef: React.MutableRefObject<Team>;
  ball: BallState;
  ballRef: React.MutableRefObject<BallState>;
  setBall: React.Dispatch<React.SetStateAction<BallState>>;
  homePlayers: PlayerConfig[];
  setHomePlayers: React.Dispatch<React.SetStateAction<PlayerConfig[]>>;
  homePlayersRef: React.MutableRefObject<PlayerConfig[]>;
  awayPlayers: PlayerConfig[];
  setAwayPlayers: React.Dispatch<React.SetStateAction<PlayerConfig[]>>;
  awayPlayersRef: React.MutableRefObject<PlayerConfig[]>;
  homeReady: boolean;
  setHomeReady: React.Dispatch<React.SetStateAction<boolean>>;
  awayReady: boolean;
  setAwayReady: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPlayerId: string | null;
  setSelectedPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  gkMoveActiveTeam: Team | null;
  setGkMoveActiveTeam: React.Dispatch<React.SetStateAction<Team | null>>;
  gkMoveActiveTeamRef: React.MutableRefObject<Team | null>;
  gkMoveTimer: number | null;
  setGkMoveTimer: React.Dispatch<React.SetStateAction<number | null>>;
  gkMoveTimerRef: React.MutableRefObject<number | null>;
  captainMoveMode: Team | null;
  captainMoveModeRef: React.MutableRefObject<Team | null>;
  lastGoalScorerRef: React.MutableRefObject<Team | null>;
  consecutiveGoalsCountRef: React.MutableRefObject<number>;
  setCaptainMoveMode: React.Dispatch<React.SetStateAction<Team | null>>;
  setScores: React.Dispatch<React.SetStateAction<{ home: number; away: number }>>;
  setLastGoalScorer: React.Dispatch<React.SetStateAction<Team | null>>;
  setConsecutiveGoalsCount: React.Dispatch<React.SetStateAction<number>>;
  setGameTime: React.Dispatch<React.SetStateAction<number>>;
  setHomeFlicksRemaining: React.Dispatch<React.SetStateAction<number>>;
  setAwayFlicksRemaining: React.Dispatch<React.SetStateAction<number>>;
  setActionStatus: React.Dispatch<React.SetStateAction<string>>;
  addGameLog: (message: string, type: GameLogEntry['type']) => void;
  setSystemMessage: React.Dispatch<React.SetStateAction<{ title: string; message: string; type?: 'info' | 'error' | 'success' | 'warning' } | null>>;
  setupIAPreparation: () => void;
  confirmCaptainMove: () => void;
  setPhase: React.Dispatch<React.SetStateAction<GamePhase>>;
}

export const useGameSetup = ({
  isMultiplayer,
  roomId,
  myRole,
  myRoleRef,
  gameMode,
  phase,
  phaseRef,
  turn,
  turnRef,
  ball,
  ballRef,
  setBall,
  homePlayers,
  setHomePlayers,
  homePlayersRef,
  awayPlayers,
  setAwayPlayers,
  awayPlayersRef,
  homeReady,
  setHomeReady,
  awayReady,
  setAwayReady,
  selectedPlayerId,
  setSelectedPlayerId,
  gkMoveActiveTeam,
  setGkMoveActiveTeam,
  gkMoveActiveTeamRef,
  gkMoveTimer,
  setGkMoveTimer,
  gkMoveTimerRef,
  captainMoveMode,
  captainMoveModeRef,
  lastGoalScorerRef,
  consecutiveGoalsCountRef,
  setCaptainMoveMode,
  setScores,
  setLastGoalScorer,
  setConsecutiveGoalsCount,
  setGameTime,
  setHomeFlicksRemaining,
  setAwayFlicksRemaining,
  setActionStatus,
  addGameLog,
  setSystemMessage,
  setupIAPreparation,
  confirmCaptainMove,
  setPhase
}: UseGameSetupParams) => {

  const getPlayerMaxBlockers = useCallback((playerId: string) => {
    return 3;
  }, []);

  const getTeamMaxBlockers = useCallback((team: Team, currentScorer: Team | null, currentCount: number) => {
    return 3;
  }, []);

  const enforceBlockerLimit = useCallback((team: Team, currentScorer: Team | null, currentCount: number) => {
    const maxLimit = getTeamMaxBlockers(team, currentScorer, currentCount);
    const setPlayers = team === 'HOME' ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => {
      let blockCount = 0;
      let tackleCount = 0;
      return prev.map(p => {
        let updated = { ...p };
        if (p.isBlocking) {
          blockCount++;
          if (blockCount > maxLimit) {
            updated.isBlocking = false;
          }
        }
        if (p.actionType === 'TACKLE') {
          tackleCount++;
          if (tackleCount > maxLimit) {
            updated.actionType = 'PASS';
          }
        }
        return updated;
      });
    });
  }, [getTeamMaxBlockers, setHomePlayers, setAwayPlayers]);

  // Initialize Teams with balanced default formations
  const initializeTeams = useCallback(() => {
    const defaultHomeSlotIds = [
      'home-gk',                                              // GK
      'home-slot-0-1', 'home-slot-0-2', 'home-slot-0-3',    // 3 defensores centrais (row 0)
      'home-slot-1-2', 'home-slot-1-3',                      // 2 meias centrais (row 1)
      'home-slot-2-1', 'home-slot-2-4',                      // 2 alas nos flancos (row 2)
      'home-slot-3-0', 'home-slot-3-2', 'home-slot-3-4'      // 3 atacantes (row 3)
    ];

    const defaultAwaySlotIds = [
      'away-gk',                                              // GK
      'away-slot-0-1', 'away-slot-0-2', 'away-slot-0-3',    // 3 defensores centrais (row 0)
      'away-slot-1-2', 'away-slot-1-3',                      // 2 meias centrais (row 1)
      'away-slot-2-1', 'away-slot-2-4',                      // 2 alas nos flancos (row 2)
      'away-slot-3-0', 'away-slot-3-2', 'away-slot-3-4'      // 3 atacantes (row 3)
    ];

    // Create Home Players
    const home: PlayerConfig[] = Array.from({ length: 11 }, (_, i) => {
      const isCaptain = i === 9;
      const slotId = defaultHomeSlotIds[i];
      const slot = ALL_SLOTS.find(s => s.id === slotId);
      const position = slot ? slot.position : [0, 0.2, -10] as [number, number, number];
      const eth = ETHNICITIES[i % ETHNICITIES.length];
      
      return {
        id: `home-p${i + 1}`,
        team: 'HOME',
        slotId,
        angle: 0, // points forward
        actionType: 'PASS' as ActionType,
        isBlocking: false,
        isCaptain,
        number: i + 1,
        position,
        skinColor: eth.skin,
        hairColor: eth.hair,
        gkSaves: 0
      };
    });

    // Create Away Players
    const away: PlayerConfig[] = Array.from({ length: 11 }, (_, i) => {
      const isCaptain = i === 9;
      const slotId = defaultAwaySlotIds[i];
      const slot = ALL_SLOTS.find(s => s.id === slotId);
      const position = slot ? slot.position : [0, 0.2, 10] as [number, number, number];
      const eth = ETHNICITIES[i % ETHNICITIES.length];
      
      return {
        id: `away-p${i + 1}`,
        team: 'AWAY',
        slotId,
        angle: Math.PI, // points down
        actionType: 'PASS' as ActionType,
        isBlocking: false,
        isCaptain,
        number: i + 1,
        position,
        skinColor: eth.skin,
        hairColor: eth.hair,
        gkSaves: 0
      };
    });

    setHomePlayers(home);
    setAwayPlayers(away);
    setHomeReady(false);
    setAwayReady(false);
  }, [setHomePlayers, setAwayPlayers, setHomeReady, setAwayReady]);

  // Drag and place player in slot
  const placePlayer = (playerId: string, slotId: string, customX?: number) => {
    // ── Goalkeeper 10-second manual move (ACTION phase, manual mode) ────────
    if (phase !== GamePhase.PREPARATION && gameMode === 'manual' && gkMoveActiveTeam !== null) {
      const concedingTeam = gkMoveActiveTeam;
      const playerTeam: Team = playerId.startsWith('home') ? 'HOME' : 'AWAY';
      if (playerTeam !== concedingTeam) return;

      if (isMultiplayer && myRole && myRole !== concedingTeam) return;

      const teamPlayers = concedingTeam === 'HOME' ? homePlayersRef.current : awayPlayersRef.current;
      const movingPlayer = teamPlayers.find(p => p.id === playerId);
      const isGK = movingPlayer?.number === 1;
      if (!isGK) return; // Only goalkeeper

      const targetSlot = ALL_SLOTS.find(s => s.id === slotId);
      if (!targetSlot) return;
      if (targetSlot.team !== concedingTeam) return;

      const isOccupied = teamPlayers.some(p => p.slotId === slotId && p.id !== playerId);
      if (isOccupied) return;

      const targetX = customX !== undefined ? customX : targetSlot.position[0];
      const targetPos: [number, number, number] = [targetX, 0.2, targetSlot.position[2]];

      const setPlayers = concedingTeam === 'HOME' ? setHomePlayers : setAwayPlayers;
      flushSync(() => {
        setPlayers(prev => prev.map(p =>
          p.id === playerId ? { ...p, slotId, position: targetPos } : p
        ));
        setGkMoveActiveTeam(null);
        gkMoveActiveTeamRef.current = null;
        setGkMoveTimer(null);
        gkMoveTimerRef.current = null;
      });

      // Sync to Firebase if multiplayer
      if (isMultiplayer && roomId) {
        const nextHomePlayers = concedingTeam === 'HOME' 
          ? homePlayersRef.current.map(p => p.id === playerId ? { ...p, slotId, position: targetPos } : p)
          : homePlayersRef.current;
        const nextAwayPlayers = concedingTeam === 'AWAY'
          ? awayPlayersRef.current.map(p => p.id === playerId ? { ...p, slotId, position: targetPos } : p)
          : awayPlayersRef.current;

        update(ref(db, `rooms/${roomId}/gameState`), {
          homePlayers: nextHomePlayers,
          awayPlayers: nextAwayPlayers,
          gkMoveActiveTeam: null,
          gkMoveTimer: null
        });
      }
      return;
    }

    // ── Captain Move Mode (after goal) ───────────────────────────────────────
    if (captainMoveModeRef.current !== null) {
      const concedingTeam = captainMoveModeRef.current;
      const playerTeam: Team = playerId.startsWith('home') ? 'HOME' : 'AWAY';
      if (playerTeam !== concedingTeam) return; // Only conceding team

      // In multiplayer, only the conceding player can act
      if (isMultiplayer && myRole && myRole !== concedingTeam) return;

      const teamPlayers = concedingTeam === 'HOME' ? homePlayersRef.current : awayPlayersRef.current;
      const movingPlayer = teamPlayers.find(p => p.id === playerId);
      const canMove = movingPlayer?.isCaptain;
      if (!canMove) return; // Only captain

      const targetSlot = ALL_SLOTS.find(s => s.id === slotId);
      if (!targetSlot) return;
      if (targetSlot.team !== concedingTeam) return;
      if (targetSlot.lineType === 'GK') return;

      const targetX = customX !== undefined ? customX : targetSlot.position[0];
      const targetPos: [number, number, number] = [targetX, 0.2, targetSlot.position[2]];

      const isOccupied = teamPlayers.some(p => 
        p.id !== playerId && 
        p.slotId !== null && 
        Math.abs(p.position[2] - targetPos[2]) < 0.1 &&
        Math.abs(p.position[0] - targetPos[0]) < 0.7
      );
      if (isOccupied) return;

      // Check if placing the player here exceeds the 3 attacking players limit
      const simulatedPlayers = teamPlayers.map(p =>
        p.id === playerId ? { ...p, slotId, position: targetPos } : p
      );
      const attCount = simulatedPlayers.filter(p => {
        if (p.number === 1) return false; // exclude GK
        if (!p.slotId) return false;
        const slot = ALL_SLOTS.find(s => s.id === p.slotId);
        if (!slot) return false;
        if (concedingTeam === 'HOME') {
          return slot.lineType === 'ATT' || (slot.position[2] > 6.0 && slot.team === 'HOME');
        } else {
          return slot.lineType === 'ATT' || (slot.position[2] < -6.0 && slot.team === 'AWAY');
        }
      }).length;

      if (attCount > 3) {
        if (!isMultiplayer || myRole === concedingTeam) {
          setSystemMessage({
            title: 'Limite de Atacantes Excedido',
            message: 'A regra do jogo permite no máximo 3 jogadores de linha na zona de ataque (linha de ataque + linha extra adversária). Posicione seu jogador fora do ataque.',
            type: 'warning'
          });
        }
        return;
      }

      const setPlayers = concedingTeam === 'HOME' ? setHomePlayers : setAwayPlayers;
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, slotId, position: targetPos } : p
      ));
      setSelectedPlayerId(null);
      return;
    }
    // ── End Captain Move Mode ─────────────────────────────────────────────────

    if (phase !== GamePhase.PREPARATION) return;

    // Block editing opponent team (robust check for both multiplayer and singleplayer)
    const isHomePlayer = playerId.startsWith('home');
    const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
    if (myControllingTeam === 'HOME' && !isHomePlayer) return;
    if (myControllingTeam === 'AWAY' && isHomePlayer) return;

    const targetSlot = ALL_SLOTS.find(s => s.id === slotId);
    if (!targetSlot) return;

    const isHome = playerId.startsWith('home');
    const playerNum = parseInt(playerId.replace('home-p', '').replace('away-p', ''));
    const isGK = playerNum === 1;

    if (isGK && gameMode !== 'manual') {
      if (isHome && slotId !== 'home-gk') return;
      if (!isHome && slotId !== 'away-gk') return;
    }
    if (!isGK && targetSlot.lineType === 'GK' && gameMode !== 'manual') return;

    if (isHome && targetSlot.team !== 'HOME') return;
    if (!isHome && targetSlot.team !== 'AWAY') return;

    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;

    setPlayers(prev => {
      const targetX = customX !== undefined ? customX : targetSlot.position[0];
      const targetPos: [number, number, number] = [targetX, 0.2, targetSlot.position[2]];

      const conflictPlayer = prev.find(p => 
        p.id !== playerId && 
        p.slotId !== null && 
        Math.abs(p.position[2] - targetPos[2]) < 0.1 &&
        Math.abs(p.position[0] - targetPos[0]) < 0.7
      );

      const isDefensiveSlot = (slotPos: [number, number, number]) =>
        isHome ? slotPos[2] < 0 : slotPos[2] > 0;

      const simulatedPlayers = prev.map(p => {
        if (p.id === playerId) {
          const safeActionType =
            p.actionType === 'SHOOT' && isDefensiveSlot(targetSlot.position)
              ? 'CROSS' as ActionType
              : p.actionType;
          return { ...p, slotId, position: targetPos, actionType: safeActionType };
        }
        if (conflictPlayer && p.id === conflictPlayer.id) {
          const currentMovingPlayer = prev.find(mp => mp.id === playerId)!;
          const swapSlotId = currentMovingPlayer.slotId;
          const swapPos: [number, number, number] = currentMovingPlayer.position
            ? [...currentMovingPlayer.position]
            : [0, 0.2, isHome ? -5.5 : 5.5];
          const safeActionType =
            p.actionType === 'SHOOT' && isDefensiveSlot(swapPos)
              ? 'CROSS' as ActionType
              : p.actionType;
          return {
            ...p,
            slotId: swapSlotId ?? null,
            position: swapPos,
            actionType: safeActionType
          };
        }
        return p;
      });

      const attCount = simulatedPlayers.filter(p => {
        if (p.number === 1) return false; // exclude GK
        const z = p.position[2];
        if (isHome) {
          return Math.abs(z - 3.93) < 0.1 || Math.abs(z - 6.7) < 0.1;
        } else {
          return Math.abs(z - (-3.93)) < 0.1 || Math.abs(z - (-6.7)) < 0.1;
        }
      }).length;

      if (attCount > 3) {
        if (isHome) {
          setSystemMessage({
            title: 'Limite de Atacantes Excedido',
            message: 'A regra do jogo permite no máximo 3 jogadores de linha na zona de ataque (linha de ataque + linha extra adversária). Mova um atacante para trás antes de posicionar outro jogador no ataque.',
            type: 'warning'
          });
        }
        return prev;
      }

      if (attCount < 1) {
        if (!isMultiplayer || myRole === (isHome ? 'HOME' : 'AWAY')) {
          setSystemMessage({
            title: 'Ataque Obrigatório',
            message: 'Sua tática precisa ter pelo menos 1 jogador no ataque. Avance outro jogador para o ataque antes de tirar este.',
            type: 'warning'
          });
        }
        return prev;
      }

      const midCount = simulatedPlayers.filter(p => {
        if (p.number === 1) return false; // exclude GK
        const z = p.position[2];
        if (isHome) {
          return Math.abs(z - (-2.36)) < 0.1 || Math.abs(z - 0.79) < 0.1;
        } else {
          return Math.abs(z - 2.36) < 0.1 || Math.abs(z - (-0.79)) < 0.1;
        }
      }).length;

      if (midCount < 1) {
        if (!isMultiplayer || myRole === (isHome ? 'HOME' : 'AWAY')) {
          setSystemMessage({
            title: 'Meio-campo Obrigatório',
            message: 'Sua tática precisa ter pelo menos 1 jogador no meio-campo. Recue outro jogador para o meio antes de tirar este.',
            type: 'warning'
          });
        }
        return prev;
      }

      const extraDefCount = simulatedPlayers.filter(p => {
        if (p.number === 1) return false; // exclude GK
        const z = p.position[2];
        return Math.abs(z - (isHome ? -6.7 : 6.7)) < 0.1;
      }).length;

      if (extraDefCount > 2) {
        if (!isMultiplayer || myRole === (isHome ? 'HOME' : 'AWAY')) {
          setSystemMessage({
            title: 'Limite da Linha Extra Defensiva Excedido',
            message: 'A regra do jogo permite no máximo 2 jogadores de linha na sua linha extra defensiva. Mova um defensor para fora da linha extra antes de colocar outro.',
            type: 'warning'
          });
        }
        return prev;
      }

      return simulatedPlayers;
    });
    setSelectedPlayerId(null);
  };

  const updatePlayerAngle = (playerId: string, angle: number) => {
    const isReady = isMultiplayer && (myRole === 'HOME' ? homeReady : awayReady);
    if (isReady) return;

    // Block editing opponent team (robust check for both multiplayer and singleplayer)
    const isHomePlayer = playerId.startsWith('home');
    const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
    if (myControllingTeam === 'HOME' && !isHomePlayer) return;
    if (myControllingTeam === 'AWAY' && isHomePlayer) return;

    const isHome = playerId.startsWith('home');
    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, angle } : p));
  };

  const updatePlayerActionType = (playerId: string, actionType: ActionType) => {
    const isReady = isMultiplayer && (myRole === 'HOME' ? homeReady : awayReady);
    if (isReady) return;

    // Block editing opponent team (robust check for both multiplayer and singleplayer)
    const isHomePlayer = playerId.startsWith('home');
    const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
    if (myControllingTeam === 'HOME' && !isHomePlayer) return;
    if (myControllingTeam === 'AWAY' && isHomePlayer) return;

    const isHome = playerId.startsWith('home');
    const player = (isHome ? homePlayers : awayPlayers).find(p => p.id === playerId);
    if (!player) return;

    if (actionType === 'SHOOT') {
      const slot = ALL_SLOTS.find(s => s.id === player.slotId);
      if (slot && slot.position[2] < 0) return;
    }

    if (actionType === 'TACKLE') {
      const currentPlayers = isHome ? homePlayers : awayPlayers;
      const tackleCount = currentPlayers.filter(p => p.actionType === 'TACKLE' && p.id !== playerId).length;
      const limit = getPlayerMaxBlockers(playerId);
      if (tackleCount >= limit) {
        throw new Error('LIMIT_EXCEEDED');
      }
    }

    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, actionType } : p));
  };

  const updatePlayerBlocking = (playerId: string, isBlocking: boolean) => {
    const isReady = isMultiplayer && (myRole === 'HOME' ? homeReady : awayReady);
    if (isReady) return;

    // Block editing opponent team (robust check for both multiplayer and singleplayer)
    const isHomePlayer = playerId.startsWith('home');
    const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
    if (myControllingTeam === 'HOME' && !isHomePlayer) return;
    if (myControllingTeam === 'AWAY' && isHomePlayer) return;

    const isHome = playerId.startsWith('home');
    if (isBlocking) {
      const currentPlayers = isHome ? homePlayers : awayPlayers;
      const blockingCount = currentPlayers.filter(p => p.isBlocking && p.id !== playerId).length;
      const limit = getPlayerMaxBlockers(playerId);
      if (blockingCount >= limit) {
        throw new Error('LIMIT_EXCEEDED');
      }
    }
    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isBlocking } : p));
  };

  // Change Captain (only during Preparation; GK cannot be captain)
  const setCaptain = (playerId: string) => {
    const isReady = isMultiplayer && (myRole === 'HOME' ? homeReady : awayReady);
    if (isReady) return;

    if (phase !== GamePhase.PREPARATION) return;
    if (captainMoveModeRef.current !== null) return; // Block changing captain after kickoff / during captain Move Mode!

    // Block editing opponent team (robust check for both multiplayer and singleplayer)
    const isHomePlayer = playerId.startsWith('home');
    const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
    if (myControllingTeam === 'HOME' && !isHomePlayer) return;
    if (myControllingTeam === 'AWAY' && isHomePlayer) return;

    const isHome = playerId.startsWith('home');
    const allPlayers = isHome ? homePlayers : awayPlayers;
    const target = allPlayers.find(p => p.id === playerId);
    if (!target || target.number === 1) return; // GK cannot be captain
    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => ({
      ...p,
      isCaptain: p.id === playerId
    })));
  };

  const completePreparation = async () => {
    const isReady = isMultiplayer && (myRole === 'HOME' ? homeReady : awayReady);
    if (isReady && captainMoveModeRef.current === null) return; // Allow confirmCaptainMove to execute if in captain move mode even if ready is set!

    if (captainMoveModeRef.current !== null) {
      confirmCaptainMove();
      return;
    }

    // ── Enforce Tactical Formation Rules ──
    if (captainMoveModeRef.current === null) {
      const activeTeam: Team = (isMultiplayer && myRole) ? myRole : 'HOME';
      const playersToValidate = activeTeam === 'HOME' ? homePlayersRef.current : awayPlayersRef.current;
      const isHomeTeam = activeTeam === 'HOME';

      const midCount = playersToValidate.filter(p => {
        if (p.number === 1) return false; // exclude GK
        const z = p.position[2];
        if (isHomeTeam) {
          return Math.abs(z - (-2.36)) < 0.1 || Math.abs(z - 0.79) < 0.1;
        } else {
          return Math.abs(z - 2.36) < 0.1 || Math.abs(z - (-0.79)) < 0.1;
        }
      }).length;

      const attCount = playersToValidate.filter(p => {
        if (p.number === 1) return false; // exclude GK
        const z = p.position[2];
        if (isHomeTeam) {
          return Math.abs(z - 3.93) < 0.1 || Math.abs(z - 6.7) < 0.1;
        } else {
          return Math.abs(z - (-3.93)) < 0.1 || Math.abs(z - (-6.7)) < 0.1;
        }
      }).length;

      const extraDefCount = playersToValidate.filter(p => {
        if (p.number === 1) return false; // exclude GK
        const z = p.position[2];
        return Math.abs(z - (isHomeTeam ? -6.7 : 6.7)) < 0.1;
      }).length;

      console.log(`[Tactical Validation] activeTeam=${activeTeam}, midCount=${midCount}, attCount=${attCount}, extraDefCount=${extraDefCount}`);

      if (midCount < 1) {
        setSystemMessage({
          title: 'Formação Inválida',
          message: 'Sua tática precisa ter pelo menos 1 jogador posicionado na linha de meio-campo.',
          type: 'warning'
        });
        return;
      }

      if (attCount < 1) {
        setSystemMessage({
          title: 'Formação Inválida',
          message: 'Sua tática precisa ter pelo menos 1 jogador posicionado no campo de ataque.',
          type: 'warning'
        });
        return;
      }

      if (extraDefCount > 2) {
        setSystemMessage({
          title: 'Formação Inválida',
          message: 'Não é permitido ter mais de 2 jogadores na linha extra defensiva.',
          type: 'warning'
        });
        return;
      }
    }

    if (isMultiplayer && roomId && myRole) {
      const localPlayers = myRole === 'HOME' ? homePlayers : awayPlayers;
      
      // Send configurations to DB
      await set(ref(db, `rooms/${roomId}/gameState/${myRole.toLowerCase()}Players`), localPlayers);
      await update(ref(db, `rooms/${roomId}/players/${myRole.toLowerCase()}`), { ready: true });
      
      if (myRole === 'HOME') setHomeReady(true);
      else setAwayReady(true);
      
      setActionStatus('Aguardando oponente confirmar tática...');
      addGameLog(`Tática de guerra confirmada por ${myRole === 'HOME' ? 'Casa (Você)' : 'Visitante (Você)'}!`, 'info');
    } else {
      flushSync(() => {
        setHomeReady(true);
        addGameLog(`Tática de guerra confirmada pelo jogador!`, 'info');
        setupIAPreparation();
        addGameLog(`A IA definiu sua formação tática.`, 'info');
        
        // In single-player, start the match immediately!
        setPhase(GamePhase.ACTION);
        
        const turnVal = turnRef.current;
        const nextStatus = turnVal === 'HOME'
          ? 'Partida Iniciada! Sua vez: dê o peteleco na bola.'
          : 'A IA está preparando o contra-ataque...';
        setActionStatus(nextStatus);
      });
    }
  };

  const updateGoalkeeperPositions = useCallback((homeX: number, homeZ: number, awayX: number, awayZ: number) => {
    setHomePlayers(prev => prev.map(p => p.number === 1 ? { ...p, position: [homeX, p.position[1], homeZ] } : p));
    setAwayPlayers(prev => prev.map(p => p.number === 1 ? { ...p, position: [awayX, p.position[1], awayZ] } : p));
  }, [setHomePlayers, setAwayPlayers]);

  const incrementGoalkeeperSaves = useCallback((team: Team) => {
    const isHome = team === 'HOME';
    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    const playersRef = isHome ? homePlayersRef : awayPlayersRef;
    
    setPlayers(prev => prev.map(p => {
      if (p.number === 1) {
        const nextSaves = (p.gkSaves ?? 0) + 1;
        return { ...p, gkSaves: nextSaves };
      }
      return p;
    }));

    playersRef.current = playersRef.current.map(p => {
      if (p.number === 1) {
        const nextSaves = (p.gkSaves ?? 0) + 1;
        return { ...p, gkSaves: nextSaves };
      }
      return p;
    });

    const currentSaves = playersRef.current.find(p => p.number === 1)?.gkSaves ?? 0;
    addGameLog(`Defesa do goleiro do Time ${isHome ? 'Casa' : 'IA'}! Total: ${currentSaves} defesas (${currentSaves}% mais lento).`, 'collision');
  }, [addGameLog, setHomePlayers, setAwayPlayers, homePlayersRef, awayPlayersRef]);

  return {
    getPlayerMaxBlockers,
    getTeamMaxBlockers,
    enforceBlockerLimit,
    initializeTeams,
    placePlayer,
    updatePlayerAngle,
    updatePlayerActionType,
    updatePlayerBlocking,
    setCaptain,
    completePreparation,
    updateGoalkeeperPositions,
    incrementGoalkeeperSaves
  };
};
