import React, { useState, useEffect, useCallback, useRef } from 'react';
import Scene from './components/Scene';
import { useGameState } from './useGameState';
import { GamePhase, Difficulty, Team, ActionType } from './types';
import { auth, db, ref, onValue, onAuthStateChanged } from './firebase';
import { 
  Play, RotateCcw, Shield, Target, Clock, ArrowRight, CheckCircle2,
  Volume2, VolumeX, ChevronLeft, ChevronRight, Award, Trophy, Info,
  Navigation, ShieldAlert, Crown, LogIn, LogOut, Lock, Globe, Users,
  ListOrdered, History, PlusCircle, ShieldQuestion, Calendar,
  Maximize2, Minimize2
} from 'lucide-react';

const App: React.FC = () => {
  const {
    phase,
    setPhase,
    difficulty,
    scores,
    homePlayers,
    awayPlayers,
    selectedPlayerId,
    setSelectedPlayerId,
    ball,
    setBall,
    turn,
    actionStatus,
    setActionStatus,
    isIAThinking,
    homeReady,
    awayReady,
    completePreparation,
    startGame,
    placePlayer,
    updatePlayerAngle,
    updatePlayerActionType,
    setCaptain,
    shootBall,
    changePossession,
    scoreGoal,
    resetMatch,
    gameTime,
    homeFlicksRemaining,
    awayFlicksRemaining,
    handleBallStopped,
    updateGoalkeeperPositions,
    homeKitConfig,
    awayKitConfig,

    // Firebase Multiplayer exports
    activeUser,
    isMultiplayer,
    roomId,
    myRole,
    activeRooms,
    leaderboard,
    matchHistory,
    opponentInfo,
    opponentDisconnected,
    disconnectCountdown,
    loginGoogle,
    logout,
    createRoom,
    joinRoom,

    // Tournament exports
    activeTournamentId,
    currentMatchId,
    tournament,
    tournamentsList,
    createTournament,
    joinTournament,
    startTournament,
    playTournamentMatch,
    joinTournamentMatch
  } = useGameState();

  const [userProfile, setUserProfile] = useState<any>(null);

  // Profile & Kit Customizer Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#1e3799');
  const [editSecondaryColor, setEditSecondaryColor] = useState('#ffffff');
  const [editPattern, setEditPattern] = useState<'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross'>('solid');
  const [editShortsColor, setEditShortsColor] = useState('#ffffff');
  const [editShortsSecondaryColor, setEditShortsSecondaryColor] = useState('#1e3799');
  const [editShortsPattern, setEditShortsPattern] = useState<'solid' | 'side-stripes' | 'three-stripes' | 'two-tone'>('solid');
  const [editSocksColor, setEditSocksColor] = useState('#1e3799');
  const [editSocksSecondaryColor, setEditSocksSecondaryColor] = useState('#ffffff');
  const [editSocksPattern, setEditSocksPattern] = useState<'solid' | 'hoops' | 'three-stripes' | 'two-tone'>('solid');
  
  const [selectedLogoBlob, setSelectedLogoBlob] = useState<Blob | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Automatic Anonymous Sign-In check to always have a valid UID for security rules
  useEffect(() => {
    const initAuth = async () => {
      const { ensureAuthenticated } = await import('./firebase');
      try {
        await ensureAuthenticated();
      } catch (err) {
        console.error("Auto authentication failed:", err);
      }
    };
    initAuth();
  }, []);

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
    if (showProfileModal && activeUser) {
      if (userProfile) {
        setEditUsername(userProfile.username || activeUser.displayName || '');
        setEditTeamName(userProfile.teamName || 'Meu Time');
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
        setLogoPreview(userProfile.logoUrl || null);
      } else {
        setEditUsername(activeUser.displayName || 'Jogador');
        setEditTeamName('Meu Time');
        setEditPrimaryColor('#1e3799');
        setEditSecondaryColor('#ffffff');
        setEditPattern('solid');
        setEditShortsColor('#ffffff');
        setEditShortsSecondaryColor('#1e3799');
        setEditShortsPattern('solid');
        setEditSocksColor('#1e3799');
        setEditSocksSecondaryColor('#ffffff');
        setEditSocksPattern('solid');
        setLogoPreview(null);
      }
      setSelectedLogoBlob(null);
      setSaveError(null);
    }
  }, [showProfileModal, activeUser, userProfile]);

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
    setIsSavingProfile(true);
    setSaveError(null);
    try {
      const { update } = await import('firebase/database');
      const userRef = ref(db, `users/${activeUser.uid}`);
      
      const profileUpdates: any = {
        uid: activeUser.uid,
        username: editUsername.trim() || activeUser.displayName || 'Jogador',
        teamName: editTeamName.trim() || 'Meu Time',
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
        }
      };

      // Upload logo image if changed
      if (selectedLogoBlob) {
        const { storage } = await import('./firebase');
        const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const logoPath = `logos/${activeUser.uid}/logo.jpg`;
        const fileRef = storageRef(storage, logoPath);
        
        await uploadBytes(fileRef, selectedLogoBlob);
        const downloadUrl = await getDownloadURL(fileRef);
        profileUpdates.logoUrl = downloadUrl;
      }

      await update(userRef, profileUpdates);
      setShowProfileModal(false);
      setSelectedLogoBlob(null);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Ocorreu um erro ao salvar as alterações.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [tackleLimitError, setTackleLimitError] = useState(false);

  // ── Fullscreen API ──────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 || 
        window.innerHeight < 500 || 
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const onFSChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange);
    document.addEventListener('mozfullscreenchange', onFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('webkitfullscreenchange', onFSChange);
      document.removeEventListener('mozfullscreenchange', onFSChange);
    };
  }, []);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
    else if ((el as any).mozRequestFullScreen) (el as any).mozRequestFullScreen();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    else if ((document as any).mozCancelFullScreen) (document as any).mozCancelFullScreen();
  }, []);

  const toggleFullscreen = useCallback(() => {
    isFullscreen ? exitFullscreen() : enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);
  // ────────────────────────────────────────────────────────────────────────────

  // Tab navigation in menu: 'solo' | 'multi' | 'tournament' | 'ranking' | 'history'
  const [currentMenuTab, setCurrentMenuTab] = useState<'solo' | 'multi' | 'tournament' | 'ranking' | 'history'>('solo');

  // Restricted Access Login Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [restrictedTabAttempt, setRestrictedTabAttempt] = useState<'multi' | 'tournament' | 'ranking' | 'history' | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (targetTab?: 'multi' | 'tournament' | 'ranking' | 'history') => {
    try {
      setLoginError(null);
      const user = await loginGoogle();
      if (user) {
        setShowLoginModal(false);
        if (targetTab) {
          setCurrentMenuTab(targetTab);
        } else if (restrictedTabAttempt) {
          setCurrentMenuTab(restrictedTabAttempt);
        }
        setRestrictedTabAttempt(null);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Ocorreu um erro ao fazer login com o Google.';
      if (err.code === 'auth/configuration-not-found') {
        errMsg = 'O provedor Google Auth não está ativado no Firebase Console para este projeto (auth/configuration-not-found). O administrador precisa ativar o Google Sign-In nas configurações do Firebase.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'O pop-up de login foi fechado antes de concluir a autenticação.';
      } else if (err.message) {
        errMsg = `Erro: ${err.message}`;
      }
      setLoginError(errMsg);
      setShowLoginModal(true);
    }
  };

  // Create Room modal/form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false);

  // Password Prompt for joining closed rooms
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [inputPassword, setInputPassword] = useState('');

  // Create Tournament Form state
  const [newTournamentName, setNewTournamentName] = useState('');
  const [showCreateTForm, setShowCreateTForm] = useState(false);

  const handleActionTypeChange = (playerId: string, actionType: ActionType) => {
    try {
      updatePlayerActionType(playerId, actionType);
      setTackleLimitError(false);
    } catch (err: any) {
      if (err.message === 'LIMIT_EXCEEDED') {
        setTackleLimitError(true);
        setTimeout(() => setTackleLimitError(false), 3000);
      }
    }
  };

  // Dynamic Google Font Injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const selectedPlayer = homePlayers.find(p => p.id === selectedPlayerId);

  // Helper to convert radian angle to degree (-180 to 180)
  const getDegreeAngle = (rad: number) => {
    let deg = Math.round(rad * (180 / Math.PI));
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    return deg;
  };

  const handleAngleChange = (deg: number) => {
    if (!selectedPlayerId) return;
    const rad = deg * (Math.PI / 180);
    updatePlayerAngle(selectedPlayerId, rad);
  };

  const GoogleIcon = () => (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.91 11.91 0 0 0 12 .09C6.938.09 2.614 3.23.636 7.745l4.63 2.02Z"
      />
      <path
        fill="#4285F4"
        d="M23.82 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.636a5.67 5.67 0 0 1-2.455 3.718l3.864 3A11.83 11.83 0 0 0 23.82 12.27Z"
      />
      <path
        fill="#FBBC05"
        d="M5.266 14.235 1.255 17.27a11.918 11.918 0 0 0 4.01 4.966V16.7c-.5-.436-.936-.973-1.254-1.573l1.255-.892Z"
      />
      <path
        fill="#34A853"
        d="M12 23.91c3.245 0 5.973-1.073 7.964-2.909l-3.864-3c-1.127.755-2.573 1.2-4.1 1.2a7.077 7.077 0 0 1-6.736-4.855L1.255 17.37A11.927 11.927 0 0 0 12 23.91Z"
      />
    </svg>
  );

  // ── Helper Tab Render Functions ───────────────────────────────────────────
  const renderSoloTab = () => {
    return (
      <div className={`w-full max-w-xl mx-auto rounded-2xl sm:rounded-3xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800 shadow-2xl animate-scaleUp
        ${isMobile ? 'p-2.5 space-y-2.5' : 'p-6 space-y-6'}
      `}>
        <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-cyan-400">DESAFIE A INTELIGÊNCIA ARTIFICIAL</h3>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {[
            { id: Difficulty.EASY, label: 'FÁCIL', desc: 'IA com rebote instável', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/10' },
            { id: Difficulty.MEDIUM, label: 'MÉDIO', desc: 'IA competitiva', color: 'border-amber-500/40 text-amber-400 bg-amber-950/10' },
            { id: Difficulty.HARD, label: 'DIFÍCIL', desc: 'IA com precisão cirúrgica', color: 'border-rose-500/40 text-rose-400 bg-rose-950/10' }
          ].map((diff) => (
            <button
              key={diff.id}
              onClick={() => startGame(diff.id)}
              className={`
                rounded-xl sm:rounded-2xl border font-black transition-all duration-300 transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center
                ${isMobile ? 'p-1.5 gap-0.5' : 'p-4 gap-2'}
                ${difficulty === diff.id 
                  ? `${diff.color} ring-2 ring-white/10 shadow-lg` 
                  : 'border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800/30'
                }
              `}
            >
              <Trophy size={isMobile ? 12 : 16} className={difficulty === diff.id ? 'animate-bounce' : 'opacity-40'} />
              <span className="text-[9px] sm:text-xs tracking-wide">{diff.label}</span>
              <span className={`text-[8px] font-medium text-zinc-500 leading-none ${isMobile ? 'hidden' : 'hidden sm:block'}`}>{diff.desc}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => startGame(difficulty)}
          className={`w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black tracking-widest uppercase rounded-xl sm:rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.4)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.55)] transform transition-all active:scale-98 flex items-center justify-center gap-2
            ${isMobile ? 'py-2 text-[10px]' : 'py-4 text-sm'}
          `}
        >
          <Play size={isMobile ? 12 : 18} />
          INICIAR DESAFIO SOLO
        </button>
      </div>
    );
  };

  const renderMultiTab = () => {
    return (
      <div className={`w-full animate-scaleUp ${isMobile ? 'space-y-1.5' : 'space-y-6'}`}>
        
        {/* Create Room Form Toggler */}
        <div className={`w-full flex flex-row justify-between items-center bg-zinc-900/40 border border-zinc-800/60 text-left
          ${isMobile ? 'p-2 rounded-xl gap-2' : 'p-4 rounded-2xl gap-3'}
        `}>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-indigo-400 text-left">SALAS MULTIPLAYER</h3>
            <p className={`text-[9px] text-zinc-550 text-left ${isMobile ? 'hidden' : 'block'}`}>Crie sua sala e desafie amigos em tempo real</p>
          </div>
          <button
            onClick={() => setShowCreateRoomForm(!showCreateRoomForm)}
            className="px-3 py-1.5 sm:px-4 sm:py-2.5 justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] sm:text-xs font-black tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-650/30"
          >
            <PlusCircle size={12} />
            NOVA SALA
          </button>
        </div>

        {/* Create Room Modal/Box */}
        {showCreateRoomForm && (
          <div className={`w-full max-w-md mx-auto rounded-2xl bg-zinc-900 border border-indigo-500/40 shadow-[0_0_25px_rgba(99,102,241,0.15)] text-left animate-fadeIn
            ${isMobile ? 'p-3 space-y-2' : 'p-5 space-y-4'}
          `}>
            <h4 className="text-[10px] sm:text-xs font-black tracking-widest text-indigo-400 uppercase">Configuração da Sala</h4>
            
            <div className={`grid grid-cols-2 gap-2 ${isMobile ? '' : 'flex flex-col space-y-3'}`}>
              <div>
                <label className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome da Sala</label>
                <input 
                  type="text"
                  placeholder="Arena Peteleco"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase block mb-1">Senha (Opcional)</label>
                <input 
                  type="password"
                  placeholder="Senha"
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  createRoom(newRoomName, newRoomPassword);
                  setShowCreateRoomForm(false);
                }}
                className="flex-grow py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md"
              >
                CRIAR SALA AGORA
              </button>
              <button
                onClick={() => setShowCreateRoomForm(false)}
                className="px-3 py-2 bg-zinc-850 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[10px] font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Password input prompt */}
        {joiningRoomId && (
          <div className="w-full max-w-sm mx-auto p-4 rounded-2xl bg-zinc-900 border border-amber-500/50 shadow-lg text-left space-y-3 animate-fadeIn">
            <div>
              <h4 className="text-[10px] sm:text-xs font-black text-amber-400 tracking-wider flex items-center gap-1">
                <Lock size={10} /> SALA COM SENHA
              </h4>
            </div>
            <input 
              type="password" 
              placeholder="Senha" 
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] focus:outline-none focus:border-amber-500 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  joinRoom(joiningRoomId, inputPassword);
                  setJoiningRoomId(null);
                  setInputPassword('');
                }}
                className="flex-grow py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setJoiningRoomId(null);
                  setInputPassword('');
                }}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded-xl text-[10px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-1.5 overflow-y-auto pr-1
          ${isMobile ? 'max-h-[140px]' : 'max-h-[350px]'}
        `}>
          {activeRooms.length > 0 ? (
            activeRooms.map((room) => (
              <div 
                key={room.roomId}
                className={`bg-zinc-900/60 border border-zinc-800 flex justify-between items-center hover:border-zinc-700 transition-colors shadow-inner
                  ${isMobile ? 'p-1.5 rounded-xl' : 'p-4 rounded-2xl'}
                `}
              >
                <div className="flex items-center gap-2">
                  <img src={room.players.home.photoURL} alt="" className="w-6 h-6 rounded-full border border-zinc-850" />
                  <div className="text-left">
                    <h4 className="text-[10px] sm:text-xs font-black text-zinc-200 uppercase tracking-wide flex items-center gap-1">
                      {room.name}
                      {room.isClosed && <Lock size={9} className="text-amber-500" />}
                    </h4>
                    <p className="text-[8px] font-semibold text-zinc-550 uppercase">Criador: {room.players.home.displayName.substring(0, 10)}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (room.isClosed) {
                      setJoiningRoomId(room.roomId);
                    } else {
                      joinRoom(room.roomId);
                    }
                  }}
                  className="px-3 py-1 bg-indigo-950 border border-indigo-800/40 hover:bg-indigo-900 text-indigo-400 font-black rounded-lg text-[9px] sm:text-xs tracking-wider transition-colors"
                >
                  JOGAR
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-6 sm:py-12 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500">
              <Users size={isMobile ? 20 : 28} className="opacity-30 mb-1" />
              <span className="text-[10px] sm:text-xs font-semibold">Nenhuma sala aguardando oponentes no momento.</span>
              <span className="text-[8px] sm:text-[10px] text-zinc-655">Clique no botão acima para inaugurar a arena!</span>
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderTournamentTab = () => {
    return (
      <div className={`w-full animate-scaleUp ${isMobile ? 'space-y-1.5' : 'space-y-6'}`}>
        
        {/* Torneio Principal Switcher */}
        {!activeTournamentId ? (
          <div className={isMobile ? 'space-y-2' : 'space-y-6'}>
            <div className={`w-full flex flex-row justify-between items-center bg-zinc-900/40 border border-zinc-800/60 rounded-2xl gap-3 text-left
              ${isMobile ? 'p-2 rounded-xl gap-2' : 'p-4 rounded-2xl gap-3'}
            `}>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-yellow-400 text-left">COPA MATA-MATA (4 JOGADORES)</h3>
                <p className={`text-[9px] text-zinc-550 text-left ${isMobile ? 'hidden' : 'block'}`}>Encare humanos e IAs substitutas na chave rumo ao ouro</p>
              </div>
              <button
                onClick={() => setShowCreateTForm(!showCreateTForm)}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-zinc-950 rounded-xl text-[9px] sm:text-xs font-black tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-650/30"
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
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto
              ${isMobile ? 'max-h-[140px]' : 'max-h-[350px]'}
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
                        <p className="text-[8px] font-semibold text-zinc-550 uppercase">Competidores: {pCount} / 4</p>
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
                <div className="col-span-2 py-6 sm:py-12 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500">
                  <Trophy size={20} className="opacity-30 mb-1" />
                  <span className="text-[10px] sm:text-xs font-semibold">Nenhum torneio agendado.</span>
                  <span className="text-[8px] sm:text-[10px] text-zinc-655">Clique no botão acima para fundar a sua copa!</span>
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
                  <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest border-b border-zinc-800/80 pb-0.5 block">Semifinais</span>
                  
                  {['semi-1', 'semi-2'].map((matchId) => {
                    const match = tournament.matches[matchId];
                    if (!match) return null;
                    
                    const isMyMatch = activeUser && (match.player1.uid === activeUser.uid || match.player2.uid === activeUser.uid);
                    
                    return (
                      <div key={matchId} className={`p-2 bg-zinc-950/80 border rounded-xl flex flex-col space-y-1 text-left relative ${isMyMatch ? 'border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]' : 'border-zinc-800'}`}>
                        {/* Player 1 Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <img src={match.player1.photoURL} alt="" className="w-4 h-4 rounded-full" />
                            <span className={`text-[9px] font-bold truncate max-w-[65px] ${match.winnerUid === match.player1.uid ? 'text-emerald-400' : match.winnerUid && match.winnerUid !== match.player1.uid ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                              {match.player1.displayName.substring(0, 10)}
                            </span>
                          </div>
                          <span className="text-[9px] font-black tabular-nums">{match.score1 !== undefined ? match.score1 : '-'}</span>
                        </div>

                        {/* Player 2 Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <img src={match.player2.photoURL} alt="" className="w-4 h-4 rounded-full" />
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
                            <img src={match.player1.photoURL} alt="" className="w-5 h-5 rounded-full border border-yellow-500/30" />
                            <span className={`text-[10px] font-black truncate max-w-[70px] ${match.winnerUid === match.player1.uid ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-900/30 px-1.5 py-0.5 rounded shadow' : match.winnerUid && match.winnerUid !== match.player1.uid ? 'text-zinc-650 line-through' : 'text-zinc-300'}`}>
                              {match.player1.displayName.substring(0, 10)}
                            </span>
                          </div>
                          <span className="text-xs font-black tabular-nums">{match.score1 !== undefined ? match.score1 : '-'}</span>
                        </div>

                        {/* Player 2 Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <img src={match.player2.photoURL} alt="" className="w-5 h-5 rounded-full border border-yellow-500/30" />
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
                  <span className="text-[8px] text-zinc-650 block mt-0.5">Você pode iniciar o torneio para preencher com bots de IA.</span>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    );
  };

  const renderRankingTab = () => {
    return (
      <div className={`w-full animate-scaleUp ${isMobile ? 'space-y-1.5' : 'space-y-6'}`}>
        
        {/* PODIUM GRAPHIC (TOP 3) */}
        <div className="w-full max-w-xl mx-auto grid grid-cols-3 gap-1.5 sm:gap-3 items-end pt-2 pb-1">
          
          {/* Podium 2nd Place */}
          {leaderboard[1] && (
            <div className="flex flex-col items-center space-y-1 animate-scaleUp delay-100">
              <div className="relative">
                <img src={leaderboard[1].photoURL} alt="" className="w-7 h-7 sm:w-12 sm:h-12 rounded-full border border-slate-400 shadow-md" />
                <span className="absolute -top-1 -right-1 bg-slate-500 border border-slate-400 text-white font-black text-[7px] sm:text-[9px] w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">2</span>
              </div>
              <span className="text-[9px] sm:text-xs font-black truncate max-w-[50px] sm:max-w-[80px]">{leaderboard[1].displayName}</span>
              <div className="w-full h-8 sm:h-16 bg-slate-900 border-t border-slate-700/60 rounded-t-lg sm:rounded-t-2xl flex flex-col items-center justify-center p-0.5 sm:p-2">
                <span className="text-[8.5px] sm:text-xs font-black text-slate-400">{leaderboard[1].points} pts</span>
              </div>
            </div>
          )}

          {/* Podium 1st Place */}
          {leaderboard[0] && (
            <div className="flex flex-col items-center space-y-1 animate-scaleUp">
              <div className="relative">
                <Crown size={10} className="text-yellow-400 absolute -top-2.5 left-1/2 -translate-x-1/2 animate-bounce" />
                <img src={leaderboard[0].photoURL} alt="" className="w-9 h-9 sm:w-16 sm:h-16 rounded-full border-2 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]" />
                <span className="absolute -top-1 -right-1 bg-yellow-500 border border-yellow-400 text-zinc-950 font-black text-[8px] sm:text-xs w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">1</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black truncate max-w-[65px] sm:max-w-[100px] text-yellow-400">{leaderboard[0].displayName}</span>
              <div className="w-full h-11 sm:h-24 bg-gradient-to-t from-zinc-900 to-yellow-950/20 border-t border-yellow-500/40 rounded-t-lg sm:rounded-t-2xl flex flex-col items-center justify-center p-0.5 sm:p-2 shadow-lg">
                <span className="text-[9.5px] sm:text-sm font-black text-yellow-400">{leaderboard[0].points} pts</span>
              </div>
            </div>
          )}

          {/* Podium 3rd Place */}
          {leaderboard[2] && (
            <div className="flex flex-col items-center space-y-1 animate-scaleUp delay-200">
              <div className="relative">
                <img src={leaderboard[2].photoURL} alt="" className="w-7 h-7 sm:w-12 sm:h-12 rounded-full border-2 border-amber-600 shadow-md" />
                <span className="absolute -top-1 -right-1 bg-amber-700 border border-amber-600 text-white font-black text-[7px] sm:text-[9px] w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">3</span>
              </div>
              <span className="text-[9px] sm:text-xs font-black truncate max-w-[50px] sm:max-w-[80px]">{leaderboard[2].displayName}</span>
              <div className="w-full h-7 sm:h-12 bg-amber-950/20 border-t border-amber-800/40 rounded-t-lg sm:rounded-t-2xl flex flex-col items-center justify-center p-0.5 sm:p-2">
                <span className="text-[8.5px] sm:text-xs font-black text-amber-600">{leaderboard[2].points} pts</span>
              </div>
            </div>
          )}

        </div>

        {/* Leaderboard Table (Position 4+) */}
        <div className="w-full max-w-xl mx-auto rounded-xl border border-zinc-850 overflow-hidden shadow-inner max-h-[110px] sm:max-h-[200px] overflow-y-auto">
          <table className="w-full text-left text-[10px] sm:text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-550 text-[8.5px] sm:text-[10px] font-black uppercase">
                <th className="px-3 py-1">Pos</th>
                <th className="px-3 py-1">Jogador</th>
                <th className="px-3 py-1 text-center hidden sm:table-cell">Vitórias</th>
                <th className="px-3 py-1 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {leaderboard.length > 3 ? (
                leaderboard.slice(3).map((player, idx) => (
                  <tr key={player.uid} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-3 py-1.5 font-bold text-zinc-555">{idx + 4}</td>
                    <td className="px-3 py-1.5 font-semibold text-zinc-300 flex items-center gap-1.5">
                      <img src={player.photoURL} alt="" className="w-4 h-4 rounded-full border border-zinc-800" />
                      <span className="truncate max-w-[70px] sm:max-w-[120px]">{player.displayName}</span>
                    </td>
                    <td className="px-3 py-1.5 text-center font-bold text-zinc-400 hidden sm:table-cell">{player.wins}</td>
                    <td className="px-3 py-1.5 text-right font-black text-purple-400">{player.points}</td>
                  </tr>
                ))
              ) : (
                leaderboard.length <= 3 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-zinc-650 font-semibold italic text-[9.5px]">Nenhum competidor adicional.</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

      </div>
    );
  };

  const renderHistoryTab = () => {
    return (
      <div className={`w-full ${isMobile ? 'space-y-1.5' : 'space-y-4'} animate-scaleUp`}>
        <h3 className="text-[10px] font-black tracking-widest text-emerald-400 uppercase text-left">Suas Últimas Pelejas</h3>
        
        <div className={`grid grid-cols-1 gap-1.5 overflow-y-auto pr-1
          ${isMobile ? 'max-h-[140px]' : 'max-h-[350px]'}
        `}>
          {matchHistory.length > 0 ? (
            matchHistory.map((match: any) => {
              const isWin = match.result === 'WIN';
              const isDraw = match.result === 'DRAW';
              const outcomeColor = isWin 
                ? 'border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.1)] bg-emerald-950/10 text-emerald-400' 
                : isDraw 
                  ? 'border-zinc-800 text-zinc-400 bg-zinc-900/30' 
                  : 'border-rose-500/40 text-rose-400 bg-rose-950/10';
              
              return (
                <div 
                  key={match.id}
                  className={`border rounded-xl flex justify-between items-center transition-all shadow-inner
                    ${isMobile ? 'p-2' : 'p-4'}
                    ${outcomeColor}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img src={match.opponentPhoto} alt="" className="w-6 h-6 rounded-full border border-zinc-800" />
                      <span className={`absolute -bottom-1 -right-1 text-[6.5px] font-black px-1 py-0.5 rounded ${match.isTournament ? 'bg-yellow-950 border border-yellow-800 text-yellow-400' : 'bg-indigo-950 border border-indigo-800 text-indigo-400'}`}>
                        {match.isTournament ? 'COPA' : 'LIGA'}
                      </span>
                    </div>
                    
                    <div className="text-left">
                      <h4 className="text-[10px] sm:text-xs font-black uppercase truncate max-w-[80px] sm:max-w-[120px]">{match.opponentName}</h4>
                      <span className="text-[7.5px] font-bold text-zinc-555 uppercase flex items-center gap-0.5 mt-0.5">
                        <Calendar size={8} /> {new Date(match.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Placar Box */}
                  <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800/80 px-2 py-1 rounded-lg font-black text-[10px] tabular-nums text-white">
                    <span className={isWin ? 'text-emerald-400' : 'text-zinc-400'}>{match.myGoals}</span>
                    <span className="text-zinc-650">:</span>
                    <span className={!isWin && !isDraw ? 'text-rose-400' : 'text-zinc-400'}>{match.opponentGoals}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500">
              <History size={20} className="opacity-30 mb-1" />
              <span className="text-[10px] sm:text-xs font-semibold">Nenhuma partida online registrada.</span>
              <span className="text-[8px] sm:text-[10px] text-zinc-650">Jogue no modo multiplayer ou mata-mata para começar!</span>
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderMobileMenu = () => {
    return (
      <div className="absolute inset-0 z-20 flex flex-row bg-gradient-to-br from-zinc-950 via-zinc-900/98 to-slate-950 select-none overflow-hidden h-full p-2 gap-2">
        {/* Animated Background Lights */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse delay-700"></div>

        {/* 1. LEFT SIDEBAR MENU */}
        <div className="w-[85px] xs:w-[110px] h-full flex flex-col justify-between items-center bg-zinc-950/70 border border-zinc-800/60 p-1.5 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md z-10 flex-shrink-0">
          
          {/* Logo / Header */}
          <div className="flex flex-col items-center select-none text-center">
            <h1 className="text-[11px] xs:text-sm font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              TABLEBALL 3D
            </h1>
            <span className="text-[5px] font-black text-zinc-550 uppercase tracking-widest leading-none">
              TÁTICO
            </span>
          </div>

          {/* Navigation Buttons Stack */}
          <div className="w-full flex flex-col gap-1 my-1.5">
            {[
              { id: 'solo', label: 'SOLO', icon: Target, activeColor: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' },
              { id: 'multi', label: 'ONLINE', icon: Globe, activeColor: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' },
              { id: 'tournament', label: 'COPA', icon: Trophy, activeColor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
              { id: 'ranking', label: 'RANKING', icon: Award, activeColor: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
              { id: 'history', label: 'HISTÓRICO', icon: History, activeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = currentMenuTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id !== 'solo' && !activeUser) {
                      setRestrictedTabAttempt(tab.id as any);
                      setLoginError(null);
                      setShowLoginModal(true);
                    } else {
                      setCurrentMenuTab(tab.id as any);
                    }
                  }}
                  className={`
                    py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[7px] font-black tracking-wider transition-all duration-300 hover:scale-102 w-full
                    ${isSelected 
                      ? `${tab.activeColor} shadow-[0_0_12px_rgba(0,0,0,0.35)]` 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                    }
                  `}
                >
                  <Icon size={12} className="w-3 h-3" />
                  <span className="text-[6.5px] font-black tracking-wider leading-none text-center">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Area (Auth Profile, Rules, Fullscreen, Logout) */}
          <div className="w-full flex flex-col items-center gap-1 border-t border-zinc-850 pt-1.5">
            {activeUser ? (
              <div className="flex flex-col items-center gap-0.5 w-full">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="relative group pointer-events-auto hover:scale-105 active:scale-95 transition-transform"
                  title="Configurações & Uniforme"
                >
                  <img 
                    src={activeUser.photoURL || ''} 
                    alt="" 
                    className="w-5 h-5 rounded-full border border-cyan-400 shadow-md object-cover" 
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-[5px] text-zinc-400">
                    ⚙️
                  </span>
                </button>
                <span className="text-[6px] text-zinc-400 font-bold truncate max-w-[60px] uppercase">
                  {userProfile?.username?.substring(0, 7) || activeUser.displayName?.substring(0, 7)}
                </span>
                
                <div className="flex gap-1 mt-0.5">
                  <button 
                    onClick={logout}
                    className="text-zinc-550 hover:text-rose-450 transition-colors p-0.5"
                    title="Sair"
                  >
                    <LogOut size={8} />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="text-zinc-550 hover:text-cyan-400 transition-colors p-0.5"
                    title="Tela Cheia"
                  >
                    {isFullscreen ? <Minimize2 size={8} /> : <Maximize2 size={8} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5 w-full">
                <button
                  onClick={() => handleLogin()}
                  className="p-1 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 rounded-full text-zinc-500 hover:text-white transition-all hover:scale-105 active:scale-95"
                  title="Entrar com Google"
                >
                  <LogIn size={10} />
                </button>
                <span className="text-[5.5px] text-zinc-500 font-bold uppercase tracking-wider text-center leading-none">Entrar</span>
                <button
                  onClick={toggleFullscreen}
                  className="text-zinc-550 hover:text-cyan-400 transition-colors p-0.5 mt-0.5"
                  title="Tela Cheia"
                >
                  {isFullscreen ? <Minimize2 size={8} /> : <Maximize2 size={8} />}
                </button>
              </div>
            )}

            {/* Rules Button */}
            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-[6.5px] font-black text-zinc-550 hover:text-cyan-400 uppercase tracking-widest transition-colors mt-0.5"
            >
              Regras
            </button>
          </div>

        </div>

        {/* 2. RIGHT CONTENT AREA */}
        <div className="flex-grow h-full bg-zinc-950/40 border border-zinc-900 rounded-2xl p-2 backdrop-blur-md overflow-hidden flex flex-col justify-center relative">
          
          {/* Rules Modal (Mobile overlay inside content pane) */}
          {showInstructions && (
            <div className="absolute inset-1 p-2 text-left rounded-xl bg-zinc-950/98 border border-cyan-500/30 text-zinc-300 text-[8px] leading-relaxed space-y-1 shadow-2xl z-50 animate-scaleUp overflow-y-auto pointer-events-auto">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-0.5">
                <span className="font-black text-cyan-400 uppercase tracking-widest text-[8px]">Instruções de Jogo</span>
                <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-zinc-300 text-[8px] font-black uppercase">Fechar</button>
              </div>
              <p>1. <strong>Preparação Secreta:</strong> Posicione seus jogadores nos slots verdes do campo. Na sua vez de programar, toque nos pinos para rotacionar a seta 3D e definir a ação (Passe, Cruzamento, Chute ou Desarme).</p>
              <p>2. <strong>O Peteleco:</strong> No seu turno ativo de jogo, clique na bola branca, arraste para trás (estilo estilingue) e solte para disparar a bola.</p>
              <p>3. <strong>Deflexões:</strong> Se a bola atingir seu próprio pino, ele dispara automaticamente a bola na direção programada pela seta, possibilitando tabelas incríveis!</p>
              <p>4. <strong>Auto-Resgate por IA:</strong> Em partidas online, se o seu oponente cair ou perder a conexão no meio do jogo, uma IA assumirá o controle do time dele para que você continue e garanta seus pontos!</p>
            </div>
          )}

          {/* Render Active Tab content container with no extra outer scrollbar */}
          <div className="w-full h-full overflow-y-auto pr-0.5 flex flex-col justify-center">
            {currentMenuTab === 'solo' && renderSoloTab()}
            {currentMenuTab === 'multi' && renderMultiTab()}
            {currentMenuTab === 'tournament' && renderTournamentTab()}
            {currentMenuTab === 'ranking' && renderRankingTab()}
            {currentMenuTab === 'history' && renderHistoryTab()}
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopMenu = () => {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center bg-gradient-to-br from-zinc-950 via-zinc-900/98 to-slate-950 select-none justify-start p-4 md:p-6 overflow-y-auto min-h-screen">
        {/* Animated Background Lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700"></div>

        <div className="relative max-w-4xl w-full flex flex-col items-center text-center space-y-4 md:space-y-6 pt-2 md:pt-4 pb-8 md:pb-12">
          {/* Header com Auth Info */}
          <div className="w-full flex justify-between items-center gap-2 flex-wrap border-b border-zinc-800/80 pb-3 md:pb-4">
            <div className="flex flex-col items-start select-none">
              <h1 className="text-base sm:text-lg md:text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                TABLEBALL 3D
              </h1>
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none hidden sm:block">
                FUTEBOL TÁTICO
              </span>
            </div>
            
            {activeUser ? (
              <div className="flex items-center gap-2">
                {/* Team logo & name from profile */}
                {userProfile?.teamName && (
                  <div className="hidden sm:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-full px-3 py-1">
                    {userProfile.logoUrl && (
                      <img src={userProfile.logoUrl} alt="logo" className="w-5 h-5 rounded-full object-cover" />
                    )}
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wide">{userProfile.teamName}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 md:gap-2 bg-zinc-900/80 border border-zinc-800 rounded-full px-2.5 md:px-4 py-1 md:py-1.5 shadow-md">
                  <img src={activeUser.photoURL || ''} alt="" className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-cyan-400" />
                  <span className="hidden sm:inline text-xs font-semibold text-zinc-300">{userProfile?.username || activeUser.displayName}</span>
                  
                  {/* Profile / Kit Customizer Button */}
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="text-zinc-400 hover:text-cyan-400 transition-all p-1 pointer-events-auto hover:scale-110"
                    title="Customizar Perfil e Uniforme"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </button>
                  
                  <button 
                    onClick={logout}
                    className="text-zinc-550 hover:text-rose-400 transition-all p-1 pointer-events-auto hover:scale-110"
                    title="Sair da Conta"
                  >
                    <LogOut size={13} />
                  </button>
                </div>

                {/* Dedicated Premium Glassmorphic Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border border-zinc-800/80 bg-zinc-950/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-350 hover:scale-110 active:scale-90 pointer-events-auto group relative"
                  title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
                >
                  {isFullscreen ? (
                    <Minimize2 size={14} className="group-hover:rotate-12 transition-transform duration-300" />
                  ) : (
                    <Maximize2 size={14} className="group-hover:scale-115 transition-transform duration-300" />
                  )}
                  {!isFullscreen && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-[#070a0e] animate-pulse"></span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Dedicated Premium Glassmorphic Fullscreen Toggle when Not Logged In */}
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border border-zinc-800/80 bg-zinc-950/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-350 hover:scale-110 active:scale-90 pointer-events-auto group relative"
                  title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
                >
                  {isFullscreen ? (
                    <Minimize2 size={14} className="group-hover:rotate-12 transition-transform duration-300" />
                  ) : (
                    <Maximize2 size={14} className="group-hover:scale-115 transition-transform duration-300" />
                  )}
                  {!isFullscreen && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-[#070a0e] animate-pulse"></span>
                  )}
                </button>

                <button
                  onClick={() => handleLogin()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md pointer-events-auto"
                >
                  <GoogleIcon />
                  Entrar com o Google
                </button>
              </div>
            )}
          </div>

          {/* TAB NAVIGATION BAR */}
          <div className="w-full grid grid-cols-5 gap-1.5 bg-zinc-950/80 border border-zinc-800/60 p-1.5 rounded-2xl shadow-inner">
            {[
              { id: 'solo', label: 'MODO SOLO', icon: Target, activeColor: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' },
              { id: 'multi', label: 'MULTIPLAYER', icon: Globe, activeColor: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' },
              { id: 'tournament', label: 'MATA-MATA', icon: Trophy, activeColor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
              { id: 'ranking', label: 'RANKING', icon: Award, activeColor: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
              { id: 'history', label: 'HISTÓRICO', icon: History, activeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = currentMenuTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id !== 'solo' && !activeUser) {
                      setRestrictedTabAttempt(tab.id as any);
                      setLoginError(null);
                      setShowLoginModal(true);
                    } else {
                      setCurrentMenuTab(tab.id as any);
                    }
                  }}
                  className={`
                    py-2 md:py-3 px-1 md:px-1.5 rounded-xl border flex flex-col items-center gap-1 md:gap-1.5 text-[7px] md:text-xs font-black tracking-wider transition-all duration-300 hover:scale-102
                    ${isSelected 
                      ? `${tab.activeColor} shadow-[0_0_15px_rgba(0,0,0,0.35)]` 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                    }
                  `}
                >
                  <Icon size={16} className="md:w-5 md:h-5 w-4 h-4" />
                  <span className="hidden md:inline text-[10px] md:text-xs font-black tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB CONTENTS */}
          <div className="w-full flex-grow flex flex-col justify-center overflow-hidden max-h-[380px] mt-4">
            {currentMenuTab === 'solo' && renderSoloTab()}
            {currentMenuTab === 'multi' && renderMultiTab()}
            {currentMenuTab === 'tournament' && renderTournamentTab()}
            {currentMenuTab === 'ranking' && renderRankingTab()}
            {currentMenuTab === 'history' && renderHistoryTab()}
          </div>

          {/* Instruction Toggle & Footer Merged for Perfect Viewport Proportion */}
          <div className="w-full pt-3 border-t border-zinc-900 flex justify-between items-center text-[10px] font-bold text-zinc-500 px-2 mt-2 select-none relative">
            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors uppercase tracking-wider pointer-events-auto"
            >
              <Info size={12} />
              {showInstructions ? 'Ocultar Regras' : 'Regras de Jogo'}
            </button>
            
            {showInstructions && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[92%] max-w-lg p-4 text-left rounded-2xl bg-zinc-950/98 border border-cyan-500/30 text-zinc-300 text-xs leading-relaxed space-y-2 shadow-2xl z-50 animate-scaleUp max-h-40 overflow-y-auto pointer-events-auto">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <span className="font-black text-cyan-400 uppercase tracking-widest text-[10px]">Instruções de Jogo</span>
                  <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-zinc-300 text-[10px] font-black uppercase">Fechar</button>
                </div>
                <p>1. <strong>Preparação Secreta:</strong> Posicione seus jogadores nos slots verdes do campo. Na sua vez de programar, toque nos pinos para rotacionar a seta 3D e definir a ação (Passe, Cruzamento, Chute ou Desarme).</p>
                <p>2. <strong>O Peteleco:</strong> No seu turno ativo de jogo, clique na bola branca, arraste para trás (estilo estilingue) e solte para disparar a bola.</p>
                <p>3. <strong>Deflexões:</strong> Se a bola atingir seu próprio pino, ele dispara automaticamente a bola na direção programada pela seta, possibilitando tabelas incríveis!</p>
                <p>4. <strong>Auto-Resgate por IA:</strong> Em partidas online, se o seu oponente cair ou perder a conexão no meio do jogo, uma IA assumirá o controle do time dele para que você continue e garanta seus pontos!</p>
              </div>
            )}
            
            <span className="uppercase tracking-widest text-zinc-650">Antigravity Games &copy; 2026</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-[#070a0e] text-zinc-100 font-['Outfit'] select-none overflow-hidden">
      {isMobile && !isFullscreen && (
        <div
          className="fullscreen-gate"
          onClick={enterFullscreen}
          onTouchEnd={(e) => { e.preventDefault(); enterFullscreen(); }}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.45em] text-cyan-400 bg-cyan-950/60 px-5 py-1.5 rounded-full border border-cyan-800/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            TABLEBALL TÁTICO 3D
          </span>

          <div className="gate-pulse">
            <span style={{ fontSize: 38 }}>⚽</span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center px-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              TABLEBALL 3D
            </h1>
            <p className="text-zinc-400 text-xs font-semibold tracking-wide">
              Futebol de botão tático em 3D
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black tracking-widest uppercase text-sm shadow-[0_4px_25px_rgba(6,182,212,0.45)] animate-pulse">
              Toque para Jogar
            </div>
            <span className="text-[10px] text-zinc-550 font-semibold">Entrará em tela cheia automaticamente</span>
          </div>
        </div>
      )}



      {/* 3D Game Canvas */}
      <div className="absolute inset-0 z-0">
        {phase !== GamePhase.MENU && (
          <Scene 
            phase={phase}
            difficulty={difficulty}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            selectedPlayerId={selectedPlayerId}
            setSelectedPlayerId={setSelectedPlayerId}
            ball={ball}
            setBall={setBall}
            turn={turn}
            shootBall={shootBall}
            changePossession={changePossession}
            scoreGoal={scoreGoal}
            placePlayer={placePlayer}
            isIAThinking={isIAThinking}
            setActionStatus={setActionStatus}
            handleBallStopped={handleBallStopped}
            updateGoalkeeperPositions={updateGoalkeeperPositions}
            homeKitConfig={homeKitConfig}
            awayKitConfig={awayKitConfig}
          />
        )}
      </div>

      {/* --- HUD OVERLAYS --- */}

      {phase === GamePhase.MENU && (
        isMobile ? renderMobileMenu() : renderDesktopMenu()
      )}

      {/* B. TOP HEADERS & SCOREBOARD (Action & Preparation Phases) */}
      {phase !== GamePhase.MENU && (
        <div className={`absolute top-0 left-0 w-full z-10 flex justify-between items-start pointer-events-none animate-fadeIn ${isMobile ? 'p-2 flex-row gap-2' : 'p-4 md:p-6 flex-col md:flex-row gap-2 md:gap-4'}`}>
          
          {/* Main Scoreboard Pill */}
          <div className={`hud-scoreboard-pill pointer-events-auto flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl transition-all duration-300 ${isMobile ? 'px-2.5 py-1 gap-1 text-[10px]' : 'px-3 md:px-5 py-1.5 md:py-2.5 gap-1.5 md:gap-3'}`}>
            <button 
              onClick={resetMatch}
              className={`text-zinc-400 hover:text-rose-400 transition-colors rounded-full hover:bg-zinc-800/80 ${isMobile ? 'p-0.5 mr-0.5' : 'p-1 md:p-1.5 mr-1.5 md:mr-3'}`}
              title="Voltar ao Menu"
            >
              <RotateCcw size={isMobile ? 12 : 15} />
            </button>

            {/* Integrated Premium Glassmorphic Fullscreen Button in Scoreboard */}
            <button 
              onClick={toggleFullscreen}
              className={`text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all duration-300 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 relative group pointer-events-auto ${isMobile ? 'p-0.5 mr-1' : 'p-1.5 mr-2.5 md:mr-4'}`}
              title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 size={isMobile ? 11 : 14} className="group-hover:rotate-12 transition-transform duration-300" />
              ) : (
                <Maximize2 size={isMobile ? 11 : 14} className="group-hover:scale-115 transition-transform duration-300" />
              )}
              {!isFullscreen && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              )}
            </button>

            {/* Home Team & Flick Indicators */}
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-3'}`}>
              <span className={`rounded-full bg-blue-600 shadow-[0_0_10px_rgba(30,55,153,0.5)] ${turn === 'HOME' ? 'animate-pulse ring-2 ring-white/30' : ''} ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5 md:w-3 md:h-3'}`}></span>
              <span className={`font-black tracking-wider uppercase transition-colors duration-300 ${turn === 'HOME' ? 'text-blue-400' : 'text-zinc-400'} ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>
                {isMobile ? 'CASA' : (isMultiplayer ? (myRole === 'HOME' ? 'CASA (VOCÊ)' : 'CASA') : 'CASA')}
              </span>
              
              {/* Home Flicks remaining */}
              <div className={`flex items-center ml-0.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 ${isMobile ? 'gap-0.5 px-1 py-0.5' : 'gap-1 md:gap-1.5 px-1.5 py-1 md:px-2.5 md:py-1.5'}`}>
                {[1, 2, 3].map(i => (
                  <span 
                    key={i} 
                    className={`rounded-full transition-all duration-300 ${
                      i <= homeFlicksRemaining 
                        ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                        : 'bg-zinc-800'
                    } ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5 md:w-2 md:h-2'}`}
                  />
                ))}
              </div>
            </div>

            {/* Score Numbers */}
            <div className={`flex items-center bg-zinc-950 border border-zinc-800/80 rounded-full font-black tabular-nums tracking-widest text-white shadow-inner ${isMobile ? 'mx-1 px-2 py-0.5 text-xs' : 'mx-2 md:mx-5 px-2.5 py-1 md:px-4 md:py-1.5 text-sm md:text-base'}`}>
              <span className="text-blue-400">{scores.home}</span>
              <span className={`text-zinc-650 ${isMobile ? 'mx-0.5' : 'mx-1 md:mx-2'}`}>:</span>
              <span className="text-orange-400">{scores.away}</span>
            </div>

            {/* Away Team & Flick Indicators */}
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-3'}`}>
              {/* Away Flicks remaining */}
              <div className={`flex items-center mr-0.5 bg-zinc-950/60 rounded-full border border-zinc-800/50 ${isMobile ? 'gap-0.5 px-1 py-0.5' : 'gap-1 md:gap-1.5 px-1.5 py-1 md:px-2.5 md:py-1.5'}`}>
                {[1, 2, 3].map(i => (
                  <span 
                    key={i} 
                    className={`rounded-full transition-all duration-300 ${
                      i <= awayFlicksRemaining 
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(241,196,15,0.8)]' 
                        : 'bg-zinc-800'
                    } ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5 md:w-2 md:h-2'}`}
                  />
                ))}
              </div>
              <span className={`font-black tracking-wider uppercase transition-colors duration-300 ${turn === 'AWAY' ? 'text-orange-400' : 'text-zinc-400'} ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>
                {isMobile ? (
                  isMultiplayer ? (opponentInfo ? opponentInfo.displayName.substring(0, 5).toUpperCase() : 'OPO') : 'I.A.'
                ) : (
                  isMultiplayer ? (myRole === 'AWAY' ? 'OPONENTE (VOCÊ)' : (opponentInfo ? opponentInfo.displayName : 'OPONENTE')) : 'INTELIGÊNCIA ARTIFICIAL'
                )}
              </span>
              <span className={`rounded-full bg-orange-600 shadow-[0_0_10px_rgba(229,80,57,0.5)] ${turn === 'AWAY' ? 'animate-pulse ring-2 ring-white/30' : ''} ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5 md:w-3 md:h-3'}`}></span>
            </div>
          </div>

          {/* TV-Broadcast-style Game Timer Pill */}
          <div className={`hud-timer-pill pointer-events-auto flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl text-[10px] md:text-xs font-black tracking-wide uppercase ${isMobile ? 'px-2.5 py-1 gap-1 text-[9px]' : 'px-4 py-2 md:px-5 md:py-2.5 gap-3 md:gap-4'}`}>
            {phase === GamePhase.PREPARATION ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Clock size={isMobile ? 11 : 14} className="animate-pulse text-emerald-400" />
                <span className="tracking-wider text-[9px] md:text-xs">
                  {isMobile ? 'PREPARAÇÃO' : (
                    <>
                      PREPARAÇÃO TÁTICA{' '}
                      {isMultiplayer ? '(AGUARDANDO CONFIRMAÇÃO)' : '(ILIMITADA)'}
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2.5 md:gap-4'} text-zinc-300`}>
                {/* Game Time (Minutes) */}
                <div className={`flex items-center gap-1 bg-zinc-950/60 rounded-full border border-zinc-800/50 text-cyan-400 shadow-inner ${isMobile ? 'px-1.5 py-0.5' : 'px-2 py-0.5 md:px-3 md:py-1'}`}>
                  <Clock size={isMobile ? 10 : 12} className="text-cyan-500" />
                  <span className={`font-black tracking-widest ${isMobile ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>{gameTime}'</span>
                </div>
                
                {/* Round Counter */}
                <div className={`${isMobile ? 'hidden' : 'hidden sm:block'} text-[10px] font-bold text-zinc-500 border-l border-zinc-800 pl-4 uppercase`}>
                  Rodada <span className="text-zinc-300 font-black">{Math.floor(gameTime / 5) + 1}</span> de <span className="text-zinc-300 font-black">18</span>
                </div>
                
                {/* Active Turn Signal */}
                <div className={`${isMobile ? '' : 'sm:border-l sm:border-zinc-800 sm:pl-4'} flex items-center`}>
                  {turn === myRole ? (
                    <span className="text-emerald-400 animate-pulse flex items-center gap-1 text-[9px] md:text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping"></span>
                      <span>SUA VEZ!</span>
                    </span>
                  ) : (
                    <span className="text-amber-500 animate-pulse flex items-center gap-1 text-[9px] md:text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-ping"></span>
                      <span>OPONENTE...</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* C. BOTTOM HUD - PREPARATION PHASE PANEL */}
      {phase === GamePhase.PREPARATION && (
        <div className="absolute bottom-0 left-0 w-full p-3 md:p-6 z-15 flex flex-col landscape:flex-row md:flex-row justify-between items-end gap-3 md:gap-4 pointer-events-none">
          
          {/* Selected Player Scale Panel */}
          {selectedPlayer && (
            <div className="hud-player-card pointer-events-auto w-[290px] xs:w-[320px] md:max-w-md bg-zinc-900/90 backdrop-blur-lg border border-zinc-800 rounded-2xl md:rounded-3xl p-2.5 xs:p-3.5 md:p-5 shadow-2xl transition-all duration-300 animate-scaleUp">
              <div className="flex flex-col space-y-3 md:space-y-4">
                {/* Header of Player Card */}
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 md:pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-950 border border-blue-800/50 flex items-center justify-center font-black text-blue-400 shadow-inner">
                      {selectedPlayer.number}
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-wider uppercase text-zinc-100">
                        {selectedPlayer.number === 1 ? 'GOLEIRO' : 'JOGADOR EM CAMPO'}
                      </h3>
                      {selectedPlayer.isCaptain && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-900/40 mt-0.5 animate-pulse">
                          <Crown size={10} /> CAPITÃO
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status & Captain Actions */}
                  <div className="flex items-center gap-2">
                    {!selectedPlayer.isCaptain && (
                      <button
                        onClick={() => setCaptain(selectedPlayer.id)}
                        className="text-[9px] font-black text-amber-400 bg-amber-950/20 hover:bg-amber-950/50 border border-amber-800/40 px-2.5 py-1.5 rounded-xl transition-colors pointer-events-auto flex items-center gap-1"
                        title="Definir este jogador como Capitão"
                      >
                        <Crown size={10} /> +CAPITÃO
                      </button>
                    )}
                  </div>
                </div>

                {/* Controls for non-goalkeepers */}
                {selectedPlayer.number !== 1 && (
                  <div className="flex flex-col space-y-4">
                    {/* Angle Control / Rotation Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase">
                        <span>Direção da Deflexão</span>
                        <span className="text-cyan-400 font-black tracking-widest bg-cyan-950/40 border border-cyan-900/40 px-2.5 py-0.5 rounded">
                          {getDegreeAngle(selectedPlayer.angle)}&deg;
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleAngleChange(getDegreeAngle(selectedPlayer.angle) - 15)}
                          className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors pointer-events-auto"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="5"
                          value={getDegreeAngle(selectedPlayer.angle)}
                          onChange={(e) => handleAngleChange(parseInt(e.target.value))}
                          className="flex-grow h-2 bg-zinc-950 border border-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 pointer-events-auto"
                        />
                        <button
                          onClick={() => handleAngleChange(getDegreeAngle(selectedPlayer.angle) + 15)}
                          className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors pointer-events-auto"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Action Mode Toggle (Cross vs. Shoot vs. Tackle) */}
                    <div className="space-y-2">
                      <span className="text-xs text-zinc-400 font-bold uppercase block">
                        Ação Programada na Colisão
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                        <button
                          onClick={() => handleActionTypeChange(selectedPlayer.id, 'PASS')}
                          className={`
                            py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                            ${selectedPlayer.actionType === 'PASS'
                              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30'
                              : 'border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-950/10 hover:border-cyan-950/40'
                            }
                          `}
                        >
                          <ArrowRight size={12} />
                          PASSAR
                        </button>

                        <button
                          onClick={() => handleActionTypeChange(selectedPlayer.id, 'CROSS')}
                          className={`
                            py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                            ${selectedPlayer.actionType === 'CROSS'
                              ? 'border-amber-500 text-amber-400 bg-amber-950/30'
                              : 'border-zinc-800 text-zinc-500 hover:text-amber-400 hover:bg-amber-950/10 hover:border-amber-950/40'
                            }
                          `}
                        >
                          <Navigation size={12} className="rotate-45" />
                          CRUZAR
                        </button>
                        
                        {/* Check if slot allows shooting (Z >= 0 or home-att slot) */}
                        {(() => {
                          const canShoot = selectedPlayer.position[2] >= 0; // forward half
                          return (
                            <button
                              disabled={!canShoot}
                              onClick={() => handleActionTypeChange(selectedPlayer.id, 'SHOOT')}
                              className={`
                                py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                                ${!canShoot 
                                  ? 'opacity-30 border-zinc-800 text-zinc-700 cursor-not-allowed'
                                  : selectedPlayer.actionType === 'SHOOT'
                                    ? 'border-rose-500 text-rose-450 bg-rose-950/30'
                                    : 'border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/10 hover:border-rose-950/40'
                                }
                              `}
                              title={!canShoot ? "Chutes bloqueados atrás da linha do meio campo!" : "Chutar direto"}
                            >
                              <Target size={12} />
                              CHUTAR
                            </button>
                          );
                        })()}

                        <button
                          onClick={() => handleActionTypeChange(selectedPlayer.id, 'TACKLE')}
                          className={`
                            py-2.5 md:py-3 px-0.5 md:px-1 rounded-xl md:rounded-2xl border-2 font-black tracking-wide text-[9px] flex flex-col items-center justify-center gap-1 md:gap-1.5 transition-all pointer-events-auto
                            ${selectedPlayer.actionType === 'TACKLE'
                              ? 'border-zinc-300 text-zinc-100 bg-zinc-850 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                              : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                            }
                          `}
                        >
                          <Shield size={12} />
                          DESARME
                        </button>
                      </div>
                      
                      {tackleLimitError && (
                        <span className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1 animate-pulse bg-rose-950/40 border border-rose-900/30 py-1.5 px-3 rounded-xl mt-1.5">
                          <ShieldAlert size={12} /> Limite de 3 Desarmes atingido!
                        </span>
                      )}

                      {selectedPlayer.position[2] < 0 && selectedPlayer.actionType !== 'TACKLE' && (
                        <span className="text-[9px] text-zinc-500 font-semibold block text-center italic mt-1">
                          * Posição defensiva: Chutes estão bloqueados.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirm Escalation Done Button */}
          <div className="pointer-events-auto w-full landscape:w-auto md:w-auto ml-auto">
            <button
              onClick={completePreparation}
              className="hud-confirm-btn w-full py-3.5 md:py-5 px-6 md:px-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black tracking-widest uppercase rounded-2xl md:rounded-3xl shadow-[0_4px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_35px_rgba(16,185,129,0.5)] transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs md:text-sm"
            >
              <CheckCircle2 size={16} className="md:w-[18px] md:h-[18px]" />
              CONFIRMAR TÁTICA
            </button>
          </div>
        </div>
      )}

      {/* D. HUD OVERLAY - ACTION PHASE (Instruções e status ativo) */}
      {phase === GamePhase.ACTION && (() => {
        const isFoul = actionStatus.startsWith('Falta!');
        const isBallSelected = selectedPlayerId === 'ball';
        return (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4 pointer-events-none flex flex-col items-center gap-3 animate-fadeIn">
            
            {/* Premium Ball Selection Guide Card */}
            {isBallSelected && turn === myRole && (
              <div className="pointer-events-auto w-full bg-zinc-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-[0_10px_40px_rgba(6,182,212,0.25)] transition-all duration-300 animate-scaleUp">
                <div className="flex flex-col space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2 md:pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
                        ⚽
                      </div>
                      <div>
                        <h3 className="text-xs md:text-sm font-black tracking-wider uppercase text-zinc-100">BOLA DE JOGO</h3>
                        <span className="inline-flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-900/40 mt-0.5 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                          SELECIONADA
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] md:text-xs text-zinc-300 leading-relaxed font-semibold text-center py-0.5 md:py-1">
                    🎯 Clique na bola, puxe para trás (estilingue) e solte para dar o peteleco!
                  </p>
                </div>
              </div>
            )}

            <div className={`pointer-events-auto w-full bg-zinc-950/90 backdrop-blur-md border p-3.5 md:p-4.5 rounded-xl md:rounded-2xl text-center flex flex-col items-center space-y-1 transition-all duration-300 ${
              isFoul 
                ? 'border-rose-600/70 shadow-[0_0_25px_rgba(225,29,72,0.25)] animate-pulse' 
                : 'border-zinc-800/80 shadow-2xl'
            }`}>
              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${
                isFoul ? 'text-rose-500' : 'text-cyan-400'
              }`}>
                {isFoul ? '⚠️ INFRAÇÃO DETECTADA' : 'INFORMAÇÕES DE CAMPO'}
              </span>
              <p className="text-[11px] md:text-xs text-zinc-300 font-semibold leading-relaxed">
                {actionStatus}
              </p>
              {isIAThinking && (
                <div className="w-16 h-1 mt-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 animate-loadingBar rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* E. HUD OVERLAY - GOAL CELEBRATION */}
      {phase === GamePhase.GOAL_CELEBRATION && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_60%)] animate-pulse"></div>
          
          <div className="relative flex flex-col items-center text-center space-y-4 animate-scaleUp">
            <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.6em] text-yellow-400 animate-bounce">
              GOLAÇOOO!
            </span>
            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase text-white bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)] leading-none select-none">
              GOL!!!
            </h1>
            <p className="text-sm md:text-base text-cyan-400 font-black tracking-widest uppercase bg-cyan-950/60 px-5 py-2 md:px-6 md:py-2.5 rounded-full border border-cyan-800/40 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              {ball.possession === 'HOME' ? 'TIME DA CASA MARCOU' : 'TIME VISITANTE MARCOU!'}
            </p>
            <p className="text-[10px] md:text-xs text-zinc-400 max-w-[280px] md:max-w-xs font-medium">
              Os jogadores continuam onde pararam. O capitão do time adversário se posicionará no centro para dar a saída!
            </p>
          </div>
        </div>
      )}

      {/* F. HUD OVERLAY - GAME OVER */}
      {phase === GamePhase.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-zinc-950/95 backdrop-blur-md">
          {scores.home >= 3 || (scores.home > scores.away && gameTime >= 90) ? (
            <div className="absolute w-[450px] h-[450px] bg-yellow-500/10 rounded-full blur-[150px] animate-pulse"></div>
          ) : (
            <div className="absolute w-[450px] h-[450px] bg-rose-500/10 rounded-full blur-[150px] animate-pulse"></div>
          )}

          <div className="relative max-w-md w-full text-center space-y-6 flex flex-col items-center animate-scaleUp">
            {scores.home >= 3 || (scores.home > scores.away && gameTime >= 90) ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-4 shadow-[0_0_30px_rgba(241,196,15,0.2)]">
                  <Trophy size={42} />
                </div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent leading-none">
                  VENCEDOR!
                </h1>
                <p className="text-zinc-400 text-xs mt-2 font-medium tracking-wide">
                  Parabéns! Você dominou o campo e garantiu a sua taça de campeão.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(229,80,57,0.2)]">
                  <Shield size={42} />
                </div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-rose-400 to-red-600 bg-clip-text text-transparent leading-none">
                  DERROTA
                </h1>
                <p className="text-zinc-400 text-xs mt-2 font-medium tracking-wide">
                  Não desanime! Ajuste sua estratégia, refine a mira e peteleque novamente.
                </p>
              </div>
            )}

            {/* Score Summary Box */}
            <div className="w-full p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-2">
                Placar Final
              </span>
              <div className="flex justify-center items-center gap-6 font-black text-4xl tabular-nums">
                <span className="text-blue-400">{scores.home}</span>
                <span className="text-zinc-600 text-2xl">:</span>
                <span className="text-orange-400">{scores.away}</span>
              </div>
            </div>

            {/* Action buttons */}
            <button 
              onClick={resetMatch}
              className="w-full py-4.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.4)] transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs"
            >
              <RotateCcw size={14} />
              VOLTAR AO MENU PRINCIPAL
            </button>
          </div>
        </div>
      )}

      {/* G. OPPONENT CONNECTION LOST OVERLAY */}
      {opponentDisconnected && phase !== GamePhase.MENU && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)] text-center space-y-6 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto animate-pulse">
              <ShieldAlert size={36} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-black tracking-wide text-rose-400 uppercase">CONEXÃO DO ADVERSÁRIO PERDIDA</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                O oponente perdeu a conexão com os servidores do Firebase. Aguardando reconexão...
              </p>
            </div>

            {/* Pulsing countdown timer */}
            <div className="bg-zinc-950 border border-zinc-800 py-4 px-6 rounded-2xl w-fit mx-auto">
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-1">A IA assumirá em</span>
              <span className="text-3xl font-black text-rose-500 tabular-nums animate-pulse">{disconnectCountdown}s</span>
            </div>

            <p className="text-[10px] text-zinc-550 italic font-semibold">
              * Você não perderá pontos ou progresso caso decida aguardar ou continuar contra a IA!
            </p>
          </div>
        </div>
      )}

      {/* H. RESTRICTED ACCESS LOGIN MODAL OVERLAY */}
      {showLoginModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative max-w-md w-full my-auto p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 border border-zinc-800 shadow-[0_10px_50px_rgba(0,0,0,0.8)] text-center space-y-5 animate-scaleUp">
            
            {/* Elegant Close Icon */}
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-full hover:bg-zinc-900/60 font-black text-sm"
              title="Fechar"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-full bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_20px_rgba(6,182,212,0.25)] animate-pulse">
              <Lock size={24} />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-xl font-black tracking-wide text-zinc-100 uppercase">ÁREA RESTRITA</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                Para disputar partidas multiplayer, participar de torneios mata-mata, subir no ranking global e visualizar seu histórico, você precisa estar conectado à sua conta.
              </p>
            </div>

            {/* Error Message Section */}
            {loginError && (
              <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded-2xl text-left space-y-1.5 text-rose-200 text-[11px] leading-relaxed animate-fadeIn">
                <span className="font-bold flex items-center gap-1.5 text-rose-450 uppercase tracking-wide">
                  <ShieldAlert size={14} className="text-rose-400" /> Falha na Autenticação
                </span>
                <p className="opacity-95">{loginError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleLogin()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 rounded-full text-xs font-bold transition-all hover:scale-102 active:scale-98 shadow-md"
              >
                <GoogleIcon />
                Entrar com o Google
              </button>

              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-3 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800/60 rounded-full text-xs font-bold transition-all hover:scale-102 active:scale-98"
              >
                Continuar no Modo Solo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROFILE & KIT CUSTOMIZER MODAL ===== */}
      {showProfileModal && activeUser && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden animate-scaleUp">
            
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <img src={activeUser.photoURL || ''} alt="" className="w-8 h-8 rounded-full border-2 border-cyan-500/50" />
                <div>
                  <h2 className="text-sm font-black tracking-wide text-zinc-100 uppercase">Perfil & Uniforme</h2>
                  <p className="text-[10px] text-zinc-500 font-semibold">{activeUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowProfileModal(false); setSelectedLogoBlob(null); }}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 hover:bg-zinc-800 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[75vh] p-6 space-y-6">

              {/* ── Identity Section ── */}
              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block">Identidade</span>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </div>

              {/* ── Logo Upload ── */}
              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block">Logo do Clube</span>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-zinc-500 font-semibold">Imagem quadrada. Máx 2MB. Será reduzida automaticamente para 256×256px.</p>
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl px-4 py-2 text-[10px] font-bold text-zinc-300 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {logoPreview ? 'Trocar Imagem' : 'Selecionar Imagem'}
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                    {logoPreview && (
                      <button
                        onClick={() => { setLogoPreview(null); setSelectedLogoBlob(null); }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 font-bold"
                      >
                        Remover logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Kit Customizer ── */}
              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500 block">Uniforme (Casa)</span>
                
                {/* Live jersey preview */}
                <div className="flex items-center justify-center gap-6 py-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                  {/* Jersey SVG preview */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Camisa</span>
                    <svg viewBox="0 0 80 90" width="72" height="81" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <clipPath id="jersey-clip">
                          <path d="M15,10 L5,30 L20,35 L20,80 L60,80 L60,35 L75,30 L65,10 L50,15 Q40,20 30,15 Z"/>
                        </clipPath>
                      </defs>
                      {/* Base jersey */}
                      <path d="M15,10 L5,30 L20,35 L20,80 L60,80 L60,35 L75,30 L65,10 L50,15 Q40,20 30,15 Z" fill={editPrimaryColor} stroke={editSecondaryColor} strokeWidth="1.5"/>
                      {/* Pattern overlay */}
                      {editPattern === 'vertical' && (
                        <>
                          <rect x="32" y="10" width="5" height="70" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                          <rect x="43" y="10" width="5" height="70" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'horizontal' && (
                        <>
                          <rect x="5" y="38" width="70" height="7" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                          <rect x="5" y="56" width="70" height="7" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'center-band' && (
                        <rect x="33" y="10" width="14" height="70" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                      )}
                      {editPattern === 'side-stripes' && (
                        <>
                          <rect x="18" y="10" width="6" height="70" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                          <rect x="56" y="10" width="6" height="70" fill={editSecondaryColor} opacity="0.7" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'x' && (
                        <>
                          <line x1="15" y1="10" x2="65" y2="80" stroke={editSecondaryColor} strokeWidth="6" opacity="0.5" clipPath="url(#jersey-clip)"/>
                          <line x1="65" y1="10" x2="15" y2="80" stroke={editSecondaryColor} strokeWidth="6" opacity="0.5" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'sash' && (
                        <polygon points="80,10 45,10 15,80 50,80" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                      )}
                      {editPattern === 'three-stripes-v' && (
                        <>
                          <rect x="20" y="10" width="8" height="70" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                          <rect x="36" y="10" width="8" height="70" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                          <rect x="52" y="10" width="8" height="70" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'three-stripes-h' && (
                        <>
                          <rect x="15" y="22" width="50" height="7" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                          <rect x="15" y="40" width="50" height="7" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                          <rect x="15" y="58" width="50" height="7" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'cross' && (
                        <>
                          <rect x="33" y="10" width="14" height="70" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                          <rect x="5" y="32" width="70" height="14" fill={editSecondaryColor} opacity="0.8" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                      {editPattern === 'sash-cross' && (
                        <>
                          <polygon points="80,10 45,10 15,80 50,80" fill={editSecondaryColor} opacity="0.85" clipPath="url(#jersey-clip)"/>
                          {/* Red cross on the left chest */}
                          <path d="M 50,30 L 43,24 L 43,36 Z M 50,30 L 57,24 L 57,36 Z M 50,30 L 43,24 L 57,24 Z M 50,30 L 43,36 L 57,36 Z" fill="#ff3f34" clipPath="url(#jersey-clip)"/>
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Shorts Preview (SVG) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-zinc-650 font-bold uppercase tracking-wider">Calção</span>
                    <svg viewBox="0 0 44 48" width="44" height="48" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <clipPath id="shorts-clip">
                          <path d="M4,0 L40,0 L36,48 L22,36 L8,48 Z"/>
                        </clipPath>
                      </defs>
                      <path d="M4,0 L40,0 L36,48 L22,36 L8,48 Z" fill={editShortsColor} stroke="#33333388" strokeWidth="1"/>
                      {editShortsPattern === 'side-stripes' && (
                        <>
                          <rect x="4" y="0" width="5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                          <rect x="35" y="0" width="5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                        </>
                      )}
                      {editShortsPattern === 'three-stripes' && (
                        <>
                          <rect x="4" y="0" width="1.5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                          <rect x="6.5" y="0" width="1.5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                          <rect x="9" y="0" width="1.5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                          <rect x="33.5" y="0" width="1.5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                          <rect x="36" y="0" width="1.5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                          <rect x="38.5" y="0" width="1.5" height="48" fill={editShortsSecondaryColor} opacity="0.8" clipPath="url(#shorts-clip)"/>
                        </>
                      )}
                      {editShortsPattern === 'two-tone' && (
                        <path d="M22,0 L40,0 L36,48 L22,36 Z" fill={editShortsSecondaryColor} opacity="0.85" clipPath="url(#shorts-clip)"/>
                      )}
                    </svg>
                  </div>

                  {/* Socks Preview (SVG) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Meias</span>
                    <svg viewBox="0 0 24 56" width="24" height="56" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="0" width="20" height="56" rx="4" fill={editSocksColor} stroke="#33333388" strokeWidth="1"/>
                      {editSocksPattern === 'hoops' && (
                        <>
                          <rect x="2" y="6" width="20" height="7" fill={editSocksSecondaryColor} opacity="0.85"/>
                          <rect x="2" y="24" width="20" height="7" fill={editSocksSecondaryColor} opacity="0.85"/>
                          <rect x="2" y="42" width="20" height="7" fill={editSocksSecondaryColor} opacity="0.85"/>
                        </>
                      )}
                      {editSocksPattern === 'three-stripes' && (
                        <>
                          <rect x="2" y="4" width="20" height="3" fill={editSocksSecondaryColor} opacity="0.85"/>
                          <rect x="2" y="10" width="20" height="3" fill={editSocksSecondaryColor} opacity="0.85"/>
                          <rect x="2" y="16" width="20" height="3" fill={editSocksSecondaryColor} opacity="0.85"/>
                        </>
                      )}
                      {editSocksPattern === 'two-tone' && (
                        <rect x="2" y="28" width="20" height="28" rx="0" fill={editSocksSecondaryColor} opacity="0.85"/>
                      )}
                    </svg>
                  </div>
                </div>

                {/* ── Jersey Colors ── */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Cores da Camisa</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Cor Primária', value: editPrimaryColor, setter: setEditPrimaryColor },
                      { label: 'Cor Secundária', value: editSecondaryColor, setter: setEditSecondaryColor },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 cursor-pointer" style={{ backgroundColor: value }}>
                          <input type="color" value={value} onChange={e => setter(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">{label}</p>
                          <p className="text-[10px] text-zinc-300 font-mono">{value.toUpperCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jersey Pattern Selector */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Padrão da Camisa</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'solid',          label: 'Liso' },
                      { id: 'vertical',       label: '2 Listras V.' },
                      { id: 'three-stripes-v',label: '3 Listras V.' },
                      { id: 'horizontal',     label: '2 Listras H.' },
                      { id: 'three-stripes-h',label: '3 Listras H.' },
                      { id: 'center-band',    label: 'Faixa Centro' },
                      { id: 'side-stripes',   label: 'Laterais' },
                      { id: 'sash',           label: 'Faixa Diagonal' },
                      { id: 'x',              label: 'Cruz (X)' },
                      { id: 'cross',          label: 'Cruz Vertical' },
                      { id: 'sash-cross',     label: 'Cruz e Faixa (Vasco)' },
                    ].map(p => (
                      <button key={p.id} onClick={() => setEditPattern(p.id as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                          editPattern === p.id
                            ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Shorts Section ── */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Calção</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Cor Principal', value: editShortsColor, setter: setEditShortsColor },
                      { label: 'Cor Detalhe', value: editShortsSecondaryColor, setter: setEditShortsSecondaryColor },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 cursor-pointer" style={{ backgroundColor: value }}>
                          <input type="color" value={value} onChange={e => setter(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">{label}</p>
                          <p className="text-[10px] text-zinc-300 font-mono">{value.toUpperCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'solid', label: 'Liso' },
                      { id: 'side-stripes', label: 'Listras Lat.' },
                      { id: 'three-stripes', label: '3 Listras' },
                      { id: 'two-tone', label: 'Bicolor' },
                    ].map(p => (
                      <button key={p.id} onClick={() => setEditShortsPattern(p.id as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                          editShortsPattern === p.id
                            ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Socks Section ── */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Meias</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Cor Principal', value: editSocksColor, setter: setEditSocksColor },
                      { label: 'Cor Detalhe', value: editSocksSecondaryColor, setter: setEditSocksSecondaryColor },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 cursor-pointer" style={{ backgroundColor: value }}>
                          <input type="color" value={value} onChange={e => setter(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">{label}</p>
                          <p className="text-[10px] text-zinc-300 font-mono">{value.toUpperCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'solid', label: 'Liso' },
                      { id: 'hoops', label: '3 Faixas' },
                      { id: 'three-stripes', label: '3 Listras' },
                      { id: 'two-tone', label: 'Bicolor' },
                    ].map(p => (
                      <button key={p.id} onClick={() => setEditSocksPattern(p.id as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[8px] font-black tracking-wider uppercase transition-all ${
                          editSocksPattern === p.id
                            ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error display */}
              {saveError && (
                <div className="bg-rose-950/40 border border-rose-900/50 p-3.5 rounded-2xl text-rose-300 text-[11px] leading-relaxed font-semibold animate-fadeIn">
                  ⚠️ {saveError}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40 flex gap-3">
              <button
                onClick={() => { setShowProfileModal(false); setSelectedLogoBlob(null); }}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-2xl text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:from-zinc-700 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-black text-xs tracking-widest uppercase rounded-2xl shadow-[0_4px_20px_rgba(6,182,212,0.3)] transition-all active:scale-98"
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
        </div>
      )}

    </div>
  );
};

export default App;
