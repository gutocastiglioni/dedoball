import React, { useState, useEffect } from 'react';
import { useGameStateContext } from '../GameStateContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { auth, db, ref, onValue, onAuthStateChanged } from '../firebase';
import SoundManager from '../SoundManager';
import { ProfileIdentity } from './profile/ProfileIdentity';
import { ProfilePreviews } from './profile/ProfilePreviews';
import { ProfileUniformEditor } from './profile/ProfileUniformEditor';

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

  if (!activeUser) return null;

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
              <span className={`font-semibold ${isMobile ? 'text-[9px] text-zinc-600' : 'text-xs text-zinc-500'}`}>{activeUser.email}</span>
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
            <ProfileIdentity
              editUsername={editUsername}
              setEditUsername={setEditUsername}
              editTeamName={editTeamName}
              setEditTeamName={setEditTeamName}
              editAbbreviation={editAbbreviation}
              setEditAbbreviation={setEditAbbreviation}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              setSelectedLogoBlob={setSelectedLogoBlob}
              saveError={saveError}
              isMobile={isMobile}
              handleLogoChange={handleLogoChange}
            />

            {/* Action buttons side-by-side at the bottom-left of Left Column */}
            <div className="pt-3 border-t border-zinc-800/60 mt-2.5 flex-shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => { SoundManager.playUIClick(); onClose(); setSelectedLogoBlob(null); }}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center active:scale-98"
              >
                Cancelar
              </button>
              <button
                type="button"
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
              <ProfilePreviews
                activePrimaryColor={activePrimaryColor}
                activeSecondaryColor={activeSecondaryColor}
                activePattern={activePattern}
                activeShortsColor={activeShortsColor}
                activeShortsSecondaryColor={activeShortsSecondaryColor}
                activeShortsPattern={activeShortsPattern}
                activeSocksColor={activeSocksColor}
                activeSocksSecondaryColor={activeSocksSecondaryColor}
                activeSocksPattern={activeSocksPattern}
                selectedUniformItem={selectedUniformItem}
                setSelectedUniformItem={setSelectedUniformItem}
              />

              {/* ── Active Customizer Editor Controls ── */}
              <ProfileUniformEditor
                selectedUniformItem={selectedUniformItem}
                isMobile={isMobile}
                activePrimaryColor={activePrimaryColor}
                setActivePrimaryColor={setActivePrimaryColor}
                activeSecondaryColor={activeSecondaryColor}
                setActiveSecondaryColor={setActiveSecondaryColor}
                activePattern={activePattern}
                setActivePattern={setActivePattern}
                activeShortsColor={activeShortsColor}
                setActiveShortsColor={setActiveShortsColor}
                activeShortsSecondaryColor={activeShortsSecondaryColor}
                setActiveShortsSecondaryColor={setActiveShortsSecondaryColor}
                activeShortsPattern={activeShortsPattern}
                setActiveShortsPattern={setActiveShortsPattern}
                activeSocksColor={activeSocksColor}
                setActiveSocksColor={setActiveSocksColor}
                activeSocksSecondaryColor={activeSocksSecondaryColor}
                setActiveSocksSecondaryColor={setActiveSocksSecondaryColor}
                activeSocksPattern={activeSocksPattern}
                setActiveSocksPattern={setActiveSocksPattern}
              />

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
