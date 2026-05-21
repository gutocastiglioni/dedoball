import React, { useState, useEffect, useRef } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { GameLogEntry, GamePhase } from '../../types';
import { Terminal, ChevronLeft, ChevronRight, Trash2, Shield, Circle, Activity } from 'lucide-react';

const HUDTelemetryLog: React.FC = () => {
  const { gameLogs, phase, gameTime, turn, homeFlicksRemaining, awayFlicksRemaining } = useGameStateContext();
  const [isOpen, setIsOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when a new log entry is added, since new entries are unshifted to the top
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [gameLogs]);

  if (phase === GamePhase.MENU) return null;

  const getLogColors = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'flick':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
          dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
          label: 'PETELECO'
        };
      case 'foul':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
          label: 'FALTA'
        };
      case 'collision':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
          label: 'FISICA'
        };
      case 'goal':
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450 font-black',
          dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,1)]',
          label: 'GOL'
        };
      case 'tackle':
        return {
          bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          dot: 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]',
          label: 'DESARME'
        };
      case 'phase':
        return {
          bg: 'bg-orange-500/15 border-orange-500/30 text-orange-400 font-extrabold',
          dot: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]',
          label: 'FASE'
        };
      default:
        return {
          bg: 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400',
          dot: 'bg-zinc-400',
          label: 'INFO'
        };
    }
  };

  return (
    <>
      {/* 1. COLLAPSED FLOATING TRIGGER TAB */}
      {!isOpen && (
        <div className="absolute top-[72px] md:top-[88px] left-4 md:left-6 z-20 pointer-events-auto animate-fadeIn">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2 px-3.5 py-2.5 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/40 text-cyan-400 font-black tracking-widest text-[9px] md:text-[10px] uppercase rounded-xl md:rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-103 active:scale-97"
            title="Abrir Telemetria do Jogo"
          >
            <Terminal size={14} className="animate-pulse text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>TELEMETRIA</span>
            <ChevronRight size={12} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* 2. EXPANDED TELEMETRIA CONSOLE DRAWER */}
      {isOpen && (
        <div className="absolute top-[72px] md:top-[88px] left-4 md:left-6 z-20 pointer-events-auto w-[280px] sm:w-[320px] md:w-[350px] max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-180px)] flex flex-col bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/90 rounded-2xl md:rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] border-cyan-500/10 overflow-hidden animate-fadeIn">
          
          {/* Header Panel */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center">
                <Terminal size={11} className="text-cyan-400" />
              </div>
              <h2 className="text-[10px] md:text-[11px] font-black tracking-widest text-zinc-100 uppercase flex items-center gap-1.5">
                TELEMETRIA DE CAMPO
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping"></span>
              </h2>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
              title="Recolher Telemetria"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Real-time State Quick Deck */}
          <div className="px-3.5 py-2.5 bg-zinc-900/30 border-b border-zinc-900/80 grid grid-cols-3 gap-2 text-center select-none font-semibold text-[8px] md:text-[9px]">
            <div className="flex flex-col items-center bg-zinc-950/65 py-1 px-2 border border-zinc-900 rounded-lg">
              <span className="text-zinc-550 uppercase tracking-widest mb-0.5">Tempo</span>
              <span className="font-extrabold text-cyan-400 text-[10px]">{gameTime}'</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-950/65 py-1 px-2 border border-zinc-900 rounded-lg">
              <span className="text-zinc-550 uppercase tracking-widest mb-0.5">Turno</span>
              <span className={`font-extrabold text-[10px] ${turn === 'HOME' ? 'text-blue-400' : 'text-orange-400'}`}>
                {turn === 'HOME' ? 'CASA' : 'VISITANTE'}
              </span>
            </div>
            <div className="flex flex-col items-center bg-zinc-950/65 py-1 px-2 border border-zinc-900 rounded-lg">
              <span className="text-zinc-550 uppercase tracking-widest mb-0.5">Flicks (C|V)</span>
              <span className="font-extrabold text-[10px] text-zinc-200">
                {homeFlicksRemaining}/3 <span className="text-zinc-650">|</span> {awayFlicksRemaining}/3
              </span>
            </div>
          </div>

          {/* Logs scroll container */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-3.5 py-2 md:py-3.5 space-y-2 max-h-[300px] sm:max-h-[380px] md:max-h-[460px] scrollbar-thin"
          >
            {gameLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 opacity-50">
                <Activity size={18} className="text-zinc-600 animate-pulse" />
                <span className="text-[10px] tracking-wider uppercase font-semibold text-zinc-500">Nenhum evento registrado</span>
              </div>
            ) : (
              gameLogs.map((log) => {
                const colors = getLogColors(log.type);
                return (
                  <div
                    key={log.id}
                    className="flex flex-col p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/40 hover:border-zinc-800 transition-all duration-150 animate-fadeIn"
                  >
                    {/* Log Meta Row */}
                    <div className="flex items-center justify-between text-[8px] md:text-[9px] border-b border-zinc-900/60 pb-1 mb-1.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 select-none">[{log.timestamp}]</span>
                        <span className="text-cyan-400/80 select-none">[{log.gameTime}']</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black border uppercase tracking-wider ${colors.bg}`}>
                          <span className={`w-1 h-1 rounded-full ${colors.dot}`} />
                          {colors.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[7.5px] text-zinc-500 uppercase tracking-widest">
                        <span>P: </span>
                        <span className={log.turn === 'HOME' ? 'text-blue-400 font-extrabold' : 'text-orange-400 font-extrabold'}>
                          {log.turn === 'HOME' ? 'H' : 'V'}
                        </span>
                        <span className="text-zinc-700">|</span>
                        <span>F:</span>
                        <span className="text-zinc-300 font-extrabold">H{log.homeFlicks} V{log.awayFlicks}</span>
                      </div>
                    </div>

                    {/* Log Message */}
                    <p className="text-[10px] md:text-[11px] font-semibold text-zinc-250 leading-relaxed tracking-wide">
                      {log.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HUDTelemetryLog;
