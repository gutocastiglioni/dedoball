import React from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Crown, Award } from 'lucide-react';

const RankingTab: React.FC = () => {
  const { leaderboard } = useGameStateContext();
  const isMobile = useIsMobile();

  return (
    <div className={`w-full animate-scaleUp ${isMobile ? 'space-y-1.5' : 'space-y-6'}`}>
      
      {/* PODIUM GRAPHIC (TOP 3) - LATERALIZED AT 90 DEGREES */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-2 pt-2 pb-1.5 px-1 animate-scaleUp">
        
        {/* Podium 1st Place */}
        {leaderboard[0] ? (
          <div className="relative flex items-start gap-3 bg-zinc-950/20 border border-yellow-500/10 rounded-2xl p-2 sm:p-2.5 hover:border-yellow-500/20 transition-all duration-300 shadow-[0_0_12px_rgba(234,179,8,0.02)]">
            {/* Profile Top-Left */}
            <div className="relative flex-shrink-0">
              <Crown size={12} className="text-yellow-400 absolute -top-3.5 left-1/2 -translate-x-1/2 animate-bounce drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]" />
              <img 
                src={leaderboard[0].photoURL} 
                alt="" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] object-cover" 
                referrerPolicy="no-referrer"
              />
              <span className="absolute -top-1 -right-1 bg-yellow-500 border border-yellow-400 text-zinc-950 font-black text-[8px] sm:text-[9.5px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">1</span>
            </div>
            
            {/* Horizontal Bar (90 degrees from image) */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-10 sm:h-12 py-0.5">
              <span className="text-[9.5px] sm:text-xs font-black text-yellow-400 truncate uppercase tracking-wide">
                {leaderboard[0].displayName}
              </span>
              <div className="relative w-full bg-zinc-950 border border-yellow-500/20 rounded-lg h-5 sm:h-6 overflow-hidden flex items-center justify-between px-2.5 shadow-inner">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-yellow-500/10 to-yellow-500/30 border-r-2 border-yellow-400/60 shadow-[0_0_8px_rgba(234,179,8,0.2)]"
                  style={{ width: '100%' }}
                />
                <span className="relative z-10 text-[9.5px] sm:text-xs font-black text-yellow-400 tracking-wider uppercase animate-pulse">
                  {leaderboard[0].points} pts
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-1" />
        )}

        {/* Podium 2nd Place */}
        {leaderboard[1] ? (
          <div className="relative flex items-start gap-3 bg-zinc-950/20 border border-slate-500/10 rounded-2xl p-2 sm:p-2.5 hover:border-slate-500/20 transition-all duration-300 shadow-[0_0_12px_rgba(148,163,184,0.02)]">
            {/* Profile Top-Left */}
            <div className="relative flex-shrink-0">
              <img 
                src={leaderboard[1].photoURL} 
                alt="" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.2)] object-cover" 
                referrerPolicy="no-referrer"
              />
              <span className="absolute -top-1 -right-1 bg-slate-500 border border-slate-400 text-white font-black text-[8px] sm:text-[9.5px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">2</span>
            </div>
            
            {/* Horizontal Bar (90 degrees from image) */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-10 sm:h-12 py-0.5">
              <span className="text-[9.5px] sm:text-xs font-black text-zinc-400 truncate uppercase tracking-wide">
                {leaderboard[1].displayName}
              </span>
              <div className="relative w-[85%] bg-zinc-950 border border-slate-500/20 rounded-lg h-5 sm:h-6 overflow-hidden flex items-center justify-between px-2.5 shadow-inner">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-slate-500/10 to-slate-500/20 border-r-2 border-slate-400/50"
                  style={{ width: '100%' }}
                />
                <span className="relative z-10 text-[9px] sm:text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  {leaderboard[1].points} pts
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-1" />
        )}

        {/* Podium 3rd Place */}
        {leaderboard[2] ? (
          <div className="relative flex items-start gap-3 bg-zinc-950/20 border border-amber-600/10 rounded-2xl p-2 sm:p-2.5 hover:border-amber-600/20 transition-all duration-300 shadow-[0_0_12px_rgba(217,119,6,0.02)]">
            {/* Profile Top-Left */}
            <div className="relative flex-shrink-0">
              <img 
                src={leaderboard[2].photoURL} 
                alt="" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.2)] object-cover" 
                referrerPolicy="no-referrer"
              />
              <span className="absolute -top-1 -right-1 bg-amber-700 border border-amber-600 text-white font-black text-[8px] sm:text-[9.5px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">3</span>
            </div>
            
            {/* Horizontal Bar (90 degrees from image) */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-10 sm:h-12 py-0.5">
              <span className="text-[9.5px] sm:text-xs font-black text-amber-600 truncate uppercase tracking-wide">
                {leaderboard[2].displayName}
              </span>
              <div className="relative w-[70%] bg-zinc-950 border border-amber-600/20 rounded-lg h-5 sm:h-6 overflow-hidden flex items-center justify-between px-2.5 shadow-inner">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600/10 to-amber-600/20 border-r-2 border-amber-500/50"
                  style={{ width: '100%' }}
                />
                <span className="relative z-10 text-[9px] sm:text-[11px] font-black text-amber-550 tracking-wider uppercase">
                  {leaderboard[2].points} pts
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-1" />
        )}

      </div>

      {/* Leaderboard Horizontal Cards List (Position 4+) */}
      <div className={`w-full flex flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin
        ${isMobile ? 'max-w-none max-h-[170px]' : 'max-w-xl mx-auto max-h-[220px]'}
      `}>
        {leaderboard.length > 3 ? (
          leaderboard.slice(3).map((player, idx) => (
            <div 
              key={player.uid} 
              className={`bg-zinc-900/60 border border-zinc-800 flex justify-between items-center hover:border-zinc-700 transition-colors shadow-inner
                ${isMobile ? 'p-2 rounded-xl' : 'p-3 px-4 rounded-2xl'}
              `}
            >
              <div className="flex items-center gap-2">
                {/* Rank Badge */}
                <span className="w-5 h-5 rounded-full bg-zinc-950 border border-zinc-850 flex items-center justify-center text-[8.5px] sm:text-[9.5px] font-black text-zinc-500">
                  {idx + 4}
                </span>
                
                {/* Avatar & Name */}
                <img src={player.photoURL} alt="" className="w-5 h-5 rounded-full border border-zinc-800 object-cover" referrerPolicy="no-referrer" />
                <span className="text-[9.5px] sm:text-xs font-black text-zinc-200 uppercase tracking-wide truncate max-w-[120px] sm:max-w-xs">
                  {player.displayName}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Wins counter */}
                {player.wins > 0 && (
                  <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest hidden xs:block">
                    {player.wins} {player.wins === 1 ? 'Vitória' : 'Vitórias'}
                  </span>
                )}
                {/* Points tag styled like buttons in multi and copa */}
                <span className="px-2.5 py-0.5 bg-purple-950 border border-purple-900 text-purple-400 font-black rounded-lg text-[9px] sm:text-[10px] tracking-wider shadow-inner">
                  {player.points} PTS
                </span>
              </div>
            </div>
          ))
        ) : (
          leaderboard.length <= 3 && (
            <div className="py-6 sm:py-12 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 max-w-xl mx-auto w-full font-bold">
              <Award size={20} className="opacity-30 mb-1" />
              <span className="text-[10px] sm:text-xs font-semibold">Nenhum competidor adicional.</span>
              <span className="text-[8px] sm:text-[10px] text-zinc-655 uppercase tracking-wide mt-0.5 font-medium">Jogue partidas para subir na classificação!</span>
            </div>
          )
        )}
      </div>

    </div>
  );
};

export default RankingTab;
