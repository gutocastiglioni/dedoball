import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Team, BallState, GamePhase, PlayerConfig, GameLogEntry } from '../types';
import { db, ref, set, update } from '../firebase';
import SoundManager from '../SoundManager';

interface UseGameTransitionsParams {
  isMultiplayer: boolean;
  roomId: string | null;
  myRole: Team | null;
  myRoleRef: React.MutableRefObject<Team | null>;
  turn: Team;
  turnRef: React.MutableRefObject<Team>;
  setTurn: React.Dispatch<React.SetStateAction<Team>>;
  setTurnSync: (t: Team) => void;
  phase: GamePhase;
  phaseRef: React.MutableRefObject<GamePhase>;
  setPhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setPhaseSync: (p: GamePhase) => void;
  ball: BallState;
  ballRef: React.MutableRefObject<BallState>;
  setBall: React.Dispatch<React.SetStateAction<BallState>>;
  setBallSync: (b: BallState) => void;
  scores: { home: number; away: number };
  scoresRef: React.MutableRefObject<{ home: number; away: number }>;
  setScores: React.Dispatch<React.SetStateAction<{ home: number; away: number }>>;
  setScoresSync: (s: { home: number; away: number }) => void;
  gameTime: number;
  gameTimeRef: React.MutableRefObject<number>;
  setGameTime: React.Dispatch<React.SetStateAction<number>>;
  setGameTimeSync: (t: number) => void;
  gameTimeSecondsRef: React.MutableRefObject<number>;
  setGameTimeSecondsSync: (s: number) => void;
  matchDurationRef: React.MutableRefObject<number>;
  homeFlicksRemaining: number;
  homeFlicksRemainingRef: React.MutableRefObject<number>;
  setHomeFlicksRemaining: React.Dispatch<React.SetStateAction<number>>;
  setHomeFlicksSync: (f: number) => void;
  awayFlicksRemaining: number;
  awayFlicksRemainingRef: React.MutableRefObject<number>;
  setAwayFlicksRemaining: React.Dispatch<React.SetStateAction<number>>;
  setAwayFlicksSync: (f: number) => void;
  gameMode: 'standard' | 'manual';
  gameModeRef: React.MutableRefObject<'standard' | 'manual'>;
  gkMoveActiveTeam: Team | null;
  gkMoveActiveTeamRef: React.MutableRefObject<Team | null>;
  setGkMoveActiveTeam: React.Dispatch<React.SetStateAction<Team | null>>;
  setGkMoveActiveTeamSync: (t: Team | null) => void;
  gkMoveTimer: number | null;
  gkMoveTimerRef: React.MutableRefObject<number | null>;
  setGkMoveTimer: React.Dispatch<React.SetStateAction<number | null>>;
  setGkMoveTimerSync: (t: number | null) => void;
  lastGoalScorer: Team | null;
  lastGoalScorerRef: React.MutableRefObject<Team | null>;
  setLastGoalScorer: React.Dispatch<React.SetStateAction<Team | null>>;
  consecutiveGoalsCount: number;
  consecutiveGoalsCountRef: React.MutableRefObject<number>;
  setConsecutiveGoalsCount: React.Dispatch<React.SetStateAction<number>>;
  actionStatus: string;
  setActionStatus: React.Dispatch<React.SetStateAction<string>>;
  isIAThinking: boolean;
  homeReady: boolean;
  setHomeReady: React.Dispatch<React.SetStateAction<boolean>>;
  awayReady: boolean;
  setAwayReady: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setCaptainMoveMode: React.Dispatch<React.SetStateAction<Team | null>>;
  captainMoveModeRef: React.MutableRefObject<Team | null>;
  pendingGoalDataRef: React.MutableRefObject<{
    concedingTeam: Team;
    nextCount: number;
    nextScores: { home: number; away: number };
  } | null>;
  wasKickoffRef: React.MutableRefObject<boolean>;
  injuryTimeRef: React.MutableRefObject<'none' | 'halftime' | 'fulltime'>;
  setInjuryTimeSync: (val: 'none' | 'halftime' | 'fulltime') => void;
  homePlayers: PlayerConfig[];
  homePlayersRef: React.MutableRefObject<PlayerConfig[]>;
  awayPlayers: PlayerConfig[];
  awayPlayersRef: React.MutableRefObject<PlayerConfig[]>;
  setSystemMessage: React.Dispatch<React.SetStateAction<{ title: string; message: string; type?: 'info' | 'error' | 'success' | 'warning' } | null>>;
  addGameLog: (message: string, type: GameLogEntry['type']) => void;
  enforceBlockerLimit: (team: Team, currentScorer: Team | null, currentCount: number) => void;
  syncGameStateToFirebase: (
    nextBall: BallState,
    nextHomePlayers: PlayerConfig[],
    nextAwayPlayers: PlayerConfig[],
    nextTurn: Team,
    nextScores: { home: number; away: number },
    nextGameTime: number,
    nextHomeFlicks: number,
    nextAwayFlicks: number,
    nextPhase: GamePhase,
    nextStatus: string,
    forceSync?: boolean
  ) => void;
}

export const useGameTransitions = ({
  isMultiplayer,
  roomId,
  myRole,
  myRoleRef,
  turn,
  turnRef,
  setTurn,
  setTurnSync,
  phase,
  phaseRef,
  setPhase,
  setPhaseSync,
  ball,
  ballRef,
  setBall,
  setBallSync,
  scores,
  scoresRef,
  setScores,
  setScoresSync,
  gameTime,
  gameTimeRef,
  setGameTime,
  setGameTimeSync,
  gameTimeSecondsRef,
  setGameTimeSecondsSync,
  matchDurationRef,
  homeFlicksRemaining,
  homeFlicksRemainingRef,
  setHomeFlicksRemaining,
  setHomeFlicksSync,
  awayFlicksRemaining,
  awayFlicksRemainingRef,
  setAwayFlicksRemaining,
  setAwayFlicksSync,
  gameMode,
  gameModeRef,
  gkMoveActiveTeam,
  gkMoveActiveTeamRef,
  setGkMoveActiveTeam,
  setGkMoveActiveTeamSync,
  gkMoveTimer,
  gkMoveTimerRef,
  setGkMoveTimer,
  setGkMoveTimerSync,
  lastGoalScorer,
  lastGoalScorerRef,
  setLastGoalScorer,
  consecutiveGoalsCount,
  consecutiveGoalsCountRef,
  setConsecutiveGoalsCount,
  actionStatus,
  setActionStatus,
  isIAThinking,
  homeReady,
  setHomeReady,
  awayReady,
  setAwayReady,
  setSelectedPlayerId,
  setCaptainMoveMode,
  captainMoveModeRef,
  pendingGoalDataRef,
  wasKickoffRef,
  injuryTimeRef,
  setInjuryTimeSync,
  homePlayers,
  homePlayersRef,
  awayPlayers,
  awayPlayersRef,
  setSystemMessage,
  addGameLog,
  enforceBlockerLimit,
  syncGameStateToFirebase
}: UseGameTransitionsParams) => {
  // Stable refs so changePossession/triggerFoul can call these before they're declared
  const handleHalfTimeRef = useRef<() => void>(() => {});
  const handleFullTimeRef = useRef<() => void>(() => {});


  // Confirm captain placement after goal (resumes play)
  const confirmCaptainMove = useCallback(() => {
    const data = pendingGoalDataRef.current;
    if (!data || captainMoveModeRef.current === null) return;

    const { concedingTeam, nextCount, nextScores } = data;

    // Clear mode
    setCaptainMoveMode(null);
    captainMoveModeRef.current = null;
    pendingGoalDataRef.current = null;

    const currentHomePlayers = homePlayersRef.current;
    const currentAwayPlayers = awayPlayersRef.current;

    const freshBall: BallState = {
      position: [0, 0.11, 0],
      velocity: [0, 0, 0],
      possession: concedingTeam,
      lastTouchedByPlayerId: null,
      isKickoff: true,
      speedMultiplier: 1
    };

    let nextPhase = GamePhase.ACTION;
    let nextStatus = '';
    const isFairnessActive = nextCount >= 2;

    if (isFairnessActive) {
      nextPhase = GamePhase.PREPARATION;
      if (isMultiplayer) {
        nextStatus = concedingTeam === myRole
          ? `Vantagem Tática Ativada! Você sofreu ${nextCount} gols seguidos. Posicione até 4 Bloqueadores (Stopper Extra).`
          : `Vantagem Tática Ativada! Oponente sofreu ${nextCount} gols seguidos.`;
      } else {
        nextStatus = concedingTeam === 'HOME'
          ? `Vantagem Tática Ativada! Você sofreu ${nextCount} gols seguidos. Posicione até 4 Bloqueadores (Stopper Extra).`
          : `Vantagem Tática Ativada! A IA sofreu ${nextCount} gols seguidos.`;
      }
    } else {
      nextPhase = GamePhase.ACTION;
      if (isMultiplayer) {
        nextStatus = concedingTeam === myRole
          ? 'Gol sofrido! Saída de bola: seu chute do meio campo.'
          : 'GOLAÇO! Saída de bola do oponente.';
      } else {
        nextStatus = concedingTeam === 'HOME'
          ? 'Gol sofrido! Saída de bola: seu chute do meio campo.'
          : 'GOLAÇO! Saída de bola da IA.';
      }
    }

    flushSync(() => {
      setBall(freshBall);
      setTurn(concedingTeam);
      setHomeReady(false);
      setAwayReady(false);
      setPhase(nextPhase);
      setActionStatus(nextStatus);
    });

    addGameLog(
      isFairnessActive
        ? `Capitão reposicionado! Vantagem Tática Ativada. Posse e kickoff do time ${concedingTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} para fase de Preparação Tática com Stopper Extra.`
        : `Capitão reposicionado! Posse do time ${concedingTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} para reiniciar no centro (Kickoff).`,
      'phase'
    );

    console.log(`%c[Captain Move] ✅ Captain confirmed at slot. Phase=${nextPhase}, Turn=${concedingTeam}`, 'color: #2ed573; font-weight: bold;');

    const currentTimeValue = gameTimeRef.current;

    if (isMultiplayer) {
      syncGameStateToFirebase(
        freshBall, currentHomePlayers, currentAwayPlayers, concedingTeam,
        nextScores, currentTimeValue, homeFlicksRemainingRef.current, awayFlicksRemainingRef.current, nextPhase, nextStatus
      );
    }
  }, [addGameLog, isMultiplayer, syncGameStateToFirebase, setBall, setTurn, setHomeReady, setAwayReady, setPhase, setActionStatus, setCaptainMoveMode, captainMoveModeRef, pendingGoalDataRef, homePlayersRef, awayPlayersRef, gameTimeRef, homeFlicksRemainingRef, awayFlicksRemainingRef]);

  // Shoot/Flick Ball
  const shootBall = (vx: number, vz: number) => {
    console.log(
      `%c[Game Loop] 🚀 shootBall called | vx: ${vx.toFixed(2)} | vz: ${vz.toFixed(2)} | Current Turn: ${turn} | Phase: ${phase} | Flicks Remaining: Home=${homeFlicksRemainingRef.current}, Away=${awayFlicksRemainingRef.current}`,
      "color: #3498db; font-weight: bold; background: #ebf5fb; padding: 3px 6px; border: 1px solid #3498db; border-radius: 4px;"
    );
    if (phase !== GamePhase.ACTION || isIAThinking || gkMoveActiveTeam !== null) return;

    let finalVx = vx;
    let finalVz = vz;
    if (ball.isKickoff) {
      const kickMultiplier = gameMode === 'manual' ? 1.6 : 1.0;
      finalVx *= kickMultiplier;
      finalVz *= kickMultiplier;
    }

    if (isMultiplayer && roomId && myRole) {
      if (turn !== myRole) {
        console.warn(`%c[Game Loop] Shot blocked! Turn belongs to ${turn}, but player is ${myRole}.`, "color: #e74c3c; font-weight: bold;");
        return;
      }
      
      console.log(`%c[Multiplayer Outgoing] Syncing flick to Firebase: vx=${finalVx.toFixed(2)}, vz=${finalVz.toFixed(2)}`, "color: #3498db; font-weight: bold;");
      set(ref(db, `rooms/${roomId}/flick`), {
        vx: finalVx,
        vz: finalVz,
        timestamp: Date.now(),
        by: myRole
      });
    }

    if (ball.isKickoff) {
      console.log(
        `%c[Flick Event] 🟢 Kickoff shot taken by ${turn}! This flick does NOT count toward the 3-flick round limit. Ball set in motion.`,
        "color: #2ecc71; font-weight: bold; background: #e8f8f5; padding: 2px 4px; border-radius: 4px;"
      );
      wasKickoffRef.current = true;
      addGameLog(`Saída de bola (Kickoff) por ${turn === 'HOME' ? 'Casa' : 'Visitante/IA'}. (Sem custo de peteleco)`, 'flick');
      setBall(prev => ({ ...prev, velocity: [finalVx, 0, finalVz], isKickoff: false }));
    } else {
      wasKickoffRef.current = false;
      if (turn === 'HOME') {
        const oldFlicks = homeFlicksRemainingRef.current;
        const newFlicks = Math.max(0, oldFlicks - 1);
        console.log(
          `%c[Flick Event] 🔵 HOME player took a shot! Flicks remaining: ${oldFlicks} ➔ ${newFlicks}`,
          "color: #2980b9; font-weight: bold; background: #d6eaf8; padding: 2px 4px; border-radius: 4px;"
        );
        homeFlicksRemainingRef.current = newFlicks;
        setHomeFlicksRemaining(newFlicks);
        addGameLog(`Peteleco executado pelo Time Casa. Restantes na rodada: ${newFlicks}/3.`, 'flick');
      } else {
        const oldFlicks = awayFlicksRemainingRef.current;
        const newFlicks = Math.max(0, oldFlicks - 1);
        console.log(
          `%c[Flick Event] 🟠 AWAY player took a shot! Flicks remaining: ${oldFlicks} ➔ ${newFlicks}`,
          "color: #d35400; font-weight: bold; background: #fdebd0; padding: 2px 4px; border-radius: 4px;"
        );
        awayFlicksRemainingRef.current = newFlicks;
        setAwayFlicksRemaining(newFlicks);
        addGameLog(`Peteleco executado pelo Time Visitante/IA. Restantes na rodada: ${newFlicks}/3.`, 'flick');
      }
      setBall(prev => ({ ...prev, velocity: [finalVx, 0, finalVz] }));
    }
    setActionStatus(isMultiplayer ? (myRole === turn ? 'Você chutou!' : 'Oponente chutou!') : 'Você chutou!');
  };

  // Change Possession & Setup turn
  const changePossession = useCallback((newPossession: Team, stoppedPosition: [number, number, number], isKickoff?: boolean) => {
    // Injury time: resolve halftime/fulltime on any ball stop (tackle, gk save, etc.)
    const currentInjuryTime = injuryTimeRef.current;
    if (currentInjuryTime !== 'none') {
      console.log(`%c[Game Loop] ⏰ Injury time resolved via changePossession: ${currentInjuryTime}. Ball stopped at [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}]`, 'color: #e74c3c; font-weight: bold; background: #2c0000; padding: 4px 8px;');
      if (currentInjuryTime === 'halftime') {
        handleHalfTimeRef.current();
      } else {
        handleFullTimeRef.current();
      }
      return;
    }

    console.log(
      `%c[Possession Event] 🔄 Possession transferring: ${turnRef.current} ➔ ${newPossession} | Position: [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}] | isKickoff: ${isKickoff}`,
      "color: #9b59b6; font-weight: bold; background: #f5eef8; padding: 2px 4px; border-radius: 4px;"
    );
    addGameLog(`Posse de bola transferida para o Time ${newPossession === 'HOME' ? 'Casa' : 'Visitante/IA'} na posição [${stoppedPosition[0].toFixed(1)}, ${stoppedPosition[2].toFixed(1)}].`, 'tackle');
    
    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;

    const currentHomeFlicks = homeFlicksRemainingRef.current;
    const currentAwayFlicks = awayFlicksRemainingRef.current;
    const isRoundOverOnTackle = currentHomeFlicks === 0 && currentAwayFlicks === 0;

    if (isRoundOverOnTackle && isMaster) {
      console.log(
        `%c[Game Loop] 🔁 ROUND COMPLETED VIA TACKLE! Both teams at 0 flicks. Entering PREPARATION. Flicks reset to 3.`,
        "color: #e67e22; font-weight: bold; background: #fdebd0; padding: 4px 8px; border: 2px solid #e67e22; border-radius: 5px;"
      );
      addGameLog(`Fim da Rodada (via desarme)! Ambos os times esgotaram seus petelecos. Preparação Tática liberada. Flicks reabastecidos para 3.`, 'phase');

      homeFlicksRemainingRef.current = 3;
      awayFlicksRemainingRef.current = 3;

      const nextScoresValue = scoresRef.current;
      const nextPhaseValue = GamePhase.PREPARATION;
      const nextStatusValue = `Fim da rodada (via desarme)! Retornando à fase de Preparação Tática.`;
      const nextTurnValue = newPossession;
      const updatedBallPrep: BallState = { 
        possession: newPossession, 
        velocity: [0, 0, 0], 
        position: stoppedPosition, 
        lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId, 
        isKickoff: isKickoff !== undefined ? isKickoff : ballRef.current.isKickoff, 
        speedMultiplier: 1 
      };

      flushSync(() => {
        setHomeFlicksSync(3);
        setAwayFlicksSync(3);
        setPhaseSync(nextPhaseValue);
        setTurnSync(nextTurnValue);
        setBallSync(updatedBallPrep);
        setActionStatus(nextStatusValue);
        setHomeReady(false);
        setAwayReady(false);
      });

      if (isMultiplayer && isMaster && roomId) {
        syncGameStateToFirebase(updatedBallPrep, homePlayersRef.current, awayPlayersRef.current, nextTurnValue, nextScoresValue, gameTimeRef.current, 3, 3, GamePhase.PREPARATION, nextStatusValue);
      }
      return;
    }

    const updatedBall: BallState = {
      possession: newPossession,
      velocity: [0, 0, 0],
      position: stoppedPosition,
      lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId,
      isKickoff: isKickoff !== undefined ? isKickoff : ballRef.current.isKickoff,
      speedMultiplier: 1
    };

    let nextStatus = '';
    if (isMultiplayer && myRole) {
      nextStatus = newPossession === myRole ? 'Sua posse! Prepare o peteleco.' : 'Posse do oponente! Aguarde...';
    } else {
      if (newPossession === 'HOME') {
        nextStatus = 'Sua posse! Prepare o peteleco.';
      } else {
        nextStatus = 'A IA está preparando o contra-ataque...';
      }
    }

    flushSync(() => {
      setTurnSync(newPossession);
      setBallSync(updatedBall);
      setActionStatus(nextStatus);
    });

    if (isMultiplayer && isMaster && roomId) {
      syncGameStateToFirebase(
        updatedBall,
        homePlayersRef.current,
        awayPlayersRef.current,
        newPossession,
        scoresRef.current,
        gameTimeRef.current,
        homeFlicksRemainingRef.current,
        awayFlicksRemainingRef.current,
        phaseRef.current,
        nextStatus
      );
    }
  }, [isMultiplayer, myRole, roomId, syncGameStateToFirebase, setHomeFlicksSync, setAwayFlicksSync, setPhaseSync, setTurnSync, setBallSync, setBall, setTurn, setActionStatus, setHomeReady, setAwayReady, turnRef, myRoleRef, homeFlicksRemainingRef, awayFlicksRemainingRef, scoresRef, ballRef, gameTimeRef, homePlayersRef, awayPlayersRef, phaseRef, injuryTimeRef, handleHalfTimeRef, handleFullTimeRef]);

  // Trigger Foul and transfer possession with flick consumption
  const triggerFoul = useCallback((e1: string, e2: string, stoppedPosition: [number, number, number]) => {
    SoundManager.playRefereeWhistle('foul');
    SoundManager.playCrowdSigh();

    // Injury time: resolve halftime/fulltime on foul stop
    const currentInjuryTime = injuryTimeRef.current;
    if (currentInjuryTime !== 'none') {
      console.log(`%c[Game Loop] ⏰ Injury time resolved via triggerFoul: ${currentInjuryTime}. Ball stopped at [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}]`, 'color: #e74c3c; font-weight: bold; background: #2c0000; padding: 4px 8px;');
      if (currentInjuryTime === 'halftime') {
        handleHalfTimeRef.current();
      } else {
        handleFullTimeRef.current();
      }
      return;
    }

    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;
    if (!isMaster) return;

    const committingTeam = turnRef.current;
    
    const playersInLoop = [e1, e2].filter(e => e !== 'WALL');
    const teamsInLoop = playersInLoop.map(id => id.startsWith('home') ? 'HOME' : 'AWAY');

    let recipientTeam: Team;
    if (teamsInLoop.every(t => t === 'HOME')) {
      recipientTeam = 'AWAY';
    } else if (teamsInLoop.every(t => t === 'AWAY')) {
      recipientTeam = 'HOME';
    } else {
      recipientTeam = committingTeam === 'HOME' ? 'AWAY' : 'HOME';
    }

    console.log(
      `%c[Foul Event] ⚠️ FOUL TRIGGERED! Loop detected between ${e1} and ${e2}. Committing Team: ${committingTeam} | Recipient Team: ${recipientTeam} | Ball Position: [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}]`,
      "color: #e74c3c; font-weight: bold; background: #fadbd8; padding: 4px 8px; border: 2px solid #e74c3c; border-radius: 6px;"
    );

    let nextHomeFlicks = homeFlicksRemainingRef.current;
    let nextAwayFlicks = awayFlicksRemainingRef.current;
    
    if (committingTeam === 'HOME') {
      nextHomeFlicks = Math.max(0, nextHomeFlicks - 1);
      homeFlicksRemainingRef.current = nextHomeFlicks;
      setHomeFlicksRemaining(nextHomeFlicks);
    } else {
      nextAwayFlicks = Math.max(0, nextAwayFlicks - 1);
      awayFlicksRemainingRef.current = nextAwayFlicks;
      setAwayFlicksRemaining(nextAwayFlicks);
    }

    const updatedBall: BallState = {
      velocity: [0, 0, 0],
      position: stoppedPosition,
      possession: recipientTeam,
      lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId,
      isKickoff: true,
      speedMultiplier: 1
    };
    setBall(updatedBall);

    const isRoundOver = nextHomeFlicks === 0 && nextAwayFlicks === 0;
    
    let nextTurnValue = recipientTeam;
    let nextPhaseValue = phaseRef.current;
    let nextStatusValue = '';
    let nextScoresValue = scoresRef.current;

    const e1Name = e1 === 'WALL' ? 'parede' : e1.startsWith('home') ? 'jogador da Casa' : 'jogador Visitante';
    const e2Name = e2 === 'WALL' ? 'parede' : e2.startsWith('home') ? 'jogador da Casa' : 'jogador Visitante';
    const foulMsg = `Falta! Bola presa em loop entre ${e1Name} e ${e2Name}. Peteleco consumido do time ${committingTeam === 'HOME' ? 'Casa' : 'Visitante'}. Posse para ${recipientTeam === 'HOME' ? 'Casa' : 'Visitante'}!`;
    
    addGameLog(`Falta! Loop detectado entre ${e1Name} e ${e2Name}. Time ${committingTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} perde 1 peteleco como punição. Posse transferida para ${recipientTeam === 'HOME' ? 'Casa' : 'Visitante/IA'}.`, 'foul');

    if (isRoundOver) {
      console.log(
        `%c[Game Loop] 🔁 ROUND COMPLETED ON FOUL! Both teams have 0 flicks remaining. Resetting flicks to 3. Entering PREPARATION.`,
        "color: #e67e22; font-weight: bold; background: #fdebd0; padding: 4px 6px; border: 1px dashed #e67e22; border-radius: 4px;"
      );
      
      addGameLog(`Fim da Rodada! Ambos os times esgotaram seus 3 petelecos. Preparação Tática liberada. Flicks reabastecidos para 3.`, 'phase');

      nextPhaseValue = GamePhase.PREPARATION;
      nextStatusValue = `Fim da rodada! Retornando à fase de Preparação Tática.`;
      
      nextHomeFlicks = 3;
      nextAwayFlicks = 3;
      homeFlicksRemainingRef.current = 3;
      awayFlicksRemainingRef.current = 3;
      setHomeFlicksRemaining(3);
      setAwayFlicksRemaining(3);
      setHomeReady(false);
      setAwayReady(false);
    } else {
      nextTurnValue = recipientTeam;
      nextStatusValue = foulMsg;
    }

    setTurn(nextTurnValue);
    setActionStatus(nextStatusValue);

    if (isMultiplayer && roomId) {
      syncGameStateToFirebase(
        updatedBall,
        homePlayersRef.current,
        awayPlayersRef.current,
        nextTurnValue,
        nextScoresValue,
        gameTimeRef.current,
        nextHomeFlicks,
        nextAwayFlicks,
        nextPhaseValue,
        nextStatusValue
      );
    }
  }, [
    isMultiplayer, roomId, myRole, syncGameStateToFirebase, addGameLog, setBall, setTurn, setActionStatus, setHomeFlicksRemaining, setAwayFlicksRemaining, setHomeReady, setAwayReady, turnRef, myRoleRef, homeFlicksRemainingRef, awayFlicksRemainingRef, ballRef, scoresRef, gameTimeRef, homePlayersRef, awayPlayersRef, phaseRef, injuryTimeRef, handleHalfTimeRef, handleFullTimeRef
  ]);

  // Handle Half Time
  const handleHalfTime = useCallback(() => {
    console.log("%c[Game Loop] ⏰ HALF-TIME reached! Pausing game, resetting ball to center.", "color: #d35400; font-weight: bold;");
    SoundManager.playRefereeWhistle('half');
    setInjuryTimeSync('none');
    
    const freshBall: BallState = {
      position: [0, 0.11, 0],
      velocity: [0, 0, 0],
      possession: 'AWAY',
      lastTouchedByPlayerId: null,
      isKickoff: true,
      speedMultiplier: 1
    };

    const halfTimeSecs = Math.floor(matchDurationRef.current / 2);
    const nextStatus = isMultiplayer
      ? 'Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff do Visitante (AWAY).'
      : 'Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff da IA.';

    addGameLog(`Fim do Primeiro Tempo! Intervalo Tático. O segundo tempo inicia com posse e kickoff do Visitante/IA no centro do campo.`, 'phase');

    flushSync(() => {
      setBallSync(freshBall);
      setTurnSync('AWAY');
      setPhaseSync(GamePhase.PREPARATION);
      setActionStatus(nextStatus);
      setHomeFlicksSync(3);
      setAwayFlicksSync(3);
      setHomeReady(false);
      setAwayReady(false);
      setGameTimeSecondsSync(halfTimeSecs);
      setGameTimeSync(45);
    });

    if (isMultiplayer && roomId) {
      syncGameStateToFirebase(
        freshBall,
        homePlayersRef.current,
        awayPlayersRef.current,
        'AWAY',
        scoresRef.current,
        45,
        3,
        3,
        GamePhase.PREPARATION,
        nextStatus,
        true
      );
    }
  }, [isMultiplayer, roomId, syncGameStateToFirebase, addGameLog, setBallSync, setTurnSync, setPhaseSync, setActionStatus, setHomeFlicksSync, setAwayFlicksSync, setHomeReady, setAwayReady, homePlayersRef, awayPlayersRef, scoresRef, setInjuryTimeSync, setGameTimeSecondsSync, setGameTimeSync, matchDurationRef]);
  handleHalfTimeRef.current = handleHalfTime;

  // Handle Full Time
  const handleFullTime = useCallback(() => {
    console.log("%c[Game Loop] ⏰ FULL-TIME reached! GAME OVER.", "color: #c0392b; font-weight: bold;");
    SoundManager.playRefereeWhistle('full');
    setInjuryTimeSync('none');

    const nextScores = scoresRef.current;
    let nextStatus = '';
    if (nextScores.home > nextScores.away) {
      nextStatus = `Fim de jogo! Vitória da Casa por ${nextScores.home}x${nextScores.away}!`;
    } else if (nextScores.away > nextScores.home) {
      nextStatus = `Fim de jogo! Vitória do Visitante por ${nextScores.away}x${nextScores.home}!`;
    } else {
      nextStatus = `Fim de jogo! Empate dramático de ${nextScores.home}x${nextScores.away}!`;
    }

    addGameLog(`Fim de Jogo! Placar Final: Casa ${nextScores.home} x ${nextScores.away} Visitante/IA.`, 'phase');

    const freshBall: BallState = {
      ...ballRef.current,
      velocity: [0, 0, 0]
    };

    flushSync(() => {
      setBallSync(freshBall);
      setPhaseSync(GamePhase.GAME_OVER);
      setActionStatus(nextStatus);
      setGameTimeSecondsSync(matchDurationRef.current);
      setGameTimeSync(90);
    });

    if (isMultiplayer && roomId) {
      syncGameStateToFirebase(
        freshBall,
        homePlayersRef.current,
        awayPlayersRef.current,
        turnRef.current,
        nextScores,
        90,
        homeFlicksRemainingRef.current,
        awayFlicksRemainingRef.current,
        GamePhase.GAME_OVER,
        nextStatus,
        true
      );
    }
  }, [isMultiplayer, roomId, syncGameStateToFirebase, addGameLog, setBallSync, setPhaseSync, setActionStatus, ballRef, scoresRef, homePlayersRef, awayPlayersRef, turnRef, homeFlicksRemainingRef, awayFlicksRemainingRef, setInjuryTimeSync, setGameTimeSecondsSync, setGameTimeSync, matchDurationRef]);
  handleFullTimeRef.current = handleFullTime;

  // Handle Ball Stopped
  const handleBallStopped = useCallback((stoppedPosition: [number, number, number]) => {
    // If injury time is pending, resolve halftime or fulltime NOW (ball just stopped)
    const currentInjuryTime = injuryTimeRef.current;
    if (currentInjuryTime !== 'none') {
      console.log(`%c[Game Loop] ⏰ Injury time resolved: ${currentInjuryTime}. Ball stopped at [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}]`, 'color: #e74c3c; font-weight: bold; background: #2c0000; padding: 4px 8px;');
      if (currentInjuryTime === 'halftime') {
        handleHalfTime();
      } else {
        handleFullTime();
      }
      return;
    }
    if (phaseRef.current === GamePhase.PREPARATION || phaseRef.current === GamePhase.GAME_OVER) {
      console.log("%c[Game Loop] Ball stopped but phase is PREPARATION or GAME_OVER. Ignoring.", "color: #7f8c8d;");
      return;
    }

    const currentHomeFlicks = homeFlicksRemainingRef.current;
    const currentAwayFlicks = awayFlicksRemainingRef.current;
    
    console.log(
      `%c[Physics Engine] 🔴 Ball stopped at [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}]. Turn=${turnRef.current} | Flicks: Home=${currentHomeFlicks}, Away=${currentAwayFlicks}`,
      "color: #1abc9c; font-weight: bold; background: #e8f8f5; padding: 2px 5px; border-radius: 4px;"
    );

    const opponentTeam = turnRef.current === 'HOME' ? 'AWAY' : 'HOME';

    addGameLog(`A bola parou na posição [${stoppedPosition[0].toFixed(1)}, ${stoppedPosition[2].toFixed(1)}].`, 'collision');

    const updatedBall: BallState = {
      velocity: [0, 0, 0],
      position: stoppedPosition,
      possession: turnRef.current,
      lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId,
      isKickoff: ballRef.current.isKickoff,
      speedMultiplier: 1
    };

    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;
    if (!isMaster) {
      flushSync(() => {
        setBallSync(updatedBall);
      });
      return;
    }

    let nextHomeFlicks = currentHomeFlicks;
    let nextAwayFlicks = currentAwayFlicks;
    let nextTurnValue = turnRef.current;
    let nextGameTimeValue = Math.floor((gameTimeSecondsRef.current / matchDurationRef.current) * 90);
    let nextPhaseValue: GamePhase = phaseRef.current;
    let nextStatusValue = actionStatus;
    let nextScoresValue = scoresRef.current;

    if (wasKickoffRef.current) {
      console.log("%c[Game Loop] Kickoff play finished. Passing possession and turn to opponent.", "color: #2ecc71; font-weight: bold;");
      nextTurnValue = opponentTeam;
      updatedBall.possession = opponentTeam;
      updatedBall.isKickoff = false;
      wasKickoffRef.current = false;
      
      if (isMultiplayer && myRoleRef.current) {
        nextStatusValue = nextTurnValue === myRoleRef.current ? 'Sua vez! Dê o peteleco na bola.' : 'Turno do adversário. Aguarde...';
      } else {
        nextStatusValue = nextTurnValue === 'HOME' ? 'Sua vez! Dê o peteleco na bola.' : 'A IA está preparando o contra-ataque...';
      }
      
      addGameLog(`Saída de bola finalizada. Vez do time ${nextTurnValue === 'HOME' ? 'Casa' : 'Visitante/IA'}.`, 'phase');
    } else {
      const isRoundOver = currentHomeFlicks === 0 && currentAwayFlicks === 0;
      console.log(
        `%c[Game Loop] Round Over Check: Home Flicks=${currentHomeFlicks}, Away Flicks=${currentAwayFlicks} ➔ isRoundOver=${isRoundOver}`,
        "color: #16a085; font-weight: bold;"
      );

      if (isRoundOver) {
        console.log(
          `%c[Game Loop] 🔁 ROUND COMPLETED! Both teams used all 3 clicks. Resetting flicks to 3 and entering PREPARATION.`,
          "color: #e67e22; font-weight: bold; background: #fdebd0; padding: 4px 8px; border: 2px solid #e67e22; border-radius: 5px;"
        );

        nextPhaseValue = GamePhase.PREPARATION;
        nextTurnValue = opponentTeam;
        updatedBall.possession = opponentTeam;
        nextStatusValue = `Rodada finalizada! Preparação Tática liberada. Flicks reabastecidos para 3/3. Vez de ${opponentTeam === 'HOME' ? 'Casa' : 'Visitante/IA'}.`;
        
        addGameLog(`Rodada finalizada! Ambos os times esgotaram seus petelecos. Preparação Tática liberada. Vez do time ${opponentTeam === 'HOME' ? 'Casa' : 'Visitante/IA'}.`, 'phase');

        nextHomeFlicks = 3;
        nextAwayFlicks = 3;
        homeFlicksRemainingRef.current = 3;
        awayFlicksRemainingRef.current = 3;
      } else {
        const opponentFlicks = opponentTeam === 'HOME' ? currentHomeFlicks : currentAwayFlicks;

        if (opponentFlicks > 0) {
          nextTurnValue = opponentTeam;
          console.log(`%c[Game Loop] Alternating turn to opponent: ${nextTurnValue}`, "color: #f1c40f; font-weight: bold;");
          addGameLog(`Alternância de Turno: Vez do time ${nextTurnValue === 'HOME' ? 'Casa' : 'Visitante/IA'}.`, 'phase');
        } else {
          nextTurnValue = turnRef.current;
          console.log(`%c[Game Loop] Opponent (${opponentTeam}) has 0 flicks remaining. Keeping turn with active player: ${nextTurnValue}`, "color: #e67e22; font-weight: bold;");
          addGameLog(`Turno mantido com o time ${nextTurnValue === 'HOME' ? 'Casa' : 'Visitante/IA'} (oponente sem petelecos).`, 'phase');
        }
        
        if (isMultiplayer && myRoleRef.current) {
          nextStatusValue = nextTurnValue === myRoleRef.current ? 'Sua vez! Dê o peteleco na bola.' : 'Turno do adversário. Aguarde...';
        } else {
          nextStatusValue = nextTurnValue === 'HOME' ? 'Sua vez! Dê o peteleco na bola.' : 'A IA está preparando o contra-ataque...';
        }
      }
    }

    let nextGkMoveActiveTeam: Team | null = null;
    let nextGkMoveTimer: number | null = null;
    
    if (gameMode === 'manual' && nextPhaseValue === GamePhase.ACTION) {
      const defender = nextTurnValue === 'HOME' ? 'AWAY' : 'HOME';
      const isIaDefending = !isMultiplayer && defender === 'AWAY';
      
      if (!isIaDefending) {
        nextGkMoveActiveTeam = defender;
        nextGkMoveTimer = 10;
        if (isMultiplayer && myRoleRef.current) {
          nextStatusValue = nextTurnValue === myRoleRef.current 
            ? 'Sua posse! Aguardando oponente posicionar o Goleiro...'
            : 'Sua vez de defender! Reposicione seu Goleiro em até 10 segundos.';
        } else {
          nextStatusValue = nextTurnValue === 'HOME' 
            ? 'Sua posse! Aguardando oponente posicionar o Goleiro...'
            : 'Sua vez de defender! Reposicione seu Goleiro em até 10 segundos.';
        }
      }
    }

    updatedBall.possession = nextTurnValue;

    flushSync(() => {
      setBallSync(updatedBall);
      setTurnSync(nextTurnValue);
      setGameTimeSync(nextGameTimeValue);
      setPhaseSync(nextPhaseValue);
      setActionStatus(nextStatusValue);
      setHomeFlicksSync(nextHomeFlicks);
      setAwayFlicksSync(nextAwayFlicks);
      
      setGkMoveActiveTeam(nextGkMoveActiveTeam);
      gkMoveActiveTeamRef.current = nextGkMoveActiveTeam;
      setGkMoveTimer(nextGkMoveTimer);
      gkMoveTimerRef.current = nextGkMoveTimer;

      if (nextPhaseValue === GamePhase.PREPARATION) {
        setHomeReady(false);
        setAwayReady(false);
      }
    });

    if (isMultiplayer) {
      syncGameStateToFirebase(
        updatedBall, homePlayers, awayPlayers, nextTurnValue, 
        nextScoresValue, nextGameTimeValue, nextHomeFlicks, nextAwayFlicks, 
        nextPhaseValue, nextStatusValue
      );
    }
  }, [
    homePlayers, awayPlayers, isMultiplayer, actionStatus, homeFlicksRemainingRef, awayFlicksRemainingRef, turnRef, myRoleRef, syncGameStateToFirebase, addGameLog, setBallSync, setTurnSync, setGameTimeSync, setPhaseSync, setActionStatus, setHomeFlicksSync, setAwayFlicksSync, setGkMoveActiveTeam, setGkMoveTimer, setHomeReady, setAwayReady, gameTimeSecondsRef, matchDurationRef, phaseRef, gameMode, gkMoveActiveTeamRef, gkMoveTimerRef, wasKickoffRef
  ]);

  // Goal scorer logic
  const scoreGoal = (scoringTeam: Team) => {
    const prevScorer = lastGoalScorerRef.current;
    const prevCount = consecutiveGoalsCountRef.current;
    
    let nextCount = 1;
    if (prevScorer === scoringTeam) {
      nextCount = prevCount + 1;
    }
    
    setLastGoalScorer(scoringTeam);
    setConsecutiveGoalsCount(nextCount);
    lastGoalScorerRef.current = scoringTeam;
    consecutiveGoalsCountRef.current = nextCount;

    enforceBlockerLimit('HOME', scoringTeam, nextCount);
    enforceBlockerLimit('AWAY', scoringTeam, nextCount);

    let nextScores = { ...scores };
    setScores(prev => {
      nextScores = {
        home: scoringTeam === 'HOME' ? prev.home + 1 : prev.home,
        away: scoringTeam === 'AWAY' ? prev.away + 1 : prev.away
      };
      console.log(`%c[Goal Event] scoreGoal: goal by ${scoringTeam}! New Score: Home=${nextScores.home} - Away=${nextScores.away}`, "color: #e74c3c; font-weight: bold; background: #fadbd8; padding: 4px;");
      return nextScores;
    });

    setPhase(GamePhase.GOAL_CELEBRATION);
    setActionStatus(`GOL DO TIME ${scoringTeam === 'HOME' ? 'CASA' : 'VISITANTE'}!`);
    setHomeReady(false);
    setAwayReady(false);

    const nextH = scoringTeam === 'HOME' ? scores.home + 1 : scores.home;
    const nextA = scoringTeam === 'AWAY' ? scores.away + 1 : scores.away;
    addGameLog(`⚽ GOL!!! O time ${scoringTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} balançou as redes! Placar: Casa ${nextH} x ${nextA} Visitante/IA.`, 'goal');

    const concedingTeam: Team = scoringTeam === 'HOME' ? 'AWAY' : 'HOME';

    setTimeout(() => {
      if (phaseRef.current === GamePhase.GAME_OVER) return;

      const isFairnessActive = nextCount >= 2;

      const freshBall: BallState = {
        position: [0, 0.11, 0],
        velocity: [0, 0, 0],
        possession: concedingTeam,
        lastTouchedByPlayerId: null,
        isKickoff: true,
        speedMultiplier: 1
      };

      const teamPlayers = concedingTeam === 'HOME' ? homePlayersRef.current : awayPlayersRef.current;
      const captainPlayer = teamPlayers.find(p => p.isCaptain);
      if (captainPlayer) {
        const isMyTeam = isMultiplayer 
          ? (concedingTeam === myRole) 
          : (concedingTeam === 'HOME');
        if (isMyTeam) {
          setSelectedPlayerId(captainPlayer.id);
        } else {
          setSelectedPlayerId(null);
        }
      }

      if (isFairnessActive) {
        console.log(`%c[Goal Event] Entering Tactical Advantage Preparation. Conceding team = ${concedingTeam}`, "color: #2ecc71; font-weight: bold;");
        
        const moveStatus = isMultiplayer
          ? (concedingTeam === myRole
              ? '🛡️ Vantagem Tática Ativada! Posicione seu time completo e defina seus Bloqueadores.'
              : '⏳ Oponente definindo escalação tática (Vantagem Tática)...')
          : (concedingTeam === 'HOME'
              ? '🛡️ Vantagem Tática Ativada! Posicione seu time completo e defina seus Bloqueadores.'
              : '⏳ IA definindo sua escalação tática (Vantagem Tática)...');

        flushSync(() => {
          setCaptainMoveMode(null);
          captainMoveModeRef.current = null;
          setHomeReady(false);
          setAwayReady(false);
          setBall(freshBall);
          setTurn(concedingTeam);
          setPhase(GamePhase.PREPARATION);
          setActionStatus(moveStatus);
        });

        addGameLog(
          concedingTeam === 'HOME'
            ? `🛡️ Vantagem Tática Ativada! O time adversário marcou ${nextCount} gols seguidos. Todo o seu time foi liberado para movimentação e você pode configurar seus Bloqueadores.`
            : `🛡️ Vantagem Tática Ativada para a IA! O oponente sofreu ${nextCount} gols seguidos.`,
          'phase'
        );

        if (isMultiplayer && myRole) {
          syncGameStateToFirebase(
            freshBall,
            homePlayersRef.current,
            awayPlayersRef.current,
            concedingTeam,
            nextScores,
            gameTimeRef.current,
            homeFlicksRemainingRef.current,
            awayFlicksRemainingRef.current,
            GamePhase.PREPARATION,
            moveStatus
          );
        }
      } else {
        console.log(`%c[Goal Event] Entering Captain Move Mode. Conceding team = ${concedingTeam}`, "color: #f39c12; font-weight: bold;");

        pendingGoalDataRef.current = { concedingTeam, nextCount, nextScores };
        
        const moveStatus = isMultiplayer
          ? (concedingTeam === myRole
              ? '👑 Pause Break! Reposicione seu Capitão se quiser, depois confirme.'
              : '⏳ Oponente decidindo posição do capitão...')
          : (concedingTeam === 'HOME'
              ? '👑 Pause Break! Reposicione seu Capitão se quiser, depois confirme.'
              : '⏳ IA decidindo posição do capitão...');

        flushSync(() => {
          setCaptainMoveMode(concedingTeam);
          captainMoveModeRef.current = concedingTeam;
          setBall(freshBall);
          setTurn(concedingTeam);
          setPhase(GamePhase.PREPARATION);
          setActionStatus(moveStatus);
          setHomeReady(false);
          setAwayReady(false);
        });

        addGameLog(`Pause Break! Time ${concedingTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} dapat reposicionar o Capitão antes de reiniciar.`, 'phase');

        if (!isMultiplayer && concedingTeam === 'AWAY') {
          setTimeout(() => {
            confirmCaptainMove();
          }, 1200);
        }
      }
    }, 4000);
  };

  return {
    confirmCaptainMove,
    shootBall,
    changePossession,
    triggerFoul,
    handleHalfTime,
    handleFullTime,
    handleBallStopped,
    scoreGoal
  };
};
