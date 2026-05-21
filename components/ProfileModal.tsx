import React, { useState, useEffect } from 'react';
import { useGameStateContext } from '../GameStateContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { auth, db, ref, onValue, onAuthStateChanged } from '../firebase';
import { Crown } from 'lucide-react';
import SoundManager from '../SoundManager';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { activeUser } = useGameStateContext();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<any>(null);

  // Profile & Kit Customizer Modal States
  const [editUsername, setEditUsername] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editAbbreviation, setEditAbbreviation] = useState('');
  
  // Home uniform states
  const [editPrimaryColor, setEditPrimaryColor] = useState('#1e3799');
  const [editSecondaryColor, setEditSecondaryColor] = useState('#ffffff');
  const [editPattern, setEditPattern] = useState<'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross'>('solid');
  const [editShortsColor, setEditShortsColor] = useState('#ffffff');
  const [editShortsSecondaryColor, setEditShortsSecondaryColor] = useState('#1e3799');
  const [editShortsPattern, setEditShortsPattern] = useState<'solid' | 'side-stripes' | 'three-stripes' | 'two-tone'>('solid');
  const [editSocksColor, setEditSocksColor] = useState('#1e3799');
  const [editSocksSecondaryColor, setEditSocksSecondaryColor] = useState('#ffffff');
  const [editSocksPattern, setEditSocksPattern] = useState<'solid' | 'hoops' | 'three-stripes' | 'two-tone'>('solid');

  // Away uniform states
  const [editAwayPrimaryColor, setEditAwayPrimaryColor] = useState('#e55039');
  const [editAwaySecondaryColor, setEditAwaySecondaryColor] = useState('#f6b93b');
  const [editAwayPattern, setEditAwayPattern] = useState<'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross'>('solid');
  const [editAwayShortsColor, setEditAwayShortsColor] = useState('#1e272e');
  const [editAwayShortsSecondaryColor, setEditAwayShortsSecondaryColor] = useState('#e55039');
  const [editAwayShortsPattern, setEditAwayShortsPattern] = useState<'solid' | 'side-stripes' | 'three-stripes' | 'two-tone'>('solid');
  const [editAwaySocksColor, setEditAwaySocksColor] = useState('#e55039');
  const [editAwaySocksSecondaryColor, setEditAwaySocksSecondaryColor] = useState('#f6b93b');
  const [editAwaySocksPattern, setEditAwaySocksPattern] = useState<'solid' | 'hoops' | 'three-stripes' | 'two-tone'>('solid');

  const [currentKitType, setCurrentKitType] = useState<'home' | 'away'>('home');
  const [selectedUniformItem, setSelectedUniformItem] = useState<'shirt' | 'shorts' | 'socks'>('shirt');

  // Compute active editor fields based on selected tab (Home or Away)
  const activePrimaryColor = currentKitType === 'home' ? editPrimaryColor : editAwayPrimaryColor;
  const setActivePrimaryColor = currentKitType === 'home' ? setEditPrimaryColor : setEditAwayPrimaryColor;

  const activeSecondaryColor = currentKitType === 'home' ? editSecondaryColor : editAwaySecondaryColor;
  const setActiveSecondaryColor = currentKitType === 'home' ? setEditSecondaryColor : setEditAwaySecondaryColor;

  const activePattern = currentKitType === 'home' ? editPattern : editAwayPattern;
  const setActivePattern = currentKitType === 'home' ? setEditPattern : setEditAwayPattern;

  const activeShortsColor = currentKitType === 'home' ? editShortsColor : editAwayShortsColor;
  const setActiveShortsColor = currentKitType === 'home' ? setEditShortsColor : setEditAwayShortsColor;

  const activeShortsSecondaryColor = currentKitType === 'home' ? editShortsSecondaryColor : editAwayShortsSecondaryColor;
  const setActiveShortsSecondaryColor = currentKitType === 'home' ? setEditShortsSecondaryColor : setEditAwayShortsSecondaryColor;

  const activeShortsPattern = currentKitType === 'home' ? editShortsPattern : editAwayShortsPattern;
  const setActiveShortsPattern = currentKitType === 'home' ? setEditShortsPattern : setEditAwayShortsPattern;

  const activeSocksColor = currentKitType === 'home' ? editSocksColor : editAwaySocksColor;
  const setActiveSocksColor = currentKitType === 'home' ? setEditSocksColor : setEditAwaySocksColor;

  const activeSocksSecondaryColor = currentKitType === 'home' ? editSocksSecondaryColor : editAwaySocksSecondaryColor;
  const setActiveSocksSecondaryColor = currentKitType === 'home' ? setEditSocksSecondaryColor : setEditAwaySocksSecondaryColor;

  const activeSocksPattern = currentKitType === 'home' ? editSocksPattern : editAwaySocksPattern;
  const setActiveSocksPattern = currentKitType === 'home' ? setEditSocksPattern : setEditAwaySocksPattern;
  
  const [selectedLogoBlob, setSelectedLogoBlob] = useState<Blob | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Listen to User Profile Data in Realtime
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        profileUnsub = onValue(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
        });
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      unsubAuth();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // Load local fields when Profile Modal is opened
  useEffect(() => {
    if (activeUser) {
      setSelectedUniformItem('shirt');
      if (userProfile) {
        setEditUsername(userProfile.username || activeUser.displayName || '');
        setEditTeamName(userProfile.teamName || 'Meu Time');
        setEditAbbreviation(userProfile.abbreviation || (userProfile.teamName ? userProfile.teamName.substring(0, 3).toUpperCase() : 'MEU'));
        if (userProfile.uniform) {
          const u = userProfile.uniform;
          setEditPrimaryColor(u.primaryColor || '#1e3799');
          setEditSecondaryColor(u.secondaryColor || '#ffffff');
          setEditPattern(u.pattern || 'solid');
          setEditShortsColor(u.shortsColor || '#ffffff');
          setEditShortsSecondaryColor(u.shortsSecondaryColor || '#1e3799');
          setEditShortsPattern(u.shortsPattern || 'solid');
          setEditSocksColor(u.socksColor || '#1e3799');
          setEditSocksSecondaryColor(u.socksSecondaryColor || '#ffffff');
          setEditSocksPattern(u.socksPattern || 'solid');
        }
        if (userProfile.awayUniform) {
          const u = userProfile.awayUniform;
          setEditAwayPrimaryColor(u.primaryColor || '#e55039');
          setEditAwaySecondaryColor(u.secondaryColor || '#f6b93b');
          setEditAwayPattern(u.pattern || 'solid');
          setEditAwayShortsColor(u.shortsColor || '#1e272e');
          setEditAwayShortsSecondaryColor(u.shortsSecondaryColor || '#e55039');
          setEditAwayShortsPattern(u.shortsPattern || 'solid');
          setEditAwaySocksColor(u.socksColor || '#e55039');
          setEditAwaySocksSecondaryColor(u.socksSecondaryColor || '#f6b93b');
          setEditAwaySocksPattern(u.socksPattern || 'solid');
        } else {
          setEditAwayPrimaryColor('#e55039');
          setEditAwaySecondaryColor('#f6b93b');
          setEditAwayPattern('solid');
          setEditAwayShortsColor('#1e272e');
          setEditAwayShortsSecondaryColor('#e55039');
          setEditAwayShortsPattern('solid');
          setEditAwaySocksColor('#e55039');
          setEditAwaySocksSecondaryColor('#f6b93b');
          setEditAwaySocksPattern('solid');
        }
        setLogoPreview(userProfile.logoUrl || null);
      } else {
        setEditUsername(activeUser.displayName || 'Jogador');
        setEditTeamName('Meu Time');
        setEditAbbreviation('MEU');
        setEditPrimaryColor('#1e3799');
        setEditSecondaryColor('#ffffff');
        setEditPattern('solid');
        setEditShortsColor('#ffffff');
        setEditShortsSecondaryColor('#1e3799');
        setEditShortsPattern('solid');
        setEditSocksColor('#1e3799');
        setEditSocksSecondaryColor('#ffffff');
        setEditSocksPattern('solid');

        setEditAwayPrimaryColor('#e55039');
        setEditAwaySecondaryColor('#f6b93b');
        setEditAwayPattern('solid');
        setEditAwayShortsColor('#1e272e');
        setEditAwayShortsSecondaryColor('#e55039');
        setEditAwayShortsPattern('solid');
        setEditAwaySocksColor('#e55039');
        setEditAwaySocksSecondaryColor('#f6b93b');
        setEditAwaySocksPattern('solid');
        setLogoPreview(null);
      }
      setSelectedLogoBlob(null);
      setSaveError(null);
    }
  }, [activeUser, userProfile]);

  // Intelligent Image Compression Function (Canvas-based, max 256x256, jpeg 85%)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Canvas context failed"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Image blob generation failed"));
          }, 'image/jpeg', 0.85);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Logo file selection handler
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    SoundManager.playUIClick();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      
      const compressed = await compressImage(file);
      setSelectedLogoBlob(compressed);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Erro ao processar imagem.');
    }
  };

  // Save profile & kit configurations to Realtime DB and upload logo to Storage
  const handleSaveProfile = async () => {
    if (!activeUser) return;
    SoundManager.playUIClick();
    setIsSavingProfile(true);
    setSaveError(null);
    try {
      const { update } = await import('firebase/database');
      const userRef = ref(db, `users/${activeUser.uid}`);
      
      const profileUpdates: any = {
        uid: activeUser.uid,
        username: editUsername.trim() || activeUser.displayName || 'Jogador',
        teamName: editTeamName.trim() || 'Meu Time',
        abbreviation: (editAbbreviation.trim().toUpperCase() || editTeamName.trim().substring(0, 3).toUpperCase() || 'MEU').substring(0, 3),
        displayName: editUsername.trim() || activeUser.displayName || 'Jogador',
        uniform: {
          primaryColor: editPrimaryColor,
          secondaryColor: editSecondaryColor,
          pattern: editPattern,
          shortsColor: editShortsColor,
          shortsSecondaryColor: editShortsSecondaryColor,
          shortsPattern: editShortsPattern,
          socksColor: editSocksColor,
          socksSecondaryColor: editSocksSecondaryColor,
          socksPattern: editSocksPattern
        },
        awayUniform: {
          primaryColor: editAwayPrimaryColor,
          secondaryColor: editAwaySecondaryColor,
          pattern: editAwayPattern,
          shortsColor: editAwayShortsColor,
          shortsSecondaryColor: editAwayShortsSecondaryColor,
          shortsPattern: editAwayShortsPattern,
          socksColor: editAwaySocksColor,
          socksSecondaryColor: editAwaySocksSecondaryColor,
          socksPattern: editAwaySocksPattern
        }
      };

      // Convert logo to base64 and store in Realtime DB (no Firebase Storage needed)
      if (selectedLogoBlob) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedLogoBlob);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        profileUpdates.logoUrl = base64;
      }

      await update(userRef, profileUpdates);
      setSelectedLogoBlob(null);
      onClose();
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Ocorreu um erro ao salvar as alterações.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className={
      isMobile 
        ? "absolute inset-0 z-50 bg-zinc-950 animate-fadeIn flex flex-col overflow-hidden" 
        : "absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    }>
      <div className={
        isMobile 
          ? "w-full h-full bg-zinc-950 flex flex-col overflow-hidden" 
          : "relative w-full max-w-4xl h-[90vh] max-h-[640px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden animate-scaleUp flex flex-col"
      }>
        
        {/* Header bar */}
        <div className={`flex items-center justify-between px-6 border-b border-zinc-900 bg-zinc-950 flex-shrink-0 w-full ${isMobile ? 'py-2' : 'py-4'}`}>
          <div className="flex items-center gap-2.5">
            <img src={activeUser.photoURL || ''} alt="" className="w-6 h-6 rounded-full border border-cyan-500/40" referrerPolicy="no-referrer" />
            <div className="flex items-baseline gap-2">
              <h2 className={`font-black tracking-wider text-zinc-200 uppercase ${isMobile ? 'text-[11px]' : 'text-sm'}`}>Perfil & Uniforme</h2>
              <span className={`font-semibold ${isMobile ? 'text-[9px] text-zinc-655' : 'text-xs text-zinc-500'}`}>{activeUser.email}</span>
            </div>
          </div>
          <button
            onClick={() => { SoundManager.playUIClick(); onClose(); setSelectedLogoBlob(null); }}
            className={`text-zinc-500 hover:text-zinc-200 transition-colors hover:bg-zinc-900 rounded-lg ${isMobile ? 'p-1 text-xs' : 'p-2 text-sm'}`}
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Two Column Landscape Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-zinc-800/40 min-h-0">
          
          {/* Left Column: Identity & Logo */}
          <div className="p-4 md:p-5 flex flex-col justify-between min-h-0 h-full">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              
              {/* ── Identity Section ── */}
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

              {/* ── Logo Upload ── */}
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

            {/* Action buttons side-by-side at the bottom-left of Left Column */}
            <div className="pt-3 border-t border-zinc-800/60 mt-2.5 flex-shrink-0 flex gap-3">
              <button
                onClick={() => { SoundManager.playUIClick(); onClose(); setSelectedLogoBlob(null); }}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center active:scale-98"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:from-zinc-700 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-black text-xs tracking-widest uppercase rounded-xl shadow-[0_4px_15px_rgba(6,182,212,0.3)] transition-all active:scale-98 flex items-center justify-center min-h-[32px]"
              >
                {isSavingProfile ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Salvando...
                  </span>
                ) : 'Salvar Perfil'}
              </button>
            </div>
          </div>

          {/* Right Column: Kit Customizer & Selector */}
          <div className="p-4 md:p-5 flex flex-col min-h-0 h-full">
            <div className="flex-1 flex flex-col min-h-0 gap-3">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block">
                  Uniforme ({currentKitType === 'home' ? 'Casa' : 'Fora'})
                </span>
                <button
                  type="button"
                  onClick={() => { SoundManager.playUIClick(); setCurrentKitType(prev => prev === 'home' ? 'away' : 'home'); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-lg text-[9px] font-black uppercase text-cyan-400 hover:text-cyan-300 transition-all hover:scale-105 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  Alternar
                </button>
              </div>
              
              {/* 3 selectable premium item previews */}
              <div className="grid grid-cols-3 gap-2.5 flex-shrink-0">
              
                {/* Jersey Selector Card */}
                <div
                  onClick={() => { SoundManager.playUIClick(); setSelectedUniformItem('shirt'); }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedUniformItem === 'shirt'
                      ? 'border-cyan-500 bg-cyan-950/20 scale-[1.03] shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'border-zinc-800 bg-zinc-900/40 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                    selectedUniformItem === 'shirt' ? 'text-cyan-400' : 'text-zinc-500'
                  }`}>Camisa</span>
                  <div className="h-[64px] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" width="48" height="54" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                      <defs>
                        <clipPath id="jersey-clip-main">
                          <path d="M30,15 L16,25 C14,26.5 14,29 16.5,31 L24,37 C25.5,38 27.5,37 27.5,35 L27.5,88 C27.5,91 29.5,93 32.5,93 L67.5,93 C70.5,93 72.5,91 72.5,88 L72.5,35 C72.5,37 74.5,38 76,37 L83.5,31 C86,29 86,26.5 84,25 L70,15 C62,20 38,20 30,15 Z" />
                        </clipPath>
                        <radialGradient id="shading-main-radial" cx="50%" cy="40%" r="60%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.0" />
                          <stop offset="80%" stopColor="#000000" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
                        </radialGradient>
                      </defs>
                      {/* Base Jersey */}
                      <path d="M30,15 L16,25 C14,26.5 14,29 16.5,31 L24,37 C25.5,38 27.5,37 27.5,35 L27.5,88 C27.5,91 29.5,93 32.5,93 L67.5,93 C70.5,93 72.5,91 72.5,88 L72.5,35 C72.5,37 74.5,38 76,37 L83.5,31 C86,29 86,26.5 84,25 L70,15 C62,20 38,20 30,15 Z" fill={activePrimaryColor} stroke={activeSecondaryColor} strokeWidth="1" strokeLinejoin="round"/>
                      
                      <g clipPath="url(#jersey-clip-main)">
                        {activePattern === 'vertical' && (
                          <>
                            <rect x="36.5" y="10" width="8" height="85" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="55.5" y="10" width="8" height="85" fill={activeSecondaryColor} opacity="0.85" />
                          </>
                        )}
                        {activePattern === 'horizontal' && (
                          <>
                            <rect x="0" y="38" width="100" height="10" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="0" y="60" width="100" height="10" fill={activeSecondaryColor} opacity="0.85" />
                          </>
                        )}
                        {activePattern === 'center-band' && (
                          <rect x="40" y="10" width="20" height="85" fill={activeSecondaryColor} opacity="0.85" />
                        )}
                        {activePattern === 'side-stripes' && (
                          <>
                            <rect x="27.5" y="10" width="7" height="85" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="65.5" y="10" width="7" height="85" fill={activeSecondaryColor} opacity="0.85" />
                          </>
                        )}
                        {activePattern === 'x' && (
                          <>
                            <line x1="10" y1="12" x2="90" y2="92" stroke={activeSecondaryColor} strokeWidth="8" opacity="0.8" />
                            <line x1="90" y1="12" x2="10" y2="92" stroke={activeSecondaryColor} strokeWidth="8" opacity="0.8" />
                          </>
                        )}
                        {activePattern === 'sash' && (
                          <polygon points="85,12 55,12 15,88 45,88" fill={activeSecondaryColor} opacity="0.85" />
                        )}
                        {activePattern === 'three-stripes-v' && (
                          <>
                            <rect x="32" y="10" width="7" height="85" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="46.5" y="10" width="7" height="85" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="61" y="10" width="7" height="85" fill={activeSecondaryColor} opacity="0.85" />
                          </>
                        )}
                        {activePattern === 'three-stripes-h' && (
                          <>
                            <rect x="0" y="30" width="100" height="8" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="0" y="48" width="100" height="8" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="0" y="66" width="100" height="8" fill={activeSecondaryColor} opacity="0.85" />
                          </>
                        )}
                        {activePattern === 'cross' && (
                          <>
                            <rect x="44" y="10" width="12" height="85" fill={activeSecondaryColor} opacity="0.85" />
                            <rect x="0" y="44" width="100" height="12" fill={activeSecondaryColor} opacity="0.85" />
                          </>
                        )}
                        {activePattern === 'sash-cross' && (
                          <>
                            <polygon points="85,12 55,12 15,88 45,88" fill={activeSecondaryColor} opacity="0.9" />
                            <path d="M 62,38 L 56,32 L 56,44 Z M 62,38 L 68,32 L 68,44 Z M 62,38 L 56,32 L 68,32 Z M 62,38 L 56,44 L 68,44 Z" fill="#ff3f34" />
                          </>
                        )}
                      </g>

                      {/* Sleeve Cuff details */}
                      <path d="M16,25 L19.5,27.8 C18.3,29.2 17.2,30.3 16.5,31 L16,25 Z" fill={activeSecondaryColor} />
                      <path d="M84,25 L80.5,27.8 C81.7,29.2 82.8,30.3 83.5,31 L84,25 Z" fill={activeSecondaryColor} />

                      {/* 3D Shading Overlay */}
                      <path d="M30,15 L16,25 C14,26.5 14,29 16.5,31 L24,37 C25.5,38 27.5,37 27.5,35 L27.5,88 C27.5,91 29.5,93 32.5,93 L67.5,93 C70.5,93 72.5,91 72.5,88 L72.5,35 C72.5,37 74.5,38 76,37 L83.5,31 C86,29 86,26.5 84,25 L70,15 C62,20 38,20 30,15 Z" fill="url(#shading-main-radial)" opacity="0.85" pointerEvents="none"/>

                      {/* Premium 3D Double Collar */}
                      <path d="M30,15 C38,20 62,20 70,15 C66,23 34,23 30,15 Z" fill={activeSecondaryColor} stroke="#00000022" strokeWidth="0.5" />
                      <path d="M30,15 C34,23 66,23 70,15 C60,11 40,11 30,15 Z" fill="#111111" opacity="0.5" />

                      {/* Fabric Folds (realistic chest/waist creases) */}
                      <path d="M30,42 C38,45 62,45 70,42" stroke="black" strokeWidth="1" fill="none" opacity="0.12" />
                      <path d="M30,43 C38,46 62,46 70,43" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15" />
                      <path d="M28,68 C36,70 64,70 72,68" stroke="black" strokeWidth="1" fill="none" opacity="0.1" />
                      <path d="M28,69 C36,71 64,71 72,69" stroke="white" strokeWidth="0.8" fill="none" opacity="0.12" />
                    </svg>
                  </div>
                </div>

                {/* Shorts Selector Card */}
                <div
                  onClick={() => { SoundManager.playUIClick(); setSelectedUniformItem('shorts'); }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedUniformItem === 'shorts'
                      ? 'border-cyan-500 bg-cyan-950/20 scale-[1.03] shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'border-zinc-800 bg-zinc-900/40 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                    selectedUniformItem === 'shorts' ? 'text-cyan-400' : 'text-zinc-500'
                  }`}>Calção</span>
                  <div className="h-[64px] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" width="46" height="46" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                      <defs>
                        <clipPath id="shorts-clip-main">
                          <path d="M18,10 L82,10 C86,10 89,12 88.5,17 L80.5,84 C79.8,90 75,92 70,89 L52,78 L48,78 L30,89 C25,92 20.2,90 19.5,84 L11.5,17 C11,12 14,10 18,10 Z" />
                        </clipPath>
                        <linearGradient id="shorts-shading-main-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
                          <stop offset="20%" stopColor="#000000" stopOpacity="0.1" />
                          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
                          <stop offset="80%" stopColor="#000000" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
                        </linearGradient>
                      </defs>
                      {/* Base Shorts */}
                      <path d="M18,10 L82,10 C86,10 89,12 88.5,17 L80.5,84 C79.8,90 75,92 70,89 L52,78 L48,78 L30,89 C25,92 20.2,90 19.5,84 L11.5,17 C11,12 14,10 18,10 Z" fill={activeShortsColor} stroke="#00000022" strokeWidth="1" strokeLinejoin="round" />
                      
                      <g clipPath="url(#shorts-clip-main)">
                        {activeShortsPattern === 'side-stripes' && (
                          <>
                            <path d="M 5,0 L 22,0 L 28,95 L 11,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                            <path d="M 95,0 L 78,0 L 72,95 L 89,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                          </>
                        )}
                        {activeShortsPattern === 'three-stripes' && (
                          <>
                            {/* Left side thin stripes */}
                            <path d="M 12,0 L 14.5,0 L 20.5,95 L 18,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                            <path d="M 16,0 L 18.5,0 L 24.5,95 L 22,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                            <path d="M 20,0 L 22.5,0 L 28.5,95 L 26,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                            {/* Right side thin stripes */}
                            <path d="M 88,0 L 85.5,0 L 79.5,95 L 82,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                            <path d="M 84,0 L 81.5,0 L 75.5,95 L 78,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                            <path d="M 80,0 L 77.5,0 L 71.5,95 L 74,95 Z" fill={activeShortsSecondaryColor} opacity="0.9" />
                          </>
                        )}
                        {activeShortsPattern === 'two-tone' && (
                          <path d="M 50,0 L 100,0 L 100,100 L 50,100 Z" fill={activeShortsSecondaryColor} opacity="0.95" />
                        )}
                      </g>

                      {/* 3D cylindrical lighting overlay */}
                      <path d="M18,10 L82,10 C86,10 89,12 88.5,17 L80.5,84 C79.8,90 75,92 70,89 L52,78 L48,78 L30,89 C25,92 20.2,90 19.5,84 L11.5,17 C11,12 14,10 18,10 Z" fill="url(#shorts-shading-main-grad)" opacity="0.85" pointerEvents="none" />

                      {/* Premium Waistband with elastic gathering ribs */}
                      <path d="M18,10 L82,10 C85.5,10 87.5,11.5 87.3,15 L86.3,24 L13.7,24 L12.7,15 C12.5,11.5 14.5,10 18,10 Z" fill={activeShortsColor} filter="brightness(0.94)" stroke="#00000022" strokeWidth="0.5" />
                      <line x1="20" y1="10" x2="20" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />
                      <line x1="30" y1="10" x2="30" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />
                      <line x1="40" y1="10" x2="40" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />
                      <line x1="50" y1="10" x2="50" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />
                      <line x1="60" y1="10" x2="60" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />
                      <line x1="70" y1="10" x2="70" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />
                      <line x1="80" y1="10" x2="80" y2="24" stroke="black" strokeWidth="0.8" opacity="0.15" />

                      {/* Crotch Seam & Anatomical Folds */}
                      <path d="M 50,24 L 50,68" fill="none" stroke="black" strokeWidth="1.2" opacity="0.18" />
                      <path d="M 50,56 C 42,48 30,44 18,46" fill="none" stroke="black" strokeWidth="1" opacity="0.12" />
                      <path d="M 50,56 C 58,48 70,44 82,46" fill="none" stroke="black" strokeWidth="1" opacity="0.12" />

                      {/* Lower leg hem trims */}
                      <path d="M19.5,84 L30,89 L28.5,91.5 L18,86.5 Z" fill={activeShortsColor} filter="brightness(0.85)" opacity="0.8" />
                      <path d="M80.5,84 L70,89 L71.5,91.5 L82,86.5 Z" fill={activeShortsColor} filter="brightness(0.85)" opacity="0.8" />
                    </svg>
                  </div>
                </div>

                {/* Socks Selector Card */}
                <div
                  onClick={() => { SoundManager.playUIClick(); setSelectedUniformItem('socks'); }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedUniformItem === 'socks'
                      ? 'border-cyan-500 bg-cyan-950/20 scale-[1.03] shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'border-zinc-800 bg-zinc-900/40 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                    selectedUniformItem === 'socks' ? 'text-cyan-400' : 'text-zinc-500'
                  }`}>Meias</span>
                  <div className="h-[64px] flex items-center justify-center">
                    <svg viewBox="0 0 50 100" width="26" height="52" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                      <defs>
                        <clipPath id="socks-clip-main">
                          <path d="M10,6 L40,6 L40,16 C40,16 38,34 39,46 C40,58 43,68 41,76 L44,82 C46,86 44,92 39,94 L15,94 C9,94 6,90 8,84 L14,75 C11,68 11,58 12,46 C13,34 10,16 10,16 Z" />
                        </clipPath>
                        <linearGradient id="socks-shading-main-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.0" />
                          <stop offset="75%" stopColor="#000000" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                      {/* Base Sock */}
                      <path d="M10,6 L40,6 L40,16 C40,16 38,34 39,46 C40,58 43,68 41,76 L44,82 C46,86 44,92 39,94 L15,94 C9,94 6,90 8,84 L14,75 C11,68 11,58 12,46 C13,34 10,16 10,16 Z" fill={activeSocksColor} stroke="#00000022" strokeWidth="0.8" />
                      
                      <g clipPath="url(#socks-clip-main)">
                        {activeSocksPattern === 'hoops' && (
                          <>
                            <rect x="0" y="28" width="50" height="8" fill={activeSocksSecondaryColor} opacity="0.9" />
                            <rect x="0" y="48" width="50" height="8" fill={activeSocksSecondaryColor} opacity="0.9" />
                            <rect x="0" y="68" width="50" height="8" fill={activeSocksSecondaryColor} opacity="0.9" />
                          </>
                        )}
                        {activeSocksPattern === 'three-stripes' && (
                          <>
                            <rect x="0" y="24" width="50" height="4" fill={activeSocksSecondaryColor} opacity="0.9" />
                            <rect x="0" y="32" width="50" height="4" fill={activeSocksSecondaryColor} opacity="0.9" />
                            <rect x="0" y="40" width="50" height="4" fill={activeSocksSecondaryColor} opacity="0.9" />
                          </>
                        )}
                        {activeSocksPattern === 'two-tone' && (
                          <path d="M 0,46 L 50,46 L 50,95 L 0,95 Z" fill={activeSocksSecondaryColor} opacity="0.9" />
                        )}
                      </g>

                      {/* High-Performance Heel and Toe Contrast Pockets */}
                      <path d="M28,84 L41,76 L44,82 C46,86 44,92 39,94 L32,94 Z" fill={activeSocksSecondaryColor} opacity="0.85" filter="brightness(0.9)" />
                      <path d="M8,84 L14,75 L16,82 L12,90 Z" fill={activeSocksSecondaryColor} opacity="0.85" filter="brightness(0.9)" />

                      {/* 3D cylindrical lighting overlay */}
                      <path d="M10,6 L40,6 L40,16 C40,16 38,34 39,46 C40,58 43,68 41,76 L44,82 C46,86 44,92 39,94 L15,94 C9,94 6,90 8,84 L14,75 C11,68 11,58 12,46 C13,34 10,16 10,16 Z" fill="url(#socks-shading-main-grad)" opacity="0.85" pointerEvents="none" />

                      {/* Ribbed Top Cuff (elastic knit) */}
                      <path d="M10,6 L40,6 L40,18 L10,18 Z" fill={activeSocksColor} filter="brightness(0.93)" stroke="#00000022" strokeWidth="0.5" />
                      <line x1="13" y1="6" x2="13" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="16" y1="6" x2="16" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="19" y1="6" x2="19" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="22" y1="6" x2="22" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="25" y1="6" x2="25" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="28" y1="6" x2="28" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="31" y1="6" x2="31" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="34" y1="6" x2="34" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />
                      <line x1="37" y1="6" x2="37" y2="18" stroke="black" strokeWidth="0.6" opacity="0.15" />

                      {/* Realistic Ankle Creases */}
                      <path d="M12,70 C20,72 30,72 38,70" stroke="black" strokeWidth="1" fill="none" opacity="0.12" />
                      <path d="M12,75 C20,77 30,77 38,75" stroke="black" strokeWidth="1" fill="none" opacity="0.1" />
                      <path d="M10,82 C18,84 28,84 36,82" stroke="black" strokeWidth="1.2" fill="none" opacity="0.15" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* ── Active Customizer Editor Controls ── */}
              <div className={`flex-1 min-h-0 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl flex flex-col justify-start overflow-hidden ${
                isMobile ? 'p-3 space-y-2.5' : 'p-4 space-y-4'
              }`}>
                
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
                              <input type="color" value={value} onChange={e => setter(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
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
                          <button key={p.id} onClick={() => { SoundManager.playUIClick(); setActivePattern(p.id as any); }}
                            className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                              activePattern === p.id
                                ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
                            }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

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
                              <input type="color" value={value} onChange={e => setter(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
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
                          <button key={p.id} onClick={() => { SoundManager.playUIClick(); setActiveShortsPattern(p.id as any); }}
                            className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                              activeShortsPattern === p.id
                                ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
                            }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

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
                              <input type="color" value={value} onChange={e => setter(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
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
                          <button key={p.id} onClick={() => { SoundManager.playUIClick(); setActiveSocksPattern(p.id as any); }}
                            className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                              activeSocksPattern === p.id
                                ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
                            }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
