import React from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { GamePhase } from '../../types';
import { Trophy, Shield, RotateCcw, ShieldAlert } from 'lucide-react';

const HUDOverlays: React.FC = () => {
  const {
    phase,
    ball,
    scores,
    gameTime,
    resetMatch,
    opponentDisconnected,
    disconnectCountdown,
  } = useGameStateContext();

  return (
    <>
      {/* E. HUD OVERLAY - GOAL CELEBRATION */}
      {phase === GamePhase.GOAL_CELEBRATION && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_60%)] animate-pulse"></div>
          
          <div className="relative flex flex-col items-center text-center space-y-4 animate-scaleUp">
            <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.6em] text-yellow-400 animate-bounce">
              GOLAÇOOO!
            </span>
            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase text-white bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)] leading-none select-none">
              GOL!!!
            </h1>
            <p className="text-sm md:text-base text-cyan-400 font-black tracking-widest uppercase bg-cyan-950/60 px-5 py-2 md:px-6 md:py-2.5 rounded-full border border-cyan-800/40 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              {ball.possession === 'HOME' ? 'TIME DA CASA MARCOU' : 'TIME VISITANTE MARCOU!'}
            </p>
            <p className="text-[10px] md:text-xs text-zinc-400 max-w-[280px] md:max-w-xs font-medium">
              Os jogadores continuam onde pararam. O capitão do time adversário se posicionará no centro para dar a saída!
            </p>
          </div>
        </div>
      )}

      {/* F. HUD OVERLAY - GAME OVER */}
      {phase === GamePhase.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-zinc-950/95 backdrop-blur-md">
          {scores.home >= 3 || (scores.home > scores.away && gameTime >= 90) ? (
            <div className="absolute w-[450px] h-[450px] bg-yellow-500/10 rounded-full blur-[150px] animate-pulse"></div>
          ) : (
            <div className="absolute w-[450px] h-[450px] bg-rose-500/10 rounded-full blur-[150px] animate-pulse"></div>
          )}

          <div className="relative max-w-md w-full text-center space-y-6 flex flex-col items-center animate-scaleUp">
            {scores.home >= 3 || (scores.home > scores.away && gameTime >= 90) ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-4 shadow-[0_0_30px_rgba(241,196,15,0.2)]">
                  <Trophy size={42} />
                </div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent leading-none">
                  VENCEDOR!
                </h1>
                <p className="text-zinc-400 text-xs mt-2 font-medium tracking-wide">
                  Parabéns! Você dominou o campo e garantiu a sua taça de campeão.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(229,80,57,0.2)]">
                  <Shield size={42} />
                </div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-rose-400 to-red-600 bg-clip-text text-transparent leading-none">
                  DERROTA
                </h1>
                <p className="text-zinc-400 text-xs mt-2 font-medium tracking-wide">
                  Não desanime! Ajuste sua estratégia, refine a mira e peteleque novamente.
                </p>
              </div>
            )}

            {/* Score Summary Box */}
            <div className="w-full p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-2">
                Placar Final
              </span>
              <div className="flex justify-center items-center gap-6 font-black text-4xl tabular-nums">
                <span className="text-blue-400">{scores.home}</span>
                <span className="text-zinc-650 text-2xl">:</span>
                <span className="text-orange-400">{scores.away}</span>
              </div>
            </div>

            {/* Action buttons */}
            <button 
              onClick={resetMatch}
              className="w-full py-4.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.4)] transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs"
            >
              <RotateCcw size={14} />
              VOLTAR AO MENU PRINCIPAL
            </button>
          </div>
        </div>
      )}

      {/* G. OPPONENT CONNECTION LOST OVERLAY */}
      {opponentDisconnected && phase !== GamePhase.MENU && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)] text-center space-y-6 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto animate-pulse">
              <ShieldAlert size={36} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-black tracking-wide text-rose-400 uppercase">CONEXÃO DO ADVERSÁRIO PERDIDA</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                O oponente perdeu a conexão com os servidores do Firebase. Aguardando reconexão...
              </p>
            </div>

            {/* Pulsing countdown timer */}
            <div className="bg-zinc-950 border border-zinc-800 py-4 px-6 rounded-2xl w-fit mx-auto">
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-1">A IA assumirá em</span>
              <span className="text-3xl font-black text-rose-500 tabular-nums animate-pulse">{disconnectCountdown}s</span>
            </div>

            <p className="text-[10px] text-zinc-550 italic font-semibold">
              * Você não perderá pontos ou progresso caso decida aguardar ou continuar contra a IA!
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default HUDOverlays;
