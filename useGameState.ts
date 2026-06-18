import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { GamePhase, Difficulty, Team, PlayerConfig, BallState, UniformConfig, GameLogEntry } from './types';
import { 
  db, auth, onAuthStateChanged, User, ref, onValue
} from './firebase';
import { 
  Room, RoomPlayer, Tournament, TournamentMatch,
  signInGoogle, logoutFirebase, leaveMultiplayerRoom
} from './firebaseMultiplayer';
import SoundManager from './SoundManager';
import { INITIAL_BALL } from './gameConstants';
import { translations } from './translations';

// Export constants for backwards-compatibility
export { FIELD_WIDTH, FIELD_LENGTH, HALF_WIDTH, HALF_LENGTH, ALL_SLOTS, ETHNICITIES } from './gameConstants';

// Import sub-hooks
import { useGameAI } from './hooks/useGameAI';
import { useGameSetup } from './hooks/useGameSetup';
import { useGameTimers } from './hooks/useGameTimers';
import { useGameTransitions } from './hooks/useGameTransitions';
import { useGameMultiplayer } from './hooks/useGameMultiplayer';

export const useGameState = () => {
  // Local States
  const [language, setLanguageState] = useState<'en' | 'pt'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('tableball_language') as 'en' | 'pt') || 'en';
    }
    return 'en';
  });

  const changeLanguage = useCallback((lang: 'en' | 'pt') => {
    setLanguageState(lang);
    localStorage.setItem('tableball_language', lang);
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    let result = value !== undefined ? value : key;
    if (replacements && typeof result === 'string') {
      Object.entries(replacements).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  }, [language]);

  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [homeKitConfig, setHomeKitConfig] = useState<UniformConfig | undefined>(undefined);
  const [awayKitConfig, setAwayKitConfig] = useState<UniformConfig | undefined>(undefined);
  const [scores, setScores] = useState({ home: 0, away: 0 });
  const [homePlayers, setHomePlayers] = useState<PlayerConfig[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerConfig[]>([]);
  const [selectedPlayerId, setSelectedPlayerIdInternal] = useState<string | null>(null);
  const [ball, setBall] = useState<BallState>(INITIAL_BALL);
  const [turn, setTurn] = useState<Team>('HOME');
  const [actionStatus, setActionStatus] = useState<string>('');
  const [isIAThinking, setIsIAThinking] = useState(false);
  const isIAThinkingRef = useRef(false);
  const [homeReady, setHomeReady] = useState(false);
  const [awayReady, setAwayReady] = useState(false);
  const [gameTime, setGameTime] = useState(0); // minutes (0 to 90)
  const [matchDuration, setMatchDuration] = useState(180); // in seconds (1, 3, or 5 mins)
  const [gameTimeSeconds, setGameTimeSeconds] = useState(0); // in seconds elapsed
  const [homeFlicksRemaining, setHomeFlicksRemaining] = useState(3);
  const [awayFlicksRemaining, setAwayFlicksRemaining] = useState(3);
  const [isCameraCentered, setIsCameraCentered] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [cameraMode, setCameraMode] = useState<'dynamic' | 'fixed'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('tableball_camera_mode') as 'dynamic' | 'fixed') || 'dynamic';
    }
    return 'dynamic';
  });

  const [gameMode, setGameMode] = useState<'standard' | 'manual'>('standard');
  const [gkMoveActiveTeam, setGkMoveActiveTeam] = useState<Team | null>(null);
  const [gkMoveTimer, setGkMoveTimer] = useState<number | null>(null);

  const [gameLogs, setGameLogs] = useState<GameLogEntry[]>([]);

  // Firebase/Multiplayer States
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Team | null>(null);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [opponentInfo, setOpponentInfo] = useState<RoomPlayer | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState(15);
  const [prepTimer, setPrepTimer] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // Tournament States
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([]);

  const [lastGoalScorer, setLastGoalScorer] = useState<Team | null>(null);
  const [consecutiveGoalsCount, setConsecutiveGoalsCount] = useState<number>(0);
  const [captainMoveMode, setCaptainMoveMode] = useState<Team | null>(null);
  const [injuryTime, setInjuryTime] = useState<'none' | 'halftime' | 'fulltime'>('none');
  const [swapPlayerId, setSwapPlayerId] = useState<string | null>(null);

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesAutoTriggered, setRulesAutoTriggered] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{ title: string; message: string; type?: 'info' | 'error' | 'success' | 'warning' } | null>(null);
  const [isBannerActive, setIsBannerActive] = useState(false);
  const [currentMenuTab, setCurrentMenuTab] = useState<'solo' | 'multi' | 'tournament' | 'ranking' | 'history'>('solo');

  const setSelectedPlayerId = useCallback((id: string | null) => {
    if (id === null || id === 'ball') {
      setSelectedPlayerIdInternal(id);
      setSwapPlayerId(null);
      return;
    }
    const isHomePlayer = id.startsWith('home');
    const myControllingTeam: Team = isMultiplayer ? (myRole || 'HOME') : 'HOME';
    if (myControllingTeam === 'HOME' && !isHomePlayer) return;
    if (myControllingTeam === 'AWAY' && isHomePlayer) return;
    setSelectedPlayerIdInternal(id);
    setSwapPlayerId(null);
  }, [isMultiplayer, myRole]);

  // Refs for real-time physics synchronizations
  const ballRef = useRef(ball);
  const captainMoveModeRef = useRef<Team | null>(null);
  const pendingGoalDataRef = useRef<{
    concedingTeam: Team;
    nextCount: number;
    nextScores: { home: number; away: number };
  } | null>(null);
  const turnRef = useRef(turn);
  const myRoleRef = useRef(myRole);
  const phaseRef = useRef(phase);
  const isLeavingRef = useRef(false);
  const awayPlayersRef = useRef(awayPlayers);
  const homePlayersRef = useRef(homePlayers);
  const scoresRef = useRef(scores);
  const gameTimeRef = useRef(gameTime);
  const homeFlicksRemainingRef = useRef(homeFlicksRemaining);
  const awayFlicksRemainingRef = useRef(awayFlicksRemaining);
  const lastGoalScorerRef = useRef(lastGoalScorer);
  const consecutiveGoalsCountRef = useRef(consecutiveGoalsCount);
  const matchDurationRef = useRef(matchDuration);
  const gameTimeSecondsRef = useRef(gameTimeSeconds);
  const wasKickoffRef = useRef(false);
  const injuryTimeRef = useRef<'none' | 'halftime' | 'fulltime'>('none');
  const turnTimerRef = useRef<number | null>(null);

  const gameModeRef = useRef<'standard' | 'manual'>('standard');
  const gkMoveActiveTeamRef = useRef<Team | null>(null);
  const gkMoveTimerRef = useRef<number | null>(null);

  const changeCameraMode = useCallback((mode: 'dynamic' | 'fixed') => {
    setCameraMode(mode);
    localStorage.setItem('tableball_camera_mode', mode);
  }, []);

  const recenterCamera = useCallback(() => {
    setRecenterTrigger(prev => prev + 1);
    setIsCameraCentered(true);
  }, []);

  // Synchronizers to bridge hook references
  const setGameModeSync = useCallback((mode: 'standard' | 'manual') => {
    gameModeRef.current = mode;
    setGameMode(mode);
  }, []);

  const setGkMoveActiveTeamSync = useCallback((team: Team | null) => {
    gkMoveActiveTeamRef.current = team;
    setGkMoveActiveTeam(team);
  }, []);

  const setGkMoveTimerSync = useCallback((timer: number | null) => {
    gkMoveTimerRef.current = timer;
    setGkMoveTimer(timer);
  }, []);

  const setTurnSync = useCallback((newTurn: Team) => {
    turnRef.current = newTurn;
    setTurn(newTurn);
  }, []);

  const setPhaseSync = useCallback((newPhase: GamePhase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
  }, []);

  const setHomeFlicksSync = useCallback((flicks: number) => {
    homeFlicksRemainingRef.current = flicks;
    setHomeFlicksRemaining(flicks);
  }, []);

  const setAwayFlicksSync = useCallback((flicks: number) => {
    awayFlicksRemainingRef.current = flicks;
    setAwayFlicksRemaining(flicks);
  }, []);

  const setBallSync = useCallback((newBall: BallState) => {
    ballRef.current = newBall;
    setBall(newBall);
  }, []);

  const setScoresSync = useCallback((newScores: { home: number; away: number }) => {
    scoresRef.current = newScores;
    setScores(newScores);
  }, []);

  const setGameTimeSync = useCallback((newTime: number) => {
    gameTimeRef.current = newTime;
    setGameTime(newTime);
  }, []);

  const setGameTimeSecondsSync = useCallback((newSeconds: number) => {
    gameTimeSecondsRef.current = newSeconds;
    setGameTimeSeconds(newSeconds);
  }, []);

  const addGameLog = useCallback((message: string, type: GameLogEntry['type']) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    let css = 'color: #c8d6e5; font-weight: bold;';
    let emoji = 'ℹ️';
    if (type === 'flick') {
      css = 'color: #00d2ff; font-weight: 800; background: #002535; padding: 2px 5px; border-radius: 3px;';
      emoji = '⚡';
    } else if (type === 'foul') {
      css = 'color: #ff4757; font-weight: 900; background: #2f0000; padding: 3px 6px; border: 1px solid #ff4757; border-radius: 4px;';
      emoji = '⚠️ FALTA';
    } else if (type === 'collision') {
      css = 'color: #ffc048; font-weight: bold;';
      emoji = '💥';
    } else if (type === 'goal') {
      css = 'color: #2ed573; font-weight: 900; background: #003618; padding: 4px 8px; border: 2px solid #2ed573; border-radius: 5px; text-transform: uppercase;';
      emoji = '⚽ GOL!!!';
    } else if (type === 'tackle') {
      css = 'color: #a55eea; font-weight: 850; background: #1c0b2b; padding: 2px 5px; border-radius: 3px;';
      emoji = '🛡️';
    } else if (type === 'phase') {
      css = 'color: #ff9f43; font-weight: 900; background: #2b1704; padding: 3px 6px; border-bottom: 2px solid #ff9f43;';
      emoji = '🏁';
    }

    console.log(`%c[Telemetry] ${emoji} [${timestamp}] (Time: ${gameTimeRef.current}', Flicks H:${homeFlicksRemainingRef.current} A:${awayFlicksRemainingRef.current}) | ${message}`, css);

    const newEntry: GameLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      gameTime: gameTimeRef.current,
      turn: turnRef.current,
      homeFlicks: homeFlicksRemainingRef.current,
      awayFlicks: awayFlicksRemainingRef.current,
      message,
      type
    };

    setGameLogs(prev => [newEntry, ...prev].slice(0, 150));
  }, []);

  const setHasSeenRules = useCallback(async () => {
    localStorage.setItem('tableball_has_seen_rules', 'true');
    if (activeUser) {
      try {
        const { update } = await import('firebase/database');
        const userRef = ref(db, `users/${activeUser.uid}`);
        await update(userRef, { hasSeenRules: true });
      } catch (err) {
        console.error("Error updating hasSeenRules in DB:", err);
      }
    }
  }, [activeUser]);

  const confirmGkPosition = useCallback(async () => {
    setGkMoveActiveTeam(null);
    gkMoveActiveTeamRef.current = null;
    setGkMoveTimer(null);
    gkMoveTimerRef.current = null;

    if (isMultiplayer && roomId) {
      try {
        const { update } = await import('firebase/database');
        await update(ref(db, `rooms/${roomId}/gameState`), {
          gkMoveActiveTeam: null,
          gkMoveTimer: null
        });
      } catch (err) {
        console.error("Error updating GK move state:", err);
      }
    }
  }, [isMultiplayer, roomId]);

  // Keep refs in sync with state changes
  useEffect(() => { lastGoalScorerRef.current = lastGoalScorer; }, [lastGoalScorer]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { gkMoveActiveTeamRef.current = gkMoveActiveTeam; }, [gkMoveActiveTeam]);
  useEffect(() => { gkMoveTimerRef.current = gkMoveTimer; }, [gkMoveTimer]);
  useEffect(() => { consecutiveGoalsCountRef.current = consecutiveGoalsCount; }, [consecutiveGoalsCount]);
  useEffect(() => { homePlayersRef.current = homePlayers; }, [homePlayers]);
  useEffect(() => { awayPlayersRef.current = awayPlayers; }, [awayPlayers]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { gameTimeRef.current = gameTime; }, [gameTime]);
  useEffect(() => { homeFlicksRemainingRef.current = homeFlicksRemaining; }, [homeFlicksRemaining]);
  useEffect(() => { awayFlicksRemainingRef.current = awayFlicksRemaining; }, [awayFlicksRemaining]);
  useEffect(() => { matchDurationRef.current = matchDuration; }, [matchDuration]);
  useEffect(() => { gameTimeSecondsRef.current = gameTimeSeconds; }, [gameTimeSeconds]);
  useEffect(() => { injuryTimeRef.current = injuryTime; }, [injuryTime]);
  useEffect(() => { ballRef.current = ball; }, [ball]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { myRoleRef.current = myRole; }, [myRole]);
  useEffect(() => { turnTimerRef.current = turnTimer; }, [turnTimer]);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase === GamePhase.ACTION) {
      SoundManager.playRefereeWhistle('kickoff');
    } else if (phase === GamePhase.GOAL_CELEBRATION) {
      SoundManager.playRefereeWhistle('goal');
      SoundManager.playCrowdCheer();
    } else if (phase === GamePhase.GAME_OVER) {
      SoundManager.playRefereeWhistle('gameover');
    }
  }, [phase]);

  const setInjuryTimeSync = (val: 'none' | 'halftime' | 'fulltime') => {
    injuryTimeRef.current = val;
    setInjuryTime(val);
  };

  // Composed Sub-Hooks Invocations
  const multiplayerHook = useGameMultiplayer({
    phase, phaseRef, setPhase, setPhaseSync,
    scores, scoresRef, setScores, setScoresSync,
    homePlayers, setHomePlayers, homePlayersRef,
    awayPlayers, setAwayPlayers, awayPlayersRef,
    ball, ballRef, setBall, setBallSync,
    turn, turnRef, setTurn, setTurnSync,
    actionStatus, setActionStatus,
    homeReady, setHomeReady, awayReady, setAwayReady,
    gameTime, gameTimeRef, setGameTime, setGameTimeSync,
    matchDuration, matchDurationRef, setMatchDuration,
    gameTimeSecondsRef, setGameTimeSecondsSync,
    homeFlicksRemainingRef, setHomeFlicksSync,
    awayFlicksRemainingRef, setAwayFlicksSync,
    gkMoveActiveTeamRef, setGkMoveActiveTeamSync,
    gkMoveTimerRef, setGkMoveTimerSync,
    lastGoalScorerRef, setLastGoalScorer,
    consecutiveGoalsCountRef, setConsecutiveGoalsCount,
    gameMode, setGameModeSync,
    isMultiplayer, setIsMultiplayer, roomId, setRoomId,
    myRole, myRoleRef, setMyRole,
    activeUser, setActiveUser, userProfile, setUserProfile,
    opponentInfo, setOpponentInfo, opponentProfile, setOpponentProfile,
    opponentDisconnected, setOpponentDisconnected,
    disconnectCountdown, setDisconnectCountdown,
    prepTimer, setPrepTimer, turnTimer, setTurnTimer,
    currentRoom, setCurrentRoom, activeRooms, setActiveRooms,
    leaderboard, setLeaderboard, matchHistory, setMatchHistory,
    tournamentsList, setTournamentsList,
    activeTournamentId, setActiveTournamentId, currentMatchId, setCurrentMatchId,
    tournament, setTournament, homeKitConfig, setHomeKitConfig, awayKitConfig, setAwayKitConfig,
    isLeavingRef, setSystemMessage, addGameLog,
    initializeTeams: () => setupHook.initializeTeams(),
    resetMatch: () => resetMatch(),
    injuryTime,
    injuryTimeRef,
    setInjuryTimeSync
  });

  const setupHook = useGameSetup({
    isMultiplayer, roomId, myRole, myRoleRef, gameMode,
    phase, phaseRef, turn, turnRef, ball, ballRef, setBall,
    homePlayers, setHomePlayers, homePlayersRef,
    awayPlayers, setAwayPlayers, awayPlayersRef,
    homeReady, setHomeReady, awayReady, setAwayReady,
    selectedPlayerId, setSelectedPlayerId,
    gkMoveActiveTeam, setGkMoveActiveTeam, gkMoveActiveTeamRef,
    gkMoveTimer, setGkMoveTimer, gkMoveTimerRef,
    captainMoveMode, captainMoveModeRef, lastGoalScorerRef, consecutiveGoalsCountRef, setCaptainMoveMode,
    setScores, setLastGoalScorer, setConsecutiveGoalsCount, setGameTime,
    setHomeFlicksRemaining, setAwayFlicksRemaining, setActionStatus,
    addGameLog, setSystemMessage,
    setupIAPreparation: () => aiHook.setupIAPreparation(),
    confirmCaptainMove: () => transitionHook.confirmCaptainMove(),
    setPhase
  });

  const aiHook = useGameAI({
    phase, phaseRef, turn, turnRef, difficulty,
    isIAThinking, setIsIAThinking, isIAThinkingRef,
    isBallMoving: Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.05,
    isMultiplayer, ball, ballRef, setBall,
    awayPlayers, setAwayPlayers, awayPlayersRef, gameMode, gkMoveActiveTeam, addGameLog,
    awayFlicksRemainingRef, setAwayFlicksRemaining, lastGoalScorerRef, consecutiveGoalsCountRef,
    getTeamMaxBlockers: setupHook.getTeamMaxBlockers,
    isBannerActive
  });

  const transitionHook = useGameTransitions({
    isMultiplayer, roomId, myRole, myRoleRef, turn, turnRef, setTurn, setTurnSync,
    phase, phaseRef, setPhase, setPhaseSync, ball, ballRef, setBall, setBallSync,
    scores, scoresRef, setScores, setScoresSync, gameTime, gameTimeRef, setGameTime, setGameTimeSync,
    gameTimeSecondsRef, setGameTimeSecondsSync, matchDurationRef,
    homeFlicksRemaining, homeFlicksRemainingRef, setHomeFlicksRemaining, setHomeFlicksSync,
    awayFlicksRemaining, awayFlicksRemainingRef, setAwayFlicksRemaining, setAwayFlicksSync,
    gameMode, gameModeRef, gkMoveActiveTeam, gkMoveActiveTeamRef, setGkMoveActiveTeam, setGkMoveActiveTeamSync,
    gkMoveTimer, gkMoveTimerRef, setGkMoveTimer, setGkMoveTimerSync,
    lastGoalScorer, lastGoalScorerRef, setLastGoalScorer,
    consecutiveGoalsCount, consecutiveGoalsCountRef, setConsecutiveGoalsCount,
    actionStatus, setActionStatus, isIAThinking, homeReady, setHomeReady, awayReady, setAwayReady,
    setSelectedPlayerId, setCaptainMoveMode, captainMoveModeRef, pendingGoalDataRef, wasKickoffRef,
    injuryTimeRef, setInjuryTimeSync,
    homePlayers, homePlayersRef, awayPlayers, awayPlayersRef, setSystemMessage, addGameLog,
    enforceBlockerLimit: setupHook.enforceBlockerLimit,
    syncGameStateToFirebase: multiplayerHook.syncGameStateToFirebase
  });

  useGameTimers({
    phase, phaseRef, isMultiplayer, roomId, myRole, myRoleRef, ball, opponentDisconnected,
    turnTimer, setTurnTimer, prepTimer, setPrepTimer, disconnectCountdown, setDisconnectCountdown,
    gkMoveTimer, setGkMoveTimer, setGkMoveActiveTeam, gkMoveTimerRef, gkMoveActiveTeamRef,
    gameTimeSeconds, setGameTimeSeconds, gameTimeSecondsRef, setGameTime, gameTimeRef,
    matchDuration, matchDurationRef, captainMoveMode, homeReady, awayReady, turn, currentRoom,
    injuryTime, setInjuryTimeSync,
    triggerActiveTurnTimeout: multiplayerHook.triggerActiveTurnTimeout,
    triggerTimeoutDefeat: multiplayerHook.triggerTimeoutDefeat,
    triggerForceStartAfterTimeout: multiplayerHook.triggerForceStartAfterTimeout,
    triggerWO: multiplayerHook.triggerWO,
    handleHalfTime: transitionHook.handleHalfTime,
    handleFullTime: transitionHook.handleFullTime
  });

  const startGame = (diff: Difficulty, mode: 'standard' | 'manual' = 'standard') => {
    console.log(`%c[Game Loop] startGame called: difficulty=${diff} | mode=${mode}`, "color: #2ecc71; font-weight: bold; background: #e8f8f5; padding: 2px 4px;");
    setIsMultiplayer(false);
    setRoomId(null);
    setMyRole(null);
    setDifficulty(diff);
    setGameMode(mode);
    gameModeRef.current = mode;
    setScores({ home: 0, away: 0 });
    setLastGoalScorer(null);
    setConsecutiveGoalsCount(0);
    lastGoalScorerRef.current = null;
    consecutiveGoalsCountRef.current = 0;
    setupHook.initializeTeams();
    setBall({
      position: [0, 0.11, 0],
      velocity: [0, 0, 0],
      possession: 'HOME',
      lastTouchedByPlayerId: null,
      isKickoff: true,
      speedMultiplier: 1
    });
    setPhase(GamePhase.PREPARATION);
    setSelectedPlayerId(null);
    setTurn('HOME');
    setGameTime(0);
    setHomeFlicksRemaining(3);
    setAwayFlicksRemaining(3);
    setActionStatus('Preparação: Monte seu campo de guerra!');
    addGameLog(`Nova partida iniciada! Dificuldade: ${diff}. Fase de Preparação Tática.`, 'phase');

    const localHasSeen = localStorage.getItem('tableball_has_seen_rules') === 'true';
    const dbHasSeen = userProfile?.hasSeenRules === true;
    if (!localHasSeen && !dbHasSeen) {
      setRulesAutoTriggered(true);
      setShowRulesModal(true);
    }
  };

  const resetMatch = () => {
    isLeavingRef.current = true;
    if (isMultiplayer && roomId && myRole) {
      leaveMultiplayerRoom(roomId, myRole);
    }
    
    // Limpar sessão salva (saída voluntária)
    try { localStorage.removeItem('tableball_mp_session'); } catch (_) {}
    
    // Define o tab correto do lobby ao retornar
    if (isMultiplayer) {
      setCurrentMenuTab('multi');
    } else if (activeTournamentId) {
      setCurrentMenuTab('tournament');
    }

    setPhase(GamePhase.MENU);
    setScores({ home: 0, away: 0 });
    setLastGoalScorer(null);
    setConsecutiveGoalsCount(0);
    lastGoalScorerRef.current = null;
    consecutiveGoalsCountRef.current = 0;
    setInjuryTime('none');
    injuryTimeRef.current = 'none';
    setCaptainMoveMode(null);
    captainMoveModeRef.current = null;
    pendingGoalDataRef.current = null;
    setSelectedPlayerId(null);
    setGameTime(0);
    setHomeFlicksRemaining(3);
    setTurnTimer(null);
    setAwayFlicksRemaining(3);
    setIsMultiplayer(false);
    setRoomId(null);
    setMyRole(null);
    setCurrentRoom(null);
    setTournament(null);
    setActiveTournamentId(null);
    setCurrentMatchId(null);

    setGameMode('standard');
    gameModeRef.current = 'standard';
    setGkMoveActiveTeam(null);
    gkMoveActiveTeamRef.current = null;
    setGkMoveTimer(null);
    gkMoveTimerRef.current = null;
  };

  return {
    phase,
    setPhase,
    currentMenuTab,
    setCurrentMenuTab,
    difficulty,
    setDifficulty,
    scores,
    homePlayers,
    awayPlayers,
    selectedPlayerId,
    setSelectedPlayerId,
    homeKitConfig,
    awayKitConfig,
    ball,
    setBall,
    turn,
    setTurn,
    actionStatus,
    setActionStatus,
    isIAThinking,
    homeReady,
    awayReady,
    completePreparation: setupHook.completePreparation,
    startGame,
    placePlayer: setupHook.placePlayer,
    updatePlayerAngle: setupHook.updatePlayerAngle,
    updatePlayerActionType: setupHook.updatePlayerActionType,
    updatePlayerBlocking: setupHook.updatePlayerBlocking,
    setCaptain: setupHook.setCaptain,
    shootBall: transitionHook.shootBall,
    changePossession: transitionHook.changePossession,
    scoreGoal: transitionHook.scoreGoal,
    triggerFoul: transitionHook.triggerFoul,
    resetMatch,
    gameTime,
    matchDuration,
    setMatchDuration,
    gameTimeSeconds,
    setGameTimeSeconds,
    homeFlicksRemaining,
    awayFlicksRemaining,
    captainMoveMode,
    confirmCaptainMove: transitionHook.confirmCaptainMove,
    handleBallStopped: transitionHook.handleBallStopped,
    updateGoalkeeperPositions: setupHook.updateGoalkeeperPositions,
    incrementGoalkeeperSaves: setupHook.incrementGoalkeeperSaves,
    isCameraCentered,
    setIsCameraCentered,
    recenterTrigger,
    recenterCamera,
    cameraMode,
    changeCameraMode,
    gameLogs,
    addGameLog,
    lastGoalScorer,
    consecutiveGoalsCount,
    showRulesModal,
    setShowRulesModal,
    setHasSeenRules,
    rulesAutoTriggered,
    setRulesAutoTriggered,
    systemMessage,
    setSystemMessage,
    isBannerActive,
    setIsBannerActive,
    injuryTime,
    prepTimer,
    turnTimer,
    swapPlayerId,
    setSwapPlayerId,

    gameMode,
    setGameMode,
    gkMoveActiveTeam,
    setGkMoveActiveTeam,
    gkMoveTimer,
    setGkMoveTimer,
    confirmGkPosition,

    // Firebase Multiplayer exports
    activeUser,
    userProfile,
    isMultiplayer,
    roomId,
    myRole,
    activeRooms,
    currentRoom,
    leaderboard,
    matchHistory,
    opponentInfo,
    opponentProfile,
    opponentDisconnected,
    disconnectCountdown,
    loginGoogle: signInGoogle,
    logout: logoutFirebase,
    createRoom: multiplayerHook.handleCreateRoom,
    joinRoom: multiplayerHook.handleJoinRoom,
    triggerForfeit: multiplayerHook.triggerForfeit,

    // Tournament exports
    activeTournamentId,
    currentMatchId,
    tournament,
    tournamentsList,
    createTournament: multiplayerHook.handleCreateTournament,
    joinTournament: multiplayerHook.handleJoinTournament,
    startTournament: multiplayerHook.handleStartTournament,
    playTournamentMatch: multiplayerHook.handlePlayTournamentMatch,
    joinTournamentMatch: multiplayerHook.handleJoinTournamentMatch,
    reconnectToRoom: multiplayerHook.reconnectToRoom,

    // Language i18n
    language,
    changeLanguage,
    t
  };
};
