import React from 'react';
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
    homeFlicksRemaining,
    awayFlicksRemaining,
    gameTime,
    resetMatch
  } = useGameStateContext();

  const isMobile = useIsMobile();

  if (phase === GamePhase.MENU) return null;

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

        {/* Home Team & Flick Indicators */}
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-3'}`}>
          <span className={`rounded-full bg-blue-600 shadow-[0_0_10px_rgba(30,55,153,0.5)] ${turn === 'HOME' ? 'animate-pulse ring-2 ring-white/30' : ''} ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5 md:w-3 md:h-3'}`}></span>
          <span className={`font-black tracking-wider uppercase transition-colors duration-300 ${turn === 'HOME' ? 'text-blue-400' : 'text-zinc-400'} ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>
            {isMobile ? 'CASA' : (isMultiplayer ? (myRole === 'HOME' ? 'CASA (VOCÊ)' : 'CASA') : 'CASA')}
          </span>
          
          {/* Home Flicks remaining */}
          <div className={`flex items-center ml-0.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 ${isMobile ? 'gap-0.5 px-1 py-0.5' : 'gap-1 md:gap-1.5 px-1.5 py-1 md:px-2.5 md:py-1.5'}`}>
            {[1, 2, 3].map(i => (
              <span 
                key={i} 
                className={`rounded-full transition-all duration-300 ${
                  i <= homeFlicksRemaining 
                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                    : 'bg-zinc-800'
                } ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5 md:w-2 md:h-2'}`}
              />
            ))}
          </div>
        </div>

        {/* Score Numbers */}
        <div className={`flex items-center bg-zinc-950 border border-zinc-800/80 rounded-full font-black tabular-nums tracking-widest text-white shadow-inner ${isMobile ? 'mx-1 px-2 py-0.5 text-xs' : 'mx-2 md:mx-5 px-2.5 py-1 md:px-4 md:py-1.5 text-sm md:text-base'}`}>
          <span className="text-blue-400">{scores.home}</span>
          <span className={`text-zinc-650 ${isMobile ? 'mx-0.5' : 'mx-1 md:mx-2'}`}>:</span>
          <span className="text-orange-400">{scores.away}</span>
        </div>

        {/* Away Team & Flick Indicators */}
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-3'}`}>
          {/* Away Flicks remaining */}
          <div className={`flex items-center mr-0.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 ${isMobile ? 'gap-0.5 px-1 py-0.5' : 'gap-1 md:gap-1.5 px-1.5 py-1 md:px-2.5 md:py-1.5'}`}>
            {[1, 2, 3].map(i => (
              <span 
                key={i} 
                className={`rounded-full transition-all duration-300 ${
                  i <= awayFlicksRemaining 
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(241,196,15,0.8)]' 
                    : 'bg-zinc-800'
                } ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5 md:w-2 md:h-2'}`}
              />
            ))}
          </div>
          <span className={`font-black tracking-wider uppercase transition-colors duration-300 ${turn === 'AWAY' ? 'text-orange-400' : 'text-zinc-400'} ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>
            {isMobile ? (
              isMultiplayer ? (opponentInfo ? opponentInfo.displayName.substring(0, 5).toUpperCase() : 'OPO') : 'I.A.'
            ) : (
              isMultiplayer ? (myRole === 'AWAY' ? 'OPONENTE (VOCÊ)' : (opponentInfo ? opponentInfo.displayName : 'OPONENTE')) : 'INTELIGÊNCIA ARTIFICIAL'
            )}
          </span>
          <span className={`rounded-full bg-orange-600 shadow-[0_0_10px_rgba(229,80,57,0.5)] ${turn === 'AWAY' ? 'animate-pulse ring-2 ring-white/30' : ''} ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5 md:w-3 md:h-3'}`}></span>
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
