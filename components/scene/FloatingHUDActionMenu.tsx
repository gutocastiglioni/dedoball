import React from 'react';
import { ArrowRight, Navigation as NavIcon, Target, Shield, Crown } from 'lucide-react';
import { PlayerConfig, Team } from '../../types';
import SoundManager from '../../SoundManager';

interface FloatingHUDActionMenuProps {
  player: PlayerConfig;
  menuScale: number;
  homePlayers: PlayerConfig[];
  awayPlayers: PlayerConfig[];
  isMultiplayer: boolean;
  myRole: Team;
  isMobile: boolean;
  updatePlayerActionType: (id: string, action: 'PASS' | 'CROSS' | 'SHOOT') => void;
  updatePlayerBlocking: (id: string, blocking: boolean) => void;
  setCaptain: (id: string) => void;
}

export const FloatingHUDActionMenu: React.FC<FloatingHUDActionMenuProps> = ({
  player: p,
  menuScale,
  homePlayers,
  awayPlayers,
  isMultiplayer,
  myRole,
  isMobile,
  updatePlayerActionType,
  updatePlayerBlocking,
  setCaptain,
}) => {

  const playersList = p.team === 'HOME' ? homePlayers : awayPlayers;
  const activeBlockers = playersList.filter(pl => pl.isBlocking).length;
  const availableBlockers = 3 - activeBlockers;

  const canShoot = p.position[2] >= 0;

  return (
    <div
      className="pointer-events-auto flex flex-col items-start select-none gap-1 w-[204px]"
      style={{
        position: 'absolute',
        left: isMobile ? '12px' : '24px',
        bottom: isMobile ? '12px' : '24px',
        transform: `scale(${menuScale})`,
        transformOrigin: 'left bottom',
        zIndex: 99999,
      }}
    >
      {/* ROW 1: Header com nome inteiro e capitão */}
      <div className="flex items-center gap-2 bg-zinc-950/95 border border-zinc-800/85 rounded-2xl px-3 py-2 shadow-[0_8px_25px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-scaleUp w-full">
        <div className="w-6 h-6 rounded-full bg-[#122e5d] border border-[#1e468a] flex items-center justify-center font-black text-[11px] text-white shadow-inner shrink-0">
          {p.number}
        </div>
        <span className="text-[9px] font-black tracking-wider text-zinc-200 uppercase whitespace-nowrap flex items-center gap-1.5">
          {p.number === 1 ? 'GOLEIRO' : 'JOGADOR EM CAMPO'}
          {p.number !== 1 && (
            <button
              disabled={p.isCaptain}
              onClick={(e) => {
                if (p.isCaptain) return;
                e.stopPropagation();
                SoundManager.playUIClick();
                setCaptain(p.id);
              }}
              className={`flex items-center justify-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-full transition-all duration-200 h-5 w-8 border ${
                p.isCaptain
                  ? 'text-amber-500 bg-amber-500/10 border-amber-500/35 shadow-[0_0_8px_rgba(245,158,11,0.2)] cursor-default'
                  : 'text-zinc-400 hover:text-amber-400 bg-zinc-900 border-zinc-700/60 hover:border-amber-500/40 cursor-pointer'
              }`}
              title={p.isCaptain ? "Capitão" : "Tornar Capitão"}
            >
              <Crown size={9} fill={p.isCaptain ? "currentColor" : "none"} />
              <span>C</span>
            </button>
          )}
        </span>
      </div>

      {/* ROW 2: Ações */}
      <div className="flex items-center gap-1.5 bg-zinc-950/95 border border-zinc-800/85 rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-scaleUp w-full justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); SoundManager.playUIClick(); updatePlayerActionType(p.id, 'PASS'); }}
          className={`flex flex-col items-center justify-center w-[60px] h-11 rounded-2xl border transition-all duration-200 ${p.actionType === 'PASS' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]' : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-900/60 border-transparent'}`}
          title="Passar"
        >
          <ArrowRight className="w-[14px] h-[14px]" />
          <span className="text-[6.5px] font-black tracking-widest mt-1">PASSAR</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); SoundManager.playUIClick(); updatePlayerActionType(p.id, 'CROSS'); }}
          className={`flex flex-col items-center justify-center w-[60px] h-11 rounded-2xl border transition-all duration-200 ${p.actionType === 'CROSS' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]' : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60 border-transparent'}`}
          title="Cruzar"
        >
          <NavIcon className="w-[14px] h-[14px] rotate-45" />
          <span className="text-[6.5px] font-black tracking-widest mt-1">CRUZAR</span>
        </button>

        <button
          disabled={!canShoot}
          onClick={(e) => { e.stopPropagation(); SoundManager.playUIClick(); updatePlayerActionType(p.id, 'SHOOT'); }}
          className={`flex flex-col items-center justify-center w-[60px] h-11 rounded-2xl border transition-all duration-200 ${!canShoot ? 'opacity-20 text-zinc-600 border-transparent cursor-not-allowed' : p.actionType === 'SHOOT' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.25)]' : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60 border-transparent'}`}
          title={canShoot ? 'Chutar' : 'Chutes bloqueados no seu próprio campo'}
        >
          <Target className="w-[14px] h-[14px]" />
          <span className="text-[6.5px] font-black tracking-widest mt-1">CHUTAR</span>
        </button>
      </div>

      {/* ROW 3: Bloq + Contador */}
      <div className="flex items-center gap-1.5 bg-zinc-950/95 border border-zinc-800/85 rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-scaleUp w-full">
        <button
          onClick={(e) => {
            e.stopPropagation();
            SoundManager.playUIClick();
            try { updatePlayerBlocking(p.id, !p.isBlocking); } catch (err: any) { if (err.message === 'LIMIT_EXCEEDED') SoundManager.playUIError(); }
          }}
          className={`flex flex-col items-center justify-center w-[93px] h-11 rounded-2xl border transition-all duration-200 ${p.isBlocking ? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/50 shadow-[0_0_8px_rgba(113,113,122,0.25)] font-black' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border-transparent'}`}
          title={`Bloquear jogada (${p.isBlocking ? 'Ativo' : 'Inativo'})`}
        >
          <Shield className="w-[14px] h-[14px]" />
          <span className="text-[6.5px] font-black tracking-widest mt-1">DEFENDER</span>
        </button>

        <div className="flex flex-col items-center justify-center w-[93px] h-11 rounded-2xl border border-zinc-900/50 bg-zinc-900/20 text-zinc-400 select-none">
          <div className="h-[14px] flex items-baseline justify-center gap-px">
            <span className="text-[13px] font-black text-zinc-100 leading-none">{availableBlockers}</span>
            <span className="text-[9px] font-black text-zinc-500 leading-none">/</span>
            <span className="text-[13px] font-black text-zinc-350 leading-none">3</span>
          </div>
          <span className="text-[6.5px] font-black text-zinc-500 tracking-widest mt-1">DISPONÍVEL</span>
        </div>
      </div>
    </div>
  );
};
