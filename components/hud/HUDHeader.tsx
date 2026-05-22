import React, { useState, useEffect, useRef } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { GamePhase } from '../../types';
import { 
  RotateCcw, 
  Minimize2, 
  Maximize2, 
  Clock,
  Swords,
  Trophy,
  Activity,
  Calendar,
  History,
  Percent,
  ShieldAlert
} from 'lucide-react';
import SoundManager from '../../SoundManager';

interface HUDHeaderProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const HUDHeader: React.FC<HUDHeaderProps> = ({ isFullscreen, toggleFullscreen }) => {
  const {
    phase,
    scores,
    turn,
    myRole,
    isMultiplayer,
    opponentInfo,
    opponentProfile,
    userProfile,
    activeUser,
    homeKitConfig,
    awayKitConfig,
    homeFlicksRemaining,
    awayFlicksRemaining,
    gameTime,
    resetMatch,
    lastGoalScorer,
    consecutiveGoalsCount,
    gameTimeSeconds,
    matchDuration,
    ball,
    homePlayers,
    awayPlayers,
    prepTimer,
    homeReady,
    awayReady,
    leaderboard,
    matchHistory
  } = useGameStateContext();

  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpponentStatsOpen, setIsOpponentStatsOpen] = useState(false);
  const [submenuTab, setSubmenuTab] = useState<'stats' | 'h2h'>('stats');

  const containerRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isBallMoving = ball ? Math.hypot(ball.velocity[0], ball.velocity[2]) > 0.05 : false;

  const isReady = isMultiplayer && myRole ? (myRole === 'HOME' ? homeReady : awayReady) : false;

  // Click outside scoreboard pill collapses expanded team names and closes stats submenu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedScoreboard = containerRef.current && containerRef.current.contains(event.target as Node);
      const clickedSubmenu = submenuRef.current && submenuRef.current.contains(event.target as Node);
      
      if (!clickedScoreboard && !clickedSubmenu) {
        setIsExpanded(false);
        setIsOpponentStatsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (phase === GamePhase.MENU) return null;

  // Streak and Stopper Extra states for UI feedback
  const homeStreakActive = lastGoalScorer === 'HOME' && consecutiveGoalsCount >= 2;
  const homeStopperActive = lastGoalScorer === 'AWAY' && consecutiveGoalsCount >= 2;
  const awayStreakActive = lastGoalScorer === 'AWAY' && consecutiveGoalsCount >= 2;
  const awayStopperActive = lastGoalScorer === 'HOME' && consecutiveGoalsCount >= 2;

  // Derived Info for HOME
  const homeTeamName = userProfile?.teamName || 'MEU TIME';
  const homeAbbreviation = userProfile?.abbreviation || 'CAS';
  const homePlayerName = userProfile?.username || activeUser?.displayName || 'Jogador 1';

  // Derived Info for AWAY
  const awayTeamName = isMultiplayer 
    ? (opponentProfile?.teamName || opponentInfo?.displayName?.toUpperCase() || 'VISITANTE')
    : 'INTELIGÊNCIA ARTIFICIAL';
  const awayAbbreviation = isMultiplayer 
    ? (opponentProfile?.abbreviation || opponentInfo?.displayName?.substring(0, 3).toUpperCase() || 'VIS')
    : 'I.A.';
  const awayPlayerName = isMultiplayer 
    ? (opponentProfile?.username || opponentInfo?.displayName || 'Oponente')
    : 'MÁQUINA';

  const homeGK = homePlayers?.find(p => p.number === 1);
  const awayGK = awayPlayers?.find(p => p.number === 1);
  const homeSaves = homeGK?.gkSaves ?? 0;
  const awaySaves = awayGK?.gkSaves ?? 0;

  // Statistics & Head-to-Head calculations for comparative submenu
  const myProfile = userProfile;
  const myRankIndex = leaderboard ? leaderboard.findIndex((u: any) => u.uid === activeUser?.uid) : -1;
  const oppRankIndex = leaderboard ? leaderboard.findIndex((u: any) => u.uid === opponentProfile?.uid || u.uid === opponentInfo?.uid) : -1;
  const myRankPosition = myRankIndex !== -1 ? (myRankIndex + 1).toString() : '--';
  const oppRankPosition = oppRankIndex !== -1 ? (oppRankIndex + 1).toString() : '--';

  const myTotalMatches = (userProfile?.wins || 0) + (userProfile?.draws || 0) + (userProfile?.losses || 0);
  const myPerf = myTotalMatches > 0 
    ? parseFloat((((userProfile?.wins || 0) * 3 + (userProfile?.draws || 0)) / (myTotalMatches * 3) * 100).toFixed(1))
    : 0;

  const oppTotalMatches = (opponentProfile?.wins || 0) + (opponentProfile?.draws || 0) + (opponentProfile?.losses || 0);
  const oppPerf = oppTotalMatches > 0 
    ? parseFloat((((opponentProfile?.wins || 0) * 3 + (opponentProfile?.draws || 0)) / (oppTotalMatches * 3) * 100).toFixed(1))
    : 0;

  const oppUid = opponentProfile?.uid || opponentInfo?.uid || '';
  const h2hMatches = matchHistory && oppUid
    ? matchHistory.filter((m: any) => m.opponentUid === oppUid)
    : [];

  const h2hWins = h2hMatches.filter((m: any) => m.result === 'WIN').length;
  const h2hDraws = h2hMatches.filter((m: any) => m.result === 'DRAW').length;
  const h2hLosses = h2hMatches.filter((m: any) => m.result === 'LOSS').length;

  const h2hGoalsScored = h2hMatches.reduce((acc: number, m: any) => acc + (m.myGoals || 0), 0);
  const h2hGoalsConceded = h2hMatches.reduce((acc: number, m: any) => acc + (m.opponentGoals || 0), 0);

  const renderCompare = (
    val1: number, 
    val2: number, 
    isPercentage: boolean = false, 
    isLowerBetter: boolean = false
  ) => {
    let val1Better = isLowerBetter ? val1 < val2 : val1 > val2;
    let val2Better = isLowerBetter ? val2 < val1 : val2 > val1;
    let isEqual = val1 === val2;

    const displayVal = (val: number) => {
      if (val === 999) return '--';
      return isPercentage ? `${val.toFixed(1)}%` : val.toString();
    };

    const color1 = isEqual ? 'text-zinc-400 font-semibold' : (val1Better ? 'text-emerald-400 font-black' : 'text-rose-455 font-medium');
    const color2 = isEqual ? 'text-zinc-400 font-semibold' : (val2Better ? 'text-emerald-400 font-black' : 'text-rose-455 font-medium');

    return (
      <div className="grid grid-cols-3 text-center text-[10px] items-center">
        <span className={color1}>{displayVal(val1)}</span>
        <span className="text-zinc-500 font-medium text-[8px] uppercase">vs</span>
        <span className={color2}>{displayVal(val2)}</span>
      </div>
    );
  };

  // Helper to render procedural crests or uploaded logos
  const renderCrest = (
    logoUrl: string | undefined, 
    abbreviation: string, 
    primaryColor: string, 
    secondaryColor: string, 
    team: 'HOME' | 'AWAY'
  ) => {
    if (logoUrl) {
      return (
        <div className={`relative flex-shrink-0 w-8 h-8 rounded-full border border-zinc-700/60 overflow-hidden bg-zinc-950 flex items-center justify-center shadow-lg transition-transform duration-300 ${isMobile ? 'scale-90' : ''}`}>
          <img src={logoUrl} alt="crest" className="w-full h-full object-cover" />
        </div>
      );
    }

    // Procedural Crest Design
    return (
      <div 
        className={`relative flex-shrink-0 w-8 h-8 rounded-full border border-zinc-700/60 overflow-hidden flex items-center justify-center shadow-lg transition-all duration-300 bg-zinc-900 ${isMobile ? 'scale-90' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 50%, ${secondaryColor} 50%)`
        }}
      >
        <div className="absolute inset-0.5 rounded-full bg-black/15 backdrop-blur-[0.5px] flex items-center justify-center">
          <span 
            className="font-black text-[9px] tracking-tighter"
            style={{
              color: '#ffffff',
              textShadow: '0px 1px 3px rgba(0,0,0,0.85), 0px 0px 1.5px rgba(0,0,0,0.5)'
            }}
          >
            {abbreviation.substring(0, 2)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`absolute top-0 left-0 w-full z-10 flex justify-between items-start pointer-events-none animate-fadeIn ${isMobile ? 'p-2' : 'p-4 md:p-6'}`}>
      
      {/* Left Column: Scoreboard and Opponent Stats Submenu */}
      <div className="flex flex-col items-start gap-2 pointer-events-none">
        
        {/* Main Scoreboard Pill */}
        <div className={`hud-scoreboard-pill pointer-events-auto flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl transition-all duration-300 ${isMobile ? 'px-2.5 py-1 gap-1 text-[10px]' : 'px-3 md:px-5 py-1.5 md:py-2.5 gap-1.5 md:gap-3'}`}>
          <button 
            onClick={resetMatch}
            className={`text-zinc-450 hover:text-rose-450 transition-colors rounded-full hover:bg-zinc-800/80 ${isMobile ? 'p-0.5 mr-0.5' : 'p-1 md:p-1.5 mr-1.5 md:mr-3'}`}
            title="Voltar ao Menu"
          >
            <RotateCcw size={isMobile ? 12 : 15} />
          </button>

          {/* Integrated Premium Glassmorphic Fullscreen Button in Scoreboard */}
          <button 
            onClick={toggleFullscreen}
            className={`text-zinc-450 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all duration-300 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 relative group pointer-events-auto ${isMobile ? 'p-0.5 mr-1' : 'p-1.5 mr-2.5 md:mr-4'}`}
            title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
          >
            {isFullscreen ? (
              <Minimize2 size={isMobile ? 11 : 14} className="group-hover:rotate-12 transition-transform duration-300" />
            ) : (
              <Maximize2 size={isMobile ? 11 : 14} className="group-hover:scale-115 transition-transform duration-300" />
            )}
            {!isFullscreen && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            )}
          </button>

          {/* Interactive Scoreboard Wrapper */}
          <div 
            ref={containerRef}
            onClick={() => {
              SoundManager.playUIClick();
              setIsExpanded(prev => !prev);
              setIsOpponentStatsOpen(prev => !prev);
            }}
            className="flex items-center gap-2 md:gap-4 cursor-pointer select-none"
          >
            {/* Home Team & Flick Indicators */}
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-3'}`}>
              <span className={`rounded-full shadow-[0_0_10px_rgba(30,55,153,0.5)] transition-all duration-300 ${turn === 'HOME' ? 'bg-blue-500 animate-pulse ring-2 ring-white/30' : 'bg-zinc-650'} ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2.5 md:w-2.5 md:h-2.5'}`}></span>
              
              {/* Home details (expanded or collapsed) */}
              <div className="flex items-center">
                {isExpanded ? (
                  <div className="flex items-center gap-1.5 animate-fadeIn">
                    <span className={`font-black uppercase tracking-wider ${turn === 'HOME' ? 'text-blue-400' : 'text-zinc-350'} ${isMobile ? 'text-[8.5px]' : 'text-xs'}`}>
                      {homeTeamName}
                    </span>
                    <span className="text-zinc-700 text-[10px] font-bold">|</span>
                    <span className={`font-bold text-zinc-400 max-w-[80px] truncate ${isMobile ? 'text-[8px]' : 'text-[11px]'}`}>
                      {homePlayerName}
                    </span>
                    {homeSaves > 0 && (
                      <>
                        <span className="text-zinc-700 text-[10px] font-bold">|</span>
                        <span 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 font-extrabold text-[8px] md:text-[9.5px] shadow-[0_0_8px_rgba(34,211,238,0.15)]`}
                          title={`Goleiro: ${homeSaves} defesas (Lentidão de -${homeSaves}%)`}
                        >
                          🧤 {homeSaves} (-{homeSaves}%)
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className={`font-black tracking-widest uppercase transition-all duration-300 animate-fadeIn ${turn === 'HOME' ? 'text-blue-400' : 'text-zinc-450'} ${isMobile ? 'text-[9.5px]' : 'text-sm'}`}>
                    {homeAbbreviation}
                  </span>
                )}
              </div>
              
              {/* Home badges */}
              {homeStreakActive && (
                <span 
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-955/60 border border-orange-700/50 text-orange-450 font-black animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.3)] text-[8px] md:text-[10px]"
                  title={`Hot Streak! ${consecutiveGoalsCount} gols seguidos.`}
                >
                  🔥 <span className="font-extrabold text-[7.5px] md:text-[9.5px]">{consecutiveGoalsCount}</span>
                </span>
              )}
              {homeStopperActive && (
                <span 
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-955/60 border border-amber-700/50 text-amber-500 font-black animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.3)] text-[8px] md:text-[10px]"
                  title="Stopper Extra! +1 Bloqueio disponível na preparação."
                >
                  🛡️ <span className="font-extrabold text-[7.5px] md:text-[9.5px]">+1</span>
                </span>
              )}

              {/* Separated circular Crest */}
              {renderCrest(
                userProfile?.logoUrl,
                homeAbbreviation,
                userProfile?.uniform?.primaryColor || '#1e3799',
                userProfile?.uniform?.secondaryColor || '#ffffff',
                'HOME'
              )}
              
              {/* Home Flicks remaining */}
              <div className={`flex items-center ml-0.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 ${isMobile ? 'gap-0.5 px-1 py-0.5' : 'gap-1 md:gap-1.5 px-1.5 py-1 md:px-2 md:py-1'}`}>
                {[1, 2, 3].map(i => (
                  <span 
                    key={i} 
                    className={`rounded-full transition-all duration-300 ${
                      i <= homeFlicksRemaining 
                        ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                        : 'bg-zinc-800'
                    } ${isMobile ? 'w-0.5 h-0.5' : 'w-1 h-1 md:w-1.5 md:h-1.5'}`}
                  />
                ))}
              </div>
            </div>

            {/* Score Numbers */}
            <div className={`flex items-center bg-zinc-950 border border-zinc-800/80 rounded-full font-black tabular-nums tracking-widest text-white shadow-inner transition-all duration-300 ${isMobile ? 'mx-0.5 px-1.5 py-0.5 text-[11px]' : 'mx-1 md:mx-3 px-3 py-1 md:px-4 md:py-1.5 text-sm md:text-base'}`}>
              <span className={turn === 'HOME' ? 'text-blue-400' : 'text-zinc-300'}>{scores.home}</span>
              <span className={`text-zinc-650 ${isMobile ? 'mx-0.5' : 'mx-1'}`}>:</span>
              <span className={turn === 'AWAY' ? 'text-orange-400' : 'text-zinc-300'}>{scores.away}</span>
            </div>

            {/* Away Team & Flick Indicators */}
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-3'}`}>
              {/* Away Flicks remaining */}
              <div className={`flex items-center mr-0.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 ${isMobile ? 'gap-0.5 px-1 py-0.5' : 'gap-1 md:gap-1.5 px-1.5 py-1 md:px-2 md:py-1'}`}>
                {[1, 2, 3].map(i => (
                  <span 
                    key={i} 
                    className={`rounded-full transition-all duration-300 ${
                      i <= awayFlicksRemaining 
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(241,196,15,0.8)]' 
                        : 'bg-zinc-800'
                    } ${isMobile ? 'w-0.5 h-0.5' : 'w-1 h-1 md:w-1.5 md:h-1.5'}`}
                  />
                ))}
              </div>

              {/* Separated circular Crest */}
              {renderCrest(
                isMultiplayer ? opponentProfile?.logoUrl : undefined,
                awayAbbreviation,
                isMultiplayer ? (opponentProfile?.uniform?.primaryColor || '#e55039') : (awayKitConfig?.primaryColor || '#e55039'),
                isMultiplayer ? (opponentProfile?.uniform?.secondaryColor || '#f6b93b') : (awayKitConfig?.secondaryColor || '#f6b93b'),
                'AWAY'
              )}
              
              {/* Away badges */}
              {awayStreakActive && (
                <span 
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-955/60 border border-orange-700/50 text-orange-450 font-black animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.3)] text-[8px] md:text-[10px]"
                  title={`Hot Streak! ${consecutiveGoalsCount} gols seguidos.`}
                >
                  🔥 <span className="font-extrabold text-[7.5px] md:text-[9.5px]">{consecutiveGoalsCount}</span>
                </span>
              )}
              {awayStopperActive && (
                <span 
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-955/60 border border-amber-700/50 text-amber-500 font-black animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.3)] text-[8px] md:text-[10px]"
                  title="Stopper Extra! +1 Bloqueio disponível na preparação."
                >
                  🛡️ <span className="font-extrabold text-[7.5px] md:text-[9.5px]">+1</span>
                </span>
              )}

              {/* Away details (expanded or collapsed) */}
              <div className="flex items-center">
                {isExpanded ? (
                  <div className="flex items-center gap-1.5 animate-fadeIn">
                    {awaySaves > 0 && (
                      <>
                        <span 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-955/60 border border-amber-800/40 text-amber-400 font-extrabold text-[8px] md:text-[9.5px] shadow-[0_0_8px_rgba(245,158,11,0.15)]`}
                          title={`Goleiro: ${awaySaves} defesas (Lentidão de -${awaySaves}%)`}
                        >
                          (-{awaySaves}%) {awaySaves} 🧤
                        </span>
                        <span className="text-zinc-700 text-[10px] font-bold">|</span>
                      </>
                    )}
                    <span className={`font-bold text-zinc-400 max-w-[80px] truncate ${isMobile ? 'text-[8px]' : 'text-[11px]'}`}>
                      {awayPlayerName}
                    </span>
                    <span className="text-zinc-700 text-[10px] font-bold">|</span>
                    <span className={`font-black uppercase tracking-wider ${turn === 'AWAY' ? 'text-orange-400' : 'text-zinc-350'} ${isMobile ? 'text-[8.5px]' : 'text-xs'}`}>
                      {awayTeamName}
                    </span>
                  </div>
                ) : (
                  <span className={`font-black tracking-widest uppercase transition-colors duration-300 animate-fadeIn ${turn === 'AWAY' ? 'text-orange-400' : 'text-zinc-450'} ${isMobile ? 'text-[9.5px]' : 'text-sm'}`}>
                    {awayAbbreviation}
                  </span>
                )}
              </div>
              
              <span className={`rounded-full shadow-[0_0_10px_rgba(229,80,57,0.5)] transition-all duration-300 ${turn === 'AWAY' ? 'bg-orange-500 animate-pulse ring-2 ring-white/30' : 'bg-zinc-650'} ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2.5 md:w-2.5 md:h-2.5'}`}></span>
            </div>
          </div>
        </div>

        {/* Discreet Submenu Panel */}
        {isOpponentStatsOpen && (
          <div 
            ref={submenuRef}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`pointer-events-auto w-[310px] sm:w-[340px] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-3 transition-all duration-300 animate-slideDown`}
          >
            {/* Header info */}
            {!isMultiplayer ? (
              <div className="text-center py-4">
                <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Modo Solo</p>
                <p className="text-[9px] text-zinc-500 mt-1">Estatísticas do ranking e confronto direto só estão disponíveis em partidas Multiplayer.</p>
              </div>
            ) : !opponentProfile ? (
              <div className="py-6 flex flex-col items-center justify-center gap-1.5">
                <svg className="animate-spin w-4.5 h-4.5 text-cyan-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span className="text-[9px] font-bold text-zinc-650 uppercase tracking-widest">Carregando dados do rival...</span>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2 text-left">
                    <div className="relative">
                      <img src={opponentProfile.photoURL || opponentInfo?.photoURL} alt="" className="w-8 h-8 rounded-full border border-zinc-850 object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute -bottom-1 -right-1 bg-purple-950 border border-purple-805 text-purple-400 font-black text-[8px] px-1 py-0.5 rounded-full">
                        #{oppRankPosition}
                      </span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-[11px] font-black text-zinc-200 uppercase tracking-wide truncate max-w-[140px]">
                        {opponentProfile.displayName || opponentProfile.username || opponentInfo?.displayName}
                      </h4>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{opponentProfile.points || 0} PTS Geral</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { SoundManager.playUIClick(); setIsOpponentStatsOpen(false); setIsExpanded(false); }}
                    className="text-zinc-500 hover:text-zinc-350 text-[11px] p-1 px-2 border border-zinc-900 rounded-md bg-zinc-900/10"
                  >
                    ✕
                  </button>
                </div>

                {/* Tab selector */}
                <div className="flex border border-zinc-900 bg-zinc-900/10 p-0.5 gap-0.5 rounded-lg">
                  <button
                    onClick={() => { SoundManager.playUIClick(); setSubmenuTab('stats'); }}
                    className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all
                      ${submenuTab === 'stats' 
                        ? 'bg-zinc-900 border border-zinc-800 text-cyan-400' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }
                    `}
                  >
                    <Activity size={10} />
                    Estatísticas
                  </button>
                  <button
                    onClick={() => { SoundManager.playUIClick(); setSubmenuTab('h2h'); }}
                    className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all
                      ${submenuTab === 'h2h' 
                        ? 'bg-zinc-900 border border-zinc-800 text-purple-400' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }
                    `}
                  >
                    <Swords size={10} />
                    Confrontos H2H
                  </button>
                </div>

                {/* Tab contents */}
                {submenuTab === 'stats' ? (
                  <div className="space-y-3 animate-scaleUp">
                    {/* Comparative Table */}
                    <div className="bg-zinc-900/10 border border-zinc-900/80 rounded-xl p-2.5 space-y-2">
                      <div className="grid grid-cols-3 text-center text-[8px] font-black uppercase tracking-wider text-zinc-550 pb-1 border-b border-zinc-900">
                        <span className="truncate">VOCÊ</span>
                        <span className="text-zinc-400">ESTATÍSTICA</span>
                        <span className="truncate">OPONENTE</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">POSIÇÃO RANKING</span>
                          {renderCompare(myRankPosition === '--' ? 999 : Number(myRankPosition), oppRankPosition === '--' ? 999 : Number(oppRankPosition), false, true)}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">PONTOS</span>
                          {renderCompare(myProfile?.points || 0, opponentProfile.points || 0)}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">APROVEITAMENTO GERAL</span>
                          {renderCompare(myPerf, oppPerf, true)}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">VITÓRIAS</span>
                          {renderCompare(myProfile?.wins || 0, opponentProfile.wins || 0)}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">DERROTAS (MENOR É MELHOR)</span>
                          {renderCompare(myProfile?.losses || 0, opponentProfile.losses || 0, false, true)}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">GOLS MARCADOS</span>
                          {renderCompare(myProfile?.goalsScored || 0, opponentProfile.goalsScored || 0)}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block text-center">GOLS SOFRIDOS (MENOR É MELHOR)</span>
                          {renderCompare(myProfile?.goalsConceded || 0, opponentProfile.goalsConceded || 0, false, true)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-scaleUp">
                    {/* H2H Balance Board */}
                    <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-2.5 space-y-2">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block text-center">Saldo de Confrontos Diretos</span>
                      <div className="grid grid-cols-3 gap-1.5 text-center items-center">
                        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-1.5">
                          <span className="text-[7px] font-black text-zinc-550 uppercase tracking-wider block">Suas Vitórias</span>
                          <span className="text-xs font-black text-emerald-450">{h2hWins}</span>
                        </div>
                        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-1.5">
                          <span className="text-[7px] font-black text-zinc-550 uppercase tracking-wider block">Empates</span>
                          <span className="text-xs font-black text-zinc-400">{h2hDraws}</span>
                        </div>
                        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-1.5">
                          <span className="text-[7px] font-black text-zinc-550 uppercase tracking-wider block">Suas Derrotas</span>
                          <span className="text-xs font-black text-rose-455">{h2hLosses}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 border-t border-zinc-900 pt-1.5">
                        <span>Aproveitamento H2H:</span>
                        <span className="text-purple-400 font-black">
                          {h2hMatches.length > 0 
                            ? `${((h2hWins * 3 + h2hDraws) / (h2hMatches.length * 3) * 100).toFixed(1)}%` 
                            : '0.0%'
                          }
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400">
                        <span>Saldo de Gols H2H:</span>
                        <span className={`font-black ${h2hGoalsScored - h2hGoalsConceded >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                          {h2hGoalsScored} GP x {h2hGoalsConceded} GC
                        </span>
                      </div>
                    </div>

                    {/* H2H Matches list */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block text-left text-zinc-400">Partidas Diretas Recentes</span>
                      {h2hMatches.length > 0 ? (
                        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
                          {h2hMatches.slice(0, 3).map((match: any) => {
                            const isWin = match.result === 'WIN';
                            const isDraw = match.result === 'DRAW';
                            const outcomeColor = isWin 
                              ? 'border-emerald-500/10 bg-emerald-950/5 text-emerald-450' 
                              : isDraw 
                                ? 'border-zinc-900 bg-zinc-900/10 text-zinc-400' 
                                : 'border-rose-500/10 bg-rose-950/5 text-rose-455';
                            
                            return (
                              <div 
                                key={match.id}
                                className={`border flex justify-between items-center p-2 rounded-lg text-left text-[9px] ${outcomeColor}`}
                              >
                                <div>
                                  <span className="text-[7px] font-bold text-zinc-550 uppercase flex items-center gap-0.5 mb-0.5">
                                    <Calendar size={8} /> {new Date(match.timestamp).toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-450 truncate max-w-[150px] block">
                                    {match.isTournament ? 'Campeonato Copa' : 'Liga Regular'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800/80 px-2 py-0.5 rounded font-black text-[9px] tabular-nums text-white">
                                  <span className={isWin ? 'text-emerald-400' : 'text-zinc-400'}>{match.myGoals}</span>
                                  <span className="text-zinc-700">:</span>
                                  <span className={!isWin && !isDraw ? 'text-rose-455' : 'text-zinc-400'}>{match.opponentGoals}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-4 bg-zinc-900/10 border border-zinc-900 rounded-xl text-center flex flex-col items-center justify-center text-zinc-650 font-bold">
                          <Swords size={14} className="opacity-30 mb-0.5" />
                          <span className="text-[8.5px] font-semibold text-zinc-500">Nenhum confronto ainda.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* TV-Broadcast-style Game Timer Pill */}
      <div className={`hud-timer-pill pointer-events-auto flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl text-[10px] md:text-xs font-black tracking-wide uppercase ${isMobile ? 'px-2.5 py-1 gap-1 text-[9px]' : 'px-4 py-2 md:px-5 md:py-2.5 gap-3 md:gap-4'}`}>
        {phase === GamePhase.PREPARATION ? (
          <div className={`flex items-center gap-1.5 ${isMultiplayer && !isReady && prepTimer !== null && prepTimer <= 15 ? 'text-rose-450 animate-pulse' : 'text-emerald-400'}`}>
            <Clock size={isMobile ? 11 : 14} className={isMultiplayer && !isReady && prepTimer !== null && prepTimer <= 15 ? 'animate-bounce text-rose-500' : 'animate-pulse text-emerald-400'} />
            <span className="tracking-wider text-[9px] md:text-xs font-black">
              {isMultiplayer ? (
                isReady ? (
                  isMobile 
                    ? `PRONTO! (${prepTimer !== null ? formatTime(prepTimer) : '--:--'})` 
                    : `PRONTO! AGUARDANDO RIVAL... (${prepTimer !== null ? formatTime(prepTimer) : '--:--'})`
                ) : (
                  prepTimer !== null ? `PREPARAÇÃO: ${formatTime(prepTimer)}` : 'PREPARAÇÃO'
                )
              ) : (
                isMobile ? 'PREPARAÇÃO' : 'PREPARAÇÃO TÁTICA (ILIMITADA)'
              )}
            </span>
          </div>
        ) : (
          <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2.5 md:gap-4'} text-zinc-300`}>
            {/* Game Time (MM:SS / TotalMM:SS) */}
            <div className={`flex items-center gap-1.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 text-cyan-400 shadow-inner ${isMobile ? 'px-2 py-0.5' : 'px-3 py-1'}`}>
              <Clock size={isMobile ? 10 : 12} className="text-cyan-500 animate-pulse" />
              <span className={`font-black tracking-widest ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>
                {formatTime(gameTimeSeconds)} <span className="opacity-40 text-zinc-550 font-medium">/</span> {formatTime(matchDuration)}
              </span>
            </div>
            
            {/* Status Indicator */}
            <div className={`${isMobile ? 'hidden' : 'hidden sm:block'} text-[10px] font-bold text-zinc-550 border-l border-zinc-800 pl-4 uppercase flex items-center gap-1.5`}>
              {isBallMoving ? (
                <span className="text-emerald-400 flex items-center gap-1 text-[9px] md:text-xs font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping"></span>
                  BOLA EM JOGO
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 text-[9px] md:text-xs font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-pulse"></span>
                  TEMPO PARADO
                </span>
              )}
            </div>
            
            {/* Active Turn Signal */}
            <div className={`${isMobile ? '' : 'sm:border-l sm:border-zinc-800 sm:pl-4'} flex items-center`}>
              {turn === myRole ? (
                <span className="text-emerald-400 animate-pulse flex items-center gap-1 text-[9px] md:text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping"></span>
                  <span>SUA VEZ!</span>
                </span>
              ) : (
                <span className="text-amber-500 animate-pulse flex items-center gap-1 text-[9px] md:text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-ping"></span>
                  <span>OPONENTE...</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HUDHeader;
