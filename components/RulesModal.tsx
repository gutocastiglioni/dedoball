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
  const { activeUser, setHasSeenRules, rulesAutoTriggered, language, t } = useGameStateContext();
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
      title: language === 'pt' ? "Controles & Direcionamento" : "Controls & Aiming",
      subtitle: language === 'pt' ? "Dominando as ações de mirar e chutar" : "Mastering aiming and shooting actions",
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
                  PASS: language === 'pt' ? 'PASSE' : 'PASS',
                  CROSS: language === 'pt' ? 'CRUZAR' : 'CROSS',
                  SHOOT: language === 'pt' ? 'CHUTAR' : 'SHOOT',
                  TACKLE: language === 'pt' ? 'DESARME' : 'TACKLE',
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
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute -bottom-1"></span>
              </div>
              <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">
                {language === 'pt' ? 'Mira Visual' : 'Visual Aiming'}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              💡 <strong>{language === 'pt' ? 'Ações Disponíveis:' : 'Available Actions:'}</strong> {language === 'pt' ? 'Cada pino do seu time pode ser configurado para reagir de formas diferentes ao tocar na bola durante a partida:' : 'Each button of your team can be configured to react in different ways when touching the ball during the match:'}
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2 text-[11px] md:text-xs">
              <li className="flex gap-1.5 items-start">
                <span className="text-emerald-400 font-extrabold">&bull;</span>
                <span><strong>{language === 'pt' ? 'PASSE' : 'PASS'}:</strong> {language === 'pt' ? 'Disparo rasteiro e controlado buscando o companheiro mais próximo.' : 'Low and controlled shot looking for the nearest teammate.'}</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-cyan-400 font-extrabold">&bull;</span>
                <span><strong>{language === 'pt' ? 'CRUZAMENTO' : 'CROSS'}:</strong> {language === 'pt' ? 'Lança a bola levantada, ideal para transpor bloqueios adversários.' : 'Launches a raised ball, ideal for bypassing opponent blockers.'}</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-rose-400 font-extrabold">&bull;</span>
                <span><strong>{language === 'pt' ? 'CHUTE' : 'SHOOT'}:</strong> {language === 'pt' ? 'Força máxima direcionada rumo ao gol adversário.' : 'Maximum strength directed towards the opponent\'s goal.'}</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-purple-400 font-extrabold">&bull;</span>
                <span><strong>{language === 'pt' ? 'DESARME' : 'TACKLE'}:</strong> {language === 'pt' ? 'Trava a bola rigidamente para neutralizar ataques e roubar a posse.' : 'Strictly locks the ball to neutralize attacks and steal possession.'}</span>
              </li>
            </ul>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-[11px] leading-snug">
                ⚠️ <strong>{language === 'pt' ? 'MIRA E FORÇA:' : 'AIMING & POWER:'}</strong> {language === 'pt' ? 'Os pontinhos de mira são apenas um guia visual para ajudar na precisão espacial, e NÃO alteram a velocidade ou força do peteleco!' : 'Aiming dots are just a visual guide to help with spatial precision, and do NOT alter the flick\'s speed or power!'}
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-purple-300 text-[11px] leading-snug">
                🛡️ <strong>{language === 'pt' ? 'ATÉ 3 BLOQUEADORES:' : 'UP TO 3 BLOCKERS:'}</strong> {language === 'pt' ? 'Permite configurar até 3 jogadores em DESARME. Ao travar a bola, a jogada adversária é encerrada na hora, dando a vez e a posse a você!' : 'Allows configuring up to 3 players in TACKLE. When locking the ball, the opponent\'s play is immediately ended, giving you the turn and possession!'}
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-[11px] leading-snug">
                ⚡ <strong>{language === 'pt' ? 'CUSTO DE PETELECOS:' : 'FLICK COST:'}</strong> {language === 'pt' ? 'Cada lance comum gasta 1 peteleco (limite de 3). Porém, as saídas de jogo e pós-gol (Kickoffs) NÃO gastam petelecos!' : 'Each regular shot costs 1 flick (limit of 3). However, kickoffs and post-goal kickoffs (Kickoffs) do NOT consume flicks!'}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: language === 'pt' ? "Posicionamento Tático" : "Tactical Positioning",
      subtitle: language === 'pt' ? "Organização defensiva e regras pós-gol" : "Defensive organization and post-goal rules",
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
                <span className="text-[7px] font-black text-zinc-550 uppercase tracking-widest">
                  {language === 'pt' ? 'Slot Verde' : 'Green Slot'}
                </span>
              </div>

              <div className="w-[1px] bg-zinc-800 self-stretch"></div>

              <div className="flex flex-col items-center gap-1 relative">
                <Diamond size={14} className="text-cyan-400 absolute -top-3.5 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center font-black text-[9px] text-white shadow-lg">
                  C
                </div>
                <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">
                  {language === 'pt' ? 'Capitão' : 'Captain'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              🛡️ <strong>{language === 'pt' ? 'Preparação Tática:' : 'Tactical Preparation:'}</strong> {language === 'pt' ? 'No início da partida e em resets gerais, você tem um tempo limite de 2 minutos (120 segundos) para arrastar e soltar seus pinos de botão nos slots verdes brilhantes e montar sua muralha tática.' : 'At the start of the match and general resets, you have a time limit of 2 minutes (120 seconds) to drag and drop your buttons into the glowing green slots and build your tactical wall.'}
            </p>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-350 text-[11px] leading-snug flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-extrabold mt-0.5">⚠️</span>
                <span><strong>{language === 'pt' ? 'FORMAÇÃO OBRIGATÓRIA:' : 'MANDATORY FORMATION:'}</strong> {language === 'pt' ? 'É obrigatório posicionar pelo menos 1 jogador de linha no ataque e pelo menos 1 jogador de linha no meio-campo.' : 'It is mandatory to position at least 1 field player in attack and at least 1 field player in midfield.'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-extrabold mt-0.5">🛡️</span>
                <span><strong>{language === 'pt' ? 'LINHA EXTRA DEFENSIVA:' : 'EXTRA DEFENSIVE LINE:'}</strong> {language === 'pt' ? 'Não se pode colocar mais que 2 jogadores de defesa na sua linha extra de defesa (logo à frente da área).' : 'You cannot place more than 2 defending players in your extra defensive line (just ahead of the penalty area).'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-extrabold mt-0.5">🔥</span>
                <span><strong>{language === 'pt' ? 'LIMITE DE ATAQUE:' : 'ATTACK LIMIT:'}</strong> {language === 'pt' ? 'É permitido posicionar no máximo 3 jogadores de linha na zona de ataque (linha de ataque + linha extra do adversário).' : 'It is allowed to position at most 3 field players in the attacking zone (attack line + opponent\'s extra line).'}</span>
              </div>
            </div>
            <p>
              ⚽ <strong>{language === 'pt' ? 'Regras após sofrer gols (Multiplayer):' : 'Rules after conceding goals (Multiplayer):'}</strong>
            </p>
            <ul className="space-y-2 pl-2 text-[11px] md:text-xs">
              <li className="flex gap-2 items-start">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-[9px]">{language === 'pt' ? '1 GOL' : '1 GOAL'}</span>
                <span>{language === 'pt' ? 'Se você sofrer apenas um gol, ganha o direito de mover apenas o seu Capitão (indicado pelo diamante brilhante, com cronômetro de 30 segundos de tempo limite) para qualquer slot livre do seu campo para reajuste defensivo imediato.' : 'If you concede only one goal, you gain the right to move only your Captain (indicated by the glowing diamond, with a 30-second time limit) to any free slot in your field for immediate defensive adjustment.'}</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black text-[9px]">{language === 'pt' ? '2 GOLS CONSECUTIVOS' : '2 CONSECUTIVE GOALS'}</span>
                <span>{language === 'pt' ? 'Se o mesmo time sofrer dois gols seguidos sem reagir, a tática quebrou! Ambos os jogadores ganham o direito de reorganizar seus times inteiros livremente no campo (com cronômetro de 2 minutos).' : 'If the same team concedes two consecutive goals without reacting, the tactics broke! Both players gain the right to reorganize their entire teams freely on the field (with a 2-minute timer).'}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: language === 'pt' ? "Paradas de Reposicionamento" : "Repositioning Pauses",
      subtitle: language === 'pt' ? "Momentos táticos cruciais para reajuste de campo" : "Crucial tactical moments for field adjustment",
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
                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-wide">
                  {language === 'pt' ? 'Petelecos Zerados' : 'Flicks Exhausted'}
                </span>
              </div>
              
              <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-950/40 rounded-xl">
                <span className="text-lg"> whistle 🏁 </span>
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-wide">Halftime</span>
              </div>

              <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-950/40 rounded-xl">
                <span className="text-xs font-black text-rose-400">⚽ x2</span>
                <span className="text-[8px] font-black text-rose-400 uppercase tracking-wide">
                  {language === 'pt' ? '2 Gols Seguidos' : '2 Consecutive Goals'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              🛑 <strong>{language === 'pt' ? 'Pausas Táticas (Restrições de Tempo):' : 'Tactical Pauses (Time Restrictions):'}</strong> {language === 'pt' ? 'O jogo entrará em pausa automática para permitir a reorganização e reajuste posicional das equipes (com cronômetro de 2 minutos ou 120 segundos para confirmação) em 3 momentos específicos:' : 'The game will automatically pause to allow the reorganization and positional adjustment of the teams (with a 2-minute or 120-second confirmation timer) in 3 specific moments:'}
            </p>
            <ul className="space-y-2.5 pl-2 text-[11px] md:text-xs">
              <li className="flex gap-2 items-start">
                <span className="text-cyan-400 font-extrabold">1.</span>
                <span><strong>{language === 'pt' ? 'Petelecos Esgotados:' : 'Flicks Exhausted:'}</strong> {language === 'pt' ? 'Assim que ambos os jogadores completam sua sequência máxima de 3 flicks consecutivos, o jogo para para um novo reset e organização tática geral (tempo limite de 2 minutos).' : 'As soon as both players complete their maximum sequence of 3 consecutive flicks, the game stops for a new reset and general tactical organization (2-minute time limit).'}</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-amber-400 font-extrabold">2.</span>
                <span><strong>{language === 'pt' ? 'Halftime (Intervalo):' : 'Halftime:'}</strong> {language === 'pt' ? 'Pausa clássica na metade da partida onde as equipes trocam de lado e podem redefinir toda a postura tática de campo (tempo limite de 2 minutos).' : 'Classic pause in the middle of the match where teams swap sides and can redefine their entire tactical stance on the field (2-minute time limit).'}</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-rose-400 font-extrabold">3.</span>
                <span><strong>{language === 'pt' ? 'Após 2 Gols Seguidos:' : 'After 2 Consecutive Goals:'}</strong> {language === 'pt' ? 'O jogo para obrigatoriamente para permitir que o time castigado reorganize completamente suas linhas e evite goleadas desastrosas (tempo limite de 2 minutos).' : 'The game must stop to allow the punished team to completely reorganize their lines and avoid disastrous blowouts (2-minute time limit).'}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: language === 'pt' ? "Velocidade da Bola & Desgaste" : "Ball Speed & Fatigue",
      subtitle: language === 'pt' ? "Física agressiva e cansaço dos goleiros" : "Aggressive physics and goalkeeper fatigue",
      icon: Zap,
      color: "from-orange-500 to-amber-600",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 items-center justify-center">
            {/* Visual speed multipliers */}
            <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-1 text-cyan-400 font-black animate-pulse">
                <Zap size={13} className="text-cyan-400" />
                <span className="text-[10px] md:text-xs">{language === 'pt' ? '+ por Toque' : '+ per Touch'}</span>
              </div>
              <span className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">
                {language === 'pt' ? 'Supervelocidade' : 'Super Speed'}
              </span>
            </div>

            {/* Visual goalkeeper abilities */}
            <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-1 text-emerald-400 font-black">
                <BookOpen size={13} className="text-emerald-400" />
                <span className="text-[10px] md:text-xs">{language === 'pt' ? 'Defesa / Estouro' : 'Save / Clearance'}</span>
              </div>
              <span className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">
                {language === 'pt' ? 'Habilidades Especiais' : 'Special Abilities'}
              </span>
            </div>

            {/* Visual goalkeeper fatigue */}
            <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-1 text-rose-400 font-black">
                <ShieldAlert size={13} className="text-rose-400 animate-bounce" />
                <span className="text-[10px] md:text-xs">{language === 'pt' ? '- por Defesa' : '- per Save'}</span>
              </div>
              <span className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">
                {language === 'pt' ? 'Cansaço (Fadiga)' : 'Fatigue'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              🔥 <strong>{language === 'pt' ? 'Supervelocidade & Fadiga:' : 'Super Speed & Fatigue:'}</strong> {language === 'pt' ? 'A bola ganha aceleração acumulada a cada toque consecutivo feito pelos jogadores, enquanto o Goleiro perde velocidade de reação a cada defesa realizada. Ambos resetam assim que a bola parar!' : 'The ball gains accumulated acceleration with each consecutive touch made by players, while the Goalkeeper loses reaction speed with each save made. Both reset as soon as the ball stops!'}
            </p>

            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={12} /> {language === 'pt' ? 'Habilidades do Goleiro (Evitando o Swarming)' : 'Goalkeeper Abilities (Avoiding Swarming)'}
              </h4>
              <ul className="space-y-2 text-[11px] md:text-xs leading-snug">
                <li className="flex gap-2 items-start">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[9px] uppercase tracking-wider flex-shrink-0">
                    {language === 'pt' ? 'Defesa' : 'Save'}
                  </span>
                  <span>{language === 'pt' ? 'Em ataques oponentes, o goleiro tem chance de segurar/bloquear a bola completamente (igual a um pino de Desarme), parando a jogada do rival e garantindo a posse sob seu controle para fazer um passe limpo e controlado!' : 'On opponent attacks, the goalkeeper has a chance to catch/block the ball completely (similar to a Tackle button), stopping the rival\'s play and securing possession under his control to make a clean, controlled pass!'}</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-[9px] uppercase tracking-wider flex-shrink-0">
                    {language === 'pt' ? 'Estouro' : 'Clearance'}
                  </span>
                  <span>{language === 'pt' ? 'O goleiro tem chance de isolar a bola para o campo de ataque adversário (Chutão), aliviando o sufoco com um balão alto e curvo que aterrissa estrategicamente entre o meio-campo e a grande área do rival!' : 'The goalkeeper has a chance to clear the ball to the opponent\'s attacking field (Big Kick), relieving pressure with a high, curved ball that lands strategically between the rival\'s midfield and penalty area!'}</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black text-[9px] uppercase tracking-wider flex-shrink-0">
                    {language === 'pt' ? 'Recuo Seguro' : 'Safe Backpass'}
                  </span>
                  <span>{language === 'pt' ? 'Ao tocar a bola intencionalmente para o seu próprio goleiro (recuo), ele nunca fará o bloqueio de Defesa (para não paralisar o seu ataque), mas a chance de Estouro (Chutão) para longe sobe significativamente!' : 'When intentionally passing the ball to your own goalkeeper (backpass), he will never make a Save block (so as not to paralyze your attack), but the chance of Clearance (Big Kick) increases significantly!'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: language === 'pt' ? "Regra das Faltas (Anti-Loop)" : "Foul Rule (Anti-Loop)",
      subtitle: language === 'pt' ? "Evitando deadlocks físicos por design" : "Avoiding physical deadlocks by design",
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
                  {language === 'pt' ? 'BOLA PRESA' : 'LOCKED BALL'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
            <p>
              ⚠️ <strong>{language === 'pt' ? 'Por que ocorrem faltas?' : 'Why do fouls occur?'}</strong> {language === 'pt' ? 'As faltas são acionadas exclusivamente em situações muito específicas quando a bola fica completamente presa ou travada entre múltiplos pinos ou as paredes da arena.' : 'Fouls are triggered exclusively in very specific situations when the ball is completely stuck or locked between multiple buttons or the arena walls.'}
            </p>
            <p>
              🔧 <strong>{language === 'pt' ? 'Mecanismo de Segurança:' : 'Safety Mechanism:'}</strong> {language === 'pt' ? 'Esta regra foi projetada para evitar loops infinitos ou loops de colisões mortais que poderiam travar o motor de física do jogo e arruinar a experiência.' : 'This rule was designed to avoid infinite loops or deadly collision loops that could crash the game\'s physics engine and ruin the experience.'}
            </p>
            <p>
              🔄 <strong>{language === 'pt' ? 'Resgate Justo:' : 'Fair Rescue:'}</strong> {language === 'pt' ? 'O jogo resolverá a falta automaticamente redistribuindo as posições e devolvendo a posse de bola de forma limpa e justa, mantendo o jogo sempre fluído.' : 'The game will resolve the foul automatically by redistributing positions and returning ball possession cleanly and fairly, keeping the game always fluid.'}
            </p>
          </div>
        </div>
      )
    },
    {
      title: language === 'pt' ? "Tudo Pronto para o Jogo!" : "All Ready for the Game!",
      subtitle: language === 'pt' ? "Como reabrir e preferências do tutorial" : "How to reopen and tutorial preferences",
      icon: CheckCircle2,
      color: "from-cyan-500 to-indigo-600",
      content: (
        <div className="space-y-5 py-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-cyan-950/60 border border-cyan-500 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <CheckCircle2 size={32} className="animate-bounce" />
            </div>
            <h4 className="text-sm font-black text-zinc-100 uppercase tracking-wide">
              {language === 'pt' ? 'Você está pronto!' : 'You are ready!'}
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm">
              {language === 'pt' ? 'Agora você conhece todas as regras essenciais que governam as táticas e físicas de Tableball.' : 'Now you know all the essential rules governing Tableball tactics and physics.'}
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl text-[11px] leading-relaxed text-zinc-350 flex items-start gap-2.5">
            <HelpCircle size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <p>
              {language === 'pt' ? (
                <>Esqueceu de algo no meio da partida? Sem problemas! Você pode reabrir este manual de regras a qualquer momento clicando no botão <strong>Regras</strong> no menu principal ou acessando o botão <strong>Regras do Jogo</strong> dentro do painel de Ajustes ⚙️ (canto inferior esquerdo) enquanto joga.</>
              ) : (
                <>Forgot something in the middle of the match? No problem! You can reopen this rule manual at any time by clicking the <strong>Rules</strong> button in the main menu or accessing the <strong>Game Rules</strong> button inside the Settings ⚙️ panel (bottom-left corner) while playing.</>
              )}
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
            className="text-zinc-555 hover:text-zinc-300 p-2 rounded-lg hover:bg-zinc-900 transition-colors text-xs font-black"
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

            <span className="text-[9px] font-black tracking-widest text-zinc-650 uppercase">
              {t('rules.pageTitle', { current: currentPage + 1, total: pages.length })}
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
                  ? 'border-transparent text-zinc-750 bg-transparent cursor-default' 
                  : 'border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <ChevronLeft size={13} />
              {t('rules.back')}
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
                  {t('rules.dontShowAgain')}
                </span>
              </label>
            )}

            {/* Next / Finish button */}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black text-xs tracking-widest uppercase rounded-xl shadow-[0_4px_15px_rgba(6,182,212,0.3)] transition-all active:scale-98 flex items-center gap-1"
            >
              <span>{currentPage === 5 ? t('rules.finish') : t('rules.next')}</span>
              {currentPage < 5 && <ChevronRight size={13} />}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RulesModal;
