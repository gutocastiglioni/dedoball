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
// import HUDTelemetryLog from './components/hud/HUDTelemetryLog';
import { useIsMobile } from './hooks/useIsMobile';
import { Navigation, Volume2, VolumeX, Zap, Users } from 'lucide-react';
import SoundManager from './SoundManager';

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
    recenterCamera
  } = useGameStateContext();

  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.5);
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
      {showFullscreenGate && (
        <div
          className="fullscreen-gate"
          onClick={enterFullscreen}
          onTouchEnd={(e) => { e.preventDefault(); enterFullscreen(); }}
        >
          <div className="gate-pulse">
            <span style={{ fontSize: 38 }}>⚽</span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center px-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              TABLEBALL
            </h1>
            <p className="text-zinc-400 text-xs font-semibold tracking-wide">
              Futebol de botão online
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
          {/* <HUDTelemetryLog /> */}
        </>
      )}

      {/* Recenter Button when NOT in preparation phase and center is lost */}
      {phase !== GamePhase.MENU && phase !== GamePhase.PREPARATION && !isCameraCentered && (
        <div className="absolute bottom-6 right-6 z-15 pointer-events-auto">
          <button
            onClick={recenterCamera}
            className="hud-recenter-btn py-3.5 md:py-4 px-6 md:px-8 bg-zinc-900/90 hover:bg-zinc-800/95 border border-zinc-700 text-cyan-400 font-bold tracking-widest uppercase rounded-2xl shadow-2xl backdrop-blur-lg transform transition-all active:scale-98 flex items-center justify-center gap-2 text-xs md:text-sm animate-scaleUp"
          >
            <Navigation size={14} className="rotate-45" />
            RECENTRALIZAR
          </button>
        </div>
      )}

      {/* Premium Glassmorphic Audio Controller Card */}
      <div 
        className="absolute bottom-6 left-6 z-20 pointer-events-auto flex flex-col items-center justify-center bg-zinc-950/85 hover:bg-zinc-950/90 border border-zinc-800 text-zinc-300 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 ease-out group"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        style={{
          width: isExpanded ? '240px' : '48px',
          height: isExpanded ? '180px' : '48px',
          padding: isExpanded ? '16px' : '0px',
        }}
      >
        {!isExpanded ? (
          <button
            onClick={handleToggleMute}
            className="flex items-center justify-center w-full h-full hover:text-cyan-400 active:scale-90 transition-all duration-200"
            title={isMuted ? "Desmutar som" : "Ajustes de Áudio"}
          >
            {isMuted || (sfxVolume === 0 && crowdVolume === 0) ? (
              <VolumeX size={18} className="text-zinc-550 hover:text-cyan-400 transition-colors" />
            ) : (
              <Volume2 size={18} className="text-cyan-400 animate-pulse" />
            )}
          </button>
        ) : (
          <div className="flex flex-col h-full w-full justify-between select-none animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 w-full">
              <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                CONTROLE DE ÁUDIO
              </span>
              <button
                onClick={handleToggleMute}
                className="hover:text-cyan-400 active:scale-90 transition-all duration-200"
                title={isMuted ? "Desmutar tudo" : "Mutar tudo"}
              >
                {isMuted ? (
                  <VolumeX size={14} className="text-zinc-550 hover:text-cyan-400 transition-colors" />
                ) : (
                  <Volume2 size={14} className="text-cyan-400 hover:text-cyan-300 transition-colors" />
                )}
              </button>
            </div>

            {/* Slider 1: SFX */}
            <div className="flex flex-col gap-1 w-full mb-1">
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
                onChange={handleCrowdVolumeChange}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #00d2ff 0%, #00d2ff ${(isMuted ? 0 : crowdVolume) * 100}%, #27272a ${(isMuted ? 0 : crowdVolume) * 100}%, #27272a 100%)`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Profile & Kit Customizer Modal Overlay */}
      {showProfileModal && activeUser && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
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
