import { useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { GamePhase, Team, PlayerConfig, BallState, GameLogEntry, UniformConfig, Difficulty } from '../types';
import { 
  db, auth, onAuthStateChanged, User, ref, set, get, onValue, off, update, remove, onDisconnect 
} from '../firebase';
import { 
  Room, RoomPlayer, Tournament, TournamentMatch,
  signInGoogle, logoutFirebase, fetchLeaderboard, fetchMatchHistory,
  createMultiplayerRoom, joinMultiplayerRoom, leaveMultiplayerRoom,
  createTournament, joinTournament, startTournament, updateTournamentMatchResult
} from '../firebaseMultiplayer';
import SoundManager from '../SoundManager';
import { INITIAL_BALL } from '../gameConstants';

// --- SESSION PERSISTENCE HELPERS ---
const SESSION_KEY = 'tableball_mp_session';

/**
 * Persiste a sessão multiplayer ativa no localStorage.
 * @param roomId ID da sala
 * @param role Papel do jogador ('HOME' | 'AWAY')
 */
const saveSession = (roomId: string, role: Team) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, role }));
  } catch (_) {}
};

/**
 * Lê a sessão multiplayer salva no localStorage.
 * @returns Objeto com roomId e role, ou null se não houver sessão.
 */
const loadSession = (): { roomId: string; role: Team } | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { roomId: string; role: Team };
  } catch (_) { return null; }
};

/**
 * Remove a sessão multiplayer do localStorage.
 */
const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
};

interface UseGameMultiplayerParams {
  phase: GamePhase;
  phaseRef: React.MutableRefObject<GamePhase>;
  setPhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setPhaseSync: (p: GamePhase) => void;
  scores: { home: number; away: number };
  scoresRef: React.MutableRefObject<{ home: number; away: number }>;
  setScores: React.Dispatch<React.SetStateAction<{ home: number; away: number }>>;
  setScoresSync: (s: { home: number; away: number }) => void;
  homePlayers: PlayerConfig[];
  setHomePlayers: React.Dispatch<React.SetStateAction<PlayerConfig[]>>;
  homePlayersRef: React.MutableRefObject<PlayerConfig[]>;
  awayPlayers: PlayerConfig[];
  setAwayPlayers: React.Dispatch<React.SetStateAction<PlayerConfig[]>>;
  awayPlayersRef: React.MutableRefObject<PlayerConfig[]>;
  ball: BallState;
  ballRef: React.MutableRefObject<BallState>;
  setBall: React.Dispatch<React.SetStateAction<BallState>>;
  setBallSync: (b: BallState) => void;
  turn: Team;
  turnRef: React.MutableRefObject<Team>;
  setTurn: React.Dispatch<React.SetStateAction<Team>>;
  setTurnSync: (t: Team) => void;
  actionStatus: string;
  setActionStatus: React.Dispatch<React.SetStateAction<string>>;
  homeReady: boolean;
  setHomeReady: React.Dispatch<React.SetStateAction<boolean>>;
  awayReady: boolean;
  setAwayReady: React.Dispatch<React.SetStateAction<boolean>>;
  gameTime: number;
  gameTimeRef: React.MutableRefObject<number>;
  setGameTime: React.Dispatch<React.SetStateAction<number>>;
  setGameTimeSync: (t: number) => void;
  matchDuration: number;
  matchDurationRef: React.MutableRefObject<number>;
  setMatchDuration: React.Dispatch<React.SetStateAction<number>>;
  gameTimeSecondsRef: React.MutableRefObject<number>;
  setGameTimeSecondsSync: (s: number) => void;
  homeFlicksRemainingRef: React.MutableRefObject<number>;
  setHomeFlicksSync: (f: number) => void;
  awayFlicksRemainingRef: React.MutableRefObject<number>;
  setAwayFlicksSync: (f: number) => void;
  gkMoveActiveTeamRef: React.MutableRefObject<Team | null>;
  setGkMoveActiveTeamSync: (t: Team | null) => void;
  gkMoveTimerRef: React.MutableRefObject<number | null>;
  setGkMoveTimerSync: (t: number | null) => void;
  lastGoalScorerRef: React.MutableRefObject<Team | null>;
  setLastGoalScorer: React.Dispatch<React.SetStateAction<Team | null>>;
  consecutiveGoalsCountRef: React.MutableRefObject<number>;
  setConsecutiveGoalsCount: React.Dispatch<React.SetStateAction<number>>;
  gameMode: 'standard' | 'manual';
  setGameModeSync: (m: 'standard' | 'manual') => void;
  isMultiplayer: boolean;
  setIsMultiplayer: React.Dispatch<React.SetStateAction<boolean>>;
  roomId: string | null;
  setRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  myRole: Team | null;
  myRoleRef: React.MutableRefObject<Team | null>;
  setMyRole: React.Dispatch<React.SetStateAction<Team | null>>;
  activeUser: User | null;
  setActiveUser: React.Dispatch<React.SetStateAction<User | null>>;
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
  opponentInfo: RoomPlayer | null;
  setOpponentInfo: React.Dispatch<React.SetStateAction<RoomPlayer | null>>;
  opponentProfile: any;
  setOpponentProfile: React.Dispatch<React.SetStateAction<any>>;
  opponentDisconnected: boolean;
  setOpponentDisconnected: React.Dispatch<React.SetStateAction<boolean>>;
  disconnectCountdown: number;
  setDisconnectCountdown: React.Dispatch<React.SetStateAction<number>>;
  prepTimer: number | null;
  setPrepTimer: React.Dispatch<React.SetStateAction<number | null>>;
  turnTimer: number | null;
  setTurnTimer: React.Dispatch<React.SetStateAction<number | null>>;
  currentRoom: Room | null;
  setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  activeRooms: Room[];
  setActiveRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  leaderboard: any[];
  setLeaderboard: React.Dispatch<React.SetStateAction<any[]>>;
  matchHistory: any[];
  setMatchHistory: React.Dispatch<React.SetStateAction<any[]>>;
  tournamentsList: Tournament[];
  setTournamentsList: React.Dispatch<React.SetStateAction<Tournament[]>>;
  activeTournamentId: string | null;
  setActiveTournamentId: React.Dispatch<React.SetStateAction<string | null>>;
  currentMatchId: string | null;
  setCurrentMatchId: React.Dispatch<React.SetStateAction<string | null>>;
  tournament: Tournament | null;
  setTournament: React.Dispatch<React.SetStateAction<Tournament | null>>;
  homeKitConfig: UniformConfig | undefined;
  setHomeKitConfig: React.Dispatch<React.SetStateAction<UniformConfig | undefined>>;
  awayKitConfig: UniformConfig | undefined;
  setAwayKitConfig: React.Dispatch<React.SetStateAction<UniformConfig | undefined>>;
  isLeavingRef: React.MutableRefObject<boolean>;
  setSystemMessage: React.Dispatch<React.SetStateAction<{ title: string; message: string; type?: 'info' | 'error' | 'success' | 'warning' } | null>>;
  addGameLog: (message: string, type: GameLogEntry['type']) => void;
  initializeTeams: () => void;
  resetMatch: () => void;
  injuryTime: 'none' | 'halftime' | 'fulltime';
  injuryTimeRef: React.MutableRefObject<'none' | 'halftime' | 'fulltime'>;
  setInjuryTimeSync: (val: 'none' | 'halftime' | 'fulltime') => void;
}

export const useGameMultiplayer = ({
  phase,
  phaseRef,
  setPhase,
  setPhaseSync,
  scores,
  scoresRef,
  setScores,
  setScoresSync,
  homePlayers,
  setHomePlayers,
  homePlayersRef,
  awayPlayers,
  setAwayPlayers,
  awayPlayersRef,
  ball,
  ballRef,
  setBall,
  setBallSync,
  turn,
  turnRef,
  setTurn,
  setTurnSync,
  actionStatus,
  setActionStatus,
  homeReady,
  setHomeReady,
  awayReady,
  setAwayReady,
  gameTime,
  gameTimeRef,
  setGameTime,
  setGameTimeSync,
  matchDuration,
  matchDurationRef,
  setMatchDuration,
  gameTimeSecondsRef,
  setGameTimeSecondsSync,
  homeFlicksRemainingRef,
  setHomeFlicksSync,
  awayFlicksRemainingRef,
  setAwayFlicksSync,
  gkMoveActiveTeamRef,
  setGkMoveActiveTeamSync,
  gkMoveTimerRef,
  setGkMoveTimerSync,
  lastGoalScorerRef,
  setLastGoalScorer,
  consecutiveGoalsCountRef,
  setConsecutiveGoalsCount,
  gameMode,
  setGameModeSync,
  isMultiplayer,
  setIsMultiplayer,
  roomId,
  setRoomId,
  myRole,
  myRoleRef,
  setMyRole,
  activeUser,
  setActiveUser,
  userProfile,
  setUserProfile,
  opponentInfo,
  setOpponentInfo,
  opponentProfile,
  setOpponentProfile,
  opponentDisconnected,
  setOpponentDisconnected,
  disconnectCountdown,
  setDisconnectCountdown,
  prepTimer,
  setPrepTimer,
  turnTimer,
  setTurnTimer,
  currentRoom,
  setCurrentRoom,
  activeRooms,
  setActiveRooms,
  leaderboard,
  setLeaderboard,
  matchHistory,
  setMatchHistory,
  tournamentsList,
  setTournamentsList,
  activeTournamentId,
  setActiveTournamentId,
  currentMatchId,
  setCurrentMatchId,
  tournament,
  setTournament,
  homeKitConfig,
  setHomeKitConfig,
  awayKitConfig,
  setAwayKitConfig,
  isLeavingRef,
  setSystemMessage,
  addGameLog,
  initializeTeams,
  resetMatch,
  injuryTime,
  injuryTimeRef,
  setInjuryTimeSync
}: UseGameMultiplayerParams) => {

  const refreshHistoryAndLeaderboard = useCallback(async (uid: string) => {
    const history = await fetchMatchHistory(uid);
    const ranking = await fetchLeaderboard();
    setMatchHistory(history);
    setLeaderboard(ranking);
  }, [setMatchHistory, setLeaderboard]);

  const syncGameStateToFirebase = useCallback((
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
    forceSync: boolean = false
  ) => {
    if (!isMultiplayer || !roomId || !myRole) return;
    
    const isMaster = forceSync || turnRef.current === myRole;
    if (!isMaster) return;

    console.log(
      `%c[Multiplayer Outgoing] 📤 Syncing GameState to DB: Turn=${nextTurn} | Time=${nextGameTime}' | Scores=H:${nextScores.home} A:${nextScores.away} | Flicks=H:${nextHomeFlicks} A:${nextAwayFlicks} | Phase=${nextPhase}`,
      "color: #8e44ad; font-weight: bold; background: #f4ecf7; padding: 2px 4px; border: 1px solid #8e44ad; border-radius: 3px;"
    );

    const updates: any = {
      gameState: {
        ball: nextBall,
        homePlayers: nextHomePlayers,
        awayPlayers: nextAwayPlayers,
        turn: nextTurn,
        scores: nextScores,
        gameTime: nextGameTime,
        gameTimeSeconds: gameTimeSecondsRef.current,
        homeFlicksRemaining: nextHomeFlicks,
        awayFlicksRemaining: nextAwayFlicks,
        phase: nextPhase,
        actionStatus: nextStatus,
        lastGoalScorer: lastGoalScorerRef.current,
        consecutiveGoalsCount: consecutiveGoalsCountRef.current,
        gkMoveActiveTeam: gkMoveActiveTeamRef.current,
        gkMoveTimer: gkMoveTimerRef.current,
        injuryTime: injuryTimeRef.current
      }
    };

    if (nextPhase === GamePhase.PREPARATION) {
      updates['players/home/ready'] = false;
      updates['players/away/ready'] = false;
    }

    update(ref(db, `rooms/${roomId}`), updates);
  }, [isMultiplayer, roomId, myRole, turnRef, gameTimeSecondsRef, lastGoalScorerRef, consecutiveGoalsCountRef, gkMoveActiveTeamRef, gkMoveTimerRef]);

  // Vitória por W.O. (Walkover) do jogador remanescente
  const triggerWO = useCallback(() => {
    if (!isMultiplayer || !roomId || !myRole) return;
    console.log("%c[Game Loop] 🏆 WO triggered! Opponent disconnected.", "color: #27ae60; font-weight: bold;");

    const currentScores = scoresRef.current;
    let finalScores = { home: 0, away: 0 };
    let winnerRole: Team = myRole;

    if (myRole === 'HOME') {
      finalScores = {
        home: Math.max(3, currentScores.home),
        away: 0
      };
    } else {
      finalScores = {
        home: 0,
        away: Math.max(3, currentScores.away)
      };
    }

    const nextStatus = `Vitória por W.O. do Time ${winnerRole === 'HOME' ? 'Casa' : 'Visitante'}! O oponente desconectou.`;

    addGameLog(`Vitória por W.O.! O time oponente desconectou da partida. Placar Final: Casa ${finalScores.home} x ${finalScores.away} Visitante.`, 'phase');

    // 1. Transition locally to GAME_OVER phase
    flushSync(() => {
      setScoresSync(finalScores);
      setPhaseSync(GamePhase.GAME_OVER);
      setActionStatus(nextStatus);
      setOpponentDisconnected(false);
    });

    // 2. Update Firebase room state to GAME_OVER and ended status
    const roomRef = ref(db, `rooms/${roomId}`);
    update(roomRef, { 
      status: 'ended',
      'gameState/phase': GamePhase.GAME_OVER,
      'gameState/scores': finalScores,
      'gameState/actionStatus': nextStatus
    });
  }, [isMultiplayer, roomId, myRole, addGameLog, scoresRef, setScoresSync, setPhaseSync, setActionStatus, setOpponentDisconnected]);

  // Derrota ou Empate por Timeout (estouro de tempo na preparação ou reposicionamento de capitão)
  const triggerTimeoutDefeat = useCallback(() => {
    if (!isMultiplayer || !roomId || !myRole) return;
    console.log("%c[Game Loop] ⏰ Timeout triggered! Player failed to confirm action.", "color: #c0392b; font-weight: bold;");

    const currentScores = scoresRef.current;
    let finalScores = { home: 0, away: 0 };
    let nextStatus = '';

    // Use currentRoom player ready flags to avoid stale closure values
    const homeReadyNow = currentRoom?.players?.home?.ready ?? false;
    const awayReadyNow = currentRoom?.players?.away?.ready ?? false;
    const bothNotReady = !homeReadyNow && !awayReadyNow;

    if (bothNotReady) {
      finalScores = {
        home: currentScores.home,
        away: currentScores.away
      };
      nextStatus = 'Empate por Timeout Mútuo! Ambos os jogadores falharam em confirmar a preparação tática.';
      addGameLog('Fim de jogo por Timeout Mútuo! Ambos os jogadores falharam em confirmar a tática a tempo. Partida encerrada em Empate.', 'phase');
    } else {
      if (myRole === 'HOME') {
        finalScores = {
          home: 0,
          away: Math.max(3, currentScores.away)
        };
      } else {
        finalScores = {
          home: Math.max(3, currentScores.home),
          away: 0
        };
      }
      nextStatus = `Derrota por Timeout do Time ${myRole === 'HOME' ? 'Casa' : 'Visitante'}! Limite de tempo excedido.`;
      addGameLog(`Fim de jogo por Estouro de Tempo (Timeout)! O time ${myRole === 'HOME' ? 'Casa' : 'Visitante'} falhou em confirmar sua ação. Placar Final: Casa ${finalScores.home} x ${finalScores.away} Visitante.`, 'phase');
    }

    // 1. Transition locally to GAME_OVER phase
    flushSync(() => {
      setScoresSync(finalScores);
      setPhaseSync(GamePhase.GAME_OVER);
      setActionStatus(nextStatus);
      setOpponentDisconnected(false);
      setPrepTimer(null);
    });

    // 2. Update Firebase room state to GAME_OVER and ended status
    const roomRef = ref(db, `rooms/${roomId}`);
    update(roomRef, { 
      status: 'ended',
      'gameState/phase': GamePhase.GAME_OVER,
      'gameState/scores': finalScores,
      'gameState/actionStatus': nextStatus
    });
  }, [isMultiplayer, roomId, myRole, addGameLog, scoresRef, currentRoom, setScoresSync, setPhaseSync, setActionStatus, setOpponentDisconnected, setPrepTimer]);

  /**
   * Força o início da partida ao expirar o timer de preparação quando o HOME já confirmou
   * mas o AWAY não confirmou a tempo. Somente o HOME (árbitro) executa esta ação.
   * Inicia o jogo com as formações no estado atual do Firebase.
   */
  const triggerForceStartAfterTimeout = useCallback(() => {
    if (!isMultiplayer || !roomId || myRole !== 'HOME') return;
    console.log("%c[Game Loop] ⏰ Prep timeout: HOME confirmed, forcing match start!", "color: #e67e22; font-weight: bold;");

    const freshBall: BallState = {
      position: [0, 0.11, 0],
      velocity: [0, 0, 0],
      possession: 'HOME',
      lastTouchedByPlayerId: null,
      isKickoff: true,
      speedMultiplier: 1
    };

    const nextStatus = 'Partida iniciada! O adversário não confirmou a tática a tempo.';
    addGameLog('Partida forçada pelo árbitro! O time visitante não confirmou a tática dentro do prazo de 120s.', 'phase');

    const updates: any = {
      status: 'playing',
      gameState: {
        ball: freshBall,
        homePlayers: homePlayersRef.current,
        awayPlayers: awayPlayersRef.current,
        turn: 'HOME',
        scores: { home: 0, away: 0 },
        gameTime: 0,
        gameTimeSeconds: 0,
        homeFlicksRemaining: 3,
        awayFlicksRemaining: 3,
        phase: GamePhase.ACTION,
        actionStatus: nextStatus,
        lastGoalScorer: null,
        consecutiveGoalsCount: 0,
        gkMoveActiveTeam: null,
        gkMoveTimer: null,
        injuryTime: 'none'
      }
    };

    update(ref(db, `rooms/${roomId}`), updates);

    // Transition locally as well
    flushSync(() => {
      setPhaseSync(GamePhase.ACTION);
      setActionStatus(nextStatus);
      setBallSync(freshBall);
      setHomeFlicksSync(3);
      setAwayFlicksSync(3);
      setTurnSync('HOME');
      setPrepTimer(null);
    });
  }, [isMultiplayer, roomId, myRole, addGameLog, homePlayersRef, awayPlayersRef, setPhaseSync, setActionStatus, setBallSync, setHomeFlicksSync, setAwayFlicksSync, setTurnSync, setPrepTimer]);

  // Derrota por Inatividade (Timeout de peteleco na fase de ação ativa) - Multiplayer Apenas
  const triggerActiveTurnTimeout = useCallback((timedOutTeam: Team) => {
    if (!isMultiplayer || !roomId || !myRole) return;
    console.log(`%c[Game Loop] ⏰ Active Turn Timeout triggered for team: ${timedOutTeam}`, "color: #c0392b; font-weight: bold;");

    const currentScores = scoresRef.current;
    let finalScores = { home: 0, away: 0 };
    let nextStatus = '';

    if (timedOutTeam === 'HOME') {
      finalScores = {
        home: 0,
        away: Math.max(3, currentScores.away)
      };
      nextStatus = 'Derrota por Timeout do Time Casa! Jogador inativo.';
      addGameLog('Fim de jogo por Estouro de Tempo (Timeout)! O time Casa perdeu por inatividade.', 'phase');
    } else {
      finalScores = {
        home: Math.max(3, currentScores.home),
        away: 0
      };
      nextStatus = 'Derrota por Timeout do Time Visitante! Jogador inativo.';
      addGameLog('Fim de jogo por Estouro de Tempo (Timeout)! O time Visitante perdeu por inatividade.', 'phase');
    }

    SoundManager.playRefereeWhistle('full');

    // 1. Transition locally to GAME_OVER phase
    flushSync(() => {
      setScoresSync(finalScores);
      setPhaseSync(GamePhase.GAME_OVER);
      setActionStatus(nextStatus);
      setOpponentDisconnected(false);
      setPrepTimer(null);
      setTurnTimer(null);
    });

    // 2. Update Firebase room state to GAME_OVER and ended status
    const roomRef = ref(db, `rooms/${roomId}`);
    update(roomRef, { 
      status: 'ended',
      'gameState/phase': GamePhase.GAME_OVER,
      'gameState/scores': finalScores,
      'gameState/actionStatus': nextStatus
    });
  }, [isMultiplayer, roomId, myRole, addGameLog, scoresRef, setScoresSync, setPhaseSync, setActionStatus, setOpponentDisconnected, setPrepTimer, setTurnTimer]);

  // Auth Listener & User Profile Listener
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (user) => {
      setActiveUser(user);
      
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (user) {
        refreshHistoryAndLeaderboard(user.uid);
        
        const userRef = ref(db, `users/${user.uid}`);
        profileUnsub = onValue(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
        });
      } else {
        setMatchHistory([]);
        setUserProfile(null);
        setOpponentProfile(null);
        setHomeKitConfig(undefined);
        setAwayKitConfig(undefined);
      }
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }, [setActiveUser, setUserProfile, setMatchHistory, setOpponentProfile, setHomeKitConfig, setAwayKitConfig, refreshHistoryAndLeaderboard]);

  // Sync opponent profile dynamically when opponentInfo is set
  useEffect(() => {
    if (opponentInfo?.uid) {
      const oppProfileRef = ref(db, `users/${opponentInfo.uid}`);
      const oppUnsub = onValue(oppProfileRef, (snap) => {
        if (snap.exists()) {
          setOpponentProfile(snap.val());
        } else {
          setOpponentProfile(null);
        }
      });
      return () => oppUnsub();
    } else {
      setOpponentProfile(null);
    }
  }, [opponentInfo?.uid, setOpponentProfile]);

  // Dynamic Role-Aware Uniform Configuration & Synchronization
  useEffect(() => {
    const getKitFromProfile = (profile: any) => {
      if (!profile) return undefined;
      const activeKit = profile.selectedKit || 'home';
      if (activeKit === 'away' && profile.awayUniform) {
        return profile.awayUniform;
      }
      return profile.uniform || undefined;
    };

    if (isMultiplayer) {
      const myKit = getKitFromProfile(userProfile);
      const oppKit = getKitFromProfile(opponentProfile);

      if (myRole === 'HOME') {
        setHomeKitConfig(myKit);
        setAwayKitConfig(oppKit);
      } else if (myRole === 'AWAY') {
        setHomeKitConfig(oppKit);
        setAwayKitConfig(myKit);
      } else {
        setHomeKitConfig(undefined);
        setAwayKitConfig(undefined);
      }
    } else {
      const myKit = getKitFromProfile(userProfile);
      setHomeKitConfig(myKit);
    }
  }, [isMultiplayer, myRole, userProfile, opponentProfile, setHomeKitConfig, setAwayKitConfig]);

  // Automatic contrast for AWAY (AI) team based on HOME kit (Solo Mode Only)
  useEffect(() => {
    if (isMultiplayer) return;

    if (!homeKitConfig) {
      setAwayKitConfig(undefined);
      return;
    }

    const isDarkOrBlue = (color: string) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const isBlueish = b > r * 1.2 && b > g * 1.2;
      return brightness < 120 || isBlueish;
    };

    if (isDarkOrBlue(homeKitConfig.primaryColor)) {
      setAwayKitConfig({
        primaryColor: '#e55039',
        secondaryColor: '#f6b93b',
        pattern: 'solid',
        shortsColor: '#1e272e',
        socksColor: '#e55039'
      });
    } else {
      setAwayKitConfig({
        primaryColor: '#1e3799',
        secondaryColor: '#ffffff',
        pattern: 'solid',
        shortsColor: '#ffffff',
        socksColor: '#1e3799'
      });
    }
  }, [homeKitConfig, isMultiplayer, setAwayKitConfig]);

  // Rooms and Tournaments list listeners (lobby)
  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const tRef = ref(db, 'tournaments');

    const unsubRooms = onValue(roomsRef, (snap) => {
      if (!snap.exists()) {
        setActiveRooms([]);
        return;
      }
      const data = snap.val();
      const list = Object.keys(data).map(key => data[key]);
      setActiveRooms(list.filter(r => r.status === 'waiting'));
    });

    const unsubTournaments = onValue(tRef, (snap) => {
      if (!snap.exists()) {
        setTournamentsList([]);
        return;
      }
      const data = snap.val();
      const list = Object.keys(data).map(key => data[key]);
      setTournamentsList(list);
    });

    return () => {
      off(roomsRef);
      off(tRef);
    };
  }, [setActiveRooms, setTournamentsList]);

  // Sincronização Multiplayer em Tempo Real
  useEffect(() => {
    if (!isMultiplayer || !roomId) {
      setCurrentRoom(null);
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (phaseRef.current === GamePhase.GAME_OVER) {
          return;
        }
        if (!isLeavingRef.current) {
          if (myRoleRef.current === 'AWAY') {
            setSystemMessage({ title: 'Partida Cancelada', message: 'O host cancelou a partida.', type: 'warning' });
          } else if (myRoleRef.current === 'HOME') {
            setSystemMessage({ title: 'Oponente Saiu', message: 'O oponente saiu da partida.', type: 'warning' });
          }
        }
        resetMatch();
        return;
      }
      const room: Room = snapshot.val();
      setCurrentRoom(room);

      if (room.gameMode !== undefined) {
        setGameModeSync(room.gameMode);
      }

      if (room.matchDuration !== undefined) {
        setMatchDuration(room.matchDuration);
        matchDurationRef.current = room.matchDuration;
      }

      const isHome = myRoleRef.current === 'HOME';

      if (room.status === 'waiting' && isHome && phaseRef.current !== GamePhase.MENU) {
        setPhase(GamePhase.MENU);
        setScores({ home: 0, away: 0 });
        setHomeReady(false);
        setAwayReady(false);
        initializeTeams();
        setBall(INITIAL_BALL);
        return;
      }

      if (room.status === 'preparation' && phaseRef.current === GamePhase.MENU) {
        setPhase(GamePhase.PREPARATION);
      }

      if (room.status === 'preparation' || (room.status === 'playing' && room.gameState && room.gameState.phase === GamePhase.PREPARATION)) {
        const homeSetup = room.players.home.ready;
        const awaySetup = room.players.away ? room.players.away.ready : false;

        setHomeReady(homeSetup);
        setAwayReady(awaySetup);

        if (room.gameState) {
          if (myRoleRef.current === 'HOME' && Array.isArray(room.gameState.awayPlayers)) {
            setAwayPlayers(room.gameState.awayPlayers);
          }
          if (myRoleRef.current === 'AWAY' && Array.isArray(room.gameState.homePlayers)) {
            setHomePlayers(room.gameState.homePlayers);
          }
        }

        // If both are ready, the host (HOME) should start/resume the match!
        if (homeSetup && awaySetup && myRoleRef.current === 'HOME') {
          const isPrepRoomStatus = room.status === 'preparation';
          const isPrepGamePhase = room.gameState?.phase === GamePhase.PREPARATION;

          if (isPrepRoomStatus || isPrepGamePhase) {
            console.log("%c[Multiplayer] Both players ready! Starting/resuming game...", "color: #2ecc71; font-weight: bold;");
            
            const nextTurn = room.gameState?.turn || 'HOME';
            const nextStatus = nextTurn === 'HOME'
              ? 'Partida Iniciada! Vez do Time Casa.'
              : 'Partida Iniciada! Vez do Time Visitante.';
            
            const freshBall: BallState = {
              position: [0, 0.11, 0],
              velocity: [0, 0, 0],
              possession: isPrepRoomStatus ? 'HOME' : nextTurn,
              lastTouchedByPlayerId: null,
              isKickoff: true,
              speedMultiplier: 1
            };

            const updates: any = {};
            if (isPrepRoomStatus) {
              updates['status'] = 'playing';
              updates['gameState'] = {
                ball: freshBall,
                homePlayers: room.gameState?.homePlayers || homePlayersRef.current,
                awayPlayers: room.gameState?.awayPlayers || awayPlayersRef.current,
                turn: 'HOME',
                scores: room.gameState?.scores || { home: 0, away: 0 },
                gameTime: room.gameState?.gameTime || 0,
                gameTimeSeconds: room.gameState?.gameTimeSeconds || 0,
                homeFlicksRemaining: 3,
                awayFlicksRemaining: 3,
                phase: GamePhase.ACTION,
                actionStatus: 'Partida Iniciada! Vez do Time Casa.',
                lastGoalScorer: room.gameState?.lastGoalScorer || null,
                consecutiveGoalsCount: room.gameState?.consecutiveGoalsCount || 0,
                gkMoveActiveTeam: null,
                gkMoveTimer: null
              };
            } else {
              const currentBall = room.gameState?.ball || ballRef.current;
              updates['gameState/phase'] = GamePhase.ACTION;
              updates['gameState/actionStatus'] = nextStatus;
              updates['gameState/ball/isKickoff'] = currentBall.isKickoff || false;
              updates['gameState/ball/position'] = currentBall.position || [0, 0.11, 0];
              updates['gameState/ball/velocity'] = [0, 0, 0];
              updates['gameState/homeFlicksRemaining'] = 3;
              updates['gameState/awayFlicksRemaining'] = 3;
            }

            update(ref(db, `rooms/${roomId}`), updates);
          }
        }
      }

      if (myRoleRef.current === 'HOME') {
        setOpponentInfo(room.players.away || null);
      } else {
        setOpponentInfo(room.players.home);
      }

      if ((room.status === 'playing' || room.status === 'ended') && room.gameState) {
        if (room.gameState.gkMoveActiveTeam !== undefined) {
          setGkMoveActiveTeamSync(room.gameState.gkMoveActiveTeam);
        }
        if (room.gameState.gkMoveTimer !== undefined) {
          setGkMoveTimerSync(room.gameState.gkMoveTimer);
        }
        const isMyTurn = room.gameState.turn === myRoleRef.current;
        const dbPhase = room.gameState.phase;
        const turnChanged = turnRef.current !== room.gameState.turn;
        const phaseChanged = phaseRef.current !== dbPhase;
        
        if (turnChanged || phaseChanged || !isMyTurn || dbPhase === GamePhase.PREPARATION || dbPhase === GamePhase.GOAL_CELEBRATION || dbPhase === GamePhase.GAME_OVER) {
          setScoresSync(room.gameState.scores);
          setTurnSync(room.gameState.turn);
          setGameTimeSync(room.gameState.gameTime);
          if (room.gameState.gameTimeSeconds !== undefined) {
            setGameTimeSecondsSync(room.gameState.gameTimeSeconds);
          }
          setHomeFlicksSync(room.gameState.homeFlicksRemaining);
          setAwayFlicksSync(room.gameState.awayFlicksRemaining);
          setPhaseSync(dbPhase);
          setActionStatus(room.gameState.actionStatus);

          setBallSync(room.gameState.ball);
          // Validate player arrays before syncing to prevent React error #185
          // caused by malformed/non-array data from Firebase crashing the renderer.
          if (Array.isArray(room.gameState.homePlayers)) {
            setHomePlayers(room.gameState.homePlayers);
          }
          if (Array.isArray(room.gameState.awayPlayers)) {
            setAwayPlayers(room.gameState.awayPlayers);
          }
          if (room.gameState.lastGoalScorer !== undefined) {
            setLastGoalScorer(room.gameState.lastGoalScorer);
            lastGoalScorerRef.current = room.gameState.lastGoalScorer;
          }
          if (room.gameState.consecutiveGoalsCount !== undefined) {
            setConsecutiveGoalsCount(room.gameState.consecutiveGoalsCount);
            consecutiveGoalsCountRef.current = room.gameState.consecutiveGoalsCount;
          }
          if (room.gameState.injuryTime !== undefined) {
            setInjuryTimeSync(room.gameState.injuryTime);
          }
        }
      }

      const oppKey = isHome ? 'away' : 'home';
      const oppPresent = room.presence ? !!room.presence[oppKey] : true;
      
      if (!oppPresent && (room.status === 'preparation' || room.status === 'playing')) {
        setOpponentDisconnected(true);
      } else {
        setOpponentDisconnected(false);
        setDisconnectCountdown(15);
      }
    });

    return () => {
      off(roomRef);
    };
  }, [isMultiplayer, roomId, setOpponentDisconnected, setDisconnectCountdown, setGkMoveActiveTeamSync, setGkMoveTimerSync, setScoresSync, setTurnSync, setGameTimeSync, setGameTimeSecondsSync, setHomeFlicksSync, setAwayFlicksSync, setPhaseSync, setBallSync, setLastGoalScorer, setConsecutiveGoalsCount, setHomeReady, setAwayReady, setAwayPlayers, setHomePlayers, setOpponentInfo, setCurrentRoom, setPhase, setScores, initializeTeams, setBall, setActionStatus, setGameModeSync, setMatchDuration, matchDurationRef, phaseRef, myRoleRef, isLeavingRef, setSystemMessage, resetMatch, turnRef, lastGoalScorerRef, consecutiveGoalsCountRef, setInjuryTimeSync]);

  // Monitoramento dinâmico de presença usando .info/connected
  useEffect(() => {
    if (!isMultiplayer || !roomId || !myRole) return;

    const connectedRef = ref(db, '.info/connected');
    const myPresenceRef = ref(db, `rooms/${roomId}/presence/${myRole === 'HOME' ? 'home' : 'away'}`);

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myPresenceRef, true);

        if (myRole === 'HOME') {
          onDisconnect(myPresenceRef).remove();
          onDisconnect(ref(db, `rooms/${roomId}`)).remove();
        } else {
          onDisconnect(myPresenceRef).set(false);
        }
      }
    });

    return () => {
      unsubConnected();
    };
  }, [isMultiplayer, roomId, myRole]);

  // Real-Time Flick listener
  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const flickRef = ref(db, `rooms/${roomId}/flick`);

    const unsubscribe = onValue(flickRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const flick = snapshot.val();

      if (flick.by !== myRoleRef.current) {
        const isKickoff = ballRef.current.isKickoff;
        if (isKickoff) {
          console.log("%c[Game Loop] Opponent Kickoff shot! This flick does NOT count.", "color: #2ecc71; font-weight: bold;");
          setBall(prev => ({
            ...prev,
            velocity: [flick.vx, 0, flick.vz],
            isKickoff: false
          }));
        } else {
          if (flick.by === 'HOME') {
            const oldFlicks = homeFlicksRemainingRef.current;
            const newFlicks = Math.max(0, oldFlicks - 1);
            homeFlicksRemainingRef.current = newFlicks;
            setHomeFlicksSync(newFlicks);
            addGameLog(`Peteleco executado pelo Time Casa (Multiplayer). Restantes: ${newFlicks}/3.`, 'flick');
          } else {
            const oldFlicks = awayFlicksRemainingRef.current;
            const newFlicks = Math.max(0, oldFlicks - 1);
            awayFlicksRemainingRef.current = newFlicks;
            setAwayFlicksSync(newFlicks);
            addGameLog(`Peteleco executado pelo Time Visitante (Multiplayer). Restantes: ${newFlicks}/3.`, 'flick');
          }
          setBall(prev => ({
            ...prev,
            velocity: [flick.vx, 0, flick.vz]
          }));
        }
        setActionStatus('O adversário disparou a bola!');
      }
    });

    return () => {
      off(flickRef);
    };
  }, [isMultiplayer, roomId, setBall, setHomeFlicksSync, setAwayFlicksSync, setActionStatus, addGameLog, myRoleRef, ballRef, homeFlicksRemainingRef, awayFlicksRemainingRef]);

  // Sincronizar final de jogo para salvar histórico e ranking de forma independente
  useEffect(() => {
    if (phase === GamePhase.GAME_OVER && isMultiplayer && roomId && myRole && activeUser) {
      console.log("%c[Game Loop] GAME_OVER phase detected. Saving stats...", "color: #27ae60; font-weight: bold;");

      const isHome = myRole === 'HOME';

      get(ref(db, `rooms/${roomId}`)).then(async (snap) => {
        if (!snap.exists()) return;
        const room: Room = snap.val();
        const homeP = room.players.home;
        const awayP = room.players.away;

        if (homeP && awayP) {
          const myGoals = isHome ? scores.home : scores.away;
          const oppGoals = isHome ? scores.away : scores.home;
          const oppPlayer = isHome ? awayP : homeP;

          const { updateLeaderboardAndHistory } = await import('../firebaseMultiplayer');
          await updateLeaderboardAndHistory(
            activeUser.uid,
            oppPlayer.displayName,
            oppPlayer.photoURL,
            myGoals,
            oppGoals,
            !!activeTournamentId,
            oppPlayer.uid || opponentInfo?.uid || opponentProfile?.uid || ''
          );

          if (activeTournamentId && currentMatchId) {
            const winnerUid = myGoals > oppGoals ? activeUser.uid : oppPlayer.uid;
            
            const shouldWriteTournament = isHome || opponentDisconnected;
            if (shouldWriteTournament) {
              await updateTournamentMatchResult(
                activeTournamentId,
                currentMatchId,
                myGoals,
                oppGoals,
                winnerUid
              );
            }
          }
        }

        const shouldDeleteRoom = isHome || opponentDisconnected;
        if (shouldDeleteRoom) {
          update(ref(db, `rooms/${roomId}`), { status: 'ended' });

          setTimeout(() => {
            console.log("%c[Cleanup] Deleting room from database to prevent phantom room.", "color: #e74c3c; font-weight: bold;");
            remove(ref(db, `rooms/${roomId}`));
          }, 2000);
        }
      });

      setTimeout(() => refreshHistoryAndLeaderboard(activeUser.uid), 2000);
    }
  }, [phase, isMultiplayer, roomId, myRole, activeUser, opponentDisconnected, scores.home, scores.away, activeTournamentId, currentMatchId, opponentInfo, opponentProfile, refreshHistoryAndLeaderboard]);

  // Sincronizar Torneio Mata-Mata Ativo
  useEffect(() => {
    if (!activeTournamentId) return;

    const tRef = ref(db, `tournaments/${activeTournamentId}`);

    const unsub = onValue(tRef, (snap) => {
      if (!snap.exists()) return;
      const t: Tournament = snap.val();
      setTournament(t);

      if (t.status === 'completed') {
        setActionStatus(`Torneio Finalizado! O vencedor foi ${t.players[t.winnerUid!].displayName}!`);
      }
    });

    return () => {
      off(tRef);
    };
  }, [activeTournamentId, setTournament, setActionStatus]);

  // --- MULTIPLAYER ROOM HELPERS ---

  /**
   * Reconecta silenciosamente a uma sala existente após um disconnect.
   * Não chama joinMultiplayerRoom (evita sobrescrever dados) — apenas restaura
   * o estado local, re-registra presence e onDisconnect no Firebase.
   * @param id ID da sala a reconectar
   * @param role Papel do jogador ('HOME' | 'AWAY')
   */
  const reconnectToRoom = useCallback(async (id: string, role: Team) => {
    try {
      const roomSnap = await get(ref(db, `rooms/${id}`));
      if (!roomSnap.exists()) {
        clearSession();
        return;
      }

      const room: Room = roomSnap.val();

      // Sala encerrada ou expirada — limpar sessão
      if (room.status === 'ended') {
        clearSession();
        return;
      }

      // Verificar se o UID do usuário ainda é membro da sala
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const isHome = room.players.home?.uid === uid;
      const isAway = room.players.away?.uid === uid;
      if (!isHome && !isAway) {
        clearSession();
        return;
      }

      // Confirmar que o role salvo bate com o UID
      const confirmedRole: Team = isHome ? 'HOME' : 'AWAY';

      console.log(`%c[Reconnect] 🔄 Reconectando à sala ${id} como ${confirmedRole}...`, 'color: #f39c12; font-weight: bold;');

      // Re-registrar presence e onDisconnect
      const presenceKey = confirmedRole === 'HOME' ? 'home' : 'away';
      const myPresenceRef = ref(db, `rooms/${id}/presence/${presenceKey}`);
      await set(myPresenceRef, true);

      if (confirmedRole === 'HOME') {
        onDisconnect(myPresenceRef).remove();
        onDisconnect(ref(db, `rooms/${id}`)).remove();
      } else {
        onDisconnect(myPresenceRef).set(false);
      }

      // Restaurar estado local
      isLeavingRef.current = false;
      setRoomId(id);
      setMyRole(confirmedRole);
      setIsMultiplayer(true);
      setMatchDuration(room.matchDuration ?? 180);
      matchDurationRef.current = room.matchDuration ?? 180;

      // Restaurar fase de acordo com o status da sala
      if (room.status === 'playing' && room.gameState) {
        setPhaseSync(room.gameState.phase ?? GamePhase.ACTION);
      } else if (room.status === 'preparation') {
        setPhaseSync(GamePhase.PREPARATION);
      } else {
        setPhaseSync(GamePhase.MENU);
      }

      setSystemMessage({
        title: 'Reconectado!',
        message: 'Você voltou à sala. Reconectando à partida...',
        type: 'success'
      });

      saveSession(id, confirmedRole);
    } catch (err) {
      console.error('[Reconnect] Erro ao reconectar:', err);
      clearSession();
    }
  }, [isLeavingRef, setRoomId, setMyRole, setIsMultiplayer, setMatchDuration, matchDurationRef, setPhaseSync, setSystemMessage]);

  const handleCreateRoom = async (name: string, pass?: string, duration: number = 180, mode: 'standard' | 'manual' = 'standard') => {
    try {
      isLeavingRef.current = false;
      const id = await createMultiplayerRoom(name, pass, duration, mode);
      setRoomId(id);
      setMyRole('HOME');
      setIsMultiplayer(true);
      setScores({ home: 0, away: 0 });
      setGameModeSync(mode);
      initializeTeams();
      setBall({ ...INITIAL_BALL, isKickoff: true });
      setPhase(GamePhase.MENU);
      setActionStatus('Sala criada! Aguardando oponente...');
      setMatchDuration(duration);
      matchDurationRef.current = duration;
      setGameTimeSecondsSync(0);
      saveSession(id, 'HOME');
      
      if (activeUser) refreshHistoryAndLeaderboard(activeUser.uid);
    } catch (err) {
      console.error(err);
      setSystemMessage({ title: 'Erro de Sala', message: 'Erro ao criar sala.', type: 'error' });
    }
  };

  const handleJoinRoom = async (id: string, pass?: string) => {
    try {
      isLeavingRef.current = false;
      await joinMultiplayerRoom(id, pass);
      setRoomId(id);
      setMyRole('AWAY');
      setIsMultiplayer(true);
      setScores({ home: 0, away: 0 });
      initializeTeams();
      setBall({ ...INITIAL_BALL, isKickoff: true });
      // Stay in MENU — the room listener handles the MENU→PREPARATION transition
      // when it detects room.status === 'preparation' and phaseRef === MENU.
      // Forcing PREPARATION here bypasses the lobby and crashes the 3D scene
      // for the AWAY player because players/ball data is not yet synced.
      setPhase(GamePhase.MENU);
      setActionStatus('Conectado à sala! Monte sua tática de guerra.');
      saveSession(id, 'AWAY');
      
      if (activeUser) refreshHistoryAndLeaderboard(activeUser.uid);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'WRONG_PASSWORD') {
        setSystemMessage({ title: 'Acesso Negado', message: 'Senha incorreta!', type: 'error' });
      } else {
        setSystemMessage({ title: 'Erro de Conexão', message: 'Erro ao entrar na sala. Talvez esteja cheia.', type: 'error' });
      }
    }
  };

  // --- TOURNAMENT HELPERS ---
  const handleCreateTournament = async (name: string) => {
    try {
      const id = await createTournament(name);
      setActiveTournamentId(id);
      setActionStatus('Torneio criado! Aguardando competidores...');
    } catch (err) {
      console.error(err);
      setSystemMessage({ title: 'Erro de Torneio', message: 'Erro ao criar torneio.', type: 'error' });
    }
  };

  const handleJoinTournament = async (id: string) => {
    try {
      await joinTournament(id);
      setActiveTournamentId(id);
      setActionStatus('Você se inscreveu no Torneio! Aguardando início...');
    } catch (err) {
      console.error(err);
      setSystemMessage({ title: 'Erro de Torneio', message: 'Erro ao entrar no torneio.', type: 'error' });
    }
  };

  const handleStartTournament = async (id: string) => {
    try {
      await startTournament(id);
      setActionStatus('Torneio Iniciado! Que vença o melhor.');
    } catch (err) {
      console.error(err);
      setSystemMessage({ title: 'Erro de Torneio', message: 'Erro ao iniciar torneio.', type: 'error' });
    }
  };

  const handlePlayTournamentMatch = async (match: TournamentMatch) => {
    if (!activeUser) return;
    const isP1 = match.player1.uid === activeUser.uid;
    const opponent = isP1 ? match.player2 : match.player1;
    
    setCurrentMatchId(match.matchId);

    if (opponent.isAI) {
      setIsMultiplayer(true);
      setRoomId(null);
      setMyRole('HOME');
      setScores({ home: 0, away: 0 });
      initializeTeams();
      setActionStatus(`Partida de Torneio contra ${opponent.displayName}!`);
      setPhase(GamePhase.PREPARATION);
    } else {
      try {
        const roomName = `Mata-Mata: ${match.player1.displayName} vs ${match.player2.displayName}`;
        const roomRefId = await createMultiplayerRoom(roomName);
        
        await update(ref(db, `tournaments/${activeTournamentId}/matches/${match.matchId}`), {
          roomId: roomRefId
        });
        
        setRoomId(roomRefId);
        setMyRole('HOME');
        setIsMultiplayer(true);
        setScores({ home: 0, away: 0 });
        initializeTeams();
        setBall(INITIAL_BALL);
        setPhase(GamePhase.PREPARATION);
        setActionStatus('Sala de torneio criada! Aguardando adversário conectar...');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleJoinTournamentMatch = async (match: TournamentMatch) => {
    if (!match.roomId) return;
    setCurrentMatchId(match.matchId);
    try {
      await joinMultiplayerRoom(match.roomId);
      setRoomId(match.roomId);
      setMyRole('AWAY');
      setIsMultiplayer(true);
      setScores({ home: 0, away: 0 });
      initializeTeams();
      setBall(INITIAL_BALL);
      setPhase(GamePhase.PREPARATION);
      setActionStatus('Conectado à partida do torneio! Prepare-se.');
    } catch (err) {
      console.error(err);
    }
  };

  // Abandono voluntário: dá vitória por W.O. ao oponente e salva as stats do jogador que sai
  const triggerForfeit = useCallback(async () => {
    if (!isMultiplayer || !roomId || !myRole || !activeUser) return;

    const opponentRole: Team = myRole === 'HOME' ? 'AWAY' : 'HOME';
    const currentScores = scoresRef.current;

    // Opponent wins: ensure at least 3-0 from their perspective
    let finalScores = { home: 0, away: 0 };
    if (opponentRole === 'HOME') {
      finalScores = { home: Math.max(3, currentScores.home), away: 0 };
    } else {
      finalScores = { home: 0, away: Math.max(3, currentScores.away) };
    }

    const nextStatus = `Vitória por Abandono do Time ${opponentRole === 'HOME' ? 'Casa' : 'Visitante'}! O adversário abandonou.`;

    try {
      const roomRef = ref(db, `rooms/${roomId}`);
      const snap = await get(roomRef);
      if (snap.exists()) {
        const room: Room = snap.val();
        const homeP = room.players.home;
        const awayP = room.players.away;

        if (homeP && awayP) {
          // Save leaving player's own stats (they get a loss)
          const myGoals = myRole === 'HOME' ? finalScores.home : finalScores.away;
          const oppGoals = myRole === 'HOME' ? finalScores.away : finalScores.home;
          const oppPlayer = myRole === 'HOME' ? awayP : homeP;

          const { updateLeaderboardAndHistory } = await import('../firebaseMultiplayer');
          await updateLeaderboardAndHistory(
            activeUser.uid,
            oppPlayer.displayName,
            oppPlayer.photoURL,
            myGoals,
            oppGoals,
            !!activeTournamentId,
            oppPlayer.uid
          );
        }

        // Update room to GAME_OVER so opponent client detects the W.O. win and saves their own stats
        await update(roomRef, {
          status: 'ended',
          'gameState/phase': GamePhase.GAME_OVER,
          'gameState/scores': finalScores,
          'gameState/actionStatus': nextStatus
        });
      }
    } catch (err) {
      console.error('[Forfeit] Error saving stats or updating room:', err);
    }

    // Leave locally after a short delay to ensure Firebase write propagates
    isLeavingRef.current = true;
    setTimeout(() => {
      resetMatch();
    }, 300);
  }, [isMultiplayer, roomId, myRole, activeUser, scoresRef, activeTournamentId, isLeavingRef, resetMatch]);

  // --- BOOT RECONNECT (runs once on mount) ---
  // Lê a sessão salva no localStorage e tenta reconectar silenciosamente
  // se o usuário retornou após um disconnect durante uma partida.
  const hasAttemptedReconnect = useRef(false);
  useEffect(() => {
    if (hasAttemptedReconnect.current) return;
    hasAttemptedReconnect.current = true;

    const session = loadSession();
    if (!session) return;

    // Aguardar o Firebase Auth estabilizar antes de tentar reconectar
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        clearSession();
        return;
      }
      reconnectToRoom(session.roomId, session.role);
    });
  }, [reconnectToRoom]);

  return {
    syncGameStateToFirebase,
    triggerWO,
    triggerTimeoutDefeat,
    triggerForceStartAfterTimeout,
    triggerActiveTurnTimeout,
    triggerForfeit,
    handleCreateRoom,
    handleJoinRoom,
    handleCreateTournament,
    handleJoinTournament,
    handleStartTournament,
    handlePlayTournamentMatch,
    handleJoinTournamentMatch,
    refreshHistoryAndLeaderboard,
    reconnectToRoom
  };
};
