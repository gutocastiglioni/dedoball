import React from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { GamePhase } from '../../types';
import { Trophy, Shield, RotateCcw, ShieldAlert, Crown, CheckCircle2, Hourglass } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import SoundManager from '../../SoundManager';

const HUDOverlays: React.FC = () => {
  const {
    phase,
    ball,
    scores,
    gameTime,
    resetMatch,
    opponentDisconnected,
    disconnectCountdown,
    captainMoveMode,
    confirmCaptainMove,
    homePlayers,
    awayPlayers,
    myRole,
    isMultiplayer,
    opponentInfo,
    opponentProfile,
    userProfile,
    activeUser,
    homeKitConfig,
    awayKitConfig,
    matchDuration,
    currentRoom,
    actionStatus,
    prepTimer,
    gameMode,
    gkMoveActiveTeam,
    gkMoveTimer,
    confirmGkPosition,
  } = useGameStateContext();

  const isMobile = useIsMobile();

  // Derived Info for HOME
  const homeTeamName = userProfile?.teamName || 'MEU TIME';
  const homeAbbreviation = userProfile?.abbreviation || 'CAS';
  const homePlayerName = userProfile?.username || activeUser?.displayName || 'Jogador 1';

  // Derived Info for AWAY
  const awayTeamName = isMultiplayer 
    ? (opponentProfile?.teamName || opponentInfo?.displayName?.toUpperCase() || 'VISITANTE')
    : 'INTELIGÊNCIA ARTIFICIAL';
  const awayAbbreviation = isMultiplayer 
    ? (opponentProfile?.abbreviation || opponentInfo?.displayName?.substring(0, 3).toUpperCase() || 'VIS')
    : 'I.A.';
  const awayPlayerName = isMultiplayer 
    ? (opponentProfile?.username || opponentInfo?.displayName || 'Oponente')
    : 'MÁQUINA';

  // Helper to render procedural crests or uploaded logos in large format
  const renderLargeCrest = (
    logoUrl: string | undefined, 
    abbreviation: string, 
    primaryColor: string, 
    secondaryColor: string,
    team: 'HOME' | 'AWAY'
  ) => {
    const shadowColor = team === 'HOME' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(249, 115, 22, 0.4)';
    const glowClass = team === 'HOME' ? 'shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'shadow-[0_0_30px_rgba(249,115,22,0.3)]';

    if (logoUrl) {
      return (
        <div 
          className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-zinc-700/80 overflow-hidden bg-zinc-950 flex items-center justify-center transition-all duration-500 hover:scale-105 ${glowClass}`}
          style={{ boxShadow: `0 0 35px ${shadowColor}` }}
        >
          <img src={logoUrl} alt="crest" className="w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div 
        className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-zinc-700/80 overflow-hidden flex items-center justify-center transition-all duration-500 hover:scale-105 bg-zinc-900 ${glowClass}`}
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 50%, ${secondaryColor} 50%)`,
          boxShadow: `0 0 35px ${shadowColor}`
        }}
      >
        <div className="absolute inset-1.5 rounded-full bg-black/25 backdrop-blur-[1.5px] flex items-center justify-center">
          <span 
            className="font-black text-xl md:text-2xl tracking-tighter uppercase"
            style={{
              color: '#ffffff',
              textShadow: '0px 2px 6px rgba(0,0,0,0.9), 0px 0px 4px rgba(0,0,0,0.6)'
            }}
          >
            {abbreviation.substring(0, 3)}
          </span>
        </div>
      </div>
    );
  };

  // Determine if the local player IS the conceding team
  const isConceding = captainMoveMode !== null && (
    !isMultiplayer
      ? captainMoveMode === 'HOME'               // offline: local player = HOME
      : myRole === captainMoveMode               // multiplayer: match by role
  );

  const concedingPlayers = captainMoveMode === 'HOME' ? homePlayers : awayPlayers;

  return (
    <>
      {/* E. HUD OVERLAY - GOAL CELEBRATION */}
      {phase === GamePhase.GOAL_CELEBRATION && captainMoveMode === null && (
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

      {/* E2. CAPTAIN REPOSITION MODE OVERLAY */}
      {phase === GamePhase.GOAL_CELEBRATION && captainMoveMode !== null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none w-full max-w-sm px-4">
          {isConceding ? (
            /* ── CONCEDING PLAYER ── */
            <div className="pointer-events-auto relative w-full animate-scaleUp">
              {/* Title badge */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown size={14} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-black tracking-[0.35em] uppercase text-amber-400">
                  REPOSICIONE SEU CAPITÃO
                </span>
                <Crown size={14} className="text-amber-400 animate-pulse" />
              </div>

              <div className="bg-zinc-900/95 border border-amber-800/50 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-[0_0_40px_rgba(217,119,6,0.25)]">
                {/* Instruction row */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-700/40 flex items-center justify-center flex-shrink-0">
                    <Crown size={18} className="text-amber-400" />
                  </div>
                  <p className="text-[11px] md:text-xs text-zinc-300 font-semibold leading-relaxed">
                    Selecione o <span className="text-amber-400 font-black">Capitão</span> em campo e clique num slot para movê-lo — ou confirme diretamente para manter a posição atual.
                  </p>
                </div>

                {/* Pulsing countdown timer for repositioning */}
                {prepTimer !== null && (
                  <div className={`flex items-center justify-center gap-1.5 px-3 py-2 mb-4 rounded-xl border font-black text-xs transition-all duration-300 ${
                    prepTimer <= 8 
                      ? 'bg-rose-950/80 border-rose-800/50 text-rose-450 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                      : 'bg-amber-955/60 border-amber-800/40 text-amber-400 animate-pulse'
                  }`}>
                    <Hourglass size={13} className={prepTimer <= 8 ? 'animate-spin text-rose-500' : 'animate-spin text-amber-500'} style={{ animationDuration: '2.5s' }} />
                    <span>TEMPO RESTANTE: {prepTimer}s</span>
                  </div>
                )}

                {/* Confirm button — always active */}
                <button
                  id="captain-confirm-btn"
                  onClick={confirmCaptainMove}
                  className="w-full py-3.5 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-[0_4px_25px_rgba(217,119,6,0.45)] hover:shadow-[0_4px_30px_rgba(217,119,6,0.6)] active:scale-98"
                >
                  <CheckCircle2 size={15} />
                  CONFIRMAR E RETOMAR
                </button>
              </div>
            </div>
          ) : (
            /* ── SCORING PLAYER or AI waiting ── */
            <div className="pointer-events-none relative animate-scaleUp">
              <div className="flex flex-col items-center gap-2 bg-zinc-900/95 border border-zinc-700/60 rounded-2xl px-5 py-3.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3">
                  <Hourglass size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase">
                    {captainMoveMode === 'AWAY'
                      ? 'IA reposicionando capitão...'
                      : 'Adversário reposicionando o capitão...'}
                  </span>
                </div>
                {prepTimer !== null && (
                  <span className="text-[10px] font-black text-cyan-400 tracking-wider">
                    Tempo limite do rival: {prepTimer}s
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* F. HUD OVERLAY - GAME OVER */}
      {phase === GamePhase.GAME_OVER && (() => {
        const isHomeWinner = scores.home > scores.away;
        const isAwayWinner = scores.away > scores.home;
        const isDraw = scores.home === scores.away;

        // Determine local result
        let localResult: 'WIN' | 'LOSE' | 'DRAW' = 'DRAW';
        if (!isDraw) {
          if (isMultiplayer) {
            if (myRole === 'AWAY') {
              localResult = isAwayWinner ? 'WIN' : 'LOSE';
            } else {
              localResult = isHomeWinner ? 'WIN' : 'LOSE';
            }
          } else {
            // offline/IA: local is HOME
            localResult = isHomeWinner ? 'WIN' : 'LOSE';
          }
        }

        return (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-lg animate-fadeIn">
            {/* Radial ambient glow */}
            {localResult === 'WIN' && (
              <div className="absolute w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-emerald-500/10 rounded-full blur-[120px] md:blur-[180px] animate-pulse"></div>
            )}
            {localResult === 'DRAW' && (
              <div className="absolute w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-amber-500/10 rounded-full blur-[120px] md:blur-[180px] animate-pulse"></div>
            )}
            {localResult === 'LOSE' && (
              <div className="absolute w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-rose-500/10 rounded-full blur-[120px] md:blur-[180px] animate-pulse"></div>
            )}

            <div className="relative max-w-2xl w-full rounded-[24px] md:rounded-[36px] border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md shadow-[0_24px_50px_rgba(0,0,0,0.8)] p-6 md:p-10 flex flex-col items-center space-y-6 md:space-y-8 animate-scaleUp">
              
              {/* Header Badge & Title */}
              {(() => {
                const isWO = actionStatus ? (actionStatus.includes('W.O.') || actionStatus.includes('WO')) : false;
                const isTimeout = actionStatus ? (actionStatus.toLowerCase().includes('timeout') || actionStatus.toLowerCase().includes('tempo excedido')) : false;

                return (
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border transition-all duration-500 ${
                      localResult === 'WIN' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]'
                        : localResult === 'DRAW'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_30px_rgba(251,113,133,0.2)]'
                    }`}>
                      {localResult === 'WIN' && <Trophy size={isMobile ? 32 : 40} className="animate-bounce" style={{ animationDuration: '3s' }} />}
                      {localResult === 'DRAW' && <Hourglass size={isMobile ? 32 : 40} className="animate-spin" style={{ animationDuration: '6s' }} />}
                      {localResult === 'LOSE' && <ShieldAlert size={isMobile ? 32 : 40} className="animate-pulse" />}
                    </div>
                    
                    <h1 className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r bg-clip-text text-transparent ${
                      localResult === 'WIN' 
                        ? 'from-emerald-300 via-teal-400 to-emerald-500'
                        : localResult === 'DRAW'
                        ? 'from-amber-300 via-yellow-400 to-amber-500'
                        : 'from-rose-400 via-red-500 to-rose-600'
                    }`}>
                      {localResult === 'WIN' && (
                        isWO ? 'VITÓRIA POR W.O.!' : (isTimeout ? 'VITÓRIA POR TIMEOUT!' : 'VITÓRIA!')
                      )}
                      {localResult === 'DRAW' && 'EMPATE'}
                      {localResult === 'LOSE' && (
                        isWO ? 'DERROTA POR W.O.!' : (isTimeout ? 'DERROTA POR TIMEOUT!' : 'DERROTA')
                      )}
                    </h1>
                    
                    <p className="text-zinc-400 text-[10px] md:text-xs font-semibold tracking-wide max-w-sm md:max-w-md">
                      {localResult === 'WIN' && (
                        isWO 
                          ? 'O oponente desconectou e você venceu a partida por W.O.!' 
                          : (isTimeout 
                              ? 'O oponente esgotou o tempo limite para concluir sua jogada e foi derrotado por timeout!' 
                              : 'Excelente partida! Sua tática e controle foram impecáveis e consagraram seu time.')
                      )}
                      {localResult === 'DRAW' && 'Que jogo disputado! Ambos os lados lutaram bravamente até o apito final.'}
                      {localResult === 'LOSE' && (
                        isWO 
                          ? 'Você desconectou e perdeu a partida por W.O.' 
                          : (isTimeout 
                              ? 'Seu tempo limite esgotou antes de confirmar sua jogada, resultando em derrota por timeout!' 
                              : 'Faltou pouco! Ajuste seus posicionamentos, refine a pontaria e tente outra vez.')
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Scoreboard & Crests Showcase Area */}
              <div className="w-full flex items-center justify-between bg-zinc-950/40 rounded-[20px] md:rounded-[28px] border border-zinc-800/40 p-4 md:p-6 shadow-inner relative overflow-hidden">
                {/* Decorative Subtle Background Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-800/30 -translate-x-1/2 pointer-events-none"></div>

                {/* HOME Team Panel */}
                <div className="flex flex-col items-center flex-1 text-center space-y-2 md:space-y-3 z-10">
                  {renderLargeCrest(
                    userProfile?.logoUrl,
                    homeAbbreviation,
                    userProfile?.uniform?.primaryColor || '#1e3799',
                    userProfile?.uniform?.secondaryColor || '#ffffff',
                    'HOME'
                  )}
                  <div className="space-y-0.5 max-w-[100px] md:max-w-[180px]">
                    <h3 className="text-xs md:text-sm font-black text-white truncate uppercase tracking-wide">
                      {homeTeamName}
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold truncate uppercase tracking-widest">
                      {homePlayerName}
                    </p>
                  </div>
                </div>

                {/* Central Placar Container */}
                <div className="flex flex-col items-center justify-center px-2 md:px-8 z-10">
                  <div className="flex items-center gap-2 md:gap-4 font-black text-4xl md:text-6xl tabular-nums tracking-tighter">
                    <span className={`${isHomeWinner ? 'text-emerald-400 filter drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 'text-zinc-400'}`}>{scores.home}</span>
                    <span className="text-zinc-700 text-2xl md:text-3xl">:</span>
                    <span className={`${isAwayWinner ? 'text-emerald-400 filter drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 'text-zinc-400'}`}>{scores.away}</span>
                  </div>
                  <div className="mt-1 md:mt-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[8px] md:text-[9.5px] text-zinc-500 font-extrabold uppercase tracking-widest">
                    Placar Final
                  </div>
                </div>

                {/* AWAY Team Panel */}
                <div className="flex flex-col items-center flex-1 text-center space-y-2 md:space-y-3 z-10">
                  {renderLargeCrest(
                    isMultiplayer ? opponentProfile?.logoUrl : undefined,
                    awayAbbreviation,
                    isMultiplayer ? (opponentProfile?.uniform?.primaryColor || '#e55039') : (awayKitConfig?.primaryColor || '#e55039'),
                    isMultiplayer ? (opponentProfile?.uniform?.secondaryColor || '#f6b93b') : (awayKitConfig?.secondaryColor || '#f6b93b'),
                    'AWAY'
                  )}
                  <div className="space-y-0.5 max-w-[100px] md:max-w-[180px]">
                    <h3 className="text-xs md:text-sm font-black text-white truncate uppercase tracking-wide">
                      {awayTeamName}
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold truncate uppercase tracking-widest">
                      {awayPlayerName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="w-full pt-2 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={resetMatch}
                  className="w-full py-3.5 md:py-4.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black tracking-widest uppercase rounded-xl md:rounded-2xl shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.5)] hover:scale-[1.01] active:scale-98 transition-all duration-300 flex items-center justify-center gap-2 text-[10px] md:text-xs"
                >
                  <RotateCcw size={isMobile ? 12 : 14} />
                  VOLTAR AO MENU PRINCIPAL
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-1">
                {currentRoom?.status === 'preparation' ? 'Retornando ao lobby em' : 'Vitória por W.O. em'}
              </span>
              <span className="text-3xl font-black text-rose-500 tabular-nums animate-pulse">{disconnectCountdown}s</span>
            </div>

            {currentRoom?.status === 'preparation' ? (
              <p className="text-[10px] text-zinc-550 italic font-semibold">
                * Aguardando o oponente estabilizar a conexão para iniciar a partida.
              </p>
            ) : (
              <p className="text-[10px] text-zinc-550 italic font-semibold">
                * Caso o oponente não retorne a tempo, você vencerá a partida por W.O. automaticamente!
              </p>
            )}
          </div>
        </div>
      )}

      {/* MANUAL MODE GOALKEEPER TIMER OVERLAY */}
      {phase === GamePhase.ACTION && gkMoveActiveTeam !== null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none w-full max-w-sm px-4">
          {gkMoveActiveTeam === (isMultiplayer ? myRole : 'HOME') ? (
            /* ── LOCAL PLAYER DEFENDING (REPOSITIONING GOALKEEPER) ── */
            <div className="pointer-events-auto relative w-full animate-scaleUp">
              {/* Title badge */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Shield size={14} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-black tracking-[0.35em] uppercase text-amber-400">
                  REPOSICIONE SEU GOLEIRO
                </span>
                <Shield size={14} className="text-amber-400 animate-pulse" />
              </div>

              <div className={isMobile 
                ? "bg-zinc-900/95 border border-amber-800/50 rounded-xl p-2.5 shadow-lg w-full flex flex-col gap-2 pointer-events-auto"
                : "bg-zinc-900/95 border border-amber-800/50 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-[0_0_40px_rgba(217,119,6,0.25)] pointer-events-auto"
              }>
                {/* Instruction row */}
                {isMobile ? (
                  <p className="text-[10px] text-zinc-300 font-semibold text-center leading-tight">
                    Arraste seu <span className="text-amber-400 font-black">Goleiro</span> ou confirme a posição.
                  </p>
                ) : (
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-700/40 flex items-center justify-center flex-shrink-0">
                      <Shield size={18} className="text-amber-400" />
                    </div>
                    <p className="text-[11px] md:text-xs text-zinc-300 font-semibold leading-relaxed">
                      Arraste seu <span className="text-amber-400 font-black">Goleiro</span> para qualquer slot de seu campo ou confirme para mantê-lo estático na posição atual.
                    </p>
                  </div>
                )}

                <div className={isMobile ? "flex items-center gap-2 w-full" : "flex flex-col gap-4"}>
                  {/* Pulsing countdown timer for goalkeeper repositioning */}
                  {gkMoveTimer !== null && (
                    <div className={isMobile
                      ? `flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border font-black text-[9px] transition-all duration-300 ${
                          gkMoveTimer <= 3 
                            ? 'bg-rose-950/80 border-rose-800/50 text-rose-450 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                            : 'bg-amber-955/60 border-amber-800/40 text-amber-400 animate-pulse'
                        } flex-1`
                      : `flex items-center justify-center gap-1.5 px-3 py-2 mb-4 rounded-xl border font-black text-xs transition-all duration-300 ${
                          gkMoveTimer <= 3 
                            ? 'bg-rose-950/80 border-rose-800/50 text-rose-450 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                            : 'bg-amber-955/60 border-amber-800/40 text-amber-400 animate-pulse'
                        }`
                    }>
                      <Hourglass size={isMobile ? 11 : 13} className={gkMoveTimer <= 3 ? 'animate-spin text-rose-500' : 'animate-spin text-amber-500'} style={{ animationDuration: '2.5s' }} />
                      <span>{isMobile ? `${gkMoveTimer}s` : `TEMPO RESTANTE: {gkMoveTimer}s`}</span>
                    </div>
                  )}

                  {/* Confirm button */}
                  <button
                    onClick={() => {
                      SoundManager.playUIClick();
                      confirmGkPosition();
                    }}
                    className={isMobile
                      ? "flex-1 py-1.5 rounded-lg font-black tracking-wide uppercase text-[9px] flex items-center justify-center gap-1 transition-all bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md active:scale-98"
                      : "w-full py-3.5 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-[0_4px_25px_rgba(217,119,6,0.45)] hover:shadow-[0_4px_30px_rgba(217,119,6,0.6)] active:scale-98"
                    }
                  >
                    <CheckCircle2 size={isMobile ? 11 : 15} />
                    {isMobile ? "CONFIRMAR" : "CONFIRMAR POSIÇÃO"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── LOCAL PLAYER ATTACKING (WAITING FOR GOALKEEPER MOVE) ── */
            <div className="pointer-events-none relative animate-scaleUp">
              <div className="flex flex-col items-center gap-2 bg-zinc-900/95 border border-zinc-700/60 rounded-2xl px-5 py-3.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3">
                  <Hourglass size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase">
                    {gkMoveActiveTeam === 'AWAY' && !isMultiplayer
                      ? 'IA ajustando goleiro...'
                      : 'Oponente reposicionando o goleiro...'}
                  </span>
                </div>
                {gkMoveTimer !== null && (
                  <span className="text-[10px] font-black text-cyan-400 tracking-wider animate-pulse">
                    Tempo restante: {gkMoveTimer}s
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default HUDOverlays;
