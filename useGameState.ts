import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { GamePhase, Difficulty, Team, PlayerConfig, Slot, BallState, ActionType, UniformConfig, GameLogEntry } from './types';
import { 
  db, auth, onAuthStateChanged, User, ref, set, get, onValue, off, update, remove 
} from './firebase';
import { 
  Room, RoomPlayer, Tournament, TournamentMatch,
  signInGoogle, logoutFirebase, fetchLeaderboard, fetchMatchHistory,
  createMultiplayerRoom, joinMultiplayerRoom, leaveMultiplayerRoom,
  createTournament, joinTournament, startTournament, updateTournamentMatchResult
} from './firebaseMultiplayer';
import SoundManager from './SoundManager';


// Constants for field bounds
export const FIELD_WIDTH = 10;
export const FIELD_LENGTH = 16;
export const HALF_WIDTH = FIELD_WIDTH / 2;
export const HALF_LENGTH = FIELD_LENGTH / 2;

// Dynamic Pegboard Slots Generation
export const ALL_SLOTS: Slot[] = [];

// 1. HOME SLOTS (27 slots total: 1 Goalkeeper + 2 rows of 5 slots + 2 rows of 6 slots + 1 row of 4 slots)
ALL_SLOTS.push({ id: 'home-gk', position: [0, 0.2, -7.2], team: 'HOME', lineType: 'GK' });
const homeRows = [
  { z: -5.5, lineType: 'DEF' as const, isAlternating: false }, // Defenders line (row 0)
  { z: -2.36, lineType: 'MID' as const, isAlternating: false }, // Midfielders 1 (row 1)
  { z: 0.79, lineType: 'MID' as const, isAlternating: false }, // Midfielders 2 (row 2)
  { z: 3.93, lineType: 'ATT' as const, isAlternating: false }, // Attackers (row 3)
  { z: -6.7, lineType: 'DEF' as const, isAlternating: true } // Alternating line in front of GK (row 4)
];
homeRows.forEach((row, rowIndex) => {
  const xCoords = row.lineType === 'MID' 
    ? [-4, -2.4, -0.8, 0.8, 2.4, 4] 
    : [-4, -2, 0, 2, 4];
  xCoords.forEach((x, colIndex) => {
    let slotTeam: Team = 'HOME';
    if (row.isAlternating) {
      if (x === 0) return; // Vazio / Penalty spot
      if (x === -4 || x === 4) {
        slotTeam = 'AWAY';
      } else {
        slotTeam = 'HOME';
      }
    }

    ALL_SLOTS.push({
      id: `home-slot-${rowIndex}-${colIndex}`,
      position: [x, 0.2, row.z],
      team: slotTeam,
      lineType: row.lineType
    });
  });
});

// 2. AWAY SLOTS (27 slots total: 1 Goalkeeper + 2 rows of 5 slots + 2 rows of 6 slots + 1 row of 4 slots)
ALL_SLOTS.push({ id: 'away-gk', position: [0, 0.2, 7.2], team: 'AWAY', lineType: 'GK' });
const awayRows = [
  { z: 5.5, lineType: 'DEF' as const, isAlternating: false }, // Defenders line (row 0)
  { z: 2.36, lineType: 'MID' as const, isAlternating: false }, // Midfielders 1 (row 1)
  { z: -0.79, lineType: 'MID' as const, isAlternating: false }, // Midfielders 2 (row 2)
  { z: -3.93, lineType: 'ATT' as const, isAlternating: false }, // Attackers (row 3)
  { z: 6.7, lineType: 'DEF' as const, isAlternating: true } // Alternating line in front of GK (row 4)
];
awayRows.forEach((row, rowIndex) => {
  const xCoords = row.lineType === 'MID' 
    ? [-4, -2.4, -0.8, 0.8, 2.4, 4] 
    : [-4, -2, 0, 2, 4];
  xCoords.forEach((x, colIndex) => {
    let slotTeam: Team = 'AWAY';
    if (row.isAlternating) {
      if (x === 0) return; // Vazio / Penalty spot
      if (x === -4 || x === 4) {
        slotTeam = 'HOME';
      } else {
        slotTeam = 'AWAY';
      }
    }

    ALL_SLOTS.push({
      id: `away-slot-${rowIndex}-${colIndex}`,
      position: [x, 0.2, row.z],
      team: slotTeam,
      lineType: row.lineType
    });
  });
});

const ETHNICITIES = [
  { skin: '#4a3728', hair: '#0d0d0d' }, // Goleiro (index 0)
  { skin: '#f3d2c1', hair: '#4a2c11' }, // index 1
  { skin: '#c68642', hair: '#0d0d0d' }, // index 2
  { skin: '#f9d5b8', hair: '#e2b13c' }, // index 3
  { skin: '#2d1f18', hair: '#0d0d0d' }, // index 4
  { skin: '#d1a384', hair: '#301a08' }, // index 5
  { skin: '#f3d2c1', hair: '#d35400' }, // index 6
  { skin: '#9c724e', hair: '#0d0d0d' }, // index 7
  { skin: '#ffdbac', hair: '#f3e5ab' }, // index 8
  { skin: '#5c4033', hair: '#0d0d0d' }, // index 9
  { skin: '#f0d5be', hair: '#95a5a6' }  // index 10
];

const INITIAL_BALL = {
  position: [0, 0.11, 0] as [number, number, number],
  velocity: [0, 0, 0] as [number, number, number],
  possession: 'HOME' as Team,
  lastTouchedByPlayerId: null as string | null,
  isKickoff: true,
  speedMultiplier: 1
};

export const useGameState = () => {
  // Local States
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [homeKitConfig, setHomeKitConfig] = useState<UniformConfig | undefined>(undefined);
  const [awayKitConfig, setAwayKitConfig] = useState<UniformConfig | undefined>(undefined);
  const [scores, setScores] = useState({ home: 0, away: 0 });
  const [homePlayers, setHomePlayers] = useState<PlayerConfig[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerConfig[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [ball, setBall] = useState<BallState>(INITIAL_BALL);
  const [turn, setTurn] = useState<Team>('HOME');
  const [actionStatus, setActionStatus] = useState<string>('');
  const [isIAThinking, setIsIAThinking] = useState(false);
  const isIAThinkingRef = useRef(false);
  const [homeReady, setHomeReady] = useState(false);
  const [awayReady, setAwayReady] = useState(false);
  const [gameTime, setGameTime] = useState(0); // minutes (0 to 90)
  const [homeFlicksRemaining, setHomeFlicksRemaining] = useState(3);
  const [awayFlicksRemaining, setAwayFlicksRemaining] = useState(3);
  const [isCameraCentered, setIsCameraCentered] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const [gameLogs, setGameLogs] = useState<GameLogEntry[]>([]);

  const addGameLog = useCallback((message: string, type: GameLogEntry['type']) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    
    // Style console logs based on type
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


  const recenterCamera = useCallback(() => {
    setRecenterTrigger(prev => prev + 1);
    setIsCameraCentered(true);
  }, []);

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

  const ballRef = useRef(ball);
  const captainMoveModeRef = useRef<Team | null>(null);
  // Stores transient goal data needed after captain is repositioned
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

  useEffect(() => {
    lastGoalScorerRef.current = lastGoalScorer;
  }, [lastGoalScorer]);

  useEffect(() => {
    consecutiveGoalsCountRef.current = consecutiveGoalsCount;
  }, [consecutiveGoalsCount]);

  useEffect(() => {
    homePlayersRef.current = homePlayers;
  }, [homePlayers]);

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
  }, [getTeamMaxBlockers]);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    gameTimeRef.current = gameTime;
  }, [gameTime]);

  useEffect(() => {
    homeFlicksRemainingRef.current = homeFlicksRemaining;
  }, [homeFlicksRemaining]);

  useEffect(() => {
    awayFlicksRemainingRef.current = awayFlicksRemaining;
  }, [awayFlicksRemaining]);

  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  useEffect(() => {
    phaseRef.current = phase;
    
    // Play transition sounds based on game phase changes
    if (phase === GamePhase.ACTION) {
      SoundManager.playRefereeWhistle('kickoff');
    } else if (phase === GamePhase.GOAL_CELEBRATION) {
      SoundManager.playRefereeWhistle('goal');
      SoundManager.playCrowdCheer();
    } else if (phase === GamePhase.GAME_OVER) {
      SoundManager.playRefereeWhistle('gameover');
    }
  }, [phase]);

  useEffect(() => {
    awayPlayersRef.current = awayPlayers;
  }, [awayPlayers]);

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
        
        // Listen to user profile (team name, kit)
        const userRef = ref(db, `users/${user.uid}`);
        profileUnsub = onValue(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            setUserProfile(data);
            const activeKit = data.selectedKit || 'home';
            if (activeKit === 'away' && data.awayUniform) {
              setHomeKitConfig(data.awayUniform);
            } else if (data.uniform) {
              setHomeKitConfig(data.uniform);
            } else {
              setHomeKitConfig(undefined);
            }
          } else {
            setUserProfile(null);
          }
        });
      } else {
        setMatchHistory([]);
        setHomeKitConfig(undefined);
        setUserProfile(null);
      }
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

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
  }, [opponentInfo?.uid]);

  // Automatic contrast for AWAY (AI) team based on HOME kit
  useEffect(() => {
    if (!homeKitConfig) {
      setAwayKitConfig(undefined);
      return;
    }

    // YIQ brightness formula to detect if home kit color is dark or blueish
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
      // If home is dark/blue, IA gets red/gold kit
      setAwayKitConfig({
        primaryColor: '#e55039',
        secondaryColor: '#f6b93b',
        pattern: 'solid',
        shortsColor: '#1e272e',
        socksColor: '#e55039'
      });
    } else {
      // If home is light, IA gets dark blue/white kit
      setAwayKitConfig({
        primaryColor: '#1e3799',
        secondaryColor: '#ffffff',
        pattern: 'solid',
        shortsColor: '#ffffff',
        socksColor: '#1e3799'
      });
    }
  }, [homeKitConfig]);

  // Fetch lists and refresh
  const refreshHistoryAndLeaderboard = async (uid: string) => {
    const history = await fetchMatchHistory(uid);
    const ranking = await fetchLeaderboard();
    setMatchHistory(history);
    setLeaderboard(ranking);
  };

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
  }, []);

  // Sincronização Multiplayer em Tempo Real
  useEffect(() => {
    if (!isMultiplayer || !roomId) {
      setCurrentRoom(null);
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room was deleted/canceled by either client
        if (!isLeavingRef.current) {
          if (myRoleRef.current === 'AWAY') {
            alert('O host cancelou a partida.');
          } else if (myRoleRef.current === 'HOME') {
            alert('O oponente saiu da partida.');
          }
        }
        resetMatch();
        return;
      }
      const room: Room = snapshot.val();
      setCurrentRoom(room);

      const isHome = myRoleRef.current === 'HOME';

      // If we are HOME (host) and room is in preparation, but guest disconnected (presence is false)
      if (isHome && room.status === 'preparation') {
        const guestPresent = room.presence ? !!room.presence.away : false;
        if (!guestPresent) {
          // Reset room to waiting and remove away player
          update(roomRef, { status: 'waiting' });
          remove(ref(db, `rooms/${roomId}/players/away`));
          remove(ref(db, `rooms/${roomId}/presence/away`));
          alert('O oponente desconectou. Voltando para o lobby de espera...');
          return;
        }
      }

      // If room status is waiting and host is currently in game preparation, return to menu lobby
      if (room.status === 'waiting' && isHome && phaseRef.current !== GamePhase.MENU) {
        setPhase(GamePhase.MENU);
        setScores({ home: 0, away: 0 });
        setHomeReady(false);
        setAwayReady(false);
        initializeTeams();
        setBall(INITIAL_BALL);
        return;
      }

      // If room moves to preparation and client is still in menu (waiting), transition to preparation phase
      if (room.status === 'preparation' && phaseRef.current === GamePhase.MENU) {
        setPhase(GamePhase.PREPARATION);
      }

      // Sync players readiness and tactical positions in preparation phase
      if (room.status === 'preparation' || (room.status === 'playing' && room.gameState && room.gameState.phase === GamePhase.PREPARATION)) {
        const homeSetup = room.players.home.ready;
        const awaySetup = room.players.away ? room.players.away.ready : false;

        setHomeReady(homeSetup);
        setAwayReady(awaySetup);

        // Fetch opponent configurations
        if (room.gameState) {
          if (myRoleRef.current === 'HOME' && room.gameState.awayPlayers) {
            setAwayPlayers(room.gameState.awayPlayers);
          }
          if (myRoleRef.current === 'AWAY' && room.gameState.homePlayers) {
            setHomePlayers(room.gameState.homePlayers);
          }
        }
      }

      // Sync opponent info
      if (myRoleRef.current === 'HOME') {
        setOpponentInfo(room.players.away || null);
      } else {
        setOpponentInfo(room.players.home);
      }

      // Sincronização de Estado Ativo de Jogo (Se mudou o turno localmente, se não for meu turno ou se mudou a fase)
      if (room.status === 'playing' && room.gameState) {
        const isMyTurn = room.gameState.turn === myRoleRef.current;
        const dbPhase = room.gameState.phase;
        const turnChanged = turnRef.current !== room.gameState.turn;
        const phaseChanged = phaseRef.current !== dbPhase;
        
        // Se mudou o turno, se mudou a fase, se não for meu turno, ou se houve gol/reajuste tático ou fim de jogo, forçamos o sync total
        if (turnChanged || phaseChanged || !isMyTurn || dbPhase === GamePhase.PREPARATION || dbPhase === GamePhase.GOAL_CELEBRATION || dbPhase === GamePhase.GAME_OVER) {
          setScores(room.gameState.scores);
          setTurn(room.gameState.turn);
          setGameTime(room.gameState.gameTime);
          setHomeFlicksRemaining(room.gameState.homeFlicksRemaining);
          setAwayFlicksRemaining(room.gameState.awayFlicksRemaining);
          setPhase(dbPhase);
          setActionStatus(room.gameState.actionStatus);

          setBall(room.gameState.ball);
          setHomePlayers(room.gameState.homePlayers);
          setAwayPlayers(room.gameState.awayPlayers);
          if (room.gameState.lastGoalScorer !== undefined) {
            setLastGoalScorer(room.gameState.lastGoalScorer);
            lastGoalScorerRef.current = room.gameState.lastGoalScorer;
          }
          if (room.gameState.consecutiveGoalsCount !== undefined) {
            setConsecutiveGoalsCount(room.gameState.consecutiveGoalsCount);
            consecutiveGoalsCountRef.current = room.gameState.consecutiveGoalsCount;
          }
        }
      }

      // Detecção de Desconexão (Presence Engine)
      const oppKey = isHome ? 'away' : 'home';
      const oppPresent = room.presence ? !!room.presence[oppKey] : true;
      
      // Se o oponente cair durante o jogo ativo
      if (!oppPresent && room.status === 'playing') {
        setOpponentDisconnected(true);
      } else {
        setOpponentDisconnected(false);
        setDisconnectCountdown(15);
      }
    });

    return () => {
      off(roomRef);
    };
  }, [isMultiplayer, roomId]);

  // Listener de Desconexão (Contagem Regressiva para substituir por IA)
  useEffect(() => {
    if (!opponentDisconnected || !isMultiplayer || !roomId) return;

    const timer = setInterval(() => {
      setDisconnectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // AI assumes the disconnected player
          setIsMultiplayer(false); // Transita para modo local!
          setMyRole(null);
          setOpponentDisconnected(false);
          setActionStatus(`Oponente desconectou permanentemente! A IA assumiu o controle do time adversário.`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [opponentDisconnected, isMultiplayer, roomId]);

  // Real-Time Flick listener
  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const flickRef = ref(db, `rooms/${roomId}/flick`);

    const unsubscribe = onValue(flickRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const flick = snapshot.val();

      // Only execute if it's from the opponent
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
            setHomeFlicksRemaining(newFlicks);
            addGameLog(`Peteleco executado pelo Time Casa (Multiplayer). Restantes: ${newFlicks}/3.`, 'flick');
          } else {
            const oldFlicks = awayFlicksRemainingRef.current;
            const newFlicks = Math.max(0, oldFlicks - 1);
            awayFlicksRemainingRef.current = newFlicks;
            setAwayFlicksRemaining(newFlicks);
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
  }, [isMultiplayer, roomId]);

  // Sincronizar final de jogo para salvar histórico e ranking
  useEffect(() => {
    if (phase === GamePhase.GAME_OVER && isMultiplayer && roomId && myRole) {
      const isMaster = turnRef.current === myRole;
      if (isMaster) {
        const homeGoals = scores.home;
        const awayGoals = scores.away;

        // Finalize room in DB
        update(ref(db, `rooms/${roomId}`), { status: 'ended' });

        // Fetch final users info to record history
        get(ref(db, `rooms/${roomId}`)).then(async (snap) => {
          if (!snap.exists()) return;
          const room: Room = snap.val();
          const homeP = room.players.home;
          const awayP = room.players.away;

          if (homeP && awayP) {
            // Master records stats in users files
            const { updateLeaderboardAndHistory } = await import('./firebaseMultiplayer');
            if (myRole === 'HOME') {
              await updateLeaderboardAndHistory(homeP.uid, awayP.displayName, awayP.photoURL, homeGoals, awayGoals, !!activeTournamentId);
              await updateLeaderboardAndHistory(awayP.uid, homeP.displayName, homeP.photoURL, awayGoals, homeGoals, !!activeTournamentId);
            } else {
              await updateLeaderboardAndHistory(awayP.uid, homeP.displayName, homeP.photoURL, awayGoals, homeGoals, !!activeTournamentId);
              await updateLeaderboardAndHistory(homeP.uid, awayP.displayName, awayP.photoURL, homeGoals, awayGoals, !!activeTournamentId);
            }

            // If tournament, update brackets
            if (activeTournamentId && currentMatchId) {
              const winnerUid = homeGoals > awayGoals ? homeP.uid : awayP.uid;
              await updateTournamentMatchResult(activeTournamentId, currentMatchId, myRole === 'HOME' ? homeGoals : awayGoals, myRole === 'AWAY' ? homeGoals : awayGoals, winnerUid);
            }
          }
        });
      }
      
      // Refresh local user profile lists
      if (activeUser) {
        setTimeout(() => refreshHistoryAndLeaderboard(activeUser.uid), 2000);
      }
    }
  }, [phase, isMultiplayer, roomId, myRole]);

  // Sincronizar Torneio Mata-Mata Ativo
  useEffect(() => {
    if (!activeTournamentId) return;

    const tRef = ref(db, `tournaments/${activeTournamentId}`);

    const unsub = onValue(tRef, (snap) => {
      if (!snap.exists()) return;
      const t: Tournament = snap.val();
      setTournament(t);

      // Se o torneio terminou, limpar
      if (t.status === 'completed') {
        setActionStatus(`Torneio Finalizado! O vencedor foi ${t.players[t.winnerUid!].displayName}!`);
      }
    });

    return () => {
      off(tRef);
    };
  }, [activeTournamentId]);

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
        hairColor: eth.hair
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
        hairColor: eth.hair
      };
    });

    setHomePlayers(home);
    setAwayPlayers(away);
    setHomeReady(false);
    setAwayReady(false);
  }, []);

  // IA Setup (Preparation Phase)
  const setupIAPreparation = useCallback(() => {
    const availableNonGkSlots = ALL_SLOTS.filter(s => s.lineType !== 'GK' && s.team === 'AWAY');
    const gkSlot = ALL_SLOTS.find(s => s.id === 'away-gk')!;
    const shuffledSlots = [...availableNonGkSlots].sort(() => Math.random() - 0.5);
    const selectedSlotIds = shuffledSlots.slice(0, 10).map(s => s.id);

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

    setAwayReady(true);
  }, [difficulty, getTeamMaxBlockers]);

  // Start Offline match
  const startGame = (diff: Difficulty) => {
    console.log(`%c[Game Loop] startGame called: difficulty=${diff}`, "color: #2ecc71; font-weight: bold; background: #e8f8f5; padding: 2px 4px;");
    setIsMultiplayer(false);
    setRoomId(null);
    setMyRole(null);
    setDifficulty(diff);
    setScores({ home: 0, away: 0 });
    setLastGoalScorer(null);
    setConsecutiveGoalsCount(0);
    lastGoalScorerRef.current = null;
    consecutiveGoalsCountRef.current = 0;
    initializeTeams();
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
  };

  // Drag and place player in slot
  const placePlayer = (playerId: string, slotId: string) => {
    // ── Captain Move Mode (after goal) ───────────────────────────────────────
    if (captainMoveModeRef.current !== null) {
      const concedingTeam = captainMoveModeRef.current;
      const playerTeam: Team = playerId.startsWith('home') ? 'HOME' : 'AWAY';
      if (playerTeam !== concedingTeam) return; // Only conceding team

      // In multiplayer, only the conceding player can act
      if (isMultiplayer && myRole && myRole !== concedingTeam) return;

      const teamPlayers = concedingTeam === 'HOME' ? homePlayersRef.current : awayPlayersRef.current;
      const movingPlayer = teamPlayers.find(p => p.id === playerId);
      if (!movingPlayer?.isCaptain) return; // Only the captain

      const targetSlot = ALL_SLOTS.find(s => s.id === slotId);
      if (!targetSlot) return;
      if (targetSlot.team !== concedingTeam) return;
      if (targetSlot.lineType === 'GK') return;

      const isOccupied = teamPlayers.some(p => p.slotId === slotId && p.id !== playerId);
      if (isOccupied) return;

      const setPlayers = concedingTeam === 'HOME' ? setHomePlayers : setAwayPlayers;
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, slotId, position: targetSlot.position } : p
      ));
      return;
    }
    // ── End Captain Move Mode ─────────────────────────────────────────────────

    if (phase !== GamePhase.PREPARATION) return;

    // In multiplayer, block editing opponent team
    if (isMultiplayer && myRole) {
      const isHomePlayer = playerId.startsWith('home');
      if (myRole === 'HOME' && !isHomePlayer) return;
      if (myRole === 'AWAY' && isHomePlayer) return;
    }

    const targetSlot = ALL_SLOTS.find(s => s.id === slotId);
    if (!targetSlot) return;

    const isHome = playerId.startsWith('home');
    const playerNum = parseInt(playerId.replace('home-p', '').replace('away-p', ''));
    const isGK = playerNum === 1;

    if (isGK) {
      if (isHome && slotId !== 'home-gk') return;
      if (!isHome && slotId !== 'away-gk') return;
    }
    if (!isGK && targetSlot.lineType === 'GK') return;

    if (isHome && targetSlot.team !== 'HOME') return;
    if (!isHome && targetSlot.team !== 'AWAY') return;

    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;

    setPlayers(prev => {
      const conflictPlayer = prev.find(p => p.slotId === slotId && p.id !== playerId);

      // Helper: check if a slot position is in the defensive half for this team.
      // HOME defends z < 0, AWAY defends z > 0.
      const isDefensiveSlot = (slotPos: [number, number, number]) =>
        isHome ? slotPos[2] < 0 : slotPos[2] > 0;

      return prev.map(p => {
        if (p.id === playerId) {
          // If this player was SHOOT and is being placed in the defensive half, downgrade to CROSS.
          const safeActionType =
            p.actionType === 'SHOOT' && isDefensiveSlot(targetSlot.position)
              ? 'CROSS' as ActionType
              : p.actionType;
          return { ...p, slotId, position: targetSlot.position, actionType: safeActionType };
        }
        if (conflictPlayer && p.id === conflictPlayer.id) {
          const currentMovingPlayer = prev.find(mp => mp.id === playerId)!;
          const swapSlotId = currentMovingPlayer.slotId;
          const swapSlot = swapSlotId ? ALL_SLOTS.find(s => s.id === swapSlotId) : null;
          const swapPos: [number, number, number] = swapSlot
            ? swapSlot.position
            : [0, 0.2, isHome ? -10 : 10];
          // Apply same SHOOT→CROSS guard for the displaced conflict player.
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
    });
  };

  const updatePlayerAngle = (playerId: string, angle: number) => {
    if (isMultiplayer && myRole) {
      const isHomePlayer = playerId.startsWith('home');
      if (myRole === 'HOME' && !isHomePlayer) return;
      if (myRole === 'AWAY' && isHomePlayer) return;
    }
    const isHome = playerId.startsWith('home');
    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, angle } : p));
  };

  const updatePlayerActionType = (playerId: string, actionType: ActionType) => {
    if (isMultiplayer && myRole) {
      const isHomePlayer = playerId.startsWith('home');
      if (myRole === 'HOME' && !isHomePlayer) return;
      if (myRole === 'AWAY' && isHomePlayer) return;
    }
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
    if (isMultiplayer && myRole) {
      const isHomePlayer = playerId.startsWith('home');
      if (myRole === 'HOME' && !isHomePlayer) return;
      if (myRole === 'AWAY' && isHomePlayer) return;
    }
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

  // Sincronizar o estado final da física no Firebase (Autoridade de Turno)
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
    nextStatus: string
  ) => {
    if (!isMultiplayer || !roomId || !myRole) return;
    
    // In multiplayer, the master is the one who took the turn/shot
    const isMaster = turnRef.current === myRole;
    if (!isMaster) return;

    console.log(
      `%c[Multiplayer Outgoing] 📤 Syncing GameState to DB: Turn=${nextTurn} | Time=${nextGameTime}' | Scores=H:${nextScores.home} A:${nextScores.away} | Flicks=H:${nextHomeFlicks} A:${nextAwayFlicks} | Phase=${nextPhase}`,
      "color: #8e44ad; font-weight: bold; background: #f4ecf7; padding: 2px 4px; border: 1px solid #8e44ad; border-radius: 3px;"
    );

    update(ref(db, `rooms/${roomId}/gameState`), {
      ball: nextBall,
      homePlayers: nextHomePlayers,
      awayPlayers: nextAwayPlayers,
      turn: nextTurn,
      scores: nextScores,
      gameTime: nextGameTime,
      homeFlicksRemaining: nextHomeFlicks,
      awayFlicksRemaining: nextAwayFlicks,
      phase: nextPhase,
      actionStatus: nextStatus,
      lastGoalScorer: lastGoalScorerRef.current,
      consecutiveGoalsCount: consecutiveGoalsCountRef.current
    });

    if (nextPhase === GamePhase.PREPARATION) {
      update(ref(db, `rooms/${roomId}/players/home`), { ready: false });
      update(ref(db, `rooms/${roomId}/players/away`), { ready: false });
    }
  }, [isMultiplayer, roomId, myRole]);

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

    setGameTime(prevTime => {
      if (isFairnessActive) {
        nextPhase = GamePhase.PREPARATION;
        nextStatus = `Vantagem Tática Ativada! Time adversário marcou ${nextCount} gols seguidos. Posicione até 4 Bloqueadores (Stopper Extra).`;
      } else if (prevTime > 0 && prevTime % 15 === 0) {
        nextPhase = GamePhase.PREPARATION;
        nextStatus = `Gol marcado! Intervalo Tático (${prevTime}'): Reajuste seu time.`;
      } else {
        nextPhase = GamePhase.ACTION;
        nextStatus = concedingTeam === 'HOME'
          ? 'Gol sofrido! Saída de bola: chute do meio campo.'
          : 'GOLAÇO! Saída de bola da IA.';
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

      if (isMultiplayer) {
        syncGameStateToFirebase(
          freshBall, currentHomePlayers, currentAwayPlayers, concedingTeam,
          nextScores, prevTime, homeFlicksRemainingRef.current, awayFlicksRemainingRef.current, nextPhase, nextStatus
        );
      }

      return prevTime;
    });
  }, [addGameLog, isMultiplayer, syncGameStateToFirebase]);

  // Change Captain (only during Preparation; GK cannot be captain)
  const setCaptain = (playerId: string) => {
    if (phase !== GamePhase.PREPARATION) return;
    if (captainMoveModeRef.current !== null) return; // Block changing captain after kickoff / during captain Move Mode!
    if (isMultiplayer && myRole) {
      const isHomePlayer = playerId.startsWith('home');
      if (myRole === 'HOME' && !isHomePlayer) return;
      if (myRole === 'AWAY' && isHomePlayer) return;
    }
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
    if (captainMoveModeRef.current !== null) {
      confirmCaptainMove();
      return;
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
      setHomeReady(true);
      addGameLog(`Tática de guerra confirmada pelo jogador!`, 'info');
      setupIAPreparation();
      addGameLog(`A IA definiu sua formação tática.`, 'info');
    }
  };

  // Switch phase to Action once both ready
  useEffect(() => {
    if (homeReady && awayReady && phase === GamePhase.PREPARATION) {
      console.log(`%c[Game Loop] Transitioning to GamePhase.ACTION! Both players are ready. Initial turn = ${turn}`, "color: #2ecc71; font-weight: bold; background: #e8f8f5; padding: 2px 4px;");
      setPhase(GamePhase.ACTION);
      setSelectedPlayerId(null);
      
      addGameLog(`Táticas em campo! O juiz apita o início do tempo de jogo. Posse inicial com ${turn === 'HOME' ? 'Casa' : 'Visitante/IA'}.`, 'phase');

      if (isMultiplayer && roomId && myRole) {
        // If master, set active playing status in DB
        const isMaster = myRole === 'HOME';
        if (isMaster) {
          update(ref(db, `rooms/${roomId}`), { status: 'playing' });
          const nextStatus = turnRef.current === myRole ? 'Peteleco Champions! Sua vez.' : 'Peteleco Champions! Vez do adversário.';
          update(ref(db, `rooms/${roomId}/gameState`), {
            turn: turnRef.current,
            scores: scoresRef.current,
            gameTime: gameTimeRef.current,
            homeFlicksRemaining: homeFlicksRemainingRef.current,
            awayFlicksRemaining: awayFlicksRemainingRef.current,
            phase: GamePhase.ACTION,
            actionStatus: nextStatus,
            ball: ballRef.current,
            homePlayers,
            awayPlayers,
            lastGoalScorer: lastGoalScorerRef.current,
            consecutiveGoalsCount: consecutiveGoalsCountRef.current
          });
        }
      } else {
        setActionStatus(turn === 'HOME' ? 'Sua vez! Dê o peteleco na bola.' : 'A IA está preparando o contra-ataque...');
      }
    }
  }, [homeReady, awayReady, phase]);

  // Shoot/Flick Ball
  const shootBall = (vx: number, vz: number) => {
    console.log(
      `%c[Game Loop] 🚀 shootBall called | vx: ${vx.toFixed(2)} | vz: ${vz.toFixed(2)} | Current Turn: ${turn} | Phase: ${phase} | Flicks Remaining: Home=${homeFlicksRemainingRef.current}, Away=${awayFlicksRemainingRef.current}`,
      "color: #3498db; font-weight: bold; background: #ebf5fb; padding: 3px 6px; border: 1px solid #3498db; border-radius: 4px;"
    );
    if (phase !== GamePhase.ACTION || isIAThinking) return;

    if (isMultiplayer && roomId && myRole) {
      if (turn !== myRole) {
        console.warn(`%c[Game Loop] Shot blocked! Turn belongs to ${turn}, but player is ${myRole}.`, "color: #e74c3c; font-weight: bold;");
        return; // Block shooting if not my turn
      }
      
      // Update DB flick event
      console.log(`%c[Multiplayer Outgoing] Syncing flick to Firebase: vx=${vx.toFixed(2)}, vz=${vz.toFixed(2)}`, "color: #3498db; font-weight: bold;");
      set(ref(db, `rooms/${roomId}/flick`), {
        vx,
        vz,
        timestamp: Date.now(),
        by: myRole
      });
    }

    if (ball.isKickoff) {
      console.log(
        `%c[Flick Event] 🟢 Kickoff shot taken by ${turn}! This flick does NOT count toward the 3-flick round limit. Ball set in motion.`,
        "color: #2ecc71; font-weight: bold; background: #e8f8f5; padding: 2px 4px; border-radius: 4px;"
      );
      addGameLog(`Saída de bola (Kickoff) por ${turn === 'HOME' ? 'Casa' : 'Visitante/IA'}. (Sem custo de peteleco)`, 'flick');
      setBall(prev => ({ ...prev, velocity: [vx, 0, vz], isKickoff: false }));
    } else {
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
      setBall(prev => ({ ...prev, velocity: [vx, 0, vz] }));
    }
    setActionStatus(isMultiplayer ? (myRole === turn ? 'Você chutou!' : 'Oponente chutou!') : 'Você chutou!');
  };

  // Change Possession & Setup turn
  const changePossession = useCallback((newPossession: Team, stoppedPosition: [number, number, number], isKickoff?: boolean) => {
    console.log(
      `%c[Possession Event] 🔄 Possession transferring: ${turnRef.current} ➔ ${newPossession} | Position: [${stoppedPosition.map(n=>n.toFixed(2)).join(', ')}] | isKickoff: ${isKickoff}`,
      "color: #9b59b6; font-weight: bold; background: #f5eef8; padding: 2px 4px; border-radius: 4px;"
    );
    addGameLog(`Posse de bola transferida para o Time ${newPossession === 'HOME' ? 'Casa' : 'Visitante/IA'} na posição [${stoppedPosition[0].toFixed(1)}, ${stoppedPosition[2].toFixed(1)}].`, 'tackle');
    
    // Check if the current client was the master of the active turn before the change
    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;

    // ─── Round-over detection (tackle path) ───────────────────────────────────
    // handleBallStopped handles this for natural stops, but tackles bypass it.
    // We must mirror the same round-over logic here so 0/0 flicks ends the round.
    const currentHomeFlicks = homeFlicksRemainingRef.current;
    const currentAwayFlicks = awayFlicksRemainingRef.current;
    const isRoundOverOnTackle = currentHomeFlicks === 0 && currentAwayFlicks === 0;

    if (isRoundOverOnTackle && isMaster) {
      const nextGameTimeValue = gameTimeRef.current + 5;

      console.log(
        `%c[Game Loop] 🔁 ROUND COMPLETED VIA TACKLE! Both teams at 0 flicks. Time: ${gameTimeRef.current}' ➔ ${nextGameTimeValue}'. Flicks reset to 3.`,
        "color: #e67e22; font-weight: bold; background: #fdebd0; padding: 4px 8px; border: 2px solid #e67e22; border-radius: 5px;"
      );
      addGameLog(`Fim da Rodada (via desarme)! Ambos os times esgotaram seus petelecos. Tempo avançado para ${nextGameTimeValue}'. Petelecos reabastecidos para 3.`, 'phase');

      homeFlicksRemainingRef.current = 3;
      awayFlicksRemainingRef.current = 3;

      const nextScoresValue = scoresRef.current;
      let nextPhaseValue = phaseRef.current;
      let nextStatusValue = '';
      let nextTurnValue = newPossession;
      let updatedBallPrep: BallState;

      if (nextGameTimeValue >= 90) {
        nextPhaseValue = GamePhase.GAME_OVER;
        const endStatus = nextScoresValue.home > nextScoresValue.away
          ? `Fim de jogo! Vitória da Casa por ${nextScoresValue.home}x${nextScoresValue.away}!`
          : nextScoresValue.away > nextScoresValue.home
            ? `Fim de jogo! Vitória do Visitante por ${nextScoresValue.away}x${nextScoresValue.home}!`
            : `Fim de jogo! Empate dramático de ${nextScoresValue.home}x${nextScoresValue.away}!`;
        
        nextStatusValue = endStatus;
        updatedBallPrep = { possession: newPossession, velocity: [0, 0, 0], position: stoppedPosition, lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId, isKickoff: true, speedMultiplier: 1 };
        
        flushSync(() => {
          setGameTime(nextGameTimeValue);
          setHomeFlicksRemaining(3);
          setAwayFlicksRemaining(3);
          setPhase(nextPhaseValue);
          setTurn(nextTurnValue);
          setBall(updatedBallPrep);
          setActionStatus(nextStatusValue);
        });

        addGameLog(`FIM DE PARTIDA! Placar Final: Casa ${nextScoresValue.home} x ${nextScoresValue.away} Visitante/IA.`, 'phase');
        if (isMultiplayer && isMaster && roomId) {
          syncGameStateToFirebase(updatedBallPrep, homePlayersRef.current, awayPlayersRef.current, newPossession, nextScoresValue, nextGameTimeValue, 3, 3, GamePhase.GAME_OVER, endStatus);
        }
        return;
      } else if (nextGameTimeValue % 15 === 0) {
        nextPhaseValue = GamePhase.PREPARATION;
        updatedBallPrep = { possession: nextTurnValue, velocity: [0, 0, 0], position: nextGameTimeValue === 45 ? [0, 0.11, 0] as [number, number, number] : stoppedPosition, lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId, isKickoff: true, speedMultiplier: 1 };
        if (nextGameTimeValue === 45) {
          nextTurnValue = 'AWAY';
          updatedBallPrep.possession = 'AWAY';
        }
        
        const prepStatus = nextGameTimeValue === 45
          ? (isMultiplayer ? `Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff do Visitante (AWAY).` : `Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff da IA.`)
          : `Intervalo Tático dos ${nextGameTimeValue} minutos! Retornando à fase de Preparação Tática.`;
        
        nextStatusValue = prepStatus;

        flushSync(() => {
          setGameTime(nextGameTimeValue);
          setHomeFlicksRemaining(3);
          setAwayFlicksRemaining(3);
          setPhase(nextPhaseValue);
          setTurn(nextTurnValue);
          setBall(updatedBallPrep);
          setActionStatus(nextStatusValue);
          setHomeReady(false);
          setAwayReady(false);
        });

        addGameLog(prepStatus, 'phase');
        if (isMultiplayer && isMaster && roomId) {
          syncGameStateToFirebase(updatedBallPrep, homePlayersRef.current, awayPlayersRef.current, nextTurnValue, nextScoresValue, nextGameTimeValue, 3, 3, GamePhase.PREPARATION, prepStatus);
        }
        return;
      } else {
        // Regular new round — possession to tackle winner
        const roundStatus = `Rodada finalizada! Iniciando nova rodada (${nextGameTimeValue}'). Posse do time ${newPossession === 'HOME' ? 'Casa' : 'Visitante'}.`;
        updatedBallPrep = { possession: newPossession, velocity: [0, 0, 0], position: stoppedPosition, lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId, isKickoff: isKickoff !== undefined ? isKickoff : ballRef.current.isKickoff, speedMultiplier: 1 };
        
        nextStatusValue = roundStatus;

        flushSync(() => {
          setGameTime(nextGameTimeValue);
          setHomeFlicksRemaining(3);
          setAwayFlicksRemaining(3);
          setTurn(newPossession);
          setBall(updatedBallPrep);
          setActionStatus(roundStatus);
        });

        addGameLog(`Rodada finalizada! Nova rodada iniciada (${nextGameTimeValue}'). Posse com ${newPossession === 'HOME' ? 'Casa' : 'Visitante/IA'}. Flicks resetados para 3/3.`, 'phase');
        if (isMultiplayer && isMaster && roomId) {
          syncGameStateToFirebase(updatedBallPrep, homePlayersRef.current, awayPlayersRef.current, newPossession, nextScoresValue, nextGameTimeValue, 3, 3, phaseRef.current, roundStatus);
        }
        return;
      }
    }
    // ─── END Round-over detection ─────────────────────────────────────────────

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
      setTurn(newPossession);
      setBall(updatedBall);
      setActionStatus(nextStatus);
    });

    // Sync the entire game state to Firebase in multiplayer if we are the master of the turn
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
  }, [isMultiplayer, myRole, roomId, syncGameStateToFirebase]);

  // Trigger Foul and transfer possession with flick consumption
  const triggerFoul = useCallback((e1: string, e2: string, stoppedPosition: [number, number, number]) => {
    // Play referee whistle and crowd disappointment sigh on both clients
    SoundManager.playRefereeWhistle('foul');
    SoundManager.playCrowdSigh();

    // Check if the current client was the master of the active turn before the change
    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;
    if (!isMaster) return;

    // 1. Identify team that committed the foul (the active turn)
    const committingTeam = turnRef.current;
    
    // 2. Identify the recipient team
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

    // 3. Decrement flicks remaining for committing team
    let nextHomeFlicks = homeFlicksRemainingRef.current;
    let nextAwayFlicks = awayFlicksRemainingRef.current;
    
    if (committingTeam === 'HOME') {
      nextHomeFlicks = Math.max(0, nextHomeFlicks - 1);
      homeFlicksRemainingRef.current = nextHomeFlicks;
      setHomeFlicksRemaining(nextHomeFlicks);
      console.log(`%c[Foul Flick Decay] Committing HOME team loses a flick! Remaining: ${nextHomeFlicks}`, "color: #e74c3c; font-weight: bold;");
    } else {
      nextAwayFlicks = Math.max(0, nextAwayFlicks - 1);
      awayFlicksRemainingRef.current = nextAwayFlicks;
      setAwayFlicksRemaining(nextAwayFlicks);
      console.log(`%c[Foul Flick Decay] Committing AWAY team loses a flick! Remaining: ${nextAwayFlicks}`, "color: #e74c3c; font-weight: bold;");
    }

    // 4. Create the fresh/foul ball state (with isKickoff = true)
    const updatedBall: BallState = {
      velocity: [0, 0, 0],
      position: stoppedPosition,
      possession: recipientTeam,
      lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId,
      isKickoff: true,
      speedMultiplier: 1
    };
    setBall(updatedBall);

    // 5. Check if round is over
    const isRoundOver = nextHomeFlicks === 0 && nextAwayFlicks === 0;
    
    let nextTurnValue = recipientTeam;
    let nextGameTimeValue = gameTimeRef.current;
    let nextPhaseValue = phaseRef.current;
    let nextStatusValue = '';
    let nextScoresValue = scoresRef.current;

    // Descriptive message for the foul loop
    const e1Name = e1 === 'WALL' ? 'parede' : e1.startsWith('home') ? 'jogador da Casa' : 'jogador Visitante';
    const e2Name = e2 === 'WALL' ? 'parede' : e2.startsWith('home') ? 'jogador da Casa' : 'jogador Visitante';
    const foulMsg = `Falta! Bola presa em loop entre ${e1Name} e ${e2Name}. Peteleco consumido do time ${committingTeam === 'HOME' ? 'Casa' : 'Visitante'}. Posse para ${recipientTeam === 'HOME' ? 'Casa' : 'Visitante'}!`;
    
    addGameLog(`Falta! Loop detectado entre ${e1Name} e ${e2Name}. Time ${committingTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} perde 1 peteleco como punição. Posse transferida para ${recipientTeam === 'HOME' ? 'Casa' : 'Visitante/IA'}.`, 'foul');

    if (isRoundOver) {
      nextGameTimeValue = gameTimeRef.current + 5;
      setGameTime(nextGameTimeValue);
      
      console.log(
        `%c[Game Loop] 🔁 ROUND COMPLETED ON FOUL! Both teams have 0 flicks remaining. Time advanced by 5 minutes: ${gameTimeRef.current}' ➔ ${nextGameTimeValue}'. Flicks reset to 3. New possession set to fouled team: ${recipientTeam}`,
        "color: #e67e22; font-weight: bold; background: #fdebd0; padding: 4px 6px; border: 1px dashed #e67e22; border-radius: 4px;"
      );
      
      addGameLog(`Fim da Rodada! Ambos os times esgotaram seus 3 petelecos. Tempo avançado em 5 minutos para ${nextGameTimeValue}'. Petelecos reabastecidos para 3.`, 'phase');

      if (nextGameTimeValue >= 90) {
        nextPhaseValue = GamePhase.GAME_OVER;
        setPhase(nextPhaseValue);
        
        if (nextScoresValue.home > nextScoresValue.away) {
          nextStatusValue = `Fim de jogo! Vitória da Casa por ${nextScoresValue.home}x${nextScoresValue.away}!`;
        } else if (nextScoresValue.away > nextScoresValue.home) {
          nextStatusValue = `Fim de jogo! Vitória do Visitante por ${nextScoresValue.away}x${nextScoresValue.home}!`;
        } else {
          nextStatusValue = `Fim de jogo! Empate dramático de ${nextScoresValue.home}x${nextScoresValue.away}!`;
        }
        addGameLog(`FIM DE PARTIDA! Placar Final: Casa ${nextScoresValue.home} x ${nextScoresValue.away} Visitante/IA.`, 'phase');
      } else if (nextGameTimeValue % 15 === 0) {
        nextPhaseValue = GamePhase.PREPARATION;
        setPhase(nextPhaseValue);
        setHomeReady(false);
        setAwayReady(false);
        if (nextGameTimeValue === 45) {
          nextTurnValue = 'AWAY';
          updatedBall.position = [0, 0.11, 0];
          updatedBall.velocity = [0, 0, 0];
          updatedBall.possession = 'AWAY';
          updatedBall.isKickoff = true;
          setBall(updatedBall);
          nextStatusValue = isMultiplayer 
            ? `Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff do Visitante (AWAY).`
            : `Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff da IA.`;
          addGameLog(`Fim do Primeiro Tempo (45')! Intervalo Tático. O segundo tempo inicia com posse e kickoff do Visitante/IA no centro do campo.`, 'phase');
        } else {
          nextTurnValue = recipientTeam;
          nextStatusValue = `Tempo esgotado! Reajuste tático dos 15 minutos (${nextGameTimeValue}').`;
          addGameLog(`Intervalo Tático dos ${nextGameTimeValue} minutos! Retornando à fase de Preparação Tática.`, 'phase');
        }
      } else {
        nextTurnValue = recipientTeam;
        nextStatusValue = `Rodada finalizada! Iniciando nova rodada (${nextGameTimeValue}'). Posse do time ${recipientTeam === 'HOME' ? 'Casa' : 'Visitante'}.`;
      }

      nextHomeFlicks = 3;
      nextAwayFlicks = 3;
      homeFlicksRemainingRef.current = 3;
      awayFlicksRemainingRef.current = 3;
      setHomeFlicksRemaining(3);
      setAwayFlicksRemaining(3);
    } else {
      nextTurnValue = recipientTeam;
      nextStatusValue = foulMsg;
    }

    setTurn(nextTurnValue);
    setActionStatus(nextStatusValue);

    // Sync to DB
    if (isMultiplayer && roomId) {
      syncGameStateToFirebase(
        updatedBall,
        homePlayersRef.current,
        awayPlayersRef.current,
        nextTurnValue,
        nextScoresValue,
        nextGameTimeValue,
        nextHomeFlicks,
        nextAwayFlicks,
        nextPhaseValue,
        nextStatusValue
      );
    }
  }, [
    isMultiplayer, roomId, myRole, syncGameStateToFirebase, homePlayers, awayPlayers, gameTime, phase, scores, actionStatus
  ]);

  // Handle Ball Stopped
  const handleBallStopped = useCallback((stoppedPosition: [number, number, number]) => {
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

    // Se estiver em multiplayer, somente quem deu o peteleco calcula as transições de turno e de tempo
    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;
    if (!isMaster) {
      flushSync(() => {
        setBall(updatedBall);
      });
      return;
    }

    const isRoundOver = currentHomeFlicks === 0 && currentAwayFlicks === 0;
    console.log(
      `%c[Game Loop] Round Over Check: Home Flicks=${currentHomeFlicks}, Away Flicks=${currentAwayFlicks} ➔ isRoundOver=${isRoundOver}`,
      "color: #16a085; font-weight: bold;"
    );

    let nextHomeFlicks = currentHomeFlicks;
    let nextAwayFlicks = currentAwayFlicks;
    let nextTurnValue = turnRef.current;
    let nextGameTimeValue = gameTimeRef.current;
    let nextPhaseValue = phaseRef.current;
    let nextStatusValue = actionStatus;
    let nextScoresValue = scoresRef.current;

    if (isRoundOver) {
      nextGameTimeValue = gameTimeRef.current + 5;
      
      console.log(
        `%c[Game Loop] 🔁 ROUND COMPLETED! Both teams used all 3 clicks. Time advanced to ${nextGameTimeValue}'. Flicks reset to 3.`,
        "color: #e67e22; font-weight: bold; background: #fdebd0; padding: 4px 8px; border: 2px solid #e67e22; border-radius: 5px;"
      );

      if (nextGameTimeValue >= 90) {
        nextPhaseValue = GamePhase.GAME_OVER;
        
        if (nextScoresValue.home > nextScoresValue.away) {
          nextStatusValue = `Fim de jogo! Vitória da Casa por ${nextScoresValue.home}x${nextScoresValue.away}!`;
        } else if (nextScoresValue.away > nextScoresValue.home) {
          nextStatusValue = `Fim de jogo! Vitória do Visitante por ${nextScoresValue.away}x${nextScoresValue.home}!`;
        } else {
          nextStatusValue = `Fim de jogo! Empate dramático de ${nextScoresValue.home}x${nextScoresValue.away}!`;
        }
      } else if (nextGameTimeValue % 15 === 0) {
        nextPhaseValue = GamePhase.PREPARATION;
        if (nextGameTimeValue === 45) {
          nextTurnValue = 'AWAY';
          updatedBall.position = [0, 0.11, 0];
          updatedBall.velocity = [0, 0, 0];
          updatedBall.possession = 'AWAY';
          updatedBall.isKickoff = true;
          nextStatusValue = isMultiplayer 
            ? `Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff do Visitante (AWAY).`
            : `Fim do primeiro tempo! O segundo tempo inicia com posse e kickoff da IA.`;
          addGameLog(`Fim do Primeiro Tempo (45')! Intervalo Tático. O segundo tempo inicia com posse e kickoff do Visitante/IA no centro do campo.`, 'phase');
        } else {
          nextTurnValue = opponentTeam;
          nextStatusValue = `Tempo esgotado! Reajuste tático dos 15 minutos (${nextGameTimeValue}').`;
          addGameLog(`Intervalo Tático dos ${nextGameTimeValue} minutos! Retornando à fase de Preparação Tática.`, 'phase');
        }
      } else {
        nextTurnValue = opponentTeam;
        nextStatusValue = `Rodada finalizada! Iniciando nova rodada (${nextGameTimeValue}'). Posse do time ${opponentTeam === 'HOME' ? 'Casa' : 'Visitante'}.`;
        addGameLog(`Rodada finalizada! Nova rodada iniciada (${nextGameTimeValue}'). Posse com ${opponentTeam === 'HOME' ? 'Casa' : 'Visitante/IA'}. Flicks resetados para 3/3.`, 'phase');
      }

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
        // Keep turn with the current player
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

    // Strictly synchronize ball possession with next turn team
    updatedBall.possession = nextTurnValue;

    flushSync(() => {
      setBall(updatedBall);
      setTurn(nextTurnValue);
      setGameTime(nextGameTimeValue);
      setPhase(nextPhaseValue);
      setActionStatus(nextStatusValue);
      setHomeFlicksRemaining(nextHomeFlicks);
      setAwayFlicksRemaining(nextAwayFlicks);
      if (nextPhaseValue === GamePhase.PREPARATION) {
        setHomeReady(false);
        setAwayReady(false);
      }
    });

    // Sync to DB
    if (isMultiplayer) {
      syncGameStateToFirebase(
        updatedBall, homePlayers, awayPlayers, nextTurnValue, 
        nextScoresValue, nextGameTimeValue, nextHomeFlicks, nextAwayFlicks, 
        nextPhaseValue, nextStatusValue
      );
    }
  }, [
    homePlayers, awayPlayers, gameTime, phase, scores, isMultiplayer, actionStatus,
    homeFlicksRemaining, awayFlicksRemaining, turn, myRole, syncGameStateToFirebase
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

    // Enforce blocker limits for both teams
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

    // After 4s celebration, enter Captain Move Mode or Full Tactical Preparation
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

      // Auto-select the conceding team's captain so they are instantly highlighted and their details shown!
      const teamPlayers = concedingTeam === 'HOME' ? homePlayersRef.current : awayPlayersRef.current;
      const captainPlayer = teamPlayers.find(p => p.isCaptain);
      if (captainPlayer) {
        setSelectedPlayerId(captainPlayer.id);
      }

      if (isFairnessActive) {
        // Bypass Captain Move Mode, directly enter full-team PREPARATION
        console.log(`%c[Goal Event] Entering Tactical Advantage Preparation. Conceding team = ${concedingTeam}`, "color: #2ecc71; font-weight: bold;");
        
        const moveStatus = concedingTeam === 'HOME'
          ? '🛡️ Vantagem Tática Ativada! Posicione seu time completo e defina seus Bloqueadores.'
          : '⏳ IA definindo sua escalação tática (Vantagem Tática)...';

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
        // Standard single goal conceded: enter Captain-only Move Mode
        console.log(`%c[Goal Event] Entering Captain Move Mode. Conceding team = ${concedingTeam}`, "color: #f39c12; font-weight: bold;");

        // Store pending goal data for confirmCaptainMove to use
        pendingGoalDataRef.current = { concedingTeam, nextCount, nextScores };
        
        const moveStatus = concedingTeam === 'HOME'
          ? '👑 Pause Break! Reposicione seu Capitão se quiser, depois confirme.'
          : '⏳ IA decidindo posição do capitão...';

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

        addGameLog(`Pause Break! Time ${concedingTeam === 'HOME' ? 'Casa' : 'Visitante/IA'} pode reposicionar o Capitão antes de reiniciar.`, 'phase');

        // If AI is the conceding team, auto-confirm after brief delay (no movement needed)
        if (!isMultiplayer && concedingTeam === 'AWAY') {
          setTimeout(() => {
            confirmCaptainMoveRef.current?.();
          }, 1200);
        }
      }
    }, 4000);
  };

  const isBallMoving = Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.05;

  // IA Turn calculation
  useEffect(() => {
    if (isMultiplayer) return; // IA doesn't play in multiplayer mode!
    
    console.log(
      `%c[Dedoball IA] Evaluation: phase=${phase}, turn=${turn}, isIAThinking=${isIAThinkingRef.current}, isBallMoving=${isBallMoving}, ballVelocity=[${ball.velocity.map(n=>n.toFixed(2)).join(', ')}]`,
      "color: #e55039; font-weight: bold;"
    );

    if (phase === GamePhase.ACTION && turn === 'AWAY' && !isIAThinkingRef.current && !isBallMoving) {
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

        // Dispatch a custom event to notify SceneContent of the AI shot instantly
        window.dispatchEvent(new CustomEvent('dedoball-ai-shot', { detail: { vx, vz } }));

        const isKickoff = ballRef.current.isKickoff;
        flushSync(() => {
          if (isKickoff) {
            console.log("%c[Dedoball IA] Kickoff shot! This flick does NOT count.", "color: #2ecc71; font-weight: bold;");
            addGameLog(`Saída de bola (Kickoff) executada pela IA. (Sem custo de peteleco)`, 'flick');
            setBall(prev => ({ ...prev, velocity: [vx, 0, vz], isKickoff: false }));
          } else {
            const oldFlicks = awayFlicksRemainingRef.current;
            const newFlicks = Math.max(0, oldFlicks - 1);
            awayFlicksRemainingRef.current = newFlicks;
            setAwayFlicksRemaining(newFlicks);
            addGameLog(`Peteleco executado pelo Time Visitante/IA. Restantes na rodada: ${newFlicks}/3.`, 'flick');
            setBall(prev => ({ ...prev, velocity: [vx, 0, vz] }));
          }
          
          isIAThinkingRef.current = false;
          setIsIAThinking(false);
          setActionStatus('A IA disparou a bola!');
        });
      }, thinkTime);

      return () => {
        console.log("%c[Dedoball IA] Cleaning up pending AI shot timer due to dependency change.", "color: #e55039;");
        clearTimeout(timer);
        isIAThinkingRef.current = false;
        setIsIAThinking(false);
      };
    }
  }, [phase, turn, difficulty, isBallMoving, isMultiplayer]);

  const updateGoalkeeperPositions = useCallback((homeX: number, awayX: number) => {
    setHomePlayers(prev => prev.map(p => p.number === 1 ? { ...p, position: [homeX, p.position[1], p.position[2]] } : p));
    setAwayPlayers(prev => prev.map(p => p.number === 1 ? { ...p, position: [awayX, p.position[1], p.position[2]] } : p));
  }, []);

  // Stable ref so the AI setTimeout can call confirmCaptainMove
  // without a stale closure problem
  const confirmCaptainMoveRef = useRef<(() => void) | null>(null);

  const resetMatch = () => {
    isLeavingRef.current = true;
    if (isMultiplayer && roomId && myRole) {
      leaveMultiplayerRoom(roomId, myRole);
    }
    setPhase(GamePhase.MENU);
    setScores({ home: 0, away: 0 });
    setLastGoalScorer(null);
    setConsecutiveGoalsCount(0);
    lastGoalScorerRef.current = null;
    consecutiveGoalsCountRef.current = 0;
    setCaptainMoveMode(null);
    captainMoveModeRef.current = null;
    pendingGoalDataRef.current = null;
    setSelectedPlayerId(null);
    setGameTime(0);
    setHomeFlicksRemaining(3);
    setAwayFlicksRemaining(3);
    setIsMultiplayer(false);
    setRoomId(null);
    setMyRole(null);
    setCurrentRoom(null);
    setTournament(null);
    setActiveTournamentId(null);
    setCurrentMatchId(null);
  };

  // --- MULTIPLAYER ROOM HELPERS ---
  const handleCreateRoom = async (name: string, pass?: string) => {
    try {
      isLeavingRef.current = false;
      const id = await createMultiplayerRoom(name, pass);
      setRoomId(id);
      setMyRole('HOME');
      setIsMultiplayer(true);
      setScores({ home: 0, away: 0 });
      initializeTeams();
      setBall({ ...INITIAL_BALL, isKickoff: true });
      setPhase(GamePhase.MENU);
      setActionStatus('Sala criada! Aguardando oponente...');
      
      if (activeUser) refreshHistoryAndLeaderboard(activeUser.uid);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar sala.');
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
      setPhase(GamePhase.PREPARATION);
      setActionStatus('Conectado à sala! Monte sua tática de guerra.');
      
      if (activeUser) refreshHistoryAndLeaderboard(activeUser.uid);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'WRONG_PASSWORD') {
        alert('Senha incorreta!');
      } else {
        alert('Erro ao entrar na sala. Talvez esteja cheia.');
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
      alert('Erro ao criar torneio.');
    }
  };

  const handleJoinTournament = async (id: string) => {
    try {
      await joinTournament(id);
      setActiveTournamentId(id);
      setActionStatus('Você se inscreveu no Torneio! Aguardando início...');
    } catch (err) {
      console.error(err);
      alert('Erro ao entrar no torneio.');
    }
  };

  const handleStartTournament = async (id: string) => {
    try {
      await startTournament(id);
      setActionStatus('Torneio Iniciado! Que vença o melhor.');
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar torneio.');
    }
  };

  const handlePlayTournamentMatch = async (match: TournamentMatch) => {
    if (!activeUser) return;
    const isP1 = match.player1.uid === activeUser.uid;
    const opponent = isP1 ? match.player2 : match.player1;
    
    setCurrentMatchId(match.matchId);

    if (opponent.isAI) {
      // Offline match against AI for the tournament
      setIsMultiplayer(true); // Treat as tournament match
      setRoomId(null);
      setMyRole('HOME');
      setDifficulty(opponent.difficulty || Difficulty.MEDIUM);
      setScores({ home: 0, away: 0 });
      initializeTeams();
      
      // Customize Away uniform label to match AI name in Scene
      setActionStatus(`Partida de Torneio contra ${opponent.displayName}!`);
      setPhase(GamePhase.PREPARATION);
    } else {
      // Online match against other human. Create a room specifically for this match
      try {
        const roomName = `Mata-Mata: ${match.player1.displayName} vs ${match.player2.displayName}`;
        const roomRefId = await createMultiplayerRoom(roomName);
        
        // Save Room ID inside match data in DB
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

  // Keep confirmCaptainMoveRef in sync so the AI timer can call it
  confirmCaptainMoveRef.current = confirmCaptainMove;

  return {
    phase,
    setPhase,
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
    completePreparation,
    startGame,
    placePlayer,
    updatePlayerAngle,
    updatePlayerActionType,
    updatePlayerBlocking,
    setCaptain,
    shootBall,
    changePossession,
    scoreGoal,
    triggerFoul,
    resetMatch,
    gameTime,
    homeFlicksRemaining,
    awayFlicksRemaining,
    captainMoveMode,
    confirmCaptainMove,
    handleBallStopped,
    updateGoalkeeperPositions,
    isCameraCentered,
    setIsCameraCentered,
    recenterTrigger,
    recenterCamera,
    gameLogs,
    addGameLog,
    lastGoalScorer,
    consecutiveGoalsCount,

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
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,

    // Tournament exports
    activeTournamentId,
    currentMatchId,
    tournament,
    tournamentsList,
    createTournament: handleCreateTournament,
    joinTournament: handleJoinTournament,
    startTournament: handleStartTournament,
    playTournamentMatch: handlePlayTournamentMatch,
    joinTournamentMatch: handleJoinTournamentMatch
  };
};
