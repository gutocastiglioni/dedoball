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
import { useIsMobile } from './hooks/useIsMobile';

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
    placePlayer,
    isIAThinking,
    setActionStatus,
    handleBallStopped,
    updateGoalkeeperPositions,
    homeKitConfig,
    awayKitConfig,
    activeUser
  } = useGameStateContext();

  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
      {isMobile && !isFullscreen && (
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
        </>
      )}

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
