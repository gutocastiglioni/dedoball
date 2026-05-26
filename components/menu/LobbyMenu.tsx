import React, { useState } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import LoginModal from '../LoginModal';
import SoundManager from '../../SoundManager';
import SoloTab from './SoloTab';
import MultiplayerTab from './MultiplayerTab';
import TournamentTab from './TournamentTab';
import RankingTab from './RankingTab';
import HistoryTab from './HistoryTab';
import { db, ref } from '../../firebase';
import { 
  Target, 
  Globe, 
  Trophy, 
  Award, 
  History, 
  LogOut, 
  LogIn, 
  Minimize2, 
  Maximize2, 
  Info,
  Lock,
  Loader2,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  Users,
  Video
} from 'lucide-react';

interface LobbyMenuProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  setShowProfileModal: (show: boolean) => void;
}

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

const defaultHomeUniform = {
  primaryColor: '#1e3799',
  secondaryColor: '#ffffff',
  pattern: 'solid' as const
};

const defaultAwayUniform = {
  primaryColor: '#e55039',
  secondaryColor: '#f6b93b',
  pattern: 'solid' as const
};

const renderJerseyMiniSVG = (primaryColor: string, secondaryColor: string, pattern: string) => {
  return (
    <svg viewBox="0 0 100 100" width="14" height="14" xmlns="http://www.w3.org/2500/svg" className="filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.4)] flex-shrink-0">
      <defs>
        <clipPath id="jersey-mini-clip">
          <path d="M30,15 L16,25 C14,26.5 14,29 16.5,31 L24,37 C25.5,38 27.5,37 27.5,35 L27.5,88 C27.5,91 29.5,93 32.5,93 L67.5,93 C70.5,93 72.5,91 72.5,88 L72.5,35 C72.5,37 74.5,38 76,37 L83.5,31 C86,29 86,26.5 84,25 L70,15 C62,20 38,20 30,15 Z" />
        </clipPath>
      </defs>
      {/* Base Jersey */}
      <path d="M30,15 L16,25 C14,26.5 14,29 16.5,31 L24,37 C25.5,38 27.5,37 27.5,35 L27.5,88 C27.5,91 29.5,93 32.5,93 L67.5,93 C70.5,93 72.5,91 72.5,88 L72.5,35 C72.5,37 74.5,38 76,37 L83.5,31 C86,29 86,26.5 84,25 L70,15 C62,20 38,20 30,15 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="2.5" strokeLinejoin="round"/>
      <g clipPath="url(#jersey-mini-clip)">
        {pattern === 'vertical' && (
          <>
            <rect x="36.5" y="10" width="8" height="85" fill={secondaryColor} opacity="0.9" />
            <rect x="55.5" y="10" width="8" height="85" fill={secondaryColor} opacity="0.9" />
          </>
        )}
        {pattern === 'horizontal' && (
          <>
            <rect x="0" y="38" width="100" height="10" fill={secondaryColor} opacity="0.9" />
            <rect x="0" y="60" width="100" height="10" fill={secondaryColor} opacity="0.9" />
          </>
        )}
        {pattern === 'center-band' && (
          <rect x="40" y="10" width="20" height="85" fill={secondaryColor} opacity="0.9" />
        )}
        {pattern === 'side-stripes' && (
          <>
            <rect x="27.5" y="10" width="7" height="85" fill={secondaryColor} opacity="0.9" />
            <rect x="65.5" y="10" width="7" height="85" fill={secondaryColor} opacity="0.9" />
          </>
        )}
        {pattern === 'x' && (
          <>
            <line x1="10" y1="12" x2="90" y2="92" stroke={secondaryColor} strokeWidth="10" opacity="0.85" />
            <line x1="90" y1="12" x2="10" y2="92" stroke={secondaryColor} strokeWidth="10" opacity="0.85" />
          </>
        )}
        {pattern === 'sash' && (
          <polygon points="85,12 55,12 15,88 45,88" fill={secondaryColor} opacity="0.95" />
        )}
        {pattern === 'three-stripes-v' && (
          <>
            <rect x="32" y="10" width="7" height="85" fill={secondaryColor} opacity="0.9" />
            <rect x="46.5" y="10" width="7" height="85" fill={secondaryColor} opacity="0.9" />
            <rect x="61" y="10" width="7" height="85" fill={secondaryColor} opacity="0.9" />
          </>
        )}
        {pattern === 'three-stripes-h' && (
          <>
            <rect x="0" y="30" width="100" height="8" fill={secondaryColor} opacity="0.9" />
            <rect x="0" y="48" width="100" height="8" fill={secondaryColor} opacity="0.9" />
            <rect x="0" y="66" width="100" height="8" fill={secondaryColor} opacity="0.9" />
          </>
        )}
        {pattern === 'cross' && (
          <>
            <rect x="44" y="10" width="12" height="85" fill={secondaryColor} opacity="0.9" />
            <rect x="0" y="44" width="100" height="12" fill={secondaryColor} opacity="0.9" />
          </>
        )}
        {pattern === 'sash-cross' && (
          <>
            <polygon points="85,12 55,12 15,88 45,88" fill={secondaryColor} opacity="0.95" />
            <path d="M 62,38 L 56,32 L 56,44 Z M 62,38 L 68,32 L 68,44 Z M 62,38 L 56,32 L 68,32 Z M 62,38 L 56,44 L 68,44 Z" fill="#ff3f34" />
          </>
        )}
      </g>
    </svg>
  );
};

const LobbyMenu: React.FC<LobbyMenuProps> = ({
  isFullscreen,
  toggleFullscreen,
  setShowProfileModal,
}) => {
  const { 
    activeUser, 
    userProfile, 
    logout, 
    isMultiplayer, 
    roomId, 
    currentRoom, 
    resetMatch,
    cameraMode,
    changeCameraMode,
    setShowRulesModal,
    setSystemMessage
  } = useGameStateContext();
  const isMobile = useIsMobile();

  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundManager.getMuted());
  const [sfxVolume, setSfxVolume] = useState(SoundManager.getSFXVolume());
  const [crowdVolume, setCrowdVolume] = useState(SoundManager.getCrowdVolume());

  const currentKitType = userProfile?.selectedKit || 'home';
  const currentKit = currentKitType === 'home'
    ? (userProfile?.uniform || defaultHomeUniform)
    : (userProfile?.awayUniform || defaultAwayUniform);

  const userAbbreviation = userProfile?.abbreviation || 
    userProfile?.teamName?.substring(0, 3).toUpperCase() || 
    activeUser?.displayName?.substring(0, 3).toUpperCase() || 
    'CAS';

  // Tab navigation in menu
  const [currentMenuTab, setCurrentMenuTab] = useState<'solo' | 'multi' | 'tournament' | 'ranking' | 'history'>('solo');


  // Restricted Access Login Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [restrictedTabAttempt, setRestrictedTabAttempt] = useState<'multi' | 'tournament' | 'ranking' | 'history' | null>(null);

  const handleSetActiveKit = async (kit: 'home' | 'away') => {
    SoundManager.playUIClick();
    if (!activeUser) return;
    try {
      const { update } = await import('firebase/database');
      const userRef = ref(db, `users/${activeUser.uid}`);
      await update(userRef, { selectedKit: kit });
    } catch (err) {
      console.error("Error setting active kit:", err);
    }
  };

  const handleLoginAttempt = (targetTab?: 'multi' | 'tournament' | 'ranking' | 'history') => {
    SoundManager.playUIClick();
    if (targetTab) {
      setRestrictedTabAttempt(targetTab);
    }
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    if (restrictedTabAttempt) {
      setCurrentMenuTab(restrictedTabAttempt);
      setRestrictedTabAttempt(null);
    }
  };

  const renderActiveTabContent = () => {
    switch (currentMenuTab) {
      case 'solo':
        return <SoloTab />;
      case 'multi':
        return <MultiplayerTab />;
      case 'tournament':
        return <TournamentTab />;
      case 'ranking':
        return <RankingTab />;
      case 'history':
        return <HistoryTab />;
      default:
        return <SoloTab />;
    }
  };

  const renderMobileMenu = () => {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900/98 to-slate-950 select-none overflow-hidden h-full p-2 gap-2">
        {/* Animated Background Lights */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse delay-700"></div>

        {/* TOP HEADER BAR */}
        <div className="w-full flex justify-between items-center bg-zinc-950/70 border border-zinc-800/60 px-3 py-1.5 rounded-xl backdrop-blur-md z-10 flex-shrink-0">
          {/* Left: Logo without "3D" */}
          <div className="flex items-center gap-1.5 select-none">
            <h1 className="text-[10px] xs:text-xs font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              TABLEBALL
            </h1>
          </div>

          {/* Right: Auth Profile, Rules, Fullscreen, Logout */}
          <div className="flex items-center gap-1.5 xs:gap-2">
            {activeUser ? (
              <div className="flex items-center gap-1.5">
                {/* Active Kit Selector with dynamic 2D mini preview (Mobile) */}
                <div className="flex items-center gap-0.5 bg-zinc-900/80 border border-zinc-800 rounded-full p-0.5 select-none pointer-events-auto h-[30px] shadow-md">
                  {(['home', 'away'] as const).map((kit) => {
                    const isKitSelected = (userProfile?.selectedKit || 'home') === kit;
                    const uniform = kit === 'home' 
                      ? (userProfile?.uniform || defaultHomeUniform)
                      : (userProfile?.awayUniform || defaultAwayUniform);
                    return (
                      <button
                        key={kit}
                        onClick={() => handleSetActiveKit(kit)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 h-full rounded-full transition-all duration-300 ${
                          isKitSelected
                            ? 'bg-cyan-500/20 border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                            : 'border border-transparent'
                        }`}
                        title={kit === 'home' ? 'Uniforme Casa (Home)' : 'Uniforme Fora (Away)'}
                      >
                        {renderJerseyMiniSVG(uniform.primaryColor, uniform.secondaryColor, uniform.pattern)}
                      </button>
                    );
                  })}
                </div>

                {/* Unified Team & Player Profile Pill (Mobile) */}
                <div
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800/85 hover:border-zinc-700/80 active:scale-95 transition-all duration-200 rounded-full pl-4 pr-3 py-0.5 shadow-md cursor-pointer pointer-events-auto group/profile h-[30px]"
                  title="Customizar Perfil, Time e Uniforme"
                >
                  {/* Left: Team Name */}
                  <span className="text-[8px] xs:text-[9px] font-black text-zinc-300 group-hover/profile:text-cyan-400 transition-colors uppercase tracking-wide whitespace-nowrap">
                    {userProfile?.teamName || 'Meu Time'}
                  </span>

                  {/* Center: Separated Circular Shield (Escudo) */}
                  <div className="w-5 h-5 rounded-full bg-zinc-950/60 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/profile:border-cyan-400/50 transition-colors relative shadow-[0_0_6px_rgba(0,0,0,0.4)]">
                    {userProfile?.logoUrl ? (
                      <img src={userProfile.logoUrl} alt="logo" className="w-full h-full object-cover animate-fadeIn" />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center font-black text-[8px] tracking-tighter"
                        style={{
                          background: `linear-gradient(135deg, ${currentKit.primaryColor} 50%, ${currentKit.secondaryColor} 50%)`,
                          color: '#ffffff',
                          textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
                        }}
                      >
                        <div className="absolute inset-0.5 rounded-full bg-black/15 backdrop-blur-[0.5px] flex items-center justify-center">
                          {userAbbreviation.substring(0, 2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Player Name */}
                  <span className="text-[8px] xs:text-[9px] font-black text-zinc-300 group-hover/profile:text-cyan-400 transition-colors uppercase tracking-wide whitespace-nowrap">
                    {userProfile?.username || activeUser.displayName}
                  </span>

                  {/* Divider */}
                  <span className="w-[1px] h-2.5 bg-zinc-800 self-center"></span>

                  {/* Settings Icon Indicator */}
                  <span className="text-[9px] text-zinc-400 group-hover/profile:text-cyan-400 transition-colors">
                    ⚙️
                  </span>

                  {/* Logout Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                    className="text-zinc-500 hover:text-rose-400 transition-all p-0.5 pointer-events-auto hover:scale-110 relative z-10 ml-0.5"
                    title="Sair"
                  >
                    <LogOut size={10} className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleLoginAttempt()}
                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black rounded-full text-[8.5px] xs:text-[9.5px] uppercase tracking-wider transition-all h-[30px] shadow-md"
              >
                <LogIn size={10} className="w-2.5 h-2.5" />
                <span>Entrar</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="text-zinc-500 hover:text-cyan-400 transition-all bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center h-[30px] w-[30px] flex-shrink-0 shadow-md hover:border-cyan-500/30"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize2 size={11} className="w-[11px] h-[11px]" /> : <Maximize2 size={11} className="w-[11px] h-[11px]" />}
            </button>
          </div>
        </div>

        {/* MAIN BODY: SIDEBAR + CONTENT AREA */}
        <div className="w-full flex-grow flex flex-row gap-2 overflow-hidden h-[calc(100%-2.5rem)]">
          {/* 1. LEFT SIDEBAR MENU */}
          <div className="w-[65px] xs:w-[80px] h-full flex flex-col justify-between items-center bg-zinc-950/70 border border-zinc-800/60 p-1 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md z-10 flex-shrink-0">
            
            {/* Navigation Buttons Stack */}
            <div className="w-full flex flex-col gap-1 my-auto">
              {[
                { id: 'solo', label: 'SOLO', icon: Target, activeColor: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' },
                { id: 'multi', label: 'ONLINE', icon: Globe, activeColor: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' },
                { id: 'tournament', label: 'COPA', icon: Trophy, activeColor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
                { id: 'ranking', label: 'RANKING', icon: Award, activeColor: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
                { id: 'history', label: 'HISTÓRICO', icon: History, activeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-405' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = currentMenuTab === tab.id && !showSettingsPopup;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      SoundManager.playUIClick();
                      setShowSettingsPopup(false);
                      if (tab.id === 'tournament') {
                        setSystemMessage({
                          title: 'EM BREVE',
                          message: 'O modo Mata-Mata estará disponível em breve! Fique atento às próximas atualizações.',
                          type: 'info'
                        });
                        return;
                      }
                      if (tab.id !== 'solo' && !activeUser) {
                        handleLoginAttempt(tab.id as any);
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

              {/* Regras Button */}
              <button
                onClick={() => {
                  SoundManager.playUIClick();
                  setShowSettingsPopup(false);
                  setShowRulesModal(true);
                }}
                className="py-1.5 px-0.5 rounded-lg border border-transparent flex flex-col items-center justify-center gap-0.5 text-[7px] font-black tracking-wider transition-all duration-300 hover:scale-102 w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"
              >
                <Info size={12} className="w-3 h-3" />
                <span className="text-[6.5px] font-black tracking-wider leading-none text-center">REGRAS</span>
              </button>

              {/* Ajustes Button */}
              <button
                onClick={() => {
                  SoundManager.playUIClick();
                  setShowSettingsPopup(!showSettingsPopup);
                }}
                className={`
                  py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[7px] font-black tracking-wider transition-all duration-300 hover:scale-102 w-full
                  ${showSettingsPopup 
                    ? 'bg-zinc-500/20 border-zinc-500/40 text-zinc-300 shadow-[0_0_12px_rgba(0,0,0,0.35)]' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                  }
                `}
              >
                <Settings size={12} className="w-3 h-3" />
                <span className="text-[6.5px] font-black tracking-wider leading-none text-center">AJUSTES</span>
              </button>
            </div>
          </div>

          {/* 2. RIGHT CONTENT AREA */}
          <div className="flex-grow h-full bg-zinc-950/40 border border-zinc-900 rounded-2xl p-2.5 backdrop-blur-md overflow-hidden flex flex-col justify-start items-stretch relative">


            {/* Render Active Tab content container with no extra outer scrollbar */}
            <div className={`w-full h-full pr-0.5 flex flex-col justify-start items-stretch ${currentMenuTab === 'solo' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              {renderActiveTabContent()}
            </div>
          </div>
        </div>

        {showSettingsPopup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
            <div className="w-full max-w-xs bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between select-none animate-scaleUp pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3 w-full">
                <span className="text-xs font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                  <Settings size={13} />
                  AJUSTES DO JOGO
                </span>
                <button
                  onClick={() => {
                    SoundManager.playUIClick();
                    const newMute = SoundManager.toggleMute();
                    setIsMuted(newMute);
                  }}
                  className="hover:text-cyan-400 active:scale-90 transition-all duration-200"
                >
                  {isMuted ? (
                    <VolumeX size={16} className="text-zinc-500 hover:text-cyan-400 transition-colors" />
                  ) : (
                    <Volume2 size={16} className="text-cyan-400 hover:text-cyan-300 transition-colors" />
                  )}
                </button>
              </div>

              {/* Sound Settings */}
              <div className="flex flex-col gap-3 w-full">
                {/* SFX volume */}
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Zap size={11} className="text-cyan-400" />
                      <span>Efeitos (SFX)</span>
                    </div>
                    <span>{isMuted ? 0 : Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : sfxVolume}
                    onChange={(e) => {
                      const newVol = parseFloat(e.target.value);
                      SoundManager.setSFXVolume(newVol);
                      setSfxVolume(newVol);
                      if (newVol > 0 && isMuted) {
                        SoundManager.setMuted(false);
                        setIsMuted(false);
                      }
                    }}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #00d2ff 0%, #00d2ff ${(isMuted ? 0 : sfxVolume) * 100}%, #27272a ${(isMuted ? 0 : sfxVolume) * 100}%, #27272a 100%)`
                    }}
                  />
                </div>

                {/* Crowd volume */}
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Users size={11} className="text-cyan-400" />
                      <span>Torcida</span>
                    </div>
                    <span>{isMuted ? 0 : Math.round(crowdVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : crowdVolume}
                    onChange={(e) => {
                      const newVol = parseFloat(e.target.value);
                      SoundManager.setCrowdVolume(newVol);
                      setCrowdVolume(newVol);
                      if (newVol > 0 && isMuted) {
                        SoundManager.setMuted(false);
                        setIsMuted(false);
                      }
                    }}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #00d2ff 0%, #00d2ff ${(isMuted ? 0 : crowdVolume) * 100}%, #27272a ${(isMuted ? 0 : crowdVolume) * 100}%, #27272a 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Camera Mode */}
              <div className="flex flex-col gap-2 w-full border-t border-zinc-800/80 pt-3 mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Video size={11} className="text-cyan-400" />
                    <span>Modo de Câmera</span>
                  </div>
                </div>
                
                <div className="flex bg-zinc-900/95 border border-zinc-800/60 p-0.5 rounded-lg w-full relative">
                  <button
                    onClick={() => changeCameraMode('dynamic')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
                      cameraMode === 'dynamic'
                        ? 'bg-cyan-500 text-zinc-950 shadow-md scale-100 font-extrabold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Seguir Bola
                  </button>
                  <button
                    onClick={() => changeCameraMode('fixed')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
                      cameraMode === 'fixed'
                        ? 'bg-cyan-500 text-zinc-950 shadow-md scale-100 font-extrabold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Câmera Livre
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  SoundManager.playUIClick();
                  setShowSettingsPopup(false);
                }}
                className="w-full mt-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-805 text-zinc-300 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all"
              >
                Confirmar e Fechar
              </button>
            </div>
          </div>
        )}

        {/* Floating Version & Branding in Bottom-Right Corner (Mobile) */}
        <div className="absolute bottom-3.5 right-4 z-20 pointer-events-none select-none flex items-center gap-1.5 text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider leading-none">
          <span className="text-zinc-650 font-extrabold">gutocastiglioni</span>
          <span className="text-zinc-800 font-black">&bull;</span>
          <span className="text-zinc-400 font-black">v0.9.5</span>
        </div>
      </div>
    );
  };

  const renderDesktopMenu = () => {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center bg-gradient-to-br from-zinc-950 via-zinc-900/98 to-slate-950 select-none justify-start p-4 md:p-6 overflow-hidden h-screen w-screen">
        {/* Animated Background Lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700"></div>

        <div className="relative max-w-4xl w-full flex flex-col items-center text-center space-y-3.5 md:space-y-5 pt-2 md:pt-4 pb-4 md:pb-6">
          {/* Header com Auth Info */}
          <div className="w-full flex justify-between items-center gap-2 flex-wrap border-b border-zinc-800/80 pb-3 md:pb-4">
            <div className="flex flex-col items-start select-none">
              <h1 className="text-base sm:text-lg md:text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                TABLEBALL
              </h1>
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none hidden sm:block">
                FUTEBOL DE BOTÃO
              </span>
            </div>

            {activeUser ? (
              <div className="flex items-center gap-2">
                {/* Active Kit Selector with dynamic 2D mini preview (Desktop) */}
                <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-850/40 hover:border-zinc-700/60 transition-all duration-200 rounded-full p-0.5 md:p-1 select-none pointer-events-auto mr-1 shadow-md h-[30px] md:h-[38px]">
                  {(['home', 'away'] as const).map((kit) => {
                    const isKitSelected = (userProfile?.selectedKit || 'home') === kit;
                    const uniform = kit === 'home' 
                      ? (userProfile?.uniform || defaultHomeUniform)
                      : (userProfile?.awayUniform || defaultAwayUniform);
                    return (
                      <button
                        key={kit}
                        onClick={() => handleSetActiveKit(kit)}
                        className={`flex items-center gap-1.5 px-3 h-full rounded-full text-[9px] font-black uppercase transition-all duration-355 ${
                          isKitSelected
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                            : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:scale-102'
                        }`}
                        title={kit === 'home' ? 'Uniforme Casa (Home)' : 'Uniforme Fora (Away)'}
                      >
                        {renderJerseyMiniSVG(uniform.primaryColor, uniform.secondaryColor, uniform.pattern)}
                        <span className="text-[9px] tracking-wider">{kit === 'home' ? 'Casa' : 'Fora'}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Unified Team & Player Profile Pill (Desktop) */}
                <div
                  onClick={() => setShowProfileModal(true)}
                  className="hidden sm:flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800/85 hover:border-zinc-700/80 active:scale-[0.98] transition-all duration-200 rounded-full pl-5 md:pl-7 pr-4 md:pr-6 py-1 shadow-md cursor-pointer pointer-events-auto group/profile h-[30px] md:h-[38px]"
                  title="Customizar Perfil, Time e Uniforme"
                >
                  {/* Left: Team Name */}
                  <span className="text-[10px] md:text-xs font-black text-zinc-300 group-hover/profile:text-cyan-400 transition-colors uppercase tracking-wide whitespace-nowrap">
                    {userProfile?.teamName || 'Meu Time'}
                  </span>

                  {/* Center: Separated Circular Shield (Escudo) */}
                  <div className="w-5 h-5 md:w-6.5 md:h-6.5 rounded-full bg-zinc-950/60 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/profile:border-cyan-400/50 transition-colors relative shadow-[0_0_8px_rgba(0,0,0,0.4)]">
                    {userProfile?.logoUrl ? (
                      <img src={userProfile.logoUrl} alt="logo" className="w-full h-full object-cover animate-fadeIn" />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center font-black text-[9px] md:text-[10px] tracking-tighter"
                        style={{
                          background: `linear-gradient(135deg, ${currentKit.primaryColor} 50%, ${currentKit.secondaryColor} 50%)`,
                          color: '#ffffff',
                          textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
                        }}
                      >
                        <div className="absolute inset-0.5 rounded-full bg-black/15 backdrop-blur-[0.5px] flex items-center justify-center">
                          {userAbbreviation.substring(0, 2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Player Name */}
                  <span className="text-[10px] md:text-xs font-black text-zinc-300 group-hover/profile:text-cyan-400 transition-colors uppercase tracking-wide whitespace-nowrap">
                    {userProfile?.username || activeUser.displayName}
                  </span>

                  {/* Divider */}
                  <span className="w-[1px] h-3.5 bg-zinc-800 self-center"></span>

                  {/* Profile / Kit Customizer Icon Indicator */}
                  <div className="text-zinc-400 group-hover/profile:text-cyan-400 transition-all p-0.5 hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </div>

                  {/* Logout Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                    className="text-zinc-550 hover:text-rose-450 transition-all p-1 pointer-events-auto hover:scale-110 relative z-10"
                    title="Sair da Conta"
                  >
                    <LogOut size={13} />
                  </button>
                </div>

                {/* Dedicated Premium Glassmorphic Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border border-zinc-800/80 bg-zinc-950/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-355 hover:scale-110 active:scale-90 pointer-events-auto group relative"
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
                  className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border border-zinc-800/80 bg-zinc-950/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-355 hover:scale-110 active:scale-90 pointer-events-auto group relative"
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
                  onClick={() => handleLoginAttempt()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md pointer-events-auto"
                >
                  <GoogleIcon />
                  Entrar com o Google
                </button>
              </div>
            )}
          </div>

          {/* TAB NAVIGATION BAR */}
          <div className="w-full grid grid-cols-6 gap-1.5 bg-zinc-950/80 border border-zinc-800/60 p-1.5 rounded-2xl shadow-inner">
            {[
              { id: 'solo', label: 'MODO SOLO', icon: Target, activeColor: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' },
              { id: 'multi', label: 'MULTIPLAYER', icon: Globe, activeColor: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' },
              { id: 'tournament', label: 'MATA-MATA', icon: Trophy, activeColor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
              { id: 'ranking', label: 'RANKING', icon: Award, activeColor: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
              { id: 'history', label: 'HISTÓRICO', icon: History, activeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450' },
              { id: 'rules', label: 'REGRAS', icon: Info, activeColor: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = tab.id === 'rules' ? false : currentMenuTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    SoundManager.playUIClick();
                    if (tab.id === 'rules') {
                      setShowRulesModal(true);
                    } else if (tab.id === 'tournament') {
                      setSystemMessage({
                        title: 'EM BREVE',
                        message: 'O modo Mata-Mata estará disponível em breve! Fique atento às próximas atualizações.',
                        type: 'info'
                      });
                    } else if (tab.id !== 'solo' && !activeUser) {
                      handleLoginAttempt(tab.id as any);
                    } else {
                      setCurrentMenuTab(tab.id as any);
                    }
                  }}
                  className={`
                    py-2 md:py-3 px-1 md:px-1.5 rounded-xl border flex flex-col items-center gap-1 md:gap-1.5 text-[7px] md:text-xs font-black tracking-wider transition-all duration-350 hover:scale-102
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
          <div className="w-full flex-grow flex flex-col justify-start items-stretch overflow-hidden max-h-[380px] md:max-h-[460px] mt-2 md:mt-4">
            {renderActiveTabContent()}
          </div>

          {/* Instruction Toggle & Footer Merged for Perfect Viewport Proportion */}
          <div className="w-full pt-3 border-t border-zinc-900 flex justify-end items-center text-[10px] font-bold text-zinc-500 px-2 mt-2 select-none relative">
            
            
            <div className="flex items-center gap-3 text-zinc-650 uppercase tracking-widest text-[9px] font-bold select-none">
              <span>v0.9.5</span>
              <span>&bull;</span>
              <span>gutocastiglioni &copy; 2026</span>
            </div>
          </div>
        </div>

        {showLoginModal && (
          <LoginModal 
            onClose={() => setShowLoginModal(false)} 
            onSuccess={handleLoginSuccess}
          />
        )}
      </div>
    );
  };

  const renderWaitingLobby = () => {
    const hostPlayer = currentRoom?.players.home;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-radial-gradient from-[#0e1a2e] to-[#060a0e] p-4 select-none animate-fadeIn">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

        {/* Content container */}
        <div className="relative w-full max-w-2xl bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-6 animate-scaleUp">
          
          {/* Header */}
          <div className="text-center space-y-1">
            <span className="text-[10px] md:text-xs font-black text-cyan-400 tracking-[0.2em] uppercase">Multiplayer Online</span>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-100 uppercase tracking-tight">
              Lobby de Espera
            </h2>
            <p className="text-xs text-zinc-400 font-medium">Aguardando o adversário entrar na sala para iniciar a partida.</p>
          </div>

          {/* Room details card */}
          <div className="w-full bg-zinc-900/60 border border-zinc-850 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Nome da Sala</span>
              <span className="text-sm font-bold text-zinc-200">{currentRoom?.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {currentRoom?.password ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                  <Lock size={12} className="text-amber-500" />
                  <span>Senha: <strong className="font-black tracking-widest ml-1">{currentRoom.password}</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                  <Globe size={12} className="text-cyan-400" />
                  <span>Sala Pública</span>
                </div>
              )}
            </div>
          </div>

          {/* Versus Board */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative my-2">
            
            {/* Host Card */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1 bg-cyan-500"></div>
              <span className="text-[9px] font-black text-cyan-400 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full tracking-widest uppercase self-start">Host</span>
              
              <div className="w-16 h-16 rounded-full border border-cyan-500/30 bg-zinc-900 flex items-center justify-center overflow-hidden shadow-inner relative">
                {hostPlayer?.photoURL ? (
                  <img src={hostPlayer.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
              </div>
              
              <span className="text-sm font-black text-zinc-200 uppercase tracking-wide truncate max-w-full">
                {hostPlayer?.displayName || 'Criador da Sala'}
              </span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pronto para o Jogo</span>
            </div>

            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 items-center justify-center z-10 shadow-lg">
              <span className="text-xs font-black text-zinc-550 italic tracking-widest">VS</span>
            </div>

            {/* Guest Card */}
            <div className="bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden min-h-[160px] justify-center">
              <span className="text-[9px] font-black text-zinc-500 px-2 py-0.5 bg-zinc-900/50 border border-zinc-800/80 rounded-full tracking-widest uppercase self-start absolute top-4 left-4">Rival</span>
              
              <div className="w-16 h-16 rounded-full border border-dashed border-zinc-800 bg-zinc-900/30 flex items-center justify-center shadow-inner relative overflow-hidden">
                <Loader2 size={24} className="text-cyan-500/60 animate-spin" />
              </div>
              
              <div className="text-center space-y-1 mt-2">
                <span className="text-xs font-black text-cyan-400 animate-pulse tracking-wide uppercase">Aguardando Rival...</span>
                <p className="text-[10px] text-zinc-550 font-bold">Divulgando sala no lobby global</p>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="w-full flex flex-col items-center gap-3 border-t border-zinc-900 pt-5 mt-2">
            <button
              onClick={() => resetMatch()}
              className="px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-200 text-rose-400 font-black rounded-xl text-xs uppercase tracking-widest transition-all duration-300 w-full max-w-xs shadow-md hover:scale-102 active:scale-98"
            >
              Cancelar e Excluir Sala
            </button>
            <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest select-none">
              <span>v0.9.5</span>
              <span>&bull;</span>
              <span>gutocastiglioni &copy; 2026</span>
            </div>
          </div>

        </div>
      </div>
    );
  };

  if (isMultiplayer && roomId && currentRoom && currentRoom.status === 'waiting') {
    return renderWaitingLobby();
  }

  return isMobile ? renderMobileMenu() : renderDesktopMenu();
};

export default LobbyMenu;
