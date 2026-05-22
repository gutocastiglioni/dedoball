import React, { useState } from 'react';
import { useGameStateContext } from '../GameStateContext';
import { useIsMobile } from '../hooks/useIsMobile';
import SoundManager from '../SoundManager';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Target, 
  Diamond, 
  ShieldAlert, 
  Zap, 
  Timer, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Move
} from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const { activeUser, setHasSeenRules, rulesAutoTriggered } = useGameStateContext();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    SoundManager.playUIClick();
    if (currentPage < 5) {
      setCurrentPage(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    SoundManager.playUIClick();
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleClose = async () => {
    SoundManager.playUIClick();
    if (dontShowAgain) {
      await setHasSeenRules();
    }
    onClose();
  };

  const pages = [
    {
      title: "Controles & Direcionamento",
      subtitle: "Dominando as ações de mirar e chutar",
      icon: Target,
      color: "from-cyan-500 to-blue-600",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            {/* Visual Action Buttons Demo */}
            <div className="flex flex-wrap gap-2 justify-center max-w-xs bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
              {['PASS', 'CROSS', 'SHOOT', 'TACKLE'].map((action) => {
                const colors = {
                  PASS: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
                  CROSS: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20',
                  SHOOT: 'border-rose-500/30 text-rose-400 bg-rose-950/20',
                  TACKLE: 'border-purple-500/30 text-purple-400 bg-purple-950/20',
                }[action];
                const label = {
                  PASS: 'PASSE',
                  CROSS: 'CRUZAR',
                  SHOOT: 'CHUTAR',
                  TACKLE: 'DESARME',
                }[action];
                return (
                  <div key={action} className={`px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-widest ${colors} shadow-md`}>
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Visual Aiming Dots Demo */}
            <div className="flex flex-col items-center bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 max-w-[200px] relative overflow-hidden group">
              <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center font-black text-xs text-white shadow-[0_0_15px_rgba(30,55,153,0.6)]">
                10
              </div>
              <div className="w-[1px] h-14 border-l border-dashed border-cyan-400/80 my-1 relative flex flex-col justify-between items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping absolute -top-1"></span>
                <span className="w-1 h-1 rounded-full bg-cyan-400/80"></span>
                <span className="w-1 h-1 rounded-full bg-cyan-400/80"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute -bottom-1"></span>
              </div>
              <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Mira Visual</span>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              💡 <strong>Ações Disponíveis:</strong> Cada pino do seu time pode ser configurado para reagir de formas diferentes ao tocar na bola durante a partida:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2 text-[11px] md:text-xs">
              <li className="flex gap-1.5 items-start">
                <span className="text-emerald-400 font-extrabold">&bull;</span>
                <span><strong>PASSE:</strong> Disparo rasteiro e controlado buscando o companheiro mais próximo.</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-cyan-400 font-extrabold">&bull;</span>
                <span><strong>CRUZAMENTO:</strong> Lança a bola levantada, ideal para transpor bloqueios adversários.</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-rose-400 font-extrabold">&bull;</span>
                <span><strong>CHUTE:</strong> Força máxima direcionada rumo ao gol adversário.</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-purple-400 font-extrabold">&bull;</span>
                <span><strong>DESARME:</strong> Trava a bola rigidamente para neutralizar ataques e roubar a posse.</span>
              </li>
            </ul>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-[11px] leading-snug">
                ⚠️ <strong>MIRA E FORÇA:</strong> Os pontinhos de mira são apenas um <strong>guia visual</strong> para ajudar na precisão espacial, e <strong>NÃO</strong> alteram a velocidade ou força do peteleco!
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-purple-300 text-[11px] leading-snug">
                🛡️ <strong>ATÉ 3 BLOQUEADORES:</strong> Permite configurar <strong>até 3 jogadores</strong> em DESARME. Ao travar a bola, a jogada adversária é <strong>encerrada na hora</strong>, dando a vez e a posse a você!
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-[11px] leading-snug">
                ⚡ <strong>CUSTO DE PETELECOS:</strong> Cada lance comum <strong>gasta 1 peteleco</strong> (limite de 3). Porém, as saídas de jogo e pós-gol (<strong>Kickoffs</strong>) <strong>NÃO gastam petelecos</strong>!
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Posicionamento Tático",
      subtitle: "Organização defensiva e regras pós-gol",
      icon: Move,
      color: "from-emerald-500 to-teal-600",
      content: (
        <div className="space-y-4">
          <div className="flex gap-4 justify-center items-center">
            {/* Visual Slot Mini Demo */}
            <div className="flex gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-zinc-950 border-2 border-emerald-500/60 hover:border-emerald-400 flex items-center justify-center relative cursor-pointer group shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <span className="text-[7px] font-black text-zinc-550 uppercase tracking-widest">Green Slot</span>
              </div>

              <div className="w-[1px] bg-zinc-800 self-stretch"></div>

              <div className="flex flex-col items-center gap-1 relative">
                <Diamond size={14} className="text-cyan-400 absolute -top-3.5 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center font-black text-[9px] text-white shadow-lg">
                  C
                </div>
                <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">Capitão</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              🛡️ <strong>Preparação Tática:</strong> Durante a fase de preparação, você pode arrastar e soltar seus pinos de botão nos slots verdes brilhantes para montar sua muralha tática.
            </p>
            <p>
              ⚽ <strong>Regras após sofrer gols:</strong>
            </p>
            <ul className="space-y-2 pl-2 text-[11px] md:text-xs">
              <li className="flex gap-2 items-start">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-[9px]">1 GOL</span>
                <span>Se você sofrer apenas um gol, ganha o direito de mover **apenas o seu Capitão** (indicado pelo diamante brilhante no momento da seleção) para qualquer slot livre do seu campo para reajuste defensivo imediato.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black text-[9px]">2 GOLS CONSECUTIVOS</span>
                <span>Se o mesmo time sofrer dois gols seguidos sem reagir, a tática quebrou! **Ambos os jogadores** ganham o direito de reorganizar seus **times inteiros** livremente no campo.</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Paradas de Reposicionamento",
      subtitle: "Momentos táticos cruciais para reajuste de campo",
      icon: Timer,
      color: "from-indigo-500 to-purple-600",
      content: (
        <div className="space-y-4">
          <div className="flex gap-4 justify-center items-center">
            {/* Visual Stops Indicators */}
            <div className="grid grid-cols-3 gap-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 text-center max-w-sm w-full">
              <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-950/40 rounded-xl">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                </div>
                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-wide">Flicks Zerados</span>
              </div>
              
              <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-950/40 rounded-xl">
                <span className="text-lg"> whistle 🏁 </span>
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-wide">Halftime</span>
              </div>

              <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-950/40 rounded-xl">
                <span className="text-xs font-black text-rose-400">⚽ x2</span>
                <span className="text-[8px] font-black text-rose-400 uppercase tracking-wide">2 Gols Seguidos</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              🛑 <strong>Pausas Táticas:</strong> O jogo entrará em pausa automática para permitir a reorganização e reajuste posicional das equipes em 3 momentos específicos:
            </p>
            <ul className="space-y-2.5 pl-2 text-[11px] md:text-xs">
              <li className="flex gap-2 items-start">
                <span className="text-cyan-400 font-extrabold">1.</span>
                <span><strong>Petelecos Esgotados:</strong> Assim que ambos os jogadores completam sua sequência máxima de 3 flicks consecutivos, o jogo para para um novo reset e organização tática geral.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-amber-400 font-extrabold">2.</span>
                <span><strong>Halftime (Intervalo):</strong> Pausa clássica na metade da partida onde as equipes trocam de lado e podem redefinir toda a postura tática de campo.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-rose-400 font-extrabold">3.</span>
                <span><strong>Após 2 Gols Seguidos:</strong> O jogo para obrigatoriamente para permitir que o time castigado reorganize completamente suas linhas e evite goleadas desastrosas.</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Velocidade da Bola & Desgaste",
      subtitle: "Física agressiva e cansaço dos goleiros",
      icon: Zap,
      color: "from-orange-500 to-amber-600",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 items-center justify-center">
            {/* Visual speed multipliers */}
            <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-1 text-cyan-400 font-black animate-pulse">
                <Zap size={14} className="text-cyan-400" />
                <span className="text-xs">+ por Hit</span>
              </div>
              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest text-center">Velocidade da Bola</span>
            </div>

            {/* Visual goalkeeper fatigue */}
            <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-1 text-rose-400 font-black">
                <ShieldAlert size={14} className="text-rose-400 animate-bounce" />
                <span className="text-xs">- por Defesa</span>
              </div>
              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest text-center">Reação do Goleiro</span>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              🔥 <strong>Supervelocidade da Bola:</strong> A bola ganha **aceleração acumulada** a cada toque consecutivo feito pelos jogadores (sequência de hits). Tabelas rápidas transformam a bola em um verdadeiro foguete!
            </p>
            <p>
              🧤 <strong>Fadiga do Goleiro:</strong> Os goleiros não são máquinas! A cada defesa ou Save efetuado pelo goleiro individualmente, ele cansa e perde **velocidade de reação** na resposta daquele lance.
            </p>
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-350 text-[11px] leading-snug">
              🔄 <strong>RESET AUTOMÁTICO:</strong> Fique tranquilo! Ambos os valores (a supervelocidade da bola e a fadiga do goleiro) **são resetados instantaneamente ao valor padrão** assim que a bola parar completamente no campo.
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Regra das Faltas (Anti-Loop)",
      subtitle: "Evitando deadlocks físicos por design",
      icon: AlertTriangle,
      color: "from-rose-500 to-red-600",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center items-center">
            {/* Visual locked ball diagram */}
            <div className="relative bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 flex items-center justify-center w-full max-w-[240px] h-20 gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center font-bold text-[9px]">P1</div>
              <div className="w-4 h-4 rounded-full bg-white border border-zinc-400 flex items-center justify-center shadow-md animate-ping">⚽</div>
              <div className="w-6 h-6 rounded-full bg-zinc-850 border-2 border-zinc-700 flex items-center justify-center font-bold text-[9px]">P2</div>
              <div className="absolute inset-0 bg-rose-950/20 border border-rose-500/20 rounded-2xl flex items-center justify-center">
                <span className="px-2 py-0.5 rounded bg-rose-500 text-zinc-950 font-black tracking-widest text-[9px] uppercase animate-pulse flex items-center gap-1">
                  <ShieldAlert size={10} />
                  BOLA PRESA
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              ⚠️ <strong>Por que ocorrem faltas?</strong> As faltas são acionadas exclusivamente em situações muito específicas quando a bola fica **completamente presa ou travada** entre múltiplos pinos ou as paredes da arena.
            </p>
            <p>
              🔧 <strong>Mecanismo de Segurança:</strong> Esta regra foi projetada para **evitar loops infinitos ou loops de colisões mortais** que poderiam travar o motor de física do jogo e arruinar a experiência.
            </p>
            <p>
              🔄 <strong>Resgate Justo:</strong> O jogo resolverá a falta automaticamente redistribuindo as posições e devolvendo a posse de bola de forma limpa e justa, mantendo o jogo sempre fluído.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Tudo Pronto para o Jogo!",
      subtitle: "Como reabrir e preferências do tutorial",
      icon: CheckCircle2,
      color: "from-cyan-500 to-indigo-600",
      content: (
        <div className="space-y-5 py-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-cyan-950/60 border border-cyan-500 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <CheckCircle2 size={32} className="animate-bounce" />
            </div>
            <h4 className="text-sm font-black text-zinc-100 uppercase tracking-wide">Você está pronto!</h4>
            <p className="text-xs text-zinc-400 max-w-sm">
              Agora você conhece todas as regras essenciais que governam as táticas e físicas de Tableball.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl text-[11px] leading-relaxed text-zinc-350 flex items-start gap-2.5">
            <HelpCircle size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <p>
              Esqueceu de algo no meio da partida? Sem problemas! Você pode reabrir este manual de regras a qualquer momento clicando no botão <strong>Regras</strong> no menu principal ou acessando o botão <strong>Regras do Jogo</strong> dentro do painel de Ajustes ⚙️ (canto inferior esquerdo) enquanto joga.
            </p>
          </div>
        </div>
      )
    }
  ];

  const activePage = pages[currentPage];
  const IconComponent = activePage.icon;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
      <div className={`relative w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between animate-scaleUp ${isMobile ? 'h-full max-h-[92vh]' : 'h-[85vh] max-h-[580px]'}`}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activePage.color} flex items-center justify-center text-white shadow-lg`}>
              <IconComponent size={16} />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wider text-zinc-200 uppercase">{activePage.title}</h3>
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wide">{activePage.subtitle}</p>
            </div>
          </div>
          
          <button 
            onClick={handleClose}
            className="text-zinc-550 hover:text-zinc-300 p-2 rounded-lg hover:bg-zinc-900 transition-colors text-xs font-black"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 md:py-6 min-h-0 select-text">
          {activePage.content}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/40 flex-shrink-0 space-y-4">
          
          {/* Progress dots / pages bar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { SoundManager.playUIClick(); setCurrentPage(i); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentPage 
                      ? 'w-6 bg-cyan-400' 
                      : 'w-1.5 bg-zinc-800 hover:bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            <span className="text-[9px] font-black tracking-widest text-zinc-600 uppercase">
              Página {currentPage + 1} de {pages.length}
            </span>
          </div>

          {/* Buttons Navigation Row */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Always show Back button on all pages */}
            <button
              onClick={handleBack}
              disabled={currentPage === 0}
              className={`px-4 py-2 border rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 active:scale-98 ${
                currentPage === 0 
                  ? 'border-transparent text-zinc-700 bg-transparent cursor-default' 
                  : 'border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <ChevronLeft size={13} />
              Voltar
            </button>

            {/* Show "Don't show again" checkbox only on the last page AND if it was auto-triggered */}
            {currentPage === 5 && rulesAutoTriggered && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none group pointer-events-auto py-1 px-3 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-850/60 rounded-xl transition-all duration-200 shadow-md">
                <div className="relative w-8 h-4 flex items-center">
                  <input 
                    type="checkbox" 
                    checked={dontShowAgain}
                    onChange={(e) => { SoundManager.playUIClick(); setDontShowAgain(e.target.checked); }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-zinc-850 rounded-full border border-zinc-700/60 peer-checked:bg-cyan-500 peer-checked:border-cyan-400 transition-all duration-300"></div>
                  <div className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-zinc-500 peer-checked:bg-white peer-checked:translate-x-4 transition-all duration-300 shadow-sm"></div>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-wide leading-none">
                  Não mostrar novamente
                </span>
              </label>
            )}

            {/* Next / Finish button */}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black text-xs tracking-widest uppercase rounded-xl shadow-[0_4px_15px_rgba(6,182,212,0.3)] transition-all active:scale-98 flex items-center gap-1"
            >
              <span>{currentPage === 5 ? 'OK, ENTENDIDO!' : 'Avançar'}</span>
              {currentPage < 5 && <ChevronRight size={13} />}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RulesModal;
