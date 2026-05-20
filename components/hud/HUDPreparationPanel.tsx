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
    selectedPlayerId,
    updatePlayerAngle,
    updatePlayerActionType,
    setCaptain,
    completePreparation,
  } = useGameStateContext();

  const [tackleLimitError, setTackleLimitError] = useState(false);

  const selectedPlayer = homePlayers.find(p => p.id === selectedPlayerId);

  const handleAngleChange = (deg: number) => {
    if (!selectedPlayerId) return;
    const rad = deg * (Math.PI / 180);
    updatePlayerAngle(selectedPlayerId, rad);
  };

  const handleActionTypeChange = (playerId: string, actionType: ActionType) => {
    try {
      updatePlayerActionType(playerId, actionType);
      setTackleLimitError(false);
    } catch (err: any) {
      if (err.message === 'LIMIT_EXCEEDED') {
        setTackleLimitError(true);
        setTimeout(() => setTackleLimitError(false), 3000);
      }
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full p-3 md:p-6 z-15 flex flex-col landscape:flex-row md:flex-row justify-between items-end gap-3 md:gap-4 pointer-events-none">
      {/* Selected Player Scale Panel */}
      {selectedPlayer && (
        <div className="hud-player-card pointer-events-auto w-[290px] xs:w-[320px] md:max-w-md bg-zinc-900/90 backdrop-blur-lg border border-zinc-800 rounded-2xl md:rounded-3xl p-2.5 xs:p-3.5 md:p-5 shadow-2xl transition-all duration-300 animate-scaleUp">
          <div className="flex flex-col space-y-3 md:space-y-4">
            {/* Header of Player Card */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 md:pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-950 border border-blue-800/50 flex items-center justify-center font-black text-blue-450 shadow-inner">
                  {selectedPlayer.number}
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase text-zinc-100">
                    {selectedPlayer.number === 1 ? 'GOLEIRO' : 'JOGADOR EM CAMPO'}
                  </h3>
                  {selectedPlayer.isCaptain && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-900/40 mt-0.5 animate-pulse">
                      <Crown size={10} /> CAPITÃO
                    </span>
                  )}
                </div>
              </div>
              
              {/* Status & Captain Actions */}
              <div className="flex items-center gap-2">
                {!selectedPlayer.isCaptain && (
                  <button
                    onClick={() => setCaptain(selectedPlayer.id)}
                    className="text-[9px] font-black text-amber-400 bg-amber-950/20 hover:bg-amber-950/50 border border-amber-800/40 px-2.5 py-1.5 rounded-xl transition-colors pointer-events-auto flex items-center gap-1"
                    title="Definir este jogador como Capitão"
                  >
                    <Crown size={10} /> +CAPITÃO
                  </button>
                )}
              </div>
            </div>

            {/* Controls for non-goalkeepers */}
            {selectedPlayer.number !== 1 && (
              <div className="flex flex-col space-y-4">
                {/* Angle Control / Rotation Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase">
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

                {/* Action Mode Toggle (Cross vs. Shoot vs. Tackle) */}
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 font-bold uppercase block">
                    Ação Programada na Colisão
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                    <button
                      onClick={() => handleActionTypeChange(selectedPlayer.id, 'PASS')}
                      className={`
                        py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
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
                        py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                        ${selectedPlayer.actionType === 'CROSS'
                          ? 'border-amber-500 text-amber-400 bg-amber-950/30'
                          : 'border-zinc-800 text-zinc-500 hover:text-amber-400 hover:bg-amber-950/10 hover:border-amber-950/40'
                        }
                      `}
                    >
                      <Navigation size={12} className="rotate-45" />
                      CRUZAR
                    </button>
                    
                    {/* Check if slot allows shooting (Z >= 0 or home-att slot) */}
                    {(() => {
                      const canShoot = selectedPlayer.position[2] >= 0; // forward half
                      return (
                        <button
                          disabled={!canShoot}
                          onClick={() => handleActionTypeChange(selectedPlayer.id, 'SHOOT')}
                          className={`
                            py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                            ${!canShoot 
                              ? 'opacity-30 border-zinc-800 text-zinc-700 cursor-not-allowed'
                              : selectedPlayer.actionType === 'SHOOT'
                                ? 'border-rose-500 text-rose-450 bg-rose-950/30'
                                : 'border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/10 hover:border-rose-950/40'
                            }
                          `}
                          title={!canShoot ? "Chutes bloqueados atrás da linha do meio campo!" : "Chutar direto"}
                        >
                          <Target size={12} />
                          CHUTAR
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => handleActionTypeChange(selectedPlayer.id, 'TACKLE')}
                      className={`
                        py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                        ${selectedPlayer.actionType === 'TACKLE'
                          ? 'border-zinc-300 text-zinc-100 bg-zinc-850 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                          : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                        }
                      `}
                    >
                      <Shield size={12} />
                      DESARME
                    </button>
                  </div>
                  
                  {tackleLimitError && (
                    <span className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1 animate-pulse bg-rose-950/40 border border-rose-900/30 py-1.5 px-3 rounded-xl mt-1.5">
                      <ShieldAlert size={12} /> Limite de 3 Desarmes atingido!
                    </span>
                  )}

                  {selectedPlayer.position[2] < 0 && selectedPlayer.actionType !== 'TACKLE' && (
                    <span className="text-[9px] text-zinc-500 font-semibold block text-center italic mt-1">
                      * Posição defensiva: Chutes estão bloqueados.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Escalation Done Button */}
      <div className="pointer-events-auto w-full landscape:w-auto md:w-auto ml-auto">
        <button
          onClick={completePreparation}
          className="hud-confirm-btn w-full py-3.5 md:py-5 px-6 md:px-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black tracking-widest uppercase rounded-2xl md:rounded-3xl shadow-[0_4px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_35px_rgba(16,185,129,0.5)] transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs md:text-sm"
        >
          <CheckCircle2 size={16} className="md:w-[18px] md:h-[18px]" />
          CONFIRMAR TÁTICA
        </button>
      </div>
    </div>
  );
};

export default HUDPreparationPanel;
