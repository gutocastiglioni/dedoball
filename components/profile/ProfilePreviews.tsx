import React from 'react';
import SoundManager from '../../SoundManager';

interface ProfilePreviewsProps {
  activePrimaryColor: string;
  activeSecondaryColor: string;
  activePattern: 'solid' | 'vertical' | 'horizontal' | 'center-band' | 'side-stripes' | 'x' | 'sash' | 'three-stripes-v' | 'three-stripes-h' | 'cross' | 'sash-cross';
  activeShortsColor: string;
  activeShortsSecondaryColor: string;
  activeShortsPattern: 'solid' | 'side-stripes' | 'three-stripes' | 'two-tone';
  activeSocksColor: string;
  activeSocksSecondaryColor: string;
  activeSocksPattern: 'solid' | 'hoops' | 'three-stripes' | 'two-tone';
  selectedUniformItem: 'shirt' | 'shorts' | 'socks';
  setSelectedUniformItem: (val: 'shirt' | 'shorts' | 'socks') => void;
}

export const ProfilePreviews: React.FC<ProfilePreviewsProps> = ({
  activePrimaryColor,
  activeSecondaryColor,
  activePattern,
  activeShortsColor,
  activeShortsSecondaryColor,
  activeShortsPattern,
  activeSocksColor,
  activeSocksSecondaryColor,
  activeSocksPattern,
  selectedUniformItem,
  setSelectedUniformItem
}) => {
  return (
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

            {/* Fabric Folds */}
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
  );
};
