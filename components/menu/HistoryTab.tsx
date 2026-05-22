import React from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Calendar, History } from 'lucide-react';

const HistoryTab: React.FC = () => {
  const { matchHistory } = useGameStateContext();
  const isMobile = useIsMobile();

  return (
    <div className={`w-full h-full flex flex-col justify-start items-stretch animate-scaleUp ${isMobile ? 'gap-1.5' : 'gap-4'}`}>
      
      {/* Header Box superior em verde esmeralda */}
      <div className={`w-full flex flex-row justify-between items-center bg-zinc-900/40 border border-zinc-800/60 text-left flex-shrink-0
        ${isMobile ? 'p-2 rounded-xl gap-2' : 'p-4 rounded-2xl gap-3'}
      `}>
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-emerald-400 text-left uppercase tracking-wide">Suas Últimas Pelejas</h3>
          <p className={`text-[9px] text-zinc-550 text-left ${isMobile ? 'hidden' : 'block'}`}>Histórico de confrontos e conquistas nas arenas</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-800/30 px-3 py-1.5 rounded-xl text-[9.5px] sm:text-xs font-black tracking-wider text-emerald-400">
          <History size={12} />
          <span>HISTÓRICO</span>
        </div>
      </div>

      {/* Contêiner inferior que envolve a lista ou o estado vazio */}
      <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-3 flex-grow flex flex-col justify-start items-stretch min-h-0 relative overflow-hidden">
        {matchHistory.length > 0 ? (
          <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-1.5 text-left">
            {matchHistory.map((match: any) => {
              const isWin = match.result === 'WIN';
              const isDraw = match.result === 'DRAW';
              const outcomeColor = isWin 
                ? 'border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.1)] bg-emerald-950/10 text-emerald-400' 
                : isDraw 
                  ? 'border-zinc-800 text-zinc-400 bg-zinc-900/30' 
                  : 'border-rose-500/40 text-rose-400 bg-rose-950/10';
              
              return (
                <div 
                  key={match.id}
                  className={`border flex justify-between items-center transition-all shadow-inner
                    ${isMobile ? 'p-1 px-2.5 rounded-lg' : 'p-4 rounded-xl'}
                    ${outcomeColor}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img src={match.opponentPhoto} alt="" className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} rounded-full border border-zinc-850`} />
                      <span className={`absolute -bottom-1 -right-1 text-[5.5px] font-black px-1 py-0.5 rounded ${match.isTournament ? 'bg-yellow-950 border border-yellow-800 text-yellow-400' : 'bg-indigo-950 border border-indigo-800 text-indigo-400'}`}>
                        {match.isTournament ? 'COPA' : 'LIGA'}
                      </span>
                    </div>
                    
                    <div className="text-left">
                      <h4 className="text-[9px] sm:text-xs font-black uppercase truncate max-w-[80px] sm:max-w-[120px]">{match.opponentName}</h4>
                      <span className="text-[7px] font-bold text-zinc-555 uppercase flex items-center gap-0.5 mt-0.5">
                        <Calendar size={8} /> {new Date(match.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Placar Box */}
                  <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800/80 px-2 py-0.5 rounded-lg font-black text-[9px] sm:text-[10px] tabular-nums text-white">
                    <span className={isWin ? 'text-emerald-400' : 'text-zinc-400'}>{match.myGoals}</span>
                    <span className="text-zinc-650">:</span>
                    <span className={!isWin && !isDraw ? 'text-rose-450' : 'text-zinc-400'}>{match.opponentGoals}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-zinc-500 font-bold py-6 sm:py-12">
            <History size={isMobile ? 20 : 28} className="opacity-30 mb-1" />
            <span className="text-[10px] sm:text-xs font-semibold">Nenhuma partida registrada</span>
            <span className="text-[8px] sm:text-[10px] text-zinc-655 font-medium">Jogue partidas para gravar sua história no Dedobol!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
