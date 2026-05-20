import React from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { Difficulty } from '../../types';
import { Trophy, Play } from 'lucide-react';

const SoloTab: React.FC = () => {
  const { difficulty, setDifficulty, startGame } = useGameStateContext();

  return (
    <div className="w-full max-w-xl mx-auto backdrop-blur-md bg-zinc-900/50 border border-zinc-800 shadow-2xl rounded-3xl p-6 space-y-6 animate-scaleUp">
      <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400">DESAFIE A INTELIGÊNCIA ARTIFICIAL</h3>
      
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
              rounded-2xl border font-black transition-all duration-300 transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center p-4 gap-2
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

      <button 
        onClick={() => startGame(difficulty)}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.4)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.55)] transform transition-all active:scale-98 flex items-center justify-center gap-2 py-4 text-sm"
      >
        <Play size={18} />
        INICIAR DESAFIO SOLO
      </button>
    </div>
  );
};

export default SoloTab;
