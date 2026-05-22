import React from 'react';
import { Trophy, ShieldAlert, Sparkles, ChevronRight, Target, Network } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const TournamentTab: React.FC = () => {
  const isMobile = useIsMobile();

  const previewFeatures = [
    {
      icon: <Target className="text-amber-400" size={isMobile ? 14 : 18} />,
      title: 'Chaves Dinâmicas de 4 a 8 Jogadores',
      desc: 'Dispute torneios no modelo de mata-mata puro (quartas, semi e final) contra adversários reais ou IAs desafiadoras.'
    },
    {
      icon: <Network className="text-cyan-400" size={isMobile ? 14 : 18} />,
      title: 'Multiplayer Local & Online',
      desc: 'Crie copas privadas para jogar com amigos em rede ou dispute campeonatos públicos de nível internacional.'
    },
    {
      icon: <Trophy className="text-yellow-400" size={isMobile ? 14 : 18} />,
      title: 'Salão de Troféus Exclusivo',
      desc: 'Acumule taças lendárias e exiba conquistas únicas no seu perfil de jogador para todos os adversários.'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center items-center min-h-[300px] p-4 relative overflow-hidden select-none animate-fadeIn">
      {/* Ambient background glow effects */}
      <div className="absolute w-[200px] md:w-[350px] h-[200px] md:h-[350px] bg-yellow-500/5 rounded-full blur-[60px] md:blur-[100px] top-10 left-10 pointer-events-none animate-pulse"></div>
      <div className="absolute w-[200px] md:w-[350px] h-[200px] md:h-[350px] bg-cyan-500/5 rounded-full blur-[60px] md:blur-[100px] bottom-10 right-10 pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main Premium Card */}
      <div className={`relative max-w-lg w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center transition-all duration-500 hover:border-yellow-500/20
        ${isMobile ? 'p-5 rounded-2xl gap-4' : 'p-8 rounded-3xl gap-6'}
      `}>
        
        {/* Top Glowing Trophy Icon Container */}
        <div className="relative group">
          <div className="absolute inset-0 bg-yellow-500/25 rounded-full blur-xl animate-pulse group-hover:scale-110 transition-transform duration-300"></div>
          <div className={`relative rounded-full bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/40 text-yellow-400 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.25)] transition-all duration-500 group-hover:scale-105 group-hover:rotate-6
            ${isMobile ? 'w-16 h-16' : 'w-20 h-20'}
          `}>
            <Trophy size={isMobile ? 32 : 42} className="animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400"></span>
        </div>

        {/* Text Section */}
        <div className="space-y-2">
          {/* Coming Soon Glowing Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(234,179,8,0.15)] animate-pulse">
            <Sparkles size={10} />
            EM BREVE
          </div>

          <h2 className={`font-black italic tracking-tighter uppercase text-white bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent leading-tight
            ${isMobile ? 'text-2xl' : 'text-3xl'}
          `}>
            Copa Mata-Mata
          </h2>
          
          <p className={`text-zinc-400 font-medium leading-relaxed max-w-xs md:max-w-sm mx-auto
            ${isMobile ? 'text-[10px]' : 'text-xs'}
          `}>
            Nossa arena de torneios eliminatórios está sendo preparada para receber os maiores estrategistas do Dedobol. Forme suas chaves e dispute a taça suprema em breve!
          </p>
        </div>

        {/* Feature List Previews */}
        <div className="w-full text-left space-y-2.5 md:space-y-3 pt-2 border-t border-zinc-800/60">
          {previewFeatures.map((feat, idx) => (
            <div key={idx} className="flex gap-2.5 md:gap-3.5 items-start p-2 rounded-xl bg-zinc-950/20 border border-zinc-900/50 hover:bg-zinc-950/40 hover:border-zinc-800/40 transition-all duration-300">
              <div className="p-1.5 md:p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0">
                {feat.icon}
              </div>
              <div className="space-y-0.5">
                <h4 className={`font-black text-zinc-200 tracking-wide flex items-center gap-1
                  ${isMobile ? 'text-[9.5px]' : 'text-[11px]'}
                `}>
                  {feat.title}
                  <ChevronRight size={10} className="text-zinc-650" />
                </h4>
                <p className={`text-zinc-500 font-medium leading-snug
                  ${isMobile ? 'text-[8.5px]' : 'text-[9.5px]'}
                `}>
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Status Row */}
        <div className={`w-full flex items-center justify-center gap-2 bg-zinc-950/50 border border-zinc-900 py-2.5 rounded-xl text-zinc-500 font-bold uppercase tracking-wider
          ${isMobile ? 'text-[8px]' : 'text-[9.5px]'}
        `}>
          <ShieldAlert size={isMobile ? 11 : 13} className="text-yellow-500 animate-pulse" />
          <span>Fase de Testes Internos: Disponível na v0.3.0</span>
        </div>
      </div>
    </div>
  );
};

export default TournamentTab;
