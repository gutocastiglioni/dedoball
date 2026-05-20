import React, { useState } from 'react';
import { useGameStateContext } from '../../GameStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PlusCircle, Lock, Users } from 'lucide-react';

const MultiplayerTab: React.FC = () => {
  const { activeRooms, createRoom, joinRoom } = useGameStateContext();
  const isMobile = useIsMobile();

  // Create Room modal/form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false);

  // Password Prompt for joining closed rooms
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [inputPassword, setInputPassword] = useState('');

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
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9.5px] sm:text-xs font-black tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-500/20"
        >
          <PlusCircle size={12} />
          NOVA SALA
        </button>
      </div>

      {/* Create Room Modal/Box */}
      {showCreateRoomForm && (
        <div className={`w-full bg-zinc-900 border border-indigo-500/40 shadow-[0_0_25px_rgba(99,102,241,0.15)] text-left animate-fadeIn
          ${isMobile ? 'p-3 space-y-2 max-w-none' : 'max-w-md mx-auto p-5 space-y-4 rounded-2xl'}
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
                placeholder="Secreta"
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
                setNewRoomName('');
                setNewRoomPassword('');
              }}
              className="flex-grow py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md"
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
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-thin
        ${isMobile ? 'max-h-[170px]' : 'max-h-[350px]'}
      `}>
        {activeRooms.length > 0 ? (
          activeRooms.map((room) => (
            <div 
              key={room.roomId}
              className={`bg-zinc-900/60 border border-zinc-800 flex justify-between items-center hover:border-zinc-700 transition-colors shadow-inner
                ${isMobile ? 'p-2 rounded-xl' : 'p-4 rounded-2xl'}
              `}
            >
              <div className="flex items-center gap-2">
                <img src={room.players.home.photoURL} alt="" className="w-6 h-6 rounded-full border border-zinc-850" referrerPolicy="no-referrer" />
                <div className="text-left">
                  <h4 className="text-[10px] sm:text-xs font-black text-zinc-200 uppercase tracking-wide flex items-center gap-1">
                    {room.name}
                    {room.isClosed && <Lock size={9} className="text-amber-500" />}
                  </h4>
                  <p className="text-[8px] font-semibold text-zinc-550 uppercase">Criador: {room.players.home.displayName}</p>
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
          <div className="col-span-2 py-6 sm:py-12 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center flex flex-col items-center justify-center text-zinc-500 font-bold">
            <Users size={isMobile ? 20 : 28} className="opacity-30 mb-1" />
            <span className="text-[10px] sm:text-xs font-semibold">Nenhuma sala aguardando oponentes no momento.</span>
            <span className="text-[8px] sm:text-[10px] text-zinc-655 font-medium">Clique no botão acima para inaugurar a arena!</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default MultiplayerTab;
