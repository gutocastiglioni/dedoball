import React, { useState } from 'react';
import { useGameStateContext } from '../GameStateContext';
import { Lock, ShieldAlert } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
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

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
  const { loginGoogle } = useGameStateContext();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoginError(null);
      const user = await loginGoogle();
      if (user) {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
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
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative max-w-md w-full my-auto p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 border border-zinc-800 shadow-[0_10px_50px_rgba(0,0,0,0.8)] text-center space-y-5 animate-scaleUp">
        
        {/* Elegant Close Icon */}
        <button 
          onClick={onClose}
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
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 rounded-full text-xs font-bold transition-all hover:scale-102 active:scale-98 shadow-md"
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
