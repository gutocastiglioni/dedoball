import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import SoundManager from '../SoundManager';

interface SystemAlertModalProps {
  title: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning';
  onClose: () => void;
}

const SystemAlertModal: React.FC<SystemAlertModalProps> = ({
  title,
  message,
  type = 'info',
  onClose
}) => {
  // Play appropriate UI sound when opened
  React.useEffect(() => {
    SoundManager.init();
    if (type === 'error' || type === 'warning') {
      // SoundManager has no direct error sound, but we can play a notification click
      SoundManager.playUIClick();
    } else {
      SoundManager.playUIClick();
    }
  }, [type]);

  const handleClose = () => {
    SoundManager.playUIClick();
    onClose();
  };

  // Color theme mapper
  const config = {
    error: {
      gradient: 'from-rose-500/20 via-red-500/10 to-transparent',
      borderColor: 'border-rose-500/40',
      iconColor: 'text-rose-400',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.2)]',
      btnBg: 'from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-650',
      btnBorder: 'border-rose-500/30',
      icon: <ShieldAlert size={28} className="animate-pulse" />
    },
    warning: {
      gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderColor: 'border-amber-500/40',
      iconColor: 'text-amber-400',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
      btnBg: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-550',
      btnBorder: 'border-amber-500/30',
      icon: <AlertTriangle size={28} className="animate-bounce" />
    },
    success: {
      gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
      borderColor: 'border-emerald-500/40',
      iconColor: 'text-emerald-400',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
      btnBg: 'from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-650',
      btnBorder: 'border-emerald-500/30',
      icon: <CheckCircle2 size={28} />
    },
    info: {
      gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-cyan-500/40',
      iconColor: 'text-cyan-400',
      glow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',
      btnBg: 'from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600',
      btnBorder: 'border-cyan-500/30',
      icon: <Info size={28} />
    }
  }[type];

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Backdrop overlay block */}
      <div 
        className={`relative max-w-sm w-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-b ${config.gradient} bg-zinc-950/95 border ${config.borderColor} ${config.glow} text-center space-y-5 animate-scaleUp`}
      >
        {/* Dynamic Icon */}
        <div className={`w-16 h-16 rounded-full bg-zinc-900/90 border ${config.borderColor} flex items-center justify-center ${config.iconColor} mx-auto shadow-inner`}>
          {config.icon}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className={`text-lg font-black tracking-widest ${config.iconColor} uppercase`}>
            {title}
          </h2>
          <p className="text-xs text-zinc-300 font-semibold leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Confirm Action Button */}
        <button
          onClick={handleClose}
          className={`w-full py-3 bg-gradient-to-r ${config.btnBg} border ${config.btnBorder} text-zinc-950 font-black text-xs tracking-widest uppercase rounded-full shadow-lg transition-all duration-200 active:scale-98`}
        >
          OK, Entendido
        </button>
      </div>
    </div>
  );
};

export default SystemAlertModal;
