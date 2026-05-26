import React from 'react';
import SoundManager from '../../SoundManager';

interface ProfileUniformEditorProps {
  selectedUniformItem: 'shirt' | 'shorts' | 'socks';
  isMobile: boolean;
  
  // Shirt active states
  activePrimaryColor: string;
  setActivePrimaryColor: (val: string) => void;
  activeSecondaryColor: string;
  setActiveSecondaryColor: (val: string) => void;
  activePattern: 'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross';
  setActivePattern: (val: 'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross') => void;

  // Shorts active states
  activeShortsColor: string;
  setActiveShortsColor: (val: string) => void;
  activeShortsSecondaryColor: string;
  setActiveShortsSecondaryColor: (val: string) => void;
  activeShortsPattern: 'solid' | 'side-stripes' | 'three-stripes' | 'two-tone';
  setActiveShortsPattern: (val: 'solid' | 'side-stripes' | 'three-stripes' | 'two-tone') => void;

  // Socks active states
  activeSocksColor: string;
  setActiveSocksColor: (val: string) => void;
  activeSocksSecondaryColor: string;
  setActiveSocksSecondaryColor: (val: string) => void;
  activeSocksPattern: 'solid' | 'hoops' | 'three-stripes' | 'two-tone';
  setActiveSocksPattern: (val: 'solid' | 'hoops' | 'three-stripes' | 'two-tone') => void;
}

export const ProfileUniformEditor: React.FC<ProfileUniformEditorProps> = ({
  selectedUniformItem,
  isMobile,
  
  activePrimaryColor,
  setActivePrimaryColor,
  activeSecondaryColor,
  setActiveSecondaryColor,
  activePattern,
  setActivePattern,

  activeShortsColor,
  setActiveShortsColor,
  activeShortsSecondaryColor,
  setActiveShortsSecondaryColor,
  activeShortsPattern,
  setActiveShortsPattern,

  activeSocksColor,
  setActiveSocksColor,
  activeSocksSecondaryColor,
  setActiveSocksSecondaryColor,
  activeSocksPattern,
  setActiveSocksPattern
}) => {
  return (
    <div className={`flex-1 min-h-0 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl flex flex-col justify-start overflow-hidden ${
      isMobile ? 'p-3 space-y-2.5' : 'p-4 space-y-4'
    }`}>
      
      {/* ── Shirt Customizer Controls ── */}
      {selectedUniformItem === 'shirt' && (
        <div className={`flex-1 flex flex-col min-h-0 animate-fadeIn ${
          isMobile ? 'space-y-2.5' : 'space-y-3.5'
        }`}>
          {/* Shirt Colors */}
          <div className="space-y-2 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 block">Cores da Camisa</span>
            <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-3'}`}>
              {[
                { label: 'Cor Primária', value: activePrimaryColor, setter: setActivePrimaryColor },
                { label: 'Cor Secundária', value: activeSecondaryColor, setter: setActiveSecondaryColor },
              ].map(({ label, value, setter }) => (
                <div key={label} className={`flex items-center bg-zinc-900 border border-zinc-800/80 rounded-xl ${
                  isMobile ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2'
                }`}>
                  <div className={`relative rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 cursor-pointer ${
                    isMobile ? 'w-6 h-6' : 'w-7 h-7'
                  }`} style={{ backgroundColor: value }}>
                    <input 
                      type="color" 
                      value={value} 
                      onChange={e => setter(e.target.value)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wide leading-none">{label}</p>
                    <p className={`text-zinc-300 font-mono mt-0.5 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>{value.toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shirt Pattern */}
          <div className={`flex-1 flex flex-col min-h-0 ${isMobile ? 'space-y-1.5' : 'space-y-2'}`}>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 block flex-shrink-0">Padrão da Camisa</span>
            <div className={`grid grid-cols-3 gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin ${
              isMobile ? 'max-h-[96px]' : ''
            }`}>
              {[
                { id: 'solid',          label: 'Liso' },
                { id: 'vertical',       label: '2 Listras V.' },
                { id: 'three-stripes-v',label: '3 Listras V.' },
                { id: 'horizontal',     label: '2 Listras H.' },
                { id: 'three-stripes-h',label: '3 Listras H.' },
                { id: 'center-band',    label: 'Faixa Centro' },
                { id: 'side-stripes',   label: 'Laterais' },
                { id: 'sash',           label: 'Diagonal' },
                { id: 'x',              label: 'Cruz (X)' },
                { id: 'cross',          label: 'Cruz Vert.' },
                { id: 'sash-cross',     label: 'Cruz e Faixa' },
              ].map(p => (
                <button 
                  key={p.id} 
                  type="button"
                  onClick={() => { SoundManager.playUIClick(); setActivePattern(p.id as any); }}
                  className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                    activePattern === p.id
                      ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Shorts Customizer Controls ── */}
      {selectedUniformItem === 'shorts' && (
        <div className={`flex-1 flex flex-col min-h-0 animate-fadeIn ${
          isMobile ? 'space-y-2.5' : 'space-y-3.5'
        }`}>
          {/* Shorts Colors */}
          <div className="space-y-2 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 block">Cores do Calção</span>
            <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-3'}`}>
              {[
                { label: 'Cor Principal', value: activeShortsColor, setter: setActiveShortsColor },
                { label: 'Cor Detalhe', value: activeShortsSecondaryColor, setter: setActiveShortsSecondaryColor },
              ].map(({ label, value, setter }) => (
                <div key={label} className={`flex items-center bg-zinc-900 border border-zinc-800/80 rounded-xl ${
                  isMobile ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2'
                }`}>
                  <div className={`relative rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 cursor-pointer ${
                    isMobile ? 'w-6 h-6' : 'w-7 h-7'
                  }`} style={{ backgroundColor: value }}>
                    <input 
                      type="color" 
                      value={value} 
                      onChange={e => setter(e.target.value)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wide leading-none">{label}</p>
                    <p className={`text-zinc-300 font-mono mt-0.5 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>{value.toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shorts Pattern */}
          <div className={`flex-1 flex flex-col min-h-0 ${isMobile ? 'space-y-1.5' : 'space-y-2'}`}>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 block flex-shrink-0">Padrão do Calção</span>
            <div className={`grid grid-cols-2 gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin ${
              isMobile ? 'max-h-[96px]' : ''
            }`}>
              {[
                { id: 'solid', label: 'Liso' },
                { id: 'side-stripes', label: 'Listras Lat.' },
                { id: 'three-stripes', label: '3 Listras' },
                { id: 'two-tone', label: 'Bicolor' },
              ].map(p => (
                <button 
                  key={p.id} 
                  type="button"
                  onClick={() => { SoundManager.playUIClick(); setActiveShortsPattern(p.id as any); }}
                  className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                    activeShortsPattern === p.id
                      ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Socks Customizer Controls ── */}
      {selectedUniformItem === 'socks' && (
        <div className={`flex-1 flex flex-col min-h-0 animate-fadeIn ${
          isMobile ? 'space-y-2.5' : 'space-y-3.5'
        }`}>
          {/* Socks Colors */}
          <div className="space-y-2 flex-shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 block">Cores das Meias</span>
            <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-3'}`}>
              {[
                { label: 'Cor Principal', value: activeSocksColor, setter: setActiveSocksColor },
                { label: 'Cor Detalhe', value: activeSocksSecondaryColor, setter: setActiveSocksSecondaryColor },
              ].map(({ label, value, setter }) => (
                <div key={label} className={`flex items-center bg-zinc-900 border border-zinc-800/80 rounded-xl ${
                  isMobile ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2'
                }`}>
                  <div className={`relative rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 cursor-pointer ${
                    isMobile ? 'w-6 h-6' : 'w-7 h-7'
                  }`} style={{ backgroundColor: value }}>
                    <input 
                      type="color" 
                      value={value} 
                      onChange={e => setter(e.target.value)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wide leading-none">{label}</p>
                    <p className={`text-zinc-300 font-mono mt-0.5 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>{value.toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Socks Pattern */}
          <div className={`flex-1 flex flex-col min-h-0 ${isMobile ? 'space-y-1.5' : 'space-y-2'}`}>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 block flex-shrink-0">Padrão das Meias</span>
            <div className={`grid grid-cols-2 gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin ${
              isMobile ? 'max-h-[96px]' : ''
            }`}>
              {[
                { id: 'solid', label: 'Liso' },
                { id: 'hoops', label: '3 Faixas' },
                { id: 'three-stripes', label: '3 Listras' },
                { id: 'two-tone', label: 'Bicolor' },
              ].map(p => (
                <button 
                  key={p.id} 
                  type="button"
                  onClick={() => { SoundManager.playUIClick(); setActiveSocksPattern(p.id as any); }}
                  className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                    activeSocksPattern === p.id
                      ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
