import React, { useState, useEffect, useRef } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { GamePhase } from '../../types';
import { RotateCcw, Minimize2, Maximize2, Clock } from 'lucide-react';

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
    consecutiveGoalsCount
  } = useGameStateContext();

  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside scoreboard pill collapses expanded team names
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
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
    <div className={`absolute top-0 left-0 w-full z-10 flex justify-between items-start pointer-events-none animate-fadeIn ${isMobile ? 'p-2 flex-row gap-2' : 'p-4 md:p-6 flex-col md:flex-row gap-2 md:gap-4'}`}>
      
      {/* Main Scoreboard Pill */}
      <div className={`hud-scoreboard-pill pointer-events-auto flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl transition-all duration-300 ${isMobile ? 'px-2.5 py-1 gap-1 text-[10px]' : 'px-3 md:px-5 py-1.5 md:py-2.5 gap-1.5 md:gap-3'}`}>
        <button 
          onClick={resetMatch}
          className={`text-zinc-400 hover:text-rose-400 transition-colors rounded-full hover:bg-zinc-800/80 ${isMobile ? 'p-0.5 mr-0.5' : 'p-1 md:p-1.5 mr-1.5 md:mr-3'}`}
          title="Voltar ao Menu"
        >
          <RotateCcw size={isMobile ? 12 : 15} />
        </button>

        {/* Integrated Premium Glassmorphic Fullscreen Button in Scoreboard */}
        <button 
          onClick={toggleFullscreen}
          className={`text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all duration-300 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 relative group pointer-events-auto ${isMobile ? 'p-0.5 mr-1' : 'p-1.5 mr-2.5 md:mr-4'}`}
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
          onClick={() => setIsExpanded(prev => !prev)}
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

      {/* TV-Broadcast-style Game Timer Pill */}
      <div className={`hud-timer-pill pointer-events-auto flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl text-[10px] md:text-xs font-black tracking-wide uppercase ${isMobile ? 'px-2.5 py-1 gap-1 text-[9px]' : 'px-4 py-2 md:px-5 md:py-2.5 gap-3 md:gap-4'}`}>
        {phase === GamePhase.PREPARATION ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Clock size={isMobile ? 11 : 14} className="animate-pulse text-emerald-400" />
            <span className="tracking-wider text-[9px] md:text-xs">
              {isMobile ? 'PREPARAÇÃO' : (
                <>
                  PREPARAÇÃO TÁTICA{' '}
                  {isMultiplayer ? '(AGUARDANDO CONFIRMAÇÃO)' : '(ILIMITADA)'}
                </>
              )}
            </span>
          </div>
        ) : (
          <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2.5 md:gap-4'} text-zinc-300`}>
            {/* Game Time (Minutes) */}
            <div className={`flex items-center gap-1 bg-zinc-950/60 rounded-full border border-zinc-800/50 text-cyan-400 shadow-inner ${isMobile ? 'px-1.5 py-0.5' : 'px-2 py-0.5 md:px-3 md:py-1'}`}>
              <Clock size={isMobile ? 10 : 12} className="text-cyan-500" />
              <span className={`font-black tracking-widest ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>{gameTime}'</span>
            </div>
            
            {/* Round Counter */}
            <div className={`${isMobile ? 'hidden' : 'hidden sm:block'} text-[10px] font-bold text-zinc-500 border-l border-zinc-800 pl-4 uppercase`}>
              Rodada <span className="text-zinc-300 font-black">{Math.floor(gameTime / 5) + 1}</span> de <span className="text-zinc-300 font-black">18</span>
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
