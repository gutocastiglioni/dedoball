import React from 'react';
import SoundManager from '../../SoundManager';

interface ProfileIdentityProps {
  editUsername: string;
  setEditUsername: (val: string) => void;
  editTeamName: string;
  setEditTeamName: (val: string) => void;
  editAbbreviation: string;
  setEditAbbreviation: (val: string) => void;
  logoPreview: string | null;
  setLogoPreview: (val: string | null) => void;
  setSelectedLogoBlob: (val: Blob | null) => void;
  saveError: string | null;
  isMobile: boolean;
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileIdentity: React.FC<ProfileIdentityProps> = ({
  editUsername,
  setEditUsername,
  editTeamName,
  setEditTeamName,
  editAbbreviation,
  setEditAbbreviation,
  logoPreview,
  setLogoPreview,
  setSelectedLogoBlob,
  saveError,
  isMobile,
  handleLogoChange
}) => {
  return (
    <div className="space-y-4 overflow-y-auto pr-1 flex-1">
      {/* Identity Section */}
      <div className="space-y-3">
        <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block">Identidade</span>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Apelido</label>
            <input
              type="text"
              value={editUsername}
              onChange={e => setEditUsername(e.target.value)}
              maxLength={24}
              placeholder="Seu apelido..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-200 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Nome do Time</label>
            <input
              type="text"
              value={editTeamName}
              onChange={e => setEditTeamName(e.target.value)}
              maxLength={30}
              placeholder="Nome do seu clube..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-200 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Sigla do Time (3 letras)</label>
            <input
              type="text"
              value={editAbbreviation}
              onChange={e => {
                const val = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
                setEditAbbreviation(val.substring(0, 3));
              }}
              maxLength={3}
              placeholder="Ex: CAL, FLA, COR..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-200 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="space-y-3 pt-4 border-t border-zinc-900/60">
        <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block">Logo do Clube</span>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-[9px] text-zinc-500 font-semibold leading-snug">Imagem quadrada. Máx 2MB. Será reduzida automaticamente para 256×256px.</p>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {logoPreview ? 'Trocar Imagem' : 'Selecionar Imagem'}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { SoundManager.playUIClick(); setLogoPreview(null); setSelectedLogoBlob(null); }}
                  className="text-[10px] text-rose-500 hover:text-rose-455 font-bold transition-colors ml-1"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl text-rose-350 text-[10px] leading-relaxed font-bold animate-fadeIn">
          ⚠️ {saveError}
        </div>
      )}
    </div>
  );
};
