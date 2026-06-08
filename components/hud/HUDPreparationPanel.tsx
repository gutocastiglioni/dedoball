import React, { useState } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { ActionType } from '../../types';
import { 
  Crown, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Navigation, 
  Target, 
  Shield, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';

const getDegreeAngle = (rad: number) => {
  let deg = Math.round(rad * (180 / Math.PI));
  if (deg > 180) deg -= 360;
  if (deg < -180) deg += 360;
  return deg;
};

const HUDPreparationPanel: React.FC = () => {
  const {
    homePlayers,
    awayPlayers,
    selectedPlayerId,
    updatePlayerAngle,
    updatePlayerActionType,
    updatePlayerBlocking,
    setCaptain,
    completePreparation,
    isCameraCentered,
    recenterCamera,
    myRole,
    lastGoalScorer,
    consecutiveGoalsCount,
    swapPlayerId,
    t
  } = useGameStateContext();

  const [blockingLimitError, setBlockingLimitError] = useState(false);

  // Dynamic player list and blocker limits based on role and fairness rule
  const playersList = myRole === 'AWAY' ? awayPlayers : homePlayers;
  const selectedPlayer = playersList.find(p => p.id === selectedPlayerId);
  const swapPlayer = swapPlayerId ? playersList.find(p => p.id === swapPlayerId) : null;

  const localTeam = myRole === 'AWAY' ? 'AWAY' : 'HOME';
  const opponentTeam = localTeam === 'HOME' ? 'AWAY' : 'HOME';
  const maxBlockers = 3;
  const currentBlockers = playersList.filter(p => p.isBlocking).length;

  const handleAngleChange = (deg: number) => {
    if (!selectedPlayerId) return;
    const rad = deg * (Math.PI / 180);
    updatePlayerAngle(selectedPlayerId, rad);
  };

  const handleActionTypeChange = (playerId: string, actionType: ActionType) => {
    updatePlayerActionType(playerId, actionType);
  };

  return (
    <div className="hud-prep-container absolute bottom-0 left-0 w-full p-3 md:p-6 z-30 flex flex-col landscape:flex-row md:flex-row justify-between items-end gap-3 md:gap-4 pointer-events-none">
      {/* Selected Player Scale Panel Stack */}
      {selectedPlayer && (
        <div className="flex flex-col gap-2 md:gap-2.5 items-start justify-end pointer-events-none animate-scaleUp">
          {/* Reduced Card of Player B (To be replaced) on top */}
          {swapPlayer && (
            <div className="reduced-player-card pointer-events-auto w-[230px] sm:w-[280px] md:w-[340px] bg-zinc-950/90 backdrop-blur-lg border border-emerald-500/60 rounded-2xl p-2 md:p-3 shadow-2xl flex items-center justify-between border-dashed animate-scaleUp">
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-900 border border-emerald-500/50 flex items-center justify-center font-black text-xs text-emerald-300">
                  {swapPlayer.number}
                </div>
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-black text-emerald-450 uppercase tracking-widest leading-none mb-0.5 flex items-center gap-1">
                    {t('hud.playerToBeReplaced')}
                  </span>
                  <span className="text-[11px] font-extrabold text-zinc-300">Nº {swapPlayer.number} — {swapPlayer.isCaptain ? 'Capitão' : 'Jogador de Linha'}</span>
                </div>
              </div>
              <div className="text-[8px] font-black tracking-widest text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2 py-1 rounded-lg uppercase">
                {swapPlayer.number === 1 ? t('hud.gkRole') : t('hud.lineRole')}
              </div>
            </div>
          )}

          {/* Swap icon connecting them */}
          {swapPlayer && (
            <div className="flex items-center justify-center w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-full shadow-lg text-emerald-400 pointer-events-auto z-10 -my-0.5 animate-pulse self-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                <path d="m3 16 4 4 4-4"/>
                <path d="M7 20V4"/>
                <path d="m21 8-4-4-4 4"/>
                <path d="M17 4v16"/>
              </svg>
            </div>
          )}

          {/* Main Selected Player Card (Player A) - Commented out as we now use the floating action panel on field
          <div className={`hud-player-card pointer-events-auto w-[230px] sm:w-[280px] md:w-[340px] bg-zinc-900/90 backdrop-blur-lg border rounded-2xl md:rounded-3xl p-2 md:p-4 shadow-2xl transition-all duration-300 ${swapPlayer ? 'border-rose-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulseGlow' : 'border-zinc-800'}`}>
            <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
              {swapPlayer && (
                <div className="text-[9.5px] text-zinc-300 leading-normal text-center bg-rose-955/20 py-2 px-3 rounded-xl border border-rose-900/30">
                  Clique no <strong>Botão de Nº {swapPlayer.number}</strong> ou em sua base em campo para confirmar a troca de posições!
                </div>
              )}

            <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 md:pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-950 border border-blue-800/50 flex items-center justify-center font-black text-blue-450 shadow-inner">
                  {selectedPlayer.number}
                </div>
                <div className="flex flex-col">
                  <h3 className="hud-player-title text-sm font-black tracking-wider uppercase text-zinc-100">
                    {selectedPlayer.number === 1 ? 'GOLEIRO' : 'JOGADOR EM CAMPO'}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedPlayer.isCaptain ? (
                  <span className="hud-captain-badge text-[9px] font-black text-zinc-950 bg-amber-500 border border-amber-400 px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.45)]">
                    <Crown size={10} fill="currentColor" /> CAPITÃO
                  </span>
                ) : (
                  selectedPlayer.number !== 1 && (
                    <button
                      onClick={() => setCaptain(selectedPlayer.id)}
                      className="text-[9px] font-black text-amber-400 bg-amber-955/20 hover:bg-amber-955/50 border border-amber-800/40 px-2.5 py-1.5 rounded-xl transition-colors pointer-events-auto flex items-center gap-1"
                      title="Definir este jogador como Capitão"
                    >
                      <Crown size={10} /> +CAPITÃO
                    </button>
                  )
                )}
              </div>
            </div>

            {selectedPlayer.number !== 1 && (
              <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
                <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                  <div className="hud-angle-text flex justify-between items-center text-xs text-zinc-400 font-bold uppercase">
                    <span>Direção da Deflexão</span>
                    <span className="text-cyan-400 font-black tracking-widest bg-cyan-950/40 border border-cyan-900/40 px-2.5 py-0.5 rounded">
                      {getDegreeAngle(selectedPlayer.angle)}&deg;
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAngleChange(getDegreeAngle(selectedPlayer.angle) - 15)}
                      className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors pointer-events-auto"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={getDegreeAngle(selectedPlayer.angle)}
                      onChange={(e) => handleAngleChange(parseInt(e.target.value))}
                      className="flex-grow h-2 bg-zinc-950 border border-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 pointer-events-auto"
                    />
                    <button
                      onClick={() => handleAngleChange(getDegreeAngle(selectedPlayer.angle) + 15)}
                      className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors pointer-events-auto"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                  <span className="hud-title-text text-xs text-zinc-400 font-bold uppercase block">
                    Ação Programada na Colisão
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                    <button
                      onClick={() => handleActionTypeChange(selectedPlayer.id, 'PASS')}
                      className={`
                        hud-action-btn py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                        ${selectedPlayer.actionType === 'PASS'
                          ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30'
                          : 'border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-950/10 hover:border-cyan-950/40'
                        }
                      `}
                    >
                      <ArrowRight size={12} />
                      PASSAR
                    </button>

                    <button
                      onClick={() => handleActionTypeChange(selectedPlayer.id, 'CROSS')}
                      className={`
                        hud-action-btn py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                        ${selectedPlayer.actionType === 'CROSS'
                          ? 'border-amber-500 text-amber-400 bg-amber-955/30'
                          : 'border-zinc-800 text-zinc-500 hover:text-amber-400 hover:bg-amber-955/10 hover:border-amber-955/40'
                        }
                      `}
                    >
                      <Navigation size={12} className="rotate-45" />
                      CRUZAR
                    </button>
                    
                    {(() => {
                      const canShoot = selectedPlayer.position[2] >= 0;
                      return (
                        <button
                          disabled={!canShoot}
                          onClick={() => handleActionTypeChange(selectedPlayer.id, 'SHOOT')}
                          className={`
                            hud-action-btn py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                            ${!canShoot 
                              ? 'opacity-30 border-zinc-800 text-zinc-700 cursor-not-allowed'
                              : selectedPlayer.actionType === 'SHOOT'
                                ? 'border-rose-500 text-rose-450 bg-rose-955/30'
                                : 'border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-955/10 hover:border-rose-955/40'
                            }
                          `}
                          title={!canShoot ? "Chutes bloqueados atrás da linha do meio campo!" : "Chutar direto"}
                        >
                          <Target size={12} />
                          CHUTAR
                        </button>
                      );
                    })()}
                  </div>

                  <div className="hud-blocker-container pt-1 sm:pt-1.5 md:pt-3">
                    <button
                      onClick={() => {
                        try {
                          updatePlayerBlocking(selectedPlayer.id, !selectedPlayer.isBlocking);
                          setBlockingLimitError(false);
                        } catch (err: any) {
                          if (err.message === 'LIMIT_EXCEEDED') {
                            setBlockingLimitError(true);
                            setTimeout(() => setBlockingLimitError(false), 3500);
                          }
                        }
                      }}
                      className={`
                        hud-blocker-btn w-full py-2.5 px-3 rounded-xl border font-bold text-[10px] md:text-xs flex items-center justify-between transition-all pointer-events-auto
                        ${selectedPlayer.isBlocking
                          ? 'border-zinc-300 text-zinc-100 bg-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.08)]'
                          : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 hover:border-zinc-700'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Shield size={14} className={selectedPlayer.isBlocking ? "text-zinc-200 animate-pulse" : "text-zinc-650"} />
                        <span className="hud-blocker-desktop hidden sm:inline">🛡️ BLOQUEAR JOGADA NO TURNO RIVAL ({currentBlockers}/{maxBlockers})</span>
                        <span className="hud-blocker-mobile inline sm:hidden">🛡️ BLOQUEAR JOGADA ({currentBlockers}/{maxBlockers})</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full transition-all relative flex items-center p-0.5 ${selectedPlayer.isBlocking ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-all shadow-md transform ${selectedPlayer.isBlocking ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>

                    {blockingLimitError && (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1 animate-pulse bg-rose-955/40 border border-rose-900/30 py-1.5 px-3 rounded-xl mt-1.5">
                        <ShieldAlert size={12} /> Limite de {maxBlockers} Bloqueios atingido!
                      </span>
                    )}

                    <p className="text-[9.5px] text-zinc-500 leading-normal mt-1.5 px-1">
                      {selectedPlayer.isBlocking 
                        ? "Ativo: Captura a bola e encerra o turno se o oponente colidir com ele. No seu turno, executa a ação selecionada."
                        : "Inativo: Apenas desvia a bola. Não intercepta a posse de bola no turno do oponente."
                      }
                    </p>
                  </div>

                  {selectedPlayer.position[2] < 0 && (
                    <span className="text-[9px] text-zinc-500 font-semibold block text-center italic mt-1">
                      * Posição defensiva: Chutes estão bloqueados.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
          */}
        </div>
      )}

      {/* Confirm Escalation Done Button */}
      <div className="pointer-events-auto w-full landscape:w-auto md:w-auto ml-auto flex flex-col gap-2.5 md:gap-3 items-end">
        {!isCameraCentered && (
          <button
            onClick={recenterCamera}
            className="hud-recenter-btn w-full py-2.5 md:py-3 px-5 md:px-7 bg-zinc-900/90 hover:bg-zinc-800/95 border border-zinc-700 text-cyan-400 font-bold tracking-widest uppercase rounded-xl md:rounded-2xl shadow-lg transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs md:text-sm animate-scaleUp pointer-events-auto"
          >
            <Navigation size={14} className="rotate-45" />
            {t('app.recenter')}
          </button>
        )}
        <button
          onClick={completePreparation}
          className="hud-confirm-btn w-full py-3.5 md:py-5 px-6 md:px-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black tracking-widest uppercase rounded-2xl md:rounded-3xl shadow-[0_4px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_35px_rgba(16,185,129,0.5)] transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs md:text-sm"
        >
          <CheckCircle2 size={16} className="md:w-[18px] md:h-[18px]" />
          {t('hud.confirmTactic')}
        </button>
      </div>
    </div>
  );
};

export default HUDPreparationPanel;
