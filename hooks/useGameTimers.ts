import { useEffect } from 'react';
import { GamePhase, Team, BallState } from '../types';
import { db, ref, update } from '../firebase';
import SoundManager from '../SoundManager';

interface UseGameTimersParams {
  phase: GamePhase;
  phaseRef: React.MutableRefObject<GamePhase>;
  isMultiplayer: boolean;
  roomId: string | null;
  myRole: Team | null;
  myRoleRef: React.MutableRefObject<Team | null>;
  ball: BallState;
  opponentDisconnected: boolean;
  turnTimer: number | null;
  setTurnTimer: React.Dispatch<React.SetStateAction<number | null>>;
  prepTimer: number | null;
  setPrepTimer: React.Dispatch<React.SetStateAction<number | null>>;
  disconnectCountdown: number;
  setDisconnectCountdown: React.Dispatch<React.SetStateAction<number>>;
  gkMoveTimer: number | null;
  setGkMoveTimer: React.Dispatch<React.SetStateAction<number | null>>;
  setGkMoveActiveTeam: React.Dispatch<React.SetStateAction<Team | null>>;
  gkMoveTimerRef: React.MutableRefObject<number | null>;
  gkMoveActiveTeamRef: React.MutableRefObject<Team | null>;
  gameTimeSeconds: number;
  setGameTimeSeconds: React.Dispatch<React.SetStateAction<number>>;
  gameTimeSecondsRef: React.MutableRefObject<number>;
  setGameTime: React.Dispatch<React.SetStateAction<number>>;
  gameTimeRef: React.MutableRefObject<number>;
  matchDuration: number;
  matchDurationRef: React.MutableRefObject<number>;
  captainMoveMode: Team | null;
  homeReady: boolean;
  awayReady: boolean;
  turn: Team;
  currentRoom: any;
  triggerActiveTurnTimeout: (team: Team) => void;
  triggerTimeoutDefeat: () => void;
  triggerForceStartAfterTimeout: () => void;
  triggerWO: () => void;
  handleHalfTime: () => void;
  handleFullTime: () => void;
  injuryTime: 'none' | 'halftime' | 'fulltime';
  setInjuryTimeSync: (val: 'none' | 'halftime' | 'fulltime') => void;
}

export const useGameTimers = ({
  phase,
  phaseRef,
  isMultiplayer,
  roomId,
  myRole,
  myRoleRef,
  ball,
  opponentDisconnected,
  turnTimer,
  setTurnTimer,
  prepTimer,
  setPrepTimer,
  disconnectCountdown,
  setDisconnectCountdown,
  gkMoveTimer,
  setGkMoveTimer,
  setGkMoveActiveTeam,
  gkMoveTimerRef,
  gkMoveActiveTeamRef,
  gameTimeSeconds,
  setGameTimeSeconds,
  gameTimeSecondsRef,
  setGameTime,
  gameTimeRef,
  matchDuration,
  matchDurationRef,
  captainMoveMode,
  homeReady,
  awayReady,
  turn,
  currentRoom,
  triggerActiveTurnTimeout,
  triggerTimeoutDefeat,
  triggerForceStartAfterTimeout,
  triggerWO,
  handleHalfTime,
  handleFullTime,
  injuryTime,
  setInjuryTimeSync
}: UseGameTimersParams) => {

  const ballMoving = Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.05;

  // Real-time ticking effect for active player turn timer (30s) - Multiplayer Only
  useEffect(() => {
    if (!isMultiplayer || phase !== GamePhase.ACTION) {
      setTurnTimer(null);
      return;
    }

    if (ballMoving) {
      setTurnTimer(null);
      return;
    }

    // Pause turn timer if opponent is disconnected in multiplayer
    if (opponentDisconnected) {
      return;
    }

    // Initialize timer to 30s when it's null and ball is stopped
    setTurnTimer(prev => (prev === null ? 30 : prev));

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      if (elapsed < 1000) return;
      lastTick = now;

      setTurnTimer(prev => {
        if (prev === null) return 30;
        if (prev <= 1) {
          clearInterval(interval);
          
          // Timeout reached! Only the active player triggers the defeat state in DB
          if (turn === myRole) {
            triggerActiveTurnTimeout(turn);
          }
          
          return 0;
        }

        // Play warning tick sound when timer is low (<= 5s)
        const nextVal = prev - 1;
        if (nextVal <= 5) {
          SoundManager.playTimerTick(nextVal <= 2);
        }

        return nextVal;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, ballMoving, turn, isMultiplayer, myRole, opponentDisconnected, triggerActiveTurnTimeout, setTurnTimer]);

  // Gerenciamento dinâmico dos timers de Preparação Tática e Capitão
  useEffect(() => {
    if (!isMultiplayer || !myRole) {
      setPrepTimer(null);
      return;
    }

    if (phase === GamePhase.PREPARATION) {
      // Ambos os jogadores veem o cronômetro de 120s da preparação tática
      setPrepTimer(prev => prev !== null ? prev : 120); // 2 minutes (120 seconds) for general tactical prep
    } else if (phase === GamePhase.GOAL_CELEBRATION && captainMoveMode !== null) {
      // Ambos os jogadores veem o cronômetro de 30s para a escolha/reposição do capitão
      setPrepTimer(prev => prev !== null ? prev : 30); // 30 seconds for repositioning captain
    } else {
      setPrepTimer(null);
    }
  }, [phase, captainMoveMode, myRole, isMultiplayer, setPrepTimer]);

  // Tick down do prepTimer a cada segundo
  useEffect(() => {
    if (prepTimer === null || !isMultiplayer) return;

    // Pausa o cronômetro de preparação se o oponente sofrer desconexão
    if (opponentDisconnected) return;

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      if (elapsed < 1000) return;
      lastTick = now;

      setPrepTimer(prev => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev <= 1) {
          clearInterval(interval);

          const isReady = myRole === 'HOME' ? homeReady : awayReady;

          if (phase === GamePhase.PREPARATION) {
            if (!isReady) {
              // Este jogador não confirmou a tática a tempo -> derrota por timeout
              triggerTimeoutDefeat();
            } else {
              // Este jogador já confirmou mas o oponente não;
              // somente o HOME (arbitro) força o início da partida
              if (myRoleRef.current === 'HOME') {
                triggerForceStartAfterTimeout();
              }
              // O AWAY aguarda: o listener do Firebase vai receber a mudança e reagir
            }
          } else if (phase === GamePhase.GOAL_CELEBRATION && captainMoveMode !== null) {
            if (captainMoveMode === myRole) {
              triggerTimeoutDefeat();
            }
          }

          return 0;
        }
        return prev - 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [prepTimer, isMultiplayer, opponentDisconnected, triggerTimeoutDefeat, triggerForceStartAfterTimeout, homeReady, awayReady, myRole, myRoleRef, phase, captainMoveMode, setPrepTimer]);

  // Listener de Desconexão (Contagem Regressiva para substituir por IA ou voltar ao lobby)
  useEffect(() => {
    if (!opponentDisconnected || !isMultiplayer || !roomId) return;

    let lastTick = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      if (elapsed < 1000) return;
      lastTick = now;

      setDisconnectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          
          const isHome = myRoleRef.current === 'HOME';
          const roomRef = ref(db, `rooms/${roomId}`);
          
          if (currentRoom?.status === 'preparation') {
            if (isHome) {
              // Host resets room back to waiting and removes Guest
              update(roomRef, { status: 'waiting' });
              // Trigger deletes
              update(ref(db, `rooms/${roomId}`), {
                'players/away': null,
                'presence/away': null
              });
            }
          } else {
            // Status is playing (or other) - WO victory triggered!
            triggerWO();
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [opponentDisconnected, isMultiplayer, roomId, currentRoom?.status, triggerWO, myRoleRef, setDisconnectCountdown]);

  // Goalkeeper repositioning 10s countdown timer
  useEffect(() => {
    if (gkMoveTimer === null || gkMoveTimer <= 0) return;

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      if (elapsed < 1000) return;
      lastTick = now;

      setGkMoveTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setGkMoveActiveTeam(null);
          gkMoveActiveTeamRef.current = null;
          gkMoveTimerRef.current = null;
          
          if (isMultiplayer && myRole === 'HOME' && roomId) {
            update(ref(db, `rooms/${roomId}/gameState`), {
              gkMoveActiveTeam: null,
              gkMoveTimer: null
            });
          }
          return null;
        }
        
        const nextVal = prev - 1;
        gkMoveTimerRef.current = nextVal;
        
        if (isMultiplayer && myRole === 'HOME' && roomId) {
          update(ref(db, `rooms/${roomId}/gameState`), {
            gkMoveTimer: nextVal
          });
        }
        
        return nextVal;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gkMoveTimer === null, isMultiplayer, roomId, myRole, setGkMoveTimer, setGkMoveActiveTeam, gkMoveTimerRef, gkMoveActiveTeamRef]);

  // Real-time ticking effect while ball is moving
  useEffect(() => {
    if (phase !== GamePhase.ACTION) return;
    if (!ballMoving) return;

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      if (elapsed < 1000) return;
      lastTick = now;

      setGameTimeSeconds(prev => {
        const nextSec = prev + 1;
        gameTimeSecondsRef.current = nextSec;

        const nextMin = Math.floor((nextSec / matchDurationRef.current) * 90);
        setGameTime(nextMin);
        gameTimeRef.current = nextMin;

        const halfTimeLimit = Math.floor(matchDurationRef.current / 2);

        if (!isMultiplayer || myRole === 'HOME') {
          if (nextSec >= matchDurationRef.current && injuryTime === 'none') {
            // Full time: activate injury time, keep ball rolling
            setInjuryTimeSync('fulltime');
            if (isMultiplayer && roomId) {
              update(ref(db, `rooms/${roomId}/gameState`), { injuryTime: 'fulltime' });
            }
          } else if (nextSec >= halfTimeLimit && nextSec < matchDurationRef.current && prev < halfTimeLimit && injuryTime === 'none') {
            // Half time: activate injury time, keep ball rolling
            setInjuryTimeSync('halftime');
            if (isMultiplayer && roomId) {
              update(ref(db, `rooms/${roomId}/gameState`), { injuryTime: 'halftime' });
            }
          }
        }

        return nextSec;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, ballMoving, isMultiplayer, myRole, injuryTime, setInjuryTimeSync, handleHalfTime, handleFullTime, setGameTimeSeconds, matchDurationRef, setGameTime, gameTimeRef, gameTimeSecondsRef]);
};
