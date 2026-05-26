import React, { useState } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { Difficulty } from '../../types';
import { Trophy, Play, Clock, Zap, Sliders } from 'lucide-react';

const SoloTab: React.FC = () => {
  const { difficulty, setDifficulty, startGame, matchDuration, setMatchDuration, gameMode, setGameMode } = useGameStateContext();
  const [isModeSelected, setIsModeSelected] = useState(false);

  if (!isModeSelected) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-4 md:space-y-4.5 animate-scaleUp">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-cyan-400">DESAFIE A INTELIGÊNCIA ARTIFICIAL</h3>
        
        <div className="space-y-2">
          <h4 className="text-[9.5px] font-black uppercase tracking-widest text-zinc-450 text-left">FÍSICA DA PARTIDA</h4>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'standard', label: 'MODO PADRÃO', desc: 'Física clássica e veloz', icon: Zap },
              { id: 'manual', label: 'MODO MANUAL', desc: 'Sem ganho de velocidade', icon: Sliders }
            ].map((modeOpt) => {
              const Icon = modeOpt.icon;
              return (
                <button
                  key={modeOpt.id}
                  onClick={() => {
                    setGameMode(modeOpt.id as 'standard' | 'manual');
                    setIsModeSelected(true);
                  }}
                  className="rounded-2xl border font-black transition-all duration-300 transform hover:scale-103 active:scale-97 flex flex-col items-center justify-center py-4 px-3 gap-1.5 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800/30"
                >
                  <Icon size={16} className={modeOpt.id === 'standard' ? 'text-cyan-400' : 'text-orange-400'} />
                  <span className="text-xs tracking-wide">{modeOpt.label}</span>
                  <span className="text-[8px] font-medium text-zinc-500 leading-none">{modeOpt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 md:space-y-4.5 animate-scaleUp">
      <div className="flex items-center justify-between">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-cyan-400">DESAFIE A INTELIGÊNCIA ARTIFICIAL</h3>
        <button
          onClick={() => setIsModeSelected(false)}
          className="text-[9px] font-black text-zinc-550 hover:text-cyan-400 transition-colors uppercase tracking-widest flex items-center gap-1"
        >
          <span>&larr;</span> Voltar
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-[9.5px] font-black uppercase tracking-widest text-zinc-450 text-left">Dificuldade da IA</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: Difficulty.EASY, label: 'FÁCIL', desc: 'IA com rebote instável', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/10' },
            { id: Difficulty.MEDIUM, label: 'MÉDIO', desc: 'IA competitiva', color: 'border-amber-500/40 text-amber-400 bg-amber-950/10' },
            { id: Difficulty.HARD, label: 'DIFÍCIL', desc: 'IA com precisão cirúrgica', color: 'border-rose-500/40 text-rose-400 bg-rose-950/10' }
          ].map((diff) => (
            <button
              key={diff.id}
              onClick={() => setDifficulty(diff.id)}
              className={`
                rounded-2xl border font-black transition-all duration-300 transform hover:scale-103 active:scale-97 flex flex-col items-center justify-center py-3 px-3 gap-1.5
                ${difficulty === diff.id 
                  ? `${diff.color} ring-2 ring-white/10 shadow-lg` 
                  : 'border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800/30'
                }
              `}
            >
              <Trophy size={16} className={difficulty === diff.id ? 'animate-bounce text-cyan-400' : 'opacity-40'} />
              <span className="text-xs tracking-wide">{diff.label}</span>
              <span className="text-[8px] font-medium text-zinc-500 leading-none">{diff.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[9.5px] font-black uppercase tracking-widest text-zinc-450 text-left">Duração do Jogo (Tempo de Bola Rolando)</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 60, label: '1 MINUTO', desc: 'Partida Relâmpago' },
            { id: 180, label: '3 MINUTOS', desc: 'Tempo Clássico' },
            { id: 300, label: '5 MINUTOS', desc: 'Guerra Tática' }
          ].map((timeOpt) => (
            <button
              key={timeOpt.id}
              onClick={() => setMatchDuration(timeOpt.id)}
              className={`
                rounded-2xl border font-black transition-all duration-300 transform hover:scale-103 active:scale-97 flex flex-col items-center justify-center py-3 px-3 gap-1.5
                ${matchDuration === timeOpt.id 
                  ? 'border-cyan-500/40 text-cyan-400 bg-cyan-950/10 ring-2 ring-white/10 shadow-lg' 
                  : 'border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800/30'
                }
              `}
            >
              <Clock size={16} className={matchDuration === timeOpt.id ? 'text-cyan-400' : 'opacity-40'} />
              <span className="text-xs tracking-wide">{timeOpt.label}</span>
              <span className="text-[8px] font-medium text-zinc-500 leading-none">{timeOpt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={() => startGame(difficulty, gameMode)}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.4)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.55)] transform transition-all active:scale-98 flex items-center justify-center gap-2 py-3 text-xs md:text-sm"
      >
        <Play size={16} />
        INICIAR DESAFIO SOLO
      </button>
    </div>
  );
};

export default SoloTab;
