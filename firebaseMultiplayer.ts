import { 
  db, auth, googleProvider, signInWithPopup, signOut, 
  ref, set, get, onValue, off, update, push, remove, onDisconnect, child 
} from './firebase';
import { PlayerConfig, BallState, Team, GamePhase, Difficulty } from './types';

export interface RoomPlayer {
  uid: string;
  displayName: string;
  photoURL: string;
  ready: boolean;
}

export interface Room {
  roomId: string;
  name: string;
  isClosed: boolean;
  password?: string;
  status: 'waiting' | 'preparation' | 'playing' | 'ended';
  createdAt: number;
  players: {
    home: RoomPlayer;
    away?: RoomPlayer;
  };
  presence?: {
    home?: boolean;
    away?: boolean;
  };
  gameState?: {
    turn: Team;
    scores: { home: number; away: number };
    gameTime: number;
    homeFlicksRemaining: number;
    awayFlicksRemaining: number;
    phase: GamePhase;
    actionStatus: string;
    ball?: BallState;
    homePlayers?: PlayerConfig[];
    awayPlayers?: PlayerConfig[];
    lastGoalScorer?: Team | null;
    consecutiveGoalsCount?: number;
  };
}

export interface TournamentMatch {
  matchId: string;
  round: number; // 1 = Semifinal, 2 = Final
  player1: { uid: string; displayName: string; photoURL: string; isAI: boolean; difficulty?: Difficulty };
  player2: { uid: string; displayName: string; photoURL: string; isAI: boolean; difficulty?: Difficulty };
  score1?: number;
  score2?: number;
  winnerUid?: string;
  status: 'pending' | 'playing' | 'completed';
  roomId?: string;
}

export interface Tournament {
  tournamentId: string;
  name: string;
  status: 'waiting' | 'active' | 'completed';
  createdAt: number;
  players: { [uid: string]: { displayName: string; photoURL: string; isAI: boolean } };
  matches: { [matchId: string]: TournamentMatch };
  winnerUid?: string;
}

// --- GOOGLE AUTH FUNCTIONS ---
export const signInGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  // Register user stats in DB if they do not exist
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  
  if (!snap.exists()) {
    await set(userRef, {
      uid: user.uid,
      displayName: user.displayName || 'Jogador',
      photoURL: user.photoURL || '',
      email: user.email || '',
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goalsScored: 0,
      goalsConceded: 0
    });
  } else {
    // Keep name & photo in sync
    await update(userRef, {
      displayName: user.displayName || 'Jogador',
      photoURL: user.photoURL || ''
    });
  }
  return user;
};

export const logoutFirebase = async () => {
  await signOut(auth);
};

// --- LEADERBOARD & HISTORY ---
export const fetchLeaderboard = async () => {
  const usersRef = ref(db, 'users');
  const snap = await get(usersRef);
  if (!snap.exists()) return [];
  
  const usersData = snap.val();
  const list = Object.keys(usersData).map(uid => usersData[uid]);
  
  // Sort by points desc, then wins desc, then goalsScored desc
  return list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.goalsScored - a.goalsScored;
  });
};

export const fetchMatchHistory = async (uid: string) => {
  const historyRef = ref(db, `users/${uid}/history`);
  const snap = await get(historyRef);
  if (!snap.exists()) return [];
  
  const data = snap.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const updateLeaderboardAndHistory = async (
  playerUid: string,
  opponentName: string,
  opponentPhoto: string,
  myGoals: number,
  opponentGoals: number,
  isTournament: boolean = false
) => {
  const userRef = ref(db, `users/${playerUid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  
  const stats = snap.val();
  let pointsAdded = 0;
  let isWin = myGoals > opponentGoals;
  let isDraw = myGoals === opponentGoals;
  
  if (isWin) pointsAdded = 3;
  else if (isDraw) pointsAdded = 1;
  
  const updatedStats = {
    points: (stats.points || 0) + pointsAdded,
    wins: (stats.wins || 0) + (isWin ? 1 : 0),
    losses: (stats.losses || 0) + (myGoals < opponentGoals ? 1 : 0),
    draws: (stats.draws || 0) + (isDraw ? 1 : 0),
    goalsScored: (stats.goalsScored || 0) + myGoals,
    goalsConceded: (stats.goalsConceded || 0) + opponentGoals
  };
  
  await update(userRef, updatedStats);
  
  // Add to History
  const historyRef = ref(db, `users/${playerUid}/history`);
  const newHistoryKey = push(historyRef).key!;
  await set(child(historyRef, newHistoryKey), {
    opponentName,
    opponentPhoto,
    myGoals,
    opponentGoals,
    result: isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS',
    isTournament,
    timestamp: Date.now()
  });
};

// --- ROOM / MATCHMAKING FUNCTIONS ---
export const createMultiplayerRoom = async (name: string, password?: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('NOT_AUTHENTICATED');
  
  const roomsRef = ref(db, 'rooms');
  const roomId = push(roomsRef).key!;
  
  const newRoom: Room = {
    roomId,
    name: name || `Sala de ${user.displayName}`,
    isClosed: !!password,
    status: 'waiting',
    createdAt: Date.now(),
    players: {
      home: {
        uid: user.uid,
        displayName: user.displayName || 'Jogador Casa',
        photoURL: user.photoURL || '',
        ready: false
      }
    }
  };
  
  if (password) {
    newRoom.password = password;
  }
  
  await set(child(roomsRef, roomId), newRoom);
  
  // Set Presence for HOME
  const presenceRef = ref(db, `rooms/${roomId}/presence/home`);
  await set(presenceRef, true);
  onDisconnect(presenceRef).remove();
  onDisconnect(ref(db, `rooms/${roomId}`)).remove();
  
  return roomId;
};

export const joinMultiplayerRoom = async (roomId: string, password?: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('NOT_AUTHENTICATED');
  
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('ROOM_NOT_FOUND');
  
  const room: Room = snap.val();
  if (room.isClosed && room.password !== password) {
    throw new Error('WRONG_PASSWORD');
  }
  
  if (room.players.away && room.players.away.uid !== user.uid) {
    throw new Error('ROOM_FULL');
  }
  
  const awayPlayer: RoomPlayer = {
    uid: user.uid,
    displayName: user.displayName || 'Jogador Visitante',
    photoURL: user.photoURL || '',
    ready: false
  };
  
  await update(ref(db, `rooms/${roomId}/players`), { away: awayPlayer });
  await update(roomRef, { status: 'preparation' });
  
  // Set Presence for AWAY
  const presenceRef = ref(db, `rooms/${roomId}/presence/away`);
  await set(presenceRef, true);
  onDisconnect(presenceRef).set(false);
};

export const leaveMultiplayerRoom = async (roomId: string, role: Team) => {
  if (!roomId || !role) return;
  
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  
  const room: Room = snap.val();
  
  if (role === 'HOME') {
    // If the host leaves, delete the room entirely
    await remove(roomRef);
  } else {
    // If the guest leaves:
    if (room.status === 'playing') {
      // If the match is already active, deleting the room ends it cleanly for both
      await remove(roomRef);
    } else {
      // If guest leaves in preparation, reset room to waiting so host can wait for another guest
      await update(roomRef, { status: 'waiting' });
      await remove(ref(db, `rooms/${roomId}/players/away`));
      await remove(ref(db, `rooms/${roomId}/presence/away`));
    }
  }
};

// --- TOURNAMENT MATA-MATA FUNCTIONS ---
export const createTournament = async (name: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('NOT_AUTHENTICATED');
  
  const tournamentsRef = ref(db, 'tournaments');
  const tournamentId = push(tournamentsRef).key!;
  
  const newTournament: Tournament = {
    tournamentId,
    name: name || 'Torneio Peteleco Pro',
    status: 'waiting',
    createdAt: Date.now(),
    players: {
      [user.uid]: {
        displayName: user.displayName || 'Jogador',
        photoURL: user.photoURL || '',
        isAI: false
      }
    },
    matches: {}
  };
  
  await set(child(tournamentsRef, tournamentId), newTournament);
  return tournamentId;
};

export const joinTournament = async (tournamentId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('NOT_AUTHENTICATED');
  
  const tRef = ref(db, `tournaments/${tournamentId}`);
  const snap = await get(tRef);
  if (!snap.exists()) throw new Error('TOURNAMENT_NOT_FOUND');
  
  const tournament: Tournament = snap.val();
  if (tournament.status !== 'waiting') throw new Error('TOURNAMENT_ALREADY_STARTED');
  if (Object.keys(tournament.players).length >= 4) throw new Error('TOURNAMENT_FULL');
  
  await update(ref(db, `tournaments/${tournamentId}/players`), {
    [user.uid]: {
      displayName: user.displayName || 'Jogador',
      photoURL: user.photoURL || '',
      isAI: false
    }
  });
};

const AI_NAMES = ['IA Messi', 'IA Cristiano', 'IA Pelé', 'IA Maradona', 'IA Neymar', 'IA Ronaldinho'];
const AI_DIFFICULTIES = [Difficulty.MEDIUM, Difficulty.HARD, Difficulty.EASY];

export const startTournament = async (tournamentId: string) => {
  const tRef = ref(db, `tournaments/${tournamentId}`);
  const snap = await get(tRef);
  if (!snap.exists()) return;
  
  const tournament: Tournament = snap.val();
  const currentPlayers = { ...tournament.players };
  const humanCount = Object.keys(currentPlayers).length;
  
  // Fill vacant spots to have exactly 4 players (Semifinals)
  let aiIndex = 0;
  while (Object.keys(currentPlayers).length < 4) {
    const aiId = `ai-bot-${Math.random().toString(36).substr(2, 9)}`;
    const randomName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)] + ` (${aiId.substr(0, 3)})`;
    currentPlayers[aiId] = {
      displayName: randomName,
      photoURL: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60',
      isAI: true
    };
    aiIndex++;
  }
  
  // Create Match 1 and Match 2 (Semifinals)
  const playerList = Object.keys(currentPlayers).map(uid => ({
    uid,
    ...currentPlayers[uid]
  }));
  
  // Shuffle player pairings
  playerList.sort(() => Math.random() - 0.5);
  
  const matches: { [matchId: string]: TournamentMatch } = {
    'semi-1': {
      matchId: 'semi-1',
      round: 1,
      player1: { uid: playerList[0].uid, displayName: playerList[0].displayName, photoURL: playerList[0].photoURL, isAI: playerList[0].isAI, difficulty: playerList[0].isAI ? AI_DIFFICULTIES[Math.floor(Math.random() * 3)] : undefined },
      player2: { uid: playerList[1].uid, displayName: playerList[1].displayName, photoURL: playerList[1].photoURL, isAI: playerList[1].isAI, difficulty: playerList[1].isAI ? AI_DIFFICULTIES[Math.floor(Math.random() * 3)] : undefined },
      status: 'pending'
    },
    'semi-2': {
      matchId: 'semi-2',
      round: 1,
      player1: { uid: playerList[2].uid, displayName: playerList[2].displayName, photoURL: playerList[2].photoURL, isAI: playerList[2].isAI, difficulty: playerList[2].isAI ? AI_DIFFICULTIES[Math.floor(Math.random() * 3)] : undefined },
      player2: { uid: playerList[3].uid, displayName: playerList[3].displayName, photoURL: playerList[3].photoURL, isAI: playerList[3].isAI, difficulty: playerList[3].isAI ? AI_DIFFICULTIES[Math.floor(Math.random() * 3)] : undefined },
      status: 'pending'
    }
  };
  
  await update(tRef, {
    players: currentPlayers,
    matches,
    status: 'active'
  });
  
  // Immediately simulate bot vs bot matches if any
  await resolveTournamentAIBots(tournamentId);
};

export const resolveTournamentAIBots = async (tournamentId: string) => {
  const tRef = ref(db, `tournaments/${tournamentId}`);
  const snap = await get(tRef);
  if (!snap.exists()) return;
  
  const tournament: Tournament = snap.val();
  const matches = { ...tournament.matches };
  let updated = false;
  
  // Check Semifinals
  for (const matchId of ['semi-1', 'semi-2']) {
    const match = matches[matchId];
    if (match && match.status === 'pending' && match.player1.isAI && match.player2.isAI) {
      // Simulate bot match score
      const goals1 = Math.floor(Math.random() * 4);
      const goals2 = Math.floor(Math.random() * 4);
      // Ensure no tie in tournament
      const finalScore1 = goals1 === goals2 ? goals1 + 1 : goals1;
      const finalScore2 = goals2;
      const winnerUid = finalScore1 > finalScore2 ? match.player1.uid : match.player2.uid;
      
      matches[matchId] = {
        ...match,
        score1: finalScore1,
        score2: finalScore2,
        winnerUid,
        status: 'completed'
      };
      updated = true;
    }
  }
  
  // Check if all Semifinals are done and Final is pending creation
  const semi1 = matches['semi-1'];
  const semi2 = matches['semi-2'];
  
  if (semi1 && semi2 && semi1.status === 'completed' && semi2.status === 'completed' && !matches['final']) {
    // Generate Final match!
    const winner1 = semi1.winnerUid === semi1.player1.uid ? semi1.player1 : semi1.player2;
    const winner2 = semi2.winnerUid === semi2.player1.uid ? semi2.player1 : semi2.player2;
    
    matches['final'] = {
      matchId: 'final',
      round: 2,
      player1: { uid: winner1.uid, displayName: winner1.displayName, photoURL: winner1.photoURL, isAI: winner1.isAI, difficulty: winner1.isAI ? Difficulty.HARD : undefined },
      player2: { uid: winner2.uid, displayName: winner2.displayName, photoURL: winner2.photoURL, isAI: winner2.isAI, difficulty: winner2.isAI ? Difficulty.HARD : undefined },
      status: 'pending'
    };
    updated = true;
  }
  
  // Check if Final was bot vs bot
  const finalMatch = matches['final'];
  if (finalMatch && finalMatch.status === 'pending' && finalMatch.player1.isAI && finalMatch.player2.isAI) {
    const goals1 = Math.floor(Math.random() * 4);
    const goals2 = Math.floor(Math.random() * 4);
    const finalScore1 = goals1 === goals2 ? goals1 + 1 : goals1;
    const finalScore2 = goals2;
    const winnerUid = finalScore1 > finalScore2 ? finalMatch.player1.uid : finalMatch.player2.uid;
    
    matches['final'] = {
      ...finalMatch,
      score1: finalScore1,
      score2: finalScore2,
      winnerUid,
      status: 'completed'
    };
    
    await update(tRef, {
      matches,
      status: 'completed',
      winnerUid
    });
    return;
  }
  
  if (updated) {
    await update(tRef, { matches });
    // Recursively check if new bot final match needs simulating
    if (matches['final'] && matches['final'].player1.isAI && matches['final'].player2.isAI) {
      await resolveTournamentAIBots(tournamentId);
    }
  }
};

export const updateTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  myGoals: number,
  oppGoals: number,
  winnerUid: string
) => {
  const tRef = ref(db, `tournaments/${tournamentId}`);
  const snap = await get(tRef);
  if (!snap.exists()) return;
  
  const tournament: Tournament = snap.val();
  const match = tournament.matches[matchId];
  if (!match) return;
  
  const matches = { ...tournament.matches };
  matches[matchId] = {
    ...match,
    score1: match.player1.uid === auth.currentUser?.uid ? myGoals : oppGoals,
    score2: match.player2.uid === auth.currentUser?.uid ? myGoals : oppGoals,
    winnerUid,
    status: 'completed'
  };
  
  await update(tRef, { matches });
  
  // Trigger bot simulation and setup next round
  await resolveTournamentAIBots(tournamentId);
  
  // If final completed, finalize tournament status
  const updatedSnap = await get(tRef);
  if (updatedSnap.exists()) {
    const updatedT: Tournament = updatedSnap.val();
    if (updatedT.matches['final'] && updatedT.matches['final'].status === 'completed') {
      await update(tRef, {
        status: 'completed',
        winnerUid: updatedT.matches['final'].winnerUid
      });
    }
  }
};
