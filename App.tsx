import React, { useState, useEffect, useCallback } from 'react';
import Scene from './components/Scene';
import { GameStateProvider, useGameStateContext } from './GameStateContext';
import { GamePhase } from './types';
import LobbyMenu from './components/menu/LobbyMenu';
import ProfileModal from './components/ProfileModal';
import HUDHeader from './components/hud/HUDHeader';
import HUDPreparationPanel from './components/hud/HUDPreparationPanel';
import HUDActionOverlay from './components/hud/HUDActionOverlay';
import HUDOverlays from './components/hud/HUDOverlays';
import HUDMatchEventBanner from './components/hud/HUDMatchEventBanner';
import { FloatingHUDActionMenu } from './components/scene/FloatingHUDActionMenu';
// import HUDTelemetryLog from './components/hud/HUDTelemetryLog';
import { useIsMobile } from './hooks/useIsMobile';
import { Navigation, Volume2, VolumeX, Zap, Users, Settings, Video, Info, BookOpen, Globe, LogOut } from 'lucide-react';
import SoundManager from './SoundManager';
import RulesModal from './components/RulesModal';
import SystemAlertModal from './components/SystemAlertModal';
import ConfirmationModal from './components/ConfirmationModal';
import { Canvas, useFrame } from '@react-three/fiber';
import Pitch from './components/Pitch';

const RotatingPitch: React.FC = () => {
  const groupRef = React.useRef<any>(null);
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <group ref={groupRef} scale={0.165} rotation={[0.42, 0, 0]}>
      <Pitch 
        phase="MENU" 
        hoveredSlotId={null} 
        setHoveredSlotId={() => {}} 
        homePlayers={[]} 
      />
    </group>
  );
};



const AppContent: React.FC = () => {
  const {
    phase,
    difficulty,
    homePlayers,
    awayPlayers,
    selectedPlayerId,
    setSelectedPlayerId,
    ball,
    setBall,
    turn,
    shootBall,
    changePossession,
    scoreGoal,
    triggerFoul,
    placePlayer,
    isIAThinking,
    setActionStatus,
    handleBallStopped,
    updateGoalkeeperPositions,
    homeKitConfig,
    awayKitConfig,
    activeUser,
    isCameraCentered,
    setIsCameraCentered,
    recenterTrigger,
    recenterCamera,
    cameraMode,
    changeCameraMode,
    incrementGoalkeeperSaves,
    showRulesModal,
    setShowRulesModal,
    setRulesAutoTriggered,
    systemMessage,
    setSystemMessage,
    updatePlayerActionType,
    updatePlayerBlocking,
    setCaptain,
    captainMoveMode,
    isMultiplayer,
    myRole,
    language,
    changeLanguage,
    triggerForfeit,
    t,
  } = useGameStateContext();

  const isMobile = useIsMobile();
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [debugTouchCount, setDebugTouchCount] = useState(0);

  const [debugMouseState, setDebugMouseState] = useState<'Nenhum' | 'Esquerdo' | 'Direito' | 'Meio'>('Nenhum');
  const [debugButtons, setDebugButtons] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTouch = (e: TouchEvent) => {
      const len = e.touches ? e.touches.length : 0;
      setDebugTouchCount(len);
      console.log(`%c[Telemetry TOUCH] ${e.type} | count: ${len}`, 'color: #00d2ff; font-weight: bold;');
    };
    const handleMouseDown = (e: MouseEvent) => {
      setDebugButtons(e.buttons || 0);
      console.log(`%c[Telemetry MOUSE] mousedown | button: ${e.button} | buttons: ${e.buttons} | clientX: ${e.clientX} | clientY: ${e.clientY}`, 'color: #ff9f43; font-weight: bold;');
      if (e.button === 0) setDebugMouseState('Esquerdo');
      else if (e.button === 2) setDebugMouseState('Direito');
      else if (e.button === 1) setDebugMouseState('Meio');
    };
    const handleMouseUp = (e: MouseEvent) => {
      setDebugButtons(e.buttons || 0);
      console.log(`%c[Telemetry MOUSE] mouseup | button: ${e.button} | buttons: ${e.buttons}`, 'color: #ff9f43; font-weight: bold;');
      setDebugMouseState('Nenhum');
    };
    const handlePointerDown = (e: PointerEvent) => {
      setDebugButtons(e.buttons || 0);
      console.log(`%c[Telemetry POINTER] pointerdown | id: ${e.pointerId} | type: ${e.pointerType} | button: ${e.button} | buttons: ${e.buttons}`, 'color: #10ac84; font-weight: bold;');
    };
    const handlePointerUp = (e: PointerEvent) => {
      setDebugButtons(e.buttons || 0);
      console.log(`%c[Telemetry POINTER] pointerup | id: ${e.pointerId} | type: ${e.pointerType} | button: ${e.button} | buttons: ${e.buttons}`, 'color: #10ac84; font-weight: bold;');
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons !== undefined) {
        setDebugButtons(e.buttons);
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      console.log(`%c[Telemetry CONTEXTMENU] contextmenu fired`, 'color: #ee5253; font-weight: bold; background: #2f0000;');
    };

    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchend', handleTouch, { passive: true });
    window.addEventListener('touchcancel', handleTouch, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchend', handleTouch);
      window.removeEventListener('touchcancel', handleTouch);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  const [crowdVolume, setCrowdVolume] = useState(0.5);
  const [isExpanded, setIsExpanded] = useState(false);


  useEffect(() => {
    setIsMuted(SoundManager.getMuted());
    setSfxVolume(SoundManager.getSFXVolume());
    setCrowdVolume(SoundManager.getCrowdVolume());
  }, []);

  const handleToggleMute = useCallback(() => {
    SoundManager.init();
    const newMute = SoundManager.toggleMute();
    setIsMuted(newMute);
    SoundManager.playUIClick();
  }, []);

  const handleSFXVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    SoundManager.init();
    const newVol = parseFloat(e.target.value);
    SoundManager.setSFXVolume(newVol);
    setSfxVolume(newVol);
    if (newVol > 0 && isMuted) {
      SoundManager.setMuted(false);
      setIsMuted(false);
    }
  }, [isMuted]);

  const handleCrowdVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    SoundManager.init();
    const newVol = parseFloat(e.target.value);
    SoundManager.setCrowdVolume(newVol);
    setCrowdVolume(newVol);
    if (newVol > 0 && isMuted) {
      SoundManager.setMuted(false);
      setIsMuted(false);
    }
  }, [isMuted]);

  // Detecta se a Fullscreen API está disponível (não existe em iOS PWA)
  const supportsFullscreen =
    typeof document !== 'undefined' &&
    !!(
      document.documentElement.requestFullscreen ||
      (document.documentElement as any).webkitRequestFullscreen ||
      (document.documentElement as any).mozRequestFullScreen
    );

  // ── Fullscreen API ──
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
    if (!supportsFullscreen) return;
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
    else if ((el as any).mozRequestFullScreen) (el as any).mozRequestFullScreen();
  }, [supportsFullscreen]);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    else if ((document as any).mozCancelFullScreen) (document as any).mozCancelFullScreen();
  }, []);

  const toggleFullscreen = useCallback(() => {
    isFullscreen ? exitFullscreen() : enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Gate só bloqueia quando mobile COM suporte a fullscreen e ainda não entrou
  const showFullscreenGate = isMobile && supportsFullscreen && !isFullscreen;

  // Dynamic Google Font Injection and Multi-Touch Tracking
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    if (typeof window !== 'undefined') {
      (window as any).activeTouchesCount = 0;
      const handleTouch = (e: TouchEvent) => {
        (window as any).activeTouchesCount = e.touches ? e.touches.length : 0;
      };
      window.addEventListener('touchstart', handleTouch, { passive: true });
      window.addEventListener('touchend', handleTouch, { passive: true });
      window.addEventListener('touchcancel', handleTouch, { passive: true });

      return () => {
        document.head.removeChild(link);
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('touchend', handleTouch);
        window.removeEventListener('touchcancel', handleTouch);
      };
    }

    return () => {
      document.head.removeChild(link);
    };
  }, []);

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

  return (
    <div className="relative w-full h-full bg-[#070a0e] text-zinc-100 font-['Outfit'] select-none overflow-hidden">
      {isMobile && isPortrait && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-[#0c1424] via-[#070a0e] to-[#04060a] p-6 text-center select-none">
          {/* Pulsing Concentric Rings Container */}
          <div className="relative w-28 h-28 flex items-center justify-center bg-cyan-950/20 rounded-full border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-500/10 animate-spin-slow"></div>
            
            {/* Rotating Smartphone Visual */}
            <div className="relative w-10 h-16 border-[2.5px] border-zinc-400 rounded-lg flex items-center justify-center bg-zinc-950/60 shadow-2xl animate-phoneRotate">
              {/* Inner screen */}
              <div className="absolute inset-0.5 border border-zinc-700/50 rounded-[4px] bg-cyan-950/30 flex items-center justify-center">
                <span className="text-[10px] animate-pulse">⚽</span>
              </div>
              {/* Home Button/Camera notch details */}
              <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-zinc-400"></div>
              <div className="absolute top-0.5 w-4 h-0.5 rounded bg-zinc-400"></div>
            </div>
          </div>

          {/* Heading and subtext */}
          <div className="flex flex-col items-center gap-2 max-w-xs">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent animate-pulseGlow">
              {t('app.rotatePhone')}
            </h2>
            <p className="text-zinc-300 text-xs font-semibold leading-relaxed">
              {t('app.landscapeRequired')}
            </p>
            <span className="text-[9px] text-cyan-400/80 font-black tracking-widest uppercase mt-2.5 animate-pulse">
              {t('app.landscapeMode')}
            </span>
          </div>
        </div>
      )}

      {showFullscreenGate && (
        <div
          className="fullscreen-gate"
          onClick={enterFullscreen}
          onTouchEnd={(e) => { e.preventDefault(); enterFullscreen(); }}
        >
          <div className="gate-pulse relative" style={{ overflow: 'visible' }}>
            <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center pointer-events-none">
              <Canvas
                camera={{ position: [0, 4.2, 5.2], fov: 40 }}
                gl={{ antialias: true, alpha: true }}
                style={{ width: '100%', height: '100%', background: 'transparent' }}
              >
                <ambientLight intensity={1.8} />
                <directionalLight position={[3, 8, 3]} intensity={2.0} />
                <pointLight position={[-3, 4, -3]} intensity={1.0} />
                <RotatingPitch />
              </Canvas>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center px-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              TABLEBALL
            </h1>
            <p className="text-zinc-400 text-xs font-semibold tracking-wide">
              Online button football
            </p>
            <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase mt-0.5">
              v1.0.0
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black tracking-widest uppercase text-sm shadow-[0_4px_25px_rgba(6,182,212,0.45)] animate-pulse">
              {t('app.tapToPlay')}
            </div>
            <span className="text-[10px] text-zinc-550 font-semibold">{t('app.fullscreenAuto')}</span>
          </div>
        </div>
      )}

      {/* 3D Game Canvas */}
      <div 
        className="absolute inset-0 z-0" 
        style={{ touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
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
            triggerFoul={triggerFoul}
            placePlayer={placePlayer}
            isIAThinking={isIAThinking}
            setActionStatus={setActionStatus}
            handleBallStopped={handleBallStopped}
            updateGoalkeeperPositions={updateGoalkeeperPositions}
            homeKitConfig={homeKitConfig}
            awayKitConfig={awayKitConfig}
            recenterTrigger={recenterTrigger}
            isCameraCentered={isCameraCentered}
            setIsCameraCentered={setIsCameraCentered}
            incrementGoalkeeperSaves={incrementGoalkeeperSaves}
          />
        )}
      </div>

      {/* Lobby Menu View */}
      {phase === GamePhase.MENU && (
        <LobbyMenu 
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          setShowProfileModal={setShowProfileModal}
        />
      )}

      {/* Game HUD Layout */}
      {phase !== GamePhase.MENU && (
        <>
          <HUDHeader 
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
          />
          {phase === GamePhase.PREPARATION && <HUDPreparationPanel />}
          {phase === GamePhase.ACTION && <HUDActionOverlay />}
          <HUDOverlays />
          <HUDMatchEventBanner />
          {/* <HUDTelemetryLog /> */}
        </>
      )}

      {/* Floating HUD Action Menu — fixed bottom-left, above settings buttons, outside canvas */}
      {phase !== GamePhase.MENU && !showFullscreenGate && (() => {
        if (!selectedPlayerId || selectedPlayerId === 'ball') return null;
        const isCaptainMoveActive = captainMoveMode !== null;
        if (phase !== GamePhase.PREPARATION && !isCaptainMoveActive) return null;
        const p = homePlayers.find(pl => pl.id === selectedPlayerId) || awayPlayers.find(pl => pl.id === selectedPlayerId);
        if (!p) return null;
        const isHomePlayer = p.id.startsWith('home');
        const isControllable = !isMultiplayer || (myRole === 'HOME' && isHomePlayer) || (myRole === 'AWAY' && !isHomePlayer);
        if (!isControllable) return null;
        if (p.number === 1) return null;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const baseRef = Math.min(w, h * 2);
        const baseScale = Math.min(1.2, Math.max(0.6, baseRef / 800));
        const menuScale = isMobile ? baseScale * 0.7 : baseScale;
        return (
          <FloatingHUDActionMenu
            player={p}
            menuScale={menuScale}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            isMultiplayer={isMultiplayer}
            myRole={myRole}
            isMobile={isMobile}
            updatePlayerActionType={updatePlayerActionType}
            updatePlayerBlocking={updatePlayerBlocking}
            setCaptain={setCaptain}
          />
        );
      })()}

      {/* Recenter Button when NOT in preparation phase and center is lost */}
      {phase !== GamePhase.MENU && phase !== GamePhase.PREPARATION && !isCameraCentered && (
        <div className="absolute bottom-6 right-6 z-15 pointer-events-auto">
          <button
            onClick={recenterCamera}
            className="hud-recenter-btn py-3.5 md:py-4 px-6 md:px-8 bg-zinc-900/90 hover:bg-zinc-800/95 border border-zinc-700 text-cyan-400 font-bold tracking-widest uppercase rounded-2xl shadow-2xl backdrop-blur-lg transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs md:text-sm animate-scaleUp"
          >
            <Navigation size={14} className="rotate-45" />
            {t('app.recenter')}
          </button>
        </div>
      )}

      {/* Premium Glassmorphic In-Game Unified Sidebar Dock */}
      {phase !== GamePhase.MENU && (!selectedPlayerId || selectedPlayerId === 'ball') && (
        <div 
          className="absolute z-20 pointer-events-auto flex flex-col-reverse items-start select-none"
          style={{ bottom: isMobile ? '6px' : '24px', left: isMobile ? '8px' : '24px', gap: '6px' }}
        >
          {/* Horizontal Dock Container */}
          <div className="flex flex-row items-center bg-zinc-950/85 border border-zinc-800 text-zinc-300 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            style={{ borderRadius: isMobile ? '10px' : '14px', padding: isMobile ? '2px' : '6px', gap: isMobile ? '2px' : '6px' }}>
            {/* Gear Button (Settings) */}
            <button
              onClick={() => {
                SoundManager.playUIClick();
                setIsExpanded(!isExpanded);
              }}
              onMouseEnter={() => {
                if (!isMobile) setIsExpanded(true);
              }}
              className={`flex items-center justify-center transition-all duration-300 ${
                isExpanded
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-900/60 border border-transparent'
              }`}
              style={{ width: isMobile ? '28px' : '44px', height: isMobile ? '28px' : '44px', borderRadius: isMobile ? '8px' : '14px' }}
              title={t('app.gameSettings')}
            >
              <Settings size={isMobile ? 12 : 18} className={`transition-transform duration-700 ease-out ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Info Button (Rules) */}
            <button
              onClick={() => {
                SoundManager.playUIClick();
                setShowRulesModal(true);
              }}
              className={`flex items-center justify-center transition-all duration-300 ${
                showRulesModal
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-900/60 border border-transparent'
              }`}
              style={{ width: isMobile ? '28px' : '44px', height: isMobile ? '28px' : '44px', borderRadius: isMobile ? '8px' : '14px' }}
              title={t('app.gameRules')}
            >
              <Info size={isMobile ? 12 : 18} />
            </button>

            {/* Leave Game Button — Multiplayer Only */}
            {isMultiplayer && (
              <button
                onClick={() => {
                  SoundManager.playUIClick();
                  setShowLeaveConfirm(true);
                }}
                className="flex items-center justify-center transition-all duration-300 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30"
                style={{ width: isMobile ? '28px' : '44px', height: isMobile ? '28px' : '44px', borderRadius: isMobile ? '8px' : '14px' }}
                title={language === 'pt' ? 'Abandonar Partida' : 'Forfeit Match'}
              >
                <LogOut size={isMobile ? 12 : 18} />
              </button>
            )}
          </div>

          {/* Floating Settings Card Panel */}
          {isExpanded && (
            <div 
              className="bg-zinc-950/90 border border-zinc-800 text-zinc-300 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col justify-between animate-scaleUp animate-duration-200"
              style={{ padding: isMobile ? '10px' : '16px', width: isMobile ? '190px' : '260px', height: isMobile ? '310px' : '415px' }}
              onMouseLeave={() => {
                if (!isMobile) setIsExpanded(false);
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 w-full">
                <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1">
                  <Settings size={11} className="animate-spin-slow" />
                  {t('app.gameSettings')}
                </span>
                <button
                  onClick={handleToggleMute}
                  className="hover:text-cyan-400 active:scale-90 transition-all duration-200"
                  title={isMuted ? (language === 'pt' ? "Desmutar tudo" : "Unmute all") : (language === 'pt' ? "Mutar tudo" : "Mute all")}
                >
                  {isMuted ? (
                    <VolumeX size={14} className="text-zinc-550 hover:text-cyan-400 transition-colors" />
                  ) : (
                    <Volume2 size={14} className="text-cyan-400 hover:text-cyan-300 transition-colors" />
                  )}
                </button>
              </div>

              {/* Seção 1: Audio */}
              <div className="flex flex-col gap-2 w-full">
                {/* Slider 1: SFX */}
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Zap size={11} className="text-cyan-400" />
                      <span>{t('app.sfxVolume')}</span>
                    </div>
                    <span>{isMuted ? 0 : Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : sfxVolume}
                    onChange={handleSFXVolumeChange}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #00d2ff 0%, #00d2ff ${(isMuted ? 0 : sfxVolume) * 100}%, #27272a ${(isMuted ? 0 : sfxVolume) * 100}%, #27272a 100%)`
                    }}
                  />
                </div>

                {/* Slider 2: Crowd / Torcida */}
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Users size={11} className="text-cyan-400" />
                      <span>{t('app.crowdVolume')}</span>
                    </div>
                    <span>{isMuted ? 0 : Math.round(crowdVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : crowdVolume}
                    onChange={handleCrowdVolumeChange}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #00d2ff 0%, #00d2ff ${(isMuted ? 0 : crowdVolume) * 100}%, #27272a ${(isMuted ? 0 : crowdVolume) * 100}%, #27272a 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Seção 2: Câmera */}
              <div className="flex flex-col gap-1.5 w-full border-t border-zinc-800/80 pt-2.5 mt-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Video size={11} className="text-cyan-400" />
                    <span>{t('app.cameraMode')}</span>
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
                    {t('app.followBall')}
                  </button>
                  <button
                    onClick={() => changeCameraMode('fixed')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
                      cameraMode === 'fixed'
                        ? 'bg-cyan-500 text-zinc-950 shadow-md scale-100 font-extrabold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t('app.freeCamera')}
                  </button>
                </div>
                <span className="text-[9.5px] text-zinc-550 leading-tight">
                  {cameraMode === 'dynamic' 
                    ? t('app.cameraDynamicDesc') 
                    : t('app.cameraFixedDesc')}
                </span>
              </div>

              {/* Seção Idioma / Language */}
              <div className="flex flex-col gap-1.5 w-full border-t border-zinc-800/80 pt-2.5 mt-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Globe size={11} className="text-cyan-400" />
                    <span>Idioma / Language</span>
                  </div>
                </div>
                <div className="flex bg-zinc-900/95 border border-zinc-800/60 p-0.5 rounded-lg w-full relative">
                  <button
                    onClick={() => {
                      SoundManager.playUIClick();
                      changeLanguage('en');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
                      language === 'en'
                        ? 'bg-cyan-500 text-zinc-950 shadow-md scale-100 font-extrabold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => {
                      SoundManager.playUIClick();
                      changeLanguage('pt');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
                      language === 'pt'
                        ? 'bg-cyan-500 text-zinc-950 shadow-md scale-100 font-extrabold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    PT
                  </button>
                </div>
              </div>

              {/* Seção 3: Regras */}
              <button
                onClick={() => {
                  SoundManager.playUIClick();
                  setShowRulesModal(true);
                }}
                className="w-full mt-2.5 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 active:from-cyan-500/40 active:to-blue-500/40 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 font-extrabold text-[10px] tracking-wider uppercase rounded-xl shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <BookOpen size={12} />
                {t('app.gameRules')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Premium Global Rules & Tutorial Modal */}
      {showRulesModal && (
        <RulesModal onClose={() => {
          setShowRulesModal(false);
          setRulesAutoTriggered(false);
        }} />
      )}

      {/* Profile & Kit Customizer Modal Overlay */}
      {showProfileModal && activeUser && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Custom System Alert Modal */}
      {systemMessage && (
        <SystemAlertModal
          title={systemMessage.title}
          message={systemMessage.message}
          type={systemMessage.type}
          onClose={() => setSystemMessage(null)}
        />
      )}

      {/* Leave / Forfeit Confirmation Modal */}
      {showLeaveConfirm && (
        <ConfirmationModal
          title={language === 'pt' ? 'ABANDONAR PARTIDA?' : 'FORFEIT MATCH?'}
          message={
            language === 'pt'
              ? 'Se você sair agora, o oponente vencerá por abandono (W.O.) e os pontos serão calculados normalmente. Tem certeza?'
              : 'If you leave now, the opponent wins by forfeit (W.O.) and stats will be saved. Are you sure?'
          }
          confirmLabel={language === 'pt' ? 'SAIR' : 'LEAVE'}
          cancelLabel={language === 'pt' ? 'CANCELAR' : 'CANCEL'}
          onConfirm={() => {
            setShowLeaveConfirm(false);
            triggerForfeit();
          }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}

    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameStateProvider>
      <AppContent />
    </GameStateProvider>
  );
};

export default App;
