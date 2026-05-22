import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStateContext } from '../GameStateContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { fetchMatchHistory } from '../firebaseMultiplayer';
import { Trophy, Calendar, History, Award, Swords, Percent, Activity, ShieldAlert, CheckCircle2, TrendingUp, Crown } from 'lucide-react';
import SoundManager from '../SoundManager';
import { db, ref, get } from '../firebase';

interface PlayerStatsModalProps {
  player: {
    uid: string;
    displayName: string;
    username?: string;
    photoURL: string;
    points: number;
    wins: number;
    losses: number;
    draws: number;
    goalsScored: number;
    goalsConceded: number;
    teamName?: string;
    logoUrl?: string;
    uniform?: any;
  };
  onClose: () => void;
}

const renderTeamCrest = (player: any, sizeClass: string = "w-10 h-10", extraBorderClass: string = "border-white/10") => {
  const logoUrl = player.logoUrl;
  const primaryColor = player.uniform?.primaryColor || '#1e3799';
  const secondaryColor = player.uniform?.secondaryColor || '#00d2ff';
  
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt="" 
        className={`${sizeClass} rounded-full border ${extraBorderClass} object-cover`} 
        referrerPolicy="no-referrer" 
      />
    );
  }
  
  const teamInitial = player.teamName 
    ? player.teamName.substring(0, 2).toUpperCase() 
    : (player.displayName ? player.displayName.substring(0, 2).toUpperCase() : 'FC');
    
  return (
    <div 
      className={`${sizeClass} rounded-full border ${extraBorderClass} flex items-center justify-center text-white font-black text-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.4)]`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        fontSize: sizeClass.includes('w-12') ? '11px' : sizeClass.includes('w-9') ? '9px' : '10px',
        letterSpacing: '-0.05em'
      }}
    >
      {teamInitial}
    </div>
  );
};

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose }) => {
  const { activeUser, leaderboard, matchHistory, userProfile } = useGameStateContext();
  const isMobile = useIsMobile();
  // Local state to keep fetched/latest player details
  const [playerData, setPlayerData] = useState(player);
  const [activeTab, setActiveTab] = useState<'stats' | 'h2h'>('stats');
  const [opponentHistory, setOpponentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch player's latest stats directly from Firebase RTDB and their match history on mount
  useEffect(() => {
    const loadPlayerDataAndHistory = async () => {
      setLoadingHistory(true);
      try {
        // Fetch latest profile data
        const userRef = ref(db, `users/${player.uid}`);
        const snap = await get(userRef);
        if (snap.exists()) {
          setPlayerData({ ...player, ...snap.val() });
        }
        
        const history = await fetchMatchHistory(player.uid);
        setOpponentHistory(history);
      } catch (err) {
        console.error("Error loading opponent data/history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadPlayerDataAndHistory();
  }, [player.uid]);

  // Find ranking position of this player
  const rankIndex = leaderboard.findIndex((p: any) => p.uid === playerData.uid);
  const rankPosition = rankIndex !== -1 ? rankIndex + 1 : '--';

  // Find ranking position of active user
  const myRankIndex = activeUser ? leaderboard.findIndex((p: any) => p.uid === activeUser.uid) : -1;
  const myRankPosition = myRankIndex !== -1 ? myRankIndex + 1 : '--';

  // Retrieve active user profile stats from context or leaderboard to ensure correctness
  const myProfile = userProfile || (activeUser ? leaderboard.find((p: any) => p.uid === activeUser.uid) : null);

  const getOpponentInfo = (opponentUid?: string, opponentName?: string) => {
    if (opponentUid && opponentUid !== playerData.uid) {
      return leaderboard.find((p: any) => p.uid === opponentUid);
    }
    if (opponentName) {
      return leaderboard.find((p: any) => p.uid !== playerData.uid && p.displayName.toLowerCase() === opponentName.toLowerCase());
    }
    return null;
  };

  // Stats Calculations
  const calculateGames = (p: any) => (p?.wins || 0) + (p?.draws || 0) + (p?.losses || 0);
  const calculatePerformance = (p: any) => {
    const games = calculateGames(p);
    if (games === 0) return 0;
    return (((p?.wins || 0) * 3 + (p?.draws || 0)) / (games * 3)) * 100;
  };

  const oppGames = calculateGames(playerData);
  const oppPerf = calculatePerformance(playerData);

  const myGames = myProfile ? calculateGames(myProfile) : 0;
  const myPerf = myProfile ? calculatePerformance(myProfile) : 0;

  // Direct confrontations (H2H) filter: matches in MY history played against this player (by UID or name)
  const h2hMatches = matchHistory.filter((m: any) => {
    const matchesUid = m.opponentUid && m.opponentUid === playerData.uid;
    const matchesName = !m.opponentUid && m.opponentName.toLowerCase() === playerData.displayName.toLowerCase();
    return matchesUid || matchesName;
  });

  // Calculate direct H2H stats
  const h2hWins = h2hMatches.filter((m: any) => m.result === 'WIN').length;
  const h2hDraws = h2hMatches.filter((m: any) => m.result === 'DRAW').length;
  const h2hLosses = h2hMatches.filter((m: any) => m.result === 'LOSS').length;
  const h2hGoalsScored = h2hMatches.reduce((acc: number, m: any) => acc + (m.myGoals || 0), 0);
  const h2hGoalsConceded = h2hMatches.reduce((acc: number, m: any) => acc + (m.opponentGoals || 0), 0);

  // Helper function to render comparative highlight
  // isLowerBetter = true for losses and goals conceded
  const renderCompare = (myVal: number, oppVal: number, isPercentValue: boolean = false, isLowerBetter: boolean = false) => {
    const formattedMy = isPercentValue ? `${myVal.toFixed(1)}%` : myVal;
    const formattedOpp = isPercentValue ? `${oppVal.toFixed(1)}%` : oppVal;

    if (myVal === oppVal) {
      return (
        <div className="grid grid-cols-3 text-center text-[11px] font-bold text-zinc-400 py-1.5 border-b border-zinc-900/50">
          <span>{formattedMy}</span>
          <span className="text-zinc-600 text-[9px] uppercase tracking-wider font-semibold">Empate</span>
          <span>{formattedOpp}</span>
        </div>
      );
    }

    const isMyBetter = isLowerBetter ? myVal < oppVal : myVal > oppVal;

    return (
      <div className="grid grid-cols-3 text-center text-[11px] font-bold py-1.5 border-b border-zinc-900/50">
        <span className={isMyBetter ? 'text-emerald-400' : 'text-rose-500'}>{formattedMy}</span>
        <span className="text-zinc-500 text-[9px] uppercase tracking-wide font-medium">vs</span>
        <span className={!isMyBetter ? 'text-emerald-400' : 'text-rose-500'}>{formattedOpp}</span>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md animate-fadeIn flex items-center justify-center p-4">
      <div className={`relative w-full bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden animate-scaleUp flex flex-col
        ${isMobile ? 'h-full max-h-[92vh]' : 'max-w-2xl h-[85vh] max-h-[580px]'}
      `}>
        
        {/* Header bar with consolidated tab switcher */}
        <div className={`flex items-center justify-between gap-3 px-4 pb-2.5 border-b border-zinc-900 bg-zinc-955 flex-shrink-0 w-full ${rankPosition === 1 ? 'pt-5' : 'pt-2.5'}`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Crest with Beautiful Crown Effect (Exact same layout as RankingTab podium card) */}
            <div className="relative flex-shrink-0 ml-0.5">
              {rankPosition === 1 ? (
                <>
                  <Crown size={14} className="text-yellow-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]" />
                  {renderTeamCrest(playerData, "w-10 h-10 sm:w-11 sm:h-11", "border-2 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]")}
                </>
              ) : rankPosition === 2 ? (
                renderTeamCrest(playerData, "w-10 h-10 sm:w-11 sm:h-11", "border-2 border-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.2)]")
              ) : rankPosition === 3 ? (
                renderTeamCrest(playerData, "w-10 h-10 sm:w-11 sm:h-11", "border-2 border-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.2)]")
              ) : (
                renderTeamCrest(playerData, "w-9 h-9 sm:w-10 sm:h-10", "border border-zinc-800")
              )}
            </div>

            {/* Big Rank Position Display */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <span className={`text-2xl sm:text-3xl font-black italic tracking-tighter leading-none select-none ${
                rankPosition === 1 ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse' :
                rankPosition === 2 ? 'text-slate-300 drop-shadow-[0_0_6px_rgba(148,163,184,0.4)]' :
                rankPosition === 3 ? 'text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.4)]' : 'text-purple-400'
              }`}>
                {rankPosition === 1 ? '#1' : rankPosition === 2 ? '#2' : rankPosition === 3 ? '#3' : `#${rankPosition}`}
              </span>
            </div>

            <div className="text-left flex flex-col justify-center min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-zinc-100 uppercase tracking-wide truncate leading-none">
                {playerData.teamName || `${(playerData.username || playerData.displayName || 'Jogador').toUpperCase()} FC`}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 leading-none text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <span>{playerData.username || playerData.displayName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Compact Segmented Controls */}
            <div className="flex bg-zinc-900/60 border border-zinc-900 p-0.5 rounded-xl flex-shrink-0">
              <button
                onClick={() => { SoundManager.playUIClick(); setActiveTab('stats'); }}
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all
                  ${activeTab === 'stats' 
                    ? 'bg-zinc-950 border border-zinc-800 text-cyan-400 shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
              >
                <Activity size={10} />
                Estatísticas
              </button>
              <button
                onClick={() => { SoundManager.playUIClick(); setActiveTab('h2h'); }}
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all
                  ${activeTab === 'h2h' 
                    ? 'bg-zinc-955 border border-zinc-800 text-purple-400 shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
              >
                <Swords size={10} />
                Confronto
              </button>
            </div>
            
            <button
              onClick={() => { SoundManager.playUIClick(); onClose(); }}
              className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin">
          
          {activeTab === 'stats' ? (
            /* ──────── TAB 1: PLAYER STATS & HIS HISTORY ──────── */
            <div className="space-y-4 animate-scaleUp">
              
              {/* Stats Highlights Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-2.5 text-center shadow-inner">
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-zinc-500 block mb-0.5">Jogos</span>
                  <span className="text-sm font-black text-zinc-200">{oppGames}</span>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-2.5 text-center shadow-inner">
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-zinc-500 block mb-0.5">Aproveitam.</span>
                  <span className="text-sm font-black text-cyan-400">{oppPerf.toFixed(0)}%</span>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-2.5 text-center shadow-inner">
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-zinc-500 block mb-0.5">Pontos</span>
                  <span className="text-sm font-black text-purple-400">{(playerData.points || 0)} PTS</span>
                </div>
              </div>

              {/* Detailed Stats Table (COLUNA DUPLA) */}
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column (Match Results) */}
                  <div className="divide-y divide-zinc-900/50">
                    <div className="grid grid-cols-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-1.5 border-b border-zinc-900 mb-1">
                      <span className="text-left">Resultado</span>
                      <span className="text-right">Qtd</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[10px] font-bold">
                      <span className="text-zinc-400 uppercase tracking-wide">Vitórias</span>
                      <span className="font-black text-emerald-400">{(playerData.wins || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[10px] font-bold">
                      <span className="text-zinc-400 uppercase tracking-wide">Empates</span>
                      <span className="font-black text-zinc-300">{(playerData.draws || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[10px] font-bold">
                      <span className="text-zinc-400 uppercase tracking-wide">Derrotas</span>
                      <span className="font-black text-rose-400">{(playerData.losses || 0)}</span>
                    </div>
                  </div>

                  {/* Right Column (Goals Metrics) */}
                  <div className="divide-y divide-zinc-900/50 mt-4 sm:mt-0">
                    <div className="grid grid-cols-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-1.5 border-b border-zinc-900 mb-1">
                      <span className="text-left">Gols</span>
                      <span className="text-right">Qtd</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[10px] font-bold">
                      <span className="text-zinc-400 uppercase tracking-wide">Gols Feitos</span>
                      <span className="font-black text-indigo-400">{(playerData.goalsScored || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[10px] font-bold">
                      <span className="text-zinc-400 uppercase tracking-wide">Gols Sofridos</span>
                      <span className="font-black text-orange-400">{(playerData.goalsConceded || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-[10px] font-bold">
                      <span className="text-zinc-400 uppercase tracking-wide">Saldo de Gols</span>
                      <span className={`font-black ${(playerData.goalsScored || 0) - (playerData.goalsConceded || 0) >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                        {(playerData.goalsScored || 0) - (playerData.goalsConceded || 0)}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Player's Recent Match History List */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block text-left">Últimos Jogos de {playerData.username || playerData.displayName}</span>
                
                {loadingHistory ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Carregando partidas...</span>
                  </div>
                ) : opponentHistory.length > 0 ? (
                  <div className="space-y-1.5">
                    {opponentHistory.slice(0, 10).map((match: any) => {
                      const isWin = match.result === 'WIN';
                      const isDraw = match.result === 'DRAW';
                      const outcomeColor = isWin 
                        ? 'border-emerald-500/20 bg-emerald-950/5 text-emerald-400' 
                        : isDraw 
                          ? 'border-zinc-800 bg-zinc-900/20 text-zinc-400' 
                          : 'border-rose-500/20 bg-rose-950/5 text-rose-400';
                      
                      const opponentInfo = getOpponentInfo(match.opponentUid, match.opponentName) || {
                        displayName: match.opponentName,
                        logoUrl: match.opponentPhoto
                      };

                      return (
                        <div 
                          key={match.id}
                          className={`border flex justify-between items-center p-3 rounded-xl shadow-inner text-left transition-colors ${outcomeColor}`}
                        >
                          <div className="flex items-center gap-2">
                            {renderTeamCrest(opponentInfo, "w-5 h-5", "border border-zinc-800")}
                            <div>
                              <div className="flex items-baseline gap-1.5 truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[240px]">
                                <h4 className="text-[10.5px] font-black uppercase truncate">
                                  {opponentInfo.teamName || `${(opponentInfo.username || opponentInfo.displayName || 'Jogador').toUpperCase()} FC`}
                                </h4>
                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                  {opponentInfo.username || opponentInfo.displayName}
                                </span>
                              </div>
                              <span className="text-[7.5px] font-bold text-zinc-500 uppercase flex items-center gap-0.5 mt-0.5">
                                <Calendar size={8} /> {new Date(match.timestamp).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[7px] font-black px-1 py-0.5 rounded ${match.isTournament ? 'bg-yellow-950 border border-yellow-900 text-yellow-400' : 'bg-indigo-950 border border-indigo-900 text-indigo-400'}`}>
                              {match.isTournament ? 'COPA' : 'LIGA'}
                            </span>
                            <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800/80 px-2 py-0.5 rounded-lg font-black text-[9.5px] tabular-nums text-white">
                              <span className={isWin ? 'text-emerald-400' : 'text-zinc-400'}>{match.myGoals}</span>
                              <span className="text-zinc-700">:</span>
                              <span className={!isWin && !isDraw ? 'text-rose-400' : 'text-zinc-400'}>{match.opponentGoals}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 bg-zinc-900/10 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 font-bold">
                    <History size={20} className="opacity-30 mb-1" />
                    <span className="text-[10px] font-semibold">Nenhuma peleja registrada.</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* ──────── TAB 2: H2H DIRECT CONFRONTATION ──────── */
            <div className="space-y-4 animate-scaleUp">
              
              {!activeUser ? (
                <div className="py-8 bg-zinc-900/10 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 font-bold">
                  <ShieldAlert size={20} className="opacity-30 mb-1" />
                  <span className="text-[10px] font-semibold">Faça login para comparar o histórico H2H.</span>
                </div>
              ) : (
                <>
                  {/* H2H Comparative Stats Table */}
                  <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-2xl overflow-hidden p-3.5 space-y-3">
                    <div className="grid grid-cols-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 pb-2 border-b border-zinc-800/80 items-center">
                      <div className="text-center min-w-0 px-1 flex flex-col justify-center items-center">
                        <div className="flex flex-wrap items-baseline justify-center gap-x-1 max-w-full">
                          <span className="font-black text-zinc-300 uppercase tracking-wide truncate">
                            {myProfile?.teamName || "VOCÊ"}
                          </span>
                          <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">
                            {userProfile?.username || myProfile?.username || activeUser?.displayName}
                          </span>
                        </div>
                      </div>
                      <span className="text-zinc-400 self-center">ESTATÍSTICA</span>
                      <div className="text-center min-w-0 px-1 flex flex-col justify-center items-center">
                        <div className="flex flex-wrap items-baseline justify-center gap-x-1 max-w-full">
                          <span className="font-black text-zinc-300 uppercase tracking-wide truncate">
                            {playerData.teamName || `${(playerData.username || playerData.displayName).toUpperCase()} FC`}
                          </span>
                          <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">
                            {playerData.username || playerData.displayName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">POSIÇÃO DO RANKING</span>
                        {renderCompare(myRankPosition === '--' ? 999 : Number(myRankPosition), rankPosition === '--' ? 999 : Number(rankPosition), false, true)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">PONTOS</span>
                        {renderCompare(myProfile?.points || 0, playerData.points || 0)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">APROVEITAMENTO GERAL</span>
                        {renderCompare(myPerf, oppPerf, true)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">VITÓRIAS</span>
                        {renderCompare(myProfile?.wins || 0, playerData.wins || 0)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">EMPATES</span>
                        {renderCompare(myProfile?.draws || 0, playerData.draws || 0)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">DERROTAS (MENOR É MELHOR)</span>
                        {renderCompare(myProfile?.losses || 0, playerData.losses || 0, false, true)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">GOLS MARCADOS</span>
                        {renderCompare(myProfile?.goalsScored || 0, playerData.goalsScored || 0)}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center">GOLS SOFRIDOS (MENOR É MELHOR)</span>
                        {renderCompare(myProfile?.goalsConceded || 0, playerData.goalsConceded || 0, false, true)}
                      </div>
                    </div>
                  </div>

                  {/* H2H Balance Board */}
                  <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3.5 space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block text-center">SALDO DE CONFRONTOS DIRETOS</span>
                    <div className="grid grid-cols-3 gap-2 text-center items-center">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider block">Suas Vitórias</span>
                        <span className="text-sm font-black text-emerald-400">{h2hWins}</span>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider block">Empates</span>
                        <span className="text-sm font-black text-zinc-400">{h2hDraws}</span>
                      </div>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider block">Suas Derrotas</span>
                        <span className="text-sm font-black text-rose-400">{h2hLosses}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 border-t border-zinc-800/60 pt-2.5">
                      <div className="flex items-center gap-1">
                        <span>Aproveitamento:</span>
                        <span className="text-purple-400 font-black">
                          {h2hMatches.length > 0 
                            ? `${((h2hWins * 3 + h2hDraws) / (h2hMatches.length * 3) * 100).toFixed(1)}%` 
                            : '0.0%'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Saldo de Gols:</span>
                        <span className={`font-black ${h2hGoalsScored - h2hGoalsConceded >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                          {h2hGoalsScored - h2hGoalsConceded >= 0 ? '+' : ''}{h2hGoalsScored - h2hGoalsConceded}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* List of Direct Matches */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block text-left">Partidas Diretas</span>
                    {h2hMatches.length > 0 ? (
                      <div className="space-y-1.5">
                        {h2hMatches.map((match: any) => {
                          const isWin = match.result === 'WIN';
                          const isDraw = match.result === 'DRAW';
                          const outcomeColor = isWin 
                            ? 'border-emerald-500/20 bg-emerald-950/5 text-emerald-400' 
                            : isDraw 
                              ? 'border-zinc-800 bg-zinc-900/20 text-zinc-400' 
                              : 'border-rose-500/20 bg-rose-950/5 text-rose-400';
                          
                          return (
                            <div 
                              key={match.id}
                              className={`border flex justify-between items-center p-3 rounded-xl shadow-inner text-left transition-colors ${outcomeColor}`}
                            >
                              <div>
                                <span className="text-[7.5px] font-bold text-zinc-500 uppercase flex items-center gap-0.5 mb-0.5">
                                  <Calendar size={8} /> {new Date(match.timestamp).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                                  {match.isTournament ? 'Campeonato Dedobol (Copa)' : 'Liga Regular Dedobol'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800/80 px-2.5 py-0.5 rounded-lg font-black text-[10px] tabular-nums text-white">
                                  <span className={isWin ? 'text-emerald-400' : 'text-zinc-400'}>{match.myGoals}</span>
                                  <span className="text-zinc-700">:</span>
                                  <span className={!isWin && !isDraw ? 'text-rose-400' : 'text-zinc-400'}>{match.opponentGoals}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 bg-zinc-900/10 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 font-bold">
                        <Swords size={20} className="opacity-30 mb-1" />
                        <span className="text-[10px] font-semibold">Nenhum confronto direto registrado ainda.</span>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
};

export default PlayerStatsModal;
