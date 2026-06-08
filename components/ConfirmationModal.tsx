import React from 'react';
import { AlertTriangle } from 'lucide-react';
import SoundManager from '../SoundManager';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}) => {
  React.useEffect(() => {
    SoundManager.init();
    SoundManager.playUIClick();
  }, []);

  const handleConfirm = () => {
    SoundManager.playUIClick();
    onConfirm();
  };

  const handleCancel = () => {
    SoundManager.playUIClick();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn pointer-events-auto">
      <div 
        className="relative max-w-sm w-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-b from-rose-500/20 via-red-500/10 to-transparent bg-zinc-950/95 border border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.25)] text-center space-y-6 animate-scaleUp"
      >
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-zinc-900/90 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
          <AlertTriangle size={28} className="animate-pulse text-rose-500" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-lg font-black tracking-widest text-rose-400 uppercase">
            {title}
          </h2>
          <p className="text-xs text-zinc-300 font-semibold leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Buttons Action Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-350 font-black text-xs tracking-widest uppercase rounded-full shadow-md transition-all duration-200 active:scale-98"
          >
            {cancelLabel}
          </button>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-650 border border-rose-500/30 text-zinc-950 font-black text-xs tracking-widest uppercase rounded-full shadow-lg transition-all duration-200 active:scale-98"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
