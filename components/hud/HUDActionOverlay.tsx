import React from 'react';
import { useGameStateContext } from '../../GameStateContext';

const HUDActionOverlay: React.FC = () => {
  const {
    selectedPlayerId,
    turn,
    myRole,
    actionStatus,
    isIAThinking,
  } = useGameStateContext();

  const isFoul = actionStatus.startsWith('Falta!');
  const isBallSelected = selectedPlayerId === 'ball';

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4 pointer-events-none flex flex-col items-center gap-3 animate-fadeIn">
      {/* Premium Ball Selection Guide Card */}
      {isBallSelected && turn === myRole && (
        <div className="pointer-events-auto w-full bg-zinc-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-[0_10px_40px_rgba(6,182,212,0.25)] transition-all duration-300 animate-scaleUp">
          <div className="flex flex-col space-y-2 md:space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2 md:pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
                  ⚽
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-black tracking-wider uppercase text-zinc-100">BOLA DE JOGO</h3>
                  <span className="inline-flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-900/40 mt-0.5 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                    SELECIONADA
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] md:text-xs text-zinc-300 leading-relaxed font-semibold text-center py-0.5 md:py-1">
              🎯 Clique na bola, puxe para trás (estilingue) e solte para dar o peteleco!
            </p>
          </div>
        </div>
      )}

      <div className={`pointer-events-auto w-full bg-zinc-950/90 backdrop-blur-md border p-3.5 md:p-4.5 rounded-xl md:rounded-2xl text-center flex flex-col items-center space-y-1 transition-all duration-300 ${
        isFoul 
          ? 'border-rose-600/70 shadow-[0_0_25px_rgba(225,29,72,0.25)] animate-pulse' 
          : 'border-zinc-800/80 shadow-2xl'
      }`}>
        <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${
          isFoul ? 'text-rose-500' : 'text-cyan-400'
        }`}>
          {isFoul ? '⚠️ INFRAÇÃO DETECTADA' : 'INFORMAÇÕES DE CAMPO'}
        </span>
        <p className="text-[11px] md:text-xs text-zinc-300 font-semibold leading-relaxed">
          {actionStatus}
        </p>
        {isIAThinking && (
          <div className="w-16 h-1 mt-2 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 animate-loadingBar rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HUDActionOverlay;
