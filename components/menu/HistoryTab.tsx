import React from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Calendar, History } from 'lucide-react';

const HistoryTab: React.FC = () => {
  const { matchHistory } = useGameStateContext();
  const isMobile = useIsMobile();

  return (
    <div className={`w-full ${isMobile ? 'space-y-1' : 'space-y-4'} animate-scaleUp`}>
      <h3 className="text-[10px] font-black tracking-widest text-emerald-400 uppercase text-left">Suas Últimas Pelejas</h3>
      
      <div className={`grid grid-cols-1 gap-1 overflow-y-auto pr-1
        ${isMobile ? 'max-h-[220px]' : 'max-h-[350px]'}
      `}>
        {matchHistory.length > 0 ? (
          matchHistory.map((match: any) => {
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
          })
        ) : (
          <div className="py-6 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 font-bold w-full">
            <History size={16} className="text-zinc-650 mb-1" />
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-555">Nenhuma partida registrada</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
