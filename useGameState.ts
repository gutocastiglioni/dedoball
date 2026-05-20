import { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, Difficulty, Team, PlayerConfig, Slot, BallState, ActionType, UniformConfig } from './types';
import { 
  db, auth, onAuthStateChanged, User, ref, set, get, onValue, off, update, remove 
} from './firebase';
import { 
  Room, RoomPlayer, Tournament, TournamentMatch,
  signInGoogle, logoutFirebase, fetchLeaderboard, fetchMatchHistory,
  createMultiplayerRoom, joinMultiplayerRoom, leaveMultiplayerRoom,
  createTournament, joinTournament, startTournament, updateTournamentMatchResult
} from './firebaseMultiplayer';

// Constants for field bounds
export const FIELD_WIDTH = 10;
export const FIELD_LENGTH = 16;
export const HALF_WIDTH = FIELD_WIDTH / 2;
export const HALF_LENGTH = FIELD_LENGTH / 2;

// Dynamic Pegboard Slots Generation
export const ALL_SLOTS: Slot[] = [];

// 1. HOME SLOTS (21 slots total: 1 Goalkeeper + 4 rows of 5 slots)
ALL_SLOTS.push({ id: 'home-gk', position: [0, 0.2, -7.2], team: 'HOME', lineType: 'GK' });
const homeRows = [
  { z: -5.5, lineType: 'DEF' as const },
  { z: -2.36, lineType: 'MID' as const },
  { z: 0.79, lineType: 'MID' as const },
  { z: 3.93, lineType: 'ATT' as const }
];
homeRows.forEach((row, rowIndex) => {
  [-4, -2, 0, 2, 4].forEach((x, colIndex) => {
    ALL_SLOTS.push({
      id: `home-slot-${rowIndex}-${colIndex}`,
      position: [x, 0.2, row.z],
      team: 'HOME',
      lineType: row.lineType
    });
  });
});

// 2. AWAY SLOTS (21 slots total: 1 Goalkeeper + 4 rows of 5 slots)
ALL_SLOTS.push({ id: 'away-gk', position: [0, 0.2, 7.2], team: 'AWAY', lineType: 'GK' });
const awayRows = [
  { z: 5.5, lineType: 'DEF' as const },
  { z: 2.36, lineType: 'MID' as const },
  { z: -0.79, lineType: 'MID' as const },
  { z: -3.93, lineType: 'ATT' as const }
];
awayRows.forEach((row, rowIndex) => {
  [-4, -2, 0, 2, 4].forEach((x, colIndex) => {
    ALL_SLOTS.push({
      id: `away-slot-${rowIndex}-${colIndex}`,
      position: [x, 0.2, row.z],
      team: 'AWAY',
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
  lastTouchedByPlayerId: null as string | null
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
  const [homeReady, setHomeReady] = useState(false);
  const [awayReady, setAwayReady] = useState(false);
  const [gameTime, setGameTime] = useState(0); // minutes (0 to 90)
  const [homeFlicksRemaining, setHomeFlicksRemaining] = useState(3);
  const [awayFlicksRemaining, setAwayFlicksRemaining] = useState(3);
  const [isCameraCentered, setIsCameraCentered] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

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
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState(15);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // Tournament States
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([]);

  const ballRef = useRef(ball);
  const turnRef = useRef(turn);
  const myRoleRef = useRef(myRole);
  const phaseRef = useRef(phase);
  const isLeavingRef = useRef(false);

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
  }, [phase]);

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
      if (room.status === 'preparation') {
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

      // Sincronização de Estado Ativo de Jogo (Se não for meu turno ou se mudou a fase)
      if (room.status === 'playing' && room.gameState) {
        const isMyTurn = room.gameState.turn === myRoleRef.current;
        const dbPhase = room.gameState.phase;
        
        // Se o oponente jogou, ou se houve gol/reajuste tático, forçamos o sync total
        if (!isMyTurn || dbPhase === GamePhase.PREPARATION || dbPhase === GamePhase.GOAL_CELEBRATION) {
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
        setBall(prev => ({
          ...prev,
          velocity: [flick.vx, 0, flick.vz]
        }));
        // Decrement oponente flicks remaining
        if (flick.by === 'HOME') {
          setHomeFlicksRemaining(prev => Math.max(0, prev - 1));
        } else {
          setAwayFlicksRemaining(prev => Math.max(0, prev - 1));
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
      'home-gk',
      'home-slot-0-1', 'home-slot-0-3', // Defenders
      'home-slot-1-0', 'home-slot-1-2', 'home-slot-1-4', // Mid-defenders
      'home-slot-2-1', 'home-slot-2-3', // Midfielders
      'home-slot-3-0', 'home-slot-3-2', 'home-slot-3-4' // Attackers
    ];

    const defaultAwaySlotIds = [
      'away-gk',
      'away-slot-0-1', 'away-slot-0-3', // Defenders
      'away-slot-1-0', 'away-slot-1-2', 'away-slot-1-4', // Midfielders
      'away-slot-2-1', 'away-slot-2-3', // Midfielders 2
      'away-slot-3-0', 'away-slot-3-2', 'away-slot-3-4' // Attackers
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
      const maxTackles = 3;

      return prev.map((p, i) => {
        if (i === 0) {
          return { ...p, slotId: gkSlot.id, position: gkSlot.position, angle: Math.PI, actionType: 'PASS' as ActionType };
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

        const rand = Math.random();
        if (rand < 0.25 && tackleCount < maxTackles && slot.lineType !== 'GK') {
          actionType = 'TACKLE';
          tackleCount++;
        } else if (slot.lineType === 'ATT') {
          actionType = 'SHOOT';
        } else if (slot.lineType === 'MID') {
          actionType = Math.random() < 0.6 ? 'PASS' : 'CROSS';
        } else {
          actionType = Math.random() < 0.4 ? 'PASS' : 'CROSS';
        }

        return { ...p, slotId, position: slot.position, angle, actionType };
      });
    });

    setAwayReady(true);
  }, [difficulty]);

  // Start Offline match
  const startGame = (diff: Difficulty) => {
    setIsMultiplayer(false);
    setRoomId(null);
    setMyRole(null);
    setDifficulty(diff);
    setScores({ home: 0, away: 0 });
    initializeTeams();
    setBall({
      position: [0, 0.11, 0],
      velocity: [0, 0, 0],
      possession: 'HOME',
      lastTouchedByPlayerId: null
    });
    setPhase(GamePhase.PREPARATION);
    setSelectedPlayerId(null);
    setTurn('HOME');
    setGameTime(0);
    setHomeFlicksRemaining(3);
    setAwayFlicksRemaining(3);
    setActionStatus('Preparação: Monte seu campo de guerra!');
  };

  // Drag and place player in slot
  const placePlayer = (playerId: string, slotId: string) => {
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
      
      return prev.map(p => {
        if (p.id === playerId) {
          return { ...p, slotId, position: targetSlot.position };
        }
        if (conflictPlayer && p.id === conflictPlayer.id) {
          const currentMovingPlayer = prev.find(mp => mp.id === playerId)!;
          return {
            ...p,
            slotId: currentMovingPlayer.slotId,
            position: currentMovingPlayer.slotId 
              ? ALL_SLOTS.find(s => s.id === currentMovingPlayer.slotId)!.position
              : [0, 0.2, isHome ? -10 : 10] as [number, number, number]
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
      if (tackleCount >= 3) {
        throw new Error('LIMIT_EXCEEDED');
      }
    }

    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, actionType } : p));
  };

  // Change Captain
  const setCaptain = (playerId: string) => {
    if (phase !== GamePhase.PREPARATION) return;
    if (isMultiplayer && myRole) {
      const isHomePlayer = playerId.startsWith('home');
      if (myRole === 'HOME' && !isHomePlayer) return;
      if (myRole === 'AWAY' && isHomePlayer) return;
    }
    const isHome = playerId.startsWith('home');
    const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
    setPlayers(prev => prev.map(p => ({
      ...p,
      isCaptain: p.id === playerId
    })));
  };

  const completePreparation = async () => {
    if (isMultiplayer && roomId && myRole) {
      const localPlayers = myRole === 'HOME' ? homePlayers : awayPlayers;
      
      // Send configurations to DB
      await set(ref(db, `rooms/${roomId}/gameState/${myRole.toLowerCase()}Players`), localPlayers);
      await update(ref(db, `rooms/${roomId}/players/${myRole.toLowerCase()}`), { ready: true });
      
      if (myRole === 'HOME') setHomeReady(true);
      else setAwayReady(true);
      
      setActionStatus('Aguardando oponente confirmar tática...');
    } else {
      setHomeReady(true);
      setupIAPreparation();
    }
  };

  // Switch phase to Action once both ready
  useEffect(() => {
    if (homeReady && awayReady && phase === GamePhase.PREPARATION) {
      setPhase(GamePhase.ACTION);
      setSelectedPlayerId(null);
      
      if (isMultiplayer && roomId && myRole) {
        // If master, set active playing status in DB
        const isMaster = myRole === 'HOME';
        if (isMaster) {
          update(ref(db, `rooms/${roomId}`), { status: 'playing' });
          update(ref(db, `rooms/${roomId}/gameState`), {
            turn: 'HOME',
            scores: { home: 0, away: 0 },
            gameTime: 0,
            homeFlicksRemaining: 3,
            awayFlicksRemaining: 3,
            phase: GamePhase.ACTION,
            actionStatus: 'Peteleco Champions! Sua vez.',
            ball: INITIAL_BALL,
            homePlayers,
            awayPlayers
          });
        }
      } else {
        setActionStatus(turn === 'HOME' ? 'Sua vez! Dê o peteleco na bola.' : 'A IA está preparando o contra-ataque...');
      }
    }
  }, [homeReady, awayReady, phase]);

  // Shoot/Flick Ball
  const shootBall = (vx: number, vz: number) => {
    if (phase !== GamePhase.ACTION || isIAThinking) return;

    if (isMultiplayer && roomId && myRole) {
      if (turn !== myRole) return; // Block shooting if not my turn
      
      // Update DB flick event
      set(ref(db, `rooms/${roomId}/flick`), {
        vx,
        vz,
        timestamp: Date.now(),
        by: myRole
      });
    }

    if (turn === 'HOME') {
      setHomeFlicksRemaining(prev => Math.max(0, prev - 1));
    } else {
      setAwayFlicksRemaining(prev => Math.max(0, prev - 1));
    }

    setBall(prev => ({ ...prev, velocity: [vx, 0, vz] }));
    setActionStatus(isMultiplayer ? (myRole === turn ? 'Você chutou!' : 'Oponente chutou!') : 'Você chutou!');
  };

  // Change Possession & Setup turn
  const changePossession = useCallback((newPossession: Team, stoppedPosition: [number, number, number]) => {
    setTurn(newPossession);
    setBall(prev => ({
      ...prev,
      possession: newPossession,
      velocity: [0, 0, 0],
      position: stoppedPosition
    }));

    if (isMultiplayer && myRole) {
      setActionStatus(newPossession === myRole ? 'Sua posse! Prepare o peteleco.' : 'Posse do oponente! Aguarde...');
    } else {
      if (newPossession === 'HOME') {
        setActionStatus('Sua posse! Prepare o peteleco.');
      } else {
        setActionStatus('A IA está preparando o contra-ataque...');
      }
    }
  }, [isMultiplayer, myRole]);

  // Sincronizar o estado final da física no Firebase (Autoridade de Turno)
  const syncGameStateToFirebase = (
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
      actionStatus: nextStatus
    });
  };

  // Handle Ball Stopped
  const handleBallStopped = useCallback((stoppedPosition: [number, number, number]) => {
    const allActivePlayers = [...homePlayers, ...awayPlayers].filter(p => p.slotId !== null);
    if (allActivePlayers.length === 0) return;

    let closestPlayer = allActivePlayers[0];
    let minDistance = Infinity;
    for (const p of allActivePlayers) {
      const dist = Math.hypot(p.position[0] - stoppedPosition[0], p.position[2] - stoppedPosition[2]);
      if (dist < minDistance) {
        minDistance = dist;
        closestPlayer = p;
      }
    }
    const closestTeam = closestPlayer.team;

    const updatedBall: BallState = {
      velocity: [0, 0, 0],
      position: stoppedPosition,
      possession: closestTeam,
      lastTouchedByPlayerId: ballRef.current.lastTouchedByPlayerId
    };

    // Update local ball
    setBall(updatedBall);

    // Se estiver em multiplayer, somente quem deu o peteleco calcula as transições de turno e de tempo
    const isMaster = !isMultiplayer || turnRef.current === myRoleRef.current;
    if (!isMaster) return;

    setHomeFlicksRemaining(homeVal => {
      let nextHomeFlicks = homeVal;
      setAwayFlicksRemaining(awayVal => {
        const isRoundOver = homeVal === 0 && awayVal === 0;

        nextHomeFlicks = homeVal;
        let nextAwayFlicks = awayVal;
        let nextTurnValue = turnRef.current;
        let nextGameTimeValue = gameTime;
        let nextPhaseValue = phase;
        let nextStatusValue = actionStatus;
        let nextScoresValue = scores;

        if (isRoundOver) {
          nextGameTimeValue = gameTime + 5;
          setGameTime(nextGameTimeValue);
          
          if (nextGameTimeValue >= 90) {
            nextPhaseValue = GamePhase.GAME_OVER;
            setPhase(nextPhaseValue);
            
            if (scores.home > scores.away) {
              nextStatusValue = `Fim de jogo! Vitória da Casa por ${scores.home}x${scores.away}!`;
            } else if (scores.away > scores.home) {
              nextStatusValue = `Fim de jogo! Vitória do Visitante por ${scores.away}x${scores.home}!`;
            } else {
              nextStatusValue = `Fim de jogo! Empate dramático de ${scores.home}x${scores.away}!`;
            }
            setActionStatus(nextStatusValue);
          } else if (nextGameTimeValue % 15 === 0) {
            nextPhaseValue = GamePhase.PREPARATION;
            setPhase(nextPhaseValue);
            setHomeReady(false);
            setAwayReady(false);
            nextTurnValue = closestTeam;
            setTurn(nextTurnValue);
            nextStatusValue = `Tempo esgotado! Reajuste tático dos 15 minutos (${nextGameTimeValue}').`;
            setActionStatus(nextStatusValue);
          } else {
            nextTurnValue = closestTeam;
            setTurn(nextTurnValue);
            nextStatusValue = `Rodada finalizada! Iniciando nova rodada (${nextGameTimeValue}'). Posse do time ${closestTeam === 'HOME' ? 'Casa' : 'Visitante'}.`;
            setActionStatus(nextStatusValue);
          }

          nextHomeFlicks = 3;
          nextAwayFlicks = 3;
          setTimeout(() => {
            setHomeFlicksRemaining(3);
            setAwayFlicksRemaining(3);
          }, 0);
        } else {
          nextTurnValue = turnRef.current === 'HOME' ? 'AWAY' : 'HOME';
          setTurn(nextTurnValue);
          
          if (isMultiplayer && myRoleRef.current) {
            nextStatusValue = nextTurnValue === myRoleRef.current ? 'Sua vez! Dê o peteleco na bola.' : 'Turno do adversário. Aguarde...';
          } else {
            nextStatusValue = nextTurnValue === 'HOME' ? 'Sua vez! Dê o peteleco na bola.' : 'A IA está preparando o contra-ataque...';
          }
          setActionStatus(nextStatusValue);
        }

        // Sync to DB
        if (isMultiplayer) {
          syncGameStateToFirebase(
            updatedBall, homePlayers, awayPlayers, nextTurnValue, 
            nextScoresValue, nextGameTimeValue, nextHomeFlicks, nextAwayFlicks, 
            nextPhaseValue, nextStatusValue
          );
        }

        return nextAwayFlicks;
      });
      return nextHomeFlicks;
    });
  }, [homePlayers, awayPlayers, gameTime, phase, scores, isMultiplayer, actionStatus]);

  // Goal scorer logic
  const scoreGoal = (scoringTeam: Team) => {
    let nextScores = { ...scores };
    setScores(prev => {
      nextScores = {
        home: scoringTeam === 'HOME' ? prev.home + 1 : prev.home,
        away: scoringTeam === 'AWAY' ? prev.away + 1 : prev.away
      };
      
      if (nextScores.home >= 3 || nextScores.away >= 3) {
        setTimeout(() => {
          setPhase(GamePhase.GAME_OVER);
          setActionStatus(nextScores.home >= 3 ? 'Parabéns, Vitória do time Casa!' : 'Fim de jogo. Vitória do time Visitante.');
          
          if (isMultiplayer) {
            syncGameStateToFirebase(
              { ...ballRef.current, velocity: [0, 0, 0] }, homePlayers, awayPlayers, turnRef.current,
              nextScores, gameTime, 3, 3, GamePhase.GAME_OVER, 
              nextScores.home >= 3 ? 'Fim de jogo! Vitória da Casa.' : 'Fim de jogo! Vitória do Visitante.'
            );
          }
        }, 3000);
      }
      return nextScores;
    });

    setPhase(GamePhase.GOAL_CELEBRATION);
    setActionStatus(`GOL DO TIME ${scoringTeam === 'HOME' ? 'CASA' : 'VISITANTE'}!`);

    const concedingTeam = scoringTeam === 'HOME' ? 'AWAY' : 'HOME';

    setTimeout(() => {
      if (phase === GamePhase.GAME_OVER || nextScores.home >= 3 || nextScores.away >= 3) return;

      const teamPlayers = concedingTeam === 'HOME' ? homePlayers : awayPlayers;
      const captain = teamPlayers.find(p => p.isCaptain) || teamPlayers[9];

      const setPlayers = concedingTeam === 'HOME' ? setHomePlayers : setAwayPlayers;

      let nextHomePlayers = homePlayers;
      let nextAwayPlayers = awayPlayers;

      const updatedPlayers = teamPlayers.map(p => {
        if (p.id === captain.id) {
          return { ...p, slotId: null, position: [0, 0.2, concedingTeam === 'HOME' ? -1.0 : 1.0] as [number, number, number] };
        }
        return p;
      });

      if (concedingTeam === 'HOME') {
        setHomePlayers(updatedPlayers);
        nextHomePlayers = updatedPlayers;
      } else {
        setAwayPlayers(updatedPlayers);
        nextAwayPlayers = updatedPlayers;
      }

      const freshBall: BallState = {
        position: [0, 0.11, 0],
        velocity: [0, 0, 0],
        possession: concedingTeam,
        lastTouchedByPlayerId: captain.id
      };

      setBall(freshBall);
      setTurn(concedingTeam);
      setHomeReady(false);
      setAwayReady(false);
      setHomeFlicksRemaining(3);
      setAwayFlicksRemaining(3);

      let nextPhase = GamePhase.ACTION;
      let nextStatus = '';

      setGameTime(prevTime => {
        if (prevTime > 0 && prevTime % 15 === 0) {
          nextPhase = GamePhase.PREPARATION;
          setPhase(nextPhase);
          nextStatus = `Gol marcado! Intervalo Tático (${prevTime}'): Reajuste seu time.`;
        } else {
          nextPhase = GamePhase.ACTION;
          setPhase(nextPhase);
          nextStatus = concedingTeam === 'HOME' 
            ? 'Gol sofrido! Saída de bola: chute do meio campo.' 
            : 'GOLAÇO! Saída de bola da IA.';
        }
        setActionStatus(nextStatus);

        // Sync fresh goal kickoff to DB
        if (isMultiplayer) {
          syncGameStateToFirebase(
            freshBall, nextHomePlayers, nextAwayPlayers, concedingTeam,
            nextScores, prevTime, 3, 3, nextPhase, nextStatus
          );
        }

        return prevTime;
      });
    }, 4000);
  };

  const isBallMoving = Math.hypot(ball.position[0] - ballRef.current.position[0], ball.position[2] - ballRef.current.position[2]) > 0.05 || Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.1;

  // IA Turn calculation
  useEffect(() => {
    if (isMultiplayer) return; // IA doesn't play in multiplayer mode!
    
    if (phase === GamePhase.ACTION && turn === 'AWAY' && !isIAThinking && !isBallMoving) {
      setIsIAThinking(true);
      const thinkTime = difficulty === Difficulty.EASY ? 1500 : difficulty === Difficulty.MEDIUM ? 2000 : 2500;
      
      setTimeout(() => {
        const [bx, by, bz] = ballRef.current.position;
        let vx = 0;
        let vz = 0;

        if (difficulty === Difficulty.EASY) {
          const angle = Math.PI * (1.1 + Math.random() * 0.8);
          const speed = 4 + Math.random() * 4;
          vx = Math.sin(angle) * speed;
          vz = Math.cos(angle) * speed;
        } else if (difficulty === Difficulty.MEDIUM) {
          const dx = 0 - bx;
          const dz = -8 - bz;
          const dist = Math.hypot(dx, dz);
          const angle = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.3;
          const speed = Math.min(10, 4 + dist * 0.6);
          vx = Math.sin(angle) * speed;
          vz = Math.cos(angle) * speed;
        } else {
          const dx = 0 - bx;
          const dz = -8 - bz;
          const dist = Math.hypot(dx, dz);
          
          const teammates = awayPlayers.filter(p => p.slotId !== null);
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
            const speed = 8;
            vx = Math.sin(angle) * speed;
            vz = Math.cos(angle) * speed;
          } else {
            const angle = Math.atan2(dx, dz);
            const speed = Math.min(12, 6 + dist * 0.5);
            vx = Math.sin(angle) * speed;
            vz = Math.cos(angle) * speed;
          }
        }

        setAwayFlicksRemaining(prev => Math.max(0, prev - 1));
        setBall(prev => ({ ...prev, velocity: [vx, 0, vz] }));
        
        setIsIAThinking(false);
        setActionStatus('A IA disparou a bola!');
      }, thinkTime);
    }
  }, [phase, turn, difficulty, isIAThinking, isBallMoving, awayPlayers, isMultiplayer]);

  const updateGoalkeeperPositions = useCallback((homeX: number, awayX: number) => {
    setHomePlayers(prev => prev.map(p => p.number === 1 ? { ...p, position: [homeX, p.position[1], p.position[2]] } : p));
    setAwayPlayers(prev => prev.map(p => p.number === 1 ? { ...p, position: [awayX, p.position[1], p.position[2]] } : p));
  }, []);

  const resetMatch = () => {
    isLeavingRef.current = true;
    if (isMultiplayer && roomId && myRole) {
      leaveMultiplayerRoom(roomId, myRole);
    }
    setPhase(GamePhase.MENU);
    setScores({ home: 0, away: 0 });
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
      setBall(INITIAL_BALL);
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
      setBall(INITIAL_BALL);
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
    setCaptain,
    shootBall,
    changePossession,
    scoreGoal,
    resetMatch,
    gameTime,
    homeFlicksRemaining,
    awayFlicksRemaining,
    handleBallStopped,
    updateGoalkeeperPositions,
    isCameraCentered,
    setIsCameraCentered,
    recenterTrigger,
    recenterCamera,

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
