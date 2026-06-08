import React, { useState, useEffect, useRef } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { GamePhase } from '../../types';

type MatchEvent = 'kickoff' | 'halftime' | 'second_half' | 'fulltime';

interface EventConfig {
  eyebrow: string;
  title: string;
  eyebrowPt: string;
  titlePt: string;
  accentColor: string;
  glowColor: string;
  bgGradient: string;
}

const EVENT_CONFIG: Record<MatchEvent, EventConfig> = {
  kickoff: {
    eyebrow: 'MATCH STARTS',
    title: 'KICK OFF',
    eyebrowPt: 'PARTIDA INICIADA',
    titlePt: 'INÍCIO',
    accentColor: '#22d3ee',
    glowColor: 'rgba(34, 211, 238, 0.3)',
    bgGradient: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(2,18,24,0.99) 50%, rgba(0,0,0,0.97) 100%)',
  },
  halftime: {
    eyebrow: 'END OF FIRST HALF',
    title: 'HALF TIME',
    eyebrowPt: 'FIM DO PRIMEIRO TEMPO',
    titlePt: 'INTERVALO',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.3)',
    bgGradient: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(18,12,0,0.99) 50%, rgba(0,0,0,0.97) 100%)',
  },
  second_half: {
    eyebrow: 'SECOND HALF',
    title: 'KICK OFF',
    eyebrowPt: 'SEGUNDO TEMPO',
    titlePt: 'INÍCIO',
    accentColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.3)',
    bgGradient: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(8,4,22,0.99) 50%, rgba(0,0,0,0.97) 100%)',
  },
  fulltime: {
    eyebrow: 'MATCH OVER',
    title: 'FULL TIME',
    eyebrowPt: 'FIM DE JOGO',
    titlePt: 'APITO FINAL',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.3)',
    bgGradient: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(22,3,8,0.99) 50%, rgba(0,0,0,0.97) 100%)',
  },
};

const HOLD_DURATION = 1580;
const EXIT_DURATION = 420;

const HUDMatchEventBanner: React.FC = () => {
  const { phase, gameTime, gameTimeSeconds, matchDuration, language, setIsBannerActive } = useGameStateContext();

  const [currentEvent, setCurrentEvent] = useState<MatchEvent | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const prevPhaseRef = useRef<GamePhase>(phase);
  const kickoffShownRef = useRef(false);
  const halftimeShownRef = useRef(false);
  const secondHalfShownRef = useRef(false);
  const fulltimeShownRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerEvent = (event: MatchEvent) => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    setCurrentEvent(event);
    setIsExiting(false);
    setIsBannerActive(true);

    exitTimerRef.current = setTimeout(() => {
      setIsExiting(true);
      dismissTimerRef.current = setTimeout(() => {
        setCurrentEvent(null);
        setIsExiting(false);
        setIsBannerActive(false);
      }, EXIT_DURATION);
    }, HOLD_DURATION);
  };

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Reset all flags when returning to MENU (new game)
    if (phase === GamePhase.MENU) {
      kickoffShownRef.current = false;
      halftimeShownRef.current = false;
      secondHalfShownRef.current = false;
      fulltimeShownRef.current = false;
      setIsBannerActive(false);
      return;
    }

    // KICKOFF: first ACTION from PREPARATION at gameTimeSeconds === 0
    if (
      prevPhase === GamePhase.PREPARATION &&
      phase === GamePhase.ACTION &&
      gameTimeSeconds === 0 &&
      !kickoffShownRef.current
    ) {
      kickoffShownRef.current = true;
      triggerEvent('kickoff');
      return;
    }

    // HALFTIME: phase becomes PREPARATION when gameTimeSeconds is exactly half of matchDuration
    const halfTimeLimit = Math.floor(matchDuration / 2);
    if (
      phase === GamePhase.PREPARATION &&
      prevPhase !== GamePhase.MENU &&
      gameTimeSeconds === halfTimeLimit &&
      !halftimeShownRef.current
    ) {
      halftimeShownRef.current = true;
      triggerEvent('halftime');
      return;
    }

    // SECOND HALF: first ACTION from PREPARATION after halftime already occurred
    if (
      prevPhase === GamePhase.PREPARATION &&
      phase === GamePhase.ACTION &&
      halftimeShownRef.current &&
      !secondHalfShownRef.current
    ) {
      secondHalfShownRef.current = true;
      triggerEvent('second_half');
      return;
    }

    // FULL TIME
    if (phase === GamePhase.GAME_OVER && !fulltimeShownRef.current) {
      fulltimeShownRef.current = true;
      triggerEvent('fulltime');
    }
  }, [phase, gameTime, gameTimeSeconds, matchDuration]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!currentEvent) return null;

  const config = EVENT_CONFIG[currentEvent];
  const isPortuguese = language === 'pt';
  const eyebrow = isPortuguese ? config.eyebrowPt : config.eyebrow;
  const title = isPortuguese ? config.titlePt : config.title;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 24 }}
    >
      {/* Dark overlay fade */}
      <div
        className={`absolute inset-0 bg-black/45 ${isExiting ? 'animate-matchOverlayOut' : 'animate-matchOverlayIn'}`}
      />

      {/* Horizontal band */}
      <div
        className={`relative w-full overflow-hidden flex flex-col items-center justify-center py-5 md:py-8 ${isExiting ? 'animate-matchBandOut' : 'animate-matchBandIn'}`}
        style={{ background: config.bgGradient, boxShadow: `0 0 100px ${config.glowColor}, 0 0 60px ${config.glowColor}` }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${config.accentColor} 25%, ${config.accentColor} 75%, transparent 100%)` }}
        />

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${config.accentColor} 25%, ${config.accentColor} 75%, transparent 100%)` }}
        />

        {/* Diagonal decorative stripes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                left: `${i * 8 - 4}%`,
                width: '5px',
                background: config.accentColor,
                opacity: 0.03,
                transform: 'skewX(-22deg)',
              }}
            />
          ))}
        </div>

        {/* Radial center glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 150% at 50% 50%, ${config.glowColor} 0%, transparent 65%)` }}
        />

        {/* Content */}
        <div className="relative flex flex-col items-center text-center gap-0.5 md:gap-1 px-4">
          {/* Eyebrow label */}
          <span
            className="text-[8px] md:text-[11px] font-black tracking-[0.5em] uppercase"
            style={{ color: config.accentColor, textShadow: `0 0 25px ${config.glowColor}` }}
          >
            ◆ {eyebrow} ◆
          </span>

          {/* Main event title */}
          <h2
            className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none select-none"
            style={{
              color: '#ffffff',
              textShadow: `0 0 80px ${config.glowColor}, 0 0 40px ${config.glowColor}, 0 6px 28px rgba(0,0,0,0.95)`,
            }}
          >
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default HUDMatchEventBanner;
