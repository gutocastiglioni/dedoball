import React, { useState } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Trophy, PlusCircle, Play, Crown, Users } from 'lucide-react';

const TournamentTab: React.FC = () => {
  const {
    activeUser,
    activeTournamentId,
    tournament,
    tournamentsList,
    createTournament,
    joinTournament,
    startTournament,
    playTournamentMatch,
    resetMatch
  } = useGameStateContext();

  const isMobile = useIsMobile();
  const [newTournamentName, setNewTournamentName] = useState('');
  const [showCreateTForm, setShowCreateTForm] = useState(false);

  return (
    <div className={`w-full animate-scaleUp ${isMobile ? 'space-y-1.5' : 'space-y-6'}`}>
      
      {/* Torneio Principal Switcher */}
      {!activeTournamentId ? (
        <div className={isMobile ? 'space-y-1.5' : 'space-y-6'}>
          <div className={`w-full flex flex-row justify-between items-center bg-zinc-900/40 border border-zinc-800/60 text-left
            ${isMobile ? 'p-2 rounded-xl gap-2' : 'p-4 rounded-2xl gap-3'}
          `}>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-yellow-400 text-left">COPA MATA-MATA (4 JOGADORES)</h3>
              <p className={`text-[9px] text-zinc-550 text-left ${isMobile ? 'hidden' : 'block'}`}>Encare humanos e IAs substitutas na chave rumo ao ouro</p>
            </div>
            <button
              onClick={() => setShowCreateTForm(!showCreateTForm)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-600 hover:bg-yellow-500 text-zinc-950 rounded-xl text-[9.5px] sm:text-xs font-black tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-md shadow-yellow-500/20"
            >
              <PlusCircle size={12} />
              CRIAR COPA
            </button>
          </div>

          {showCreateTForm && (
            <div className="w-full max-w-md mx-auto p-4 rounded-2xl bg-zinc-900 border border-yellow-500/40 shadow-[0_0_25px_rgba(234,179,8,0.15)] space-y-3 text-left animate-fadeIn">
              <h4 className="text-[10px] sm:text-xs font-black tracking-widest text-yellow-400 uppercase">Configuração da Copa</h4>
              <div>
                <label className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome da Copa</label>
                <input 
                  type="text"
                  placeholder="Peteleco Cup 2026"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    createTournament(newTournamentName);
                    setShowCreateTForm(false);
                    setNewTournamentName('');
                  }}
                  className="flex-grow py-2.5 bg-yellow-600 hover:bg-yellow-500 text-zinc-950 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md"
                >
                  CRIAR TORNEIO AGORA
                </button>
                <button
                  onClick={() => setShowCreateTForm(false)}
                  className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[10px] font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tournaments List */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-thin
            ${isMobile ? 'max-h-[170px]' : 'max-h-[350px]'}
          `}>
            {tournamentsList.length > 0 ? (
              tournamentsList.map((t) => {
                const pCount = Object.keys(t.players || {}).length;
                return (
                  <div 
                    key={t.tournamentId}
                    className={`bg-zinc-900/60 border border-zinc-800 flex justify-between items-center hover:border-zinc-700 transition-colors shadow-inner
                      ${isMobile ? 'p-2 rounded-xl' : 'p-4 rounded-2xl'}
                    `}
                  >
                    <div className="text-left">
                      <h4 className="text-[10px] sm:text-xs font-black text-zinc-200 uppercase tracking-wide flex items-center gap-1.5">
                        {t.name}
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${t.status === 'active' ? 'bg-yellow-950 border border-yellow-800 text-yellow-400' : t.status === 'completed' ? 'bg-zinc-800 border border-zinc-700 text-zinc-400' : 'bg-emerald-950 border border-emerald-800 text-emerald-450'}`}>
                          {t.status === 'active' ? 'EM CURSO' : t.status === 'completed' ? 'CONCLUÍDO' : 'INSCRIÇÕES'}
                        </span>
                      </h4>
                      <p className="text-[8px] font-semibold text-zinc-555 uppercase">Competidores: {pCount} / 4</p>
                    </div>

                    <button
                      onClick={() => {
                        joinTournament(t.tournamentId);
                      }}
                      className="px-3 py-1 bg-yellow-950 border border-yellow-800/40 hover:bg-yellow-900 text-yellow-400 font-black rounded-lg text-[9px] sm:text-xs tracking-wider transition-colors"
                    >
                      ENTRAR
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 py-6 sm:py-12 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 font-bold">
                <Trophy size={20} className="opacity-30 mb-1" />
                <span className="text-[10px] sm:text-xs font-semibold">Nenhum torneio agendado.</span>
                <span className="text-[8px] sm:text-[10px] text-zinc-655 font-medium">Clique no botão acima para fundar a sua copa!</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        // BRACKETS TREE SCREEN (ACTIVE TOURNAMENT)
        <div className={`w-full bg-zinc-900/40 border border-zinc-800 flex flex-col shadow-inner animate-scaleUp
          ${isMobile ? 'p-2 rounded-xl space-y-2' : 'p-6 rounded-3xl space-y-6'}
        `}>
          
          {/* Brackets Header */}
          <div className="flex flex-row justify-between items-center gap-2 border-b border-zinc-800/60 pb-2">
            <div className="text-left">
              <span className="text-[8px] font-black uppercase text-yellow-400 tracking-widest bg-yellow-950 border border-yellow-800/60 px-2 py-0.5 rounded-full">CHAVE TÁTICA ATIVA</span>
              <h3 className="text-xs sm:text-base font-black uppercase mt-1 tracking-wide truncate max-w-[120px] sm:max-w-xs">{tournament?.name}</h3>
            </div>

            <div className="flex gap-1.5">
              {tournament?.status === 'waiting' && (
                <button
                  onClick={() => startTournament(activeTournamentId)}
                  className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-[9px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-1"
                >
                  <Play size={8} fill="white" /> INICIAR
                </button>
              )}
              <button
                onClick={resetMatch}
                className="px-2 py-1 bg-zinc-850 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[9px] sm:text-xs font-bold transition-all"
              >
                Voltar
              </button>
            </div>
          </div>

          {/* Torneio Arvore Brackets Visual */}
          {tournament && tournament.status !== 'waiting' ? (
            <div className="relative w-full flex flex-row gap-3 items-center overflow-x-auto pb-2 scrollbar-thin">
              
              {/* Coluna 1: Semifinais */}
              <div className="flex flex-col space-y-2 min-w-[140px] xs:min-w-[160px] flex-shrink-0">
                <span className="text-[8px] font-bold text-zinc-555 uppercase tracking-widest border-b border-zinc-800/80 pb-0.5 block">Semifinais</span>
                
                {['semi-1', 'semi-2'].map((matchId) => {
                  const match = tournament.matches[matchId];
                  if (!match) return null;
                  
                  const isMyMatch = activeUser && (match.player1.uid === activeUser.uid || match.player2.uid === activeUser.uid);
                  
                  return (
                    <div key={matchId} className={`p-2 bg-zinc-950/80 border rounded-xl flex flex-col space-y-1 text-left relative ${isMyMatch ? 'border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]' : 'border-zinc-800'}`}>
                      {/* Player 1 Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <img src={match.player1.photoURL} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                          <span className={`text-[9px] font-bold truncate max-w-[65px] ${match.winnerUid === match.player1.uid ? 'text-emerald-400' : match.winnerUid && match.winnerUid !== match.player1.uid ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                            {match.player1.displayName.substring(0, 10)}
                          </span>
                        </div>
                        <span className="text-[9px] font-black tabular-nums">{match.score1 !== undefined ? match.score1 : '-'}</span>
                      </div>

                      {/* Player 2 Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <img src={match.player2.photoURL} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                          <span className={`text-[9px] font-bold truncate max-w-[65px] ${match.winnerUid === match.player2.uid ? 'text-emerald-400' : match.winnerUid && match.winnerUid !== match.player2.uid ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                            {match.player2.displayName.substring(0, 10)}
                          </span>
                        </div>
                        <span className="text-[9px] font-black tabular-nums">{match.score2 !== undefined ? match.score2 : '-'}</span>
                      </div>

                      {/* JOGAR Match Button */}
                      {match.status === 'pending' && isMyMatch && (
                        <button
                          onClick={() => playTournamentMatch(match)}
                          className="mt-1 w-full py-1 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-black rounded text-[8px] tracking-widest uppercase transition-colors"
                        >
                          JOGAR AGORA
                        </button>
                      )}

                      {/* WAIT/SPECTATE Match Button */}
                      {match.status === 'pending' && !isMyMatch && (
                        <div className="mt-0.5 text-[8px] font-bold text-zinc-650 uppercase text-center italic bg-zinc-900 border border-zinc-800 rounded py-0.5">
                          Aguardando Bots...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Coluna 3: Final */}
              <div className="flex flex-col justify-center space-y-2 min-w-[160px] xs:min-w-[180px] flex-shrink-0">
                <span className="text-[8px] font-bold text-zinc-555 uppercase tracking-widest border-b border-zinc-800/80 pb-0.5 block">Grande Final</span>
                
                {(() => {
                  const match = tournament.matches['final'];
                  if (!match) {
                    return (
                      <div className="p-4 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-xl text-zinc-600 text-center text-[10px] font-bold uppercase py-6">
                        <Trophy size={14} className="mx-auto opacity-35 mb-1" />
                        Aguardando
                      </div>
                    );
                  }
                  
                  const isMyMatch = activeUser && (match.player1.uid === activeUser.uid || match.player2.uid === activeUser.uid);
                  
                  return (
                    <div className={`p-3 bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 border-2 rounded-xl flex flex-col space-y-2 text-left relative ${match.winnerUid ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.25)]' : isMyMatch ? 'border-yellow-500/50 shadow-md' : 'border-zinc-800'}`}>
                      {/* Player 1 Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <img src={match.player1.photoURL} alt="" className="w-5 h-5 rounded-full border border-yellow-500/30" referrerPolicy="no-referrer" />
                          <span className={`text-[10px] font-black truncate max-w-[70px] ${match.winnerUid === match.player1.uid ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-900/30 px-1.5 py-0.5 rounded shadow' : match.winnerUid && match.winnerUid !== match.player1.uid ? 'text-zinc-650 line-through' : 'text-zinc-300'}`}>
                            {match.player1.displayName.substring(0, 10)}
                          </span>
                        </div>
                        <span className="text-xs font-black tabular-nums">{match.score1 !== undefined ? match.score1 : '-'}</span>
                      </div>

                      {/* Player 2 Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <img src={match.player2.photoURL} alt="" className="w-5 h-5 rounded-full border border-yellow-500/30" referrerPolicy="no-referrer" />
                          <span className={`text-[10px] font-black truncate max-w-[70px] ${match.winnerUid === match.player2.uid ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-900/30 px-1.5 py-0.5 rounded shadow' : match.winnerUid && match.winnerUid !== match.player2.uid ? 'text-zinc-650 line-through' : 'text-zinc-300'}`}>
                            {match.player2.displayName.substring(0, 10)}
                          </span>
                        </div>
                        <span className="text-xs font-black tabular-nums">{match.score2 !== undefined ? match.score2 : '-'}</span>
                      </div>

                      {/* JOGAR Match Button */}
                      {match.status === 'pending' && isMyMatch && (
                        <button
                          onClick={() => playTournamentMatch(match)}
                          className="mt-1 w-full py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 font-black rounded-lg text-[9px] tracking-widest uppercase transition-all shadow-md"
                        >
                          INICIAR FINAL
                        </button>
                      )}

                      {/* Winner Announcement Badges */}
                      {match.status === 'completed' && match.winnerUid && (
                        <div className="py-1 bg-yellow-950/40 border border-yellow-800/40 rounded-lg text-center flex items-center justify-center gap-1 text-[9px] text-yellow-400 font-black uppercase shadow-inner animate-pulse">
                          <Crown size={11} /> Campeão!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500 space-y-2 flex flex-col items-center">
              <Users size={24} className="opacity-30" />
              <div>
                <span className="text-[10px] font-semibold block">Aguardando competidores confirmarem presença.</span>
                <span className="text-[8px] text-zinc-655 block mt-0.5">Você pode iniciar o torneio para preencher com bots de IA.</span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default TournamentTab;
