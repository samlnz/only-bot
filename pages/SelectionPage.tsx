
import React from 'react';
import { cardGenerator } from '../services/cardGenerator';
import BingoCard from '../components/BingoCard';

interface NetworkUser {
  id: number;
  username: string;
}

interface SelectionPageProps {
  playerName: string;
  playerId: string;
  balance: number;
  selectedCards: number[];
  networkSelections: NetworkUser[];
  onToggleCard: (id: number) => void;
  onRandomAssign: () => void;
  onClearSelection: () => void;
  globalTime: number;
  roundEndTime: number;
  roundId: number;
  activeParticipantCount: number;
}

const SelectionPage: React.FC<SelectionPageProps> = ({ 
  playerName, 
  playerId, 
  balance,
  selectedCards, 
  networkSelections,
  onToggleCard, 
  onRandomAssign, 
  onClearSelection, 
  globalTime, 
  roundEndTime, 
  roundId,
  activeParticipantCount
}) => {
  const timeLeft = Math.max(0, roundEndTime - globalTime);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden p-1.5 md:p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-blue-400/10 to-cyan-300/20 pointer-events-none"></div>
      
      <div className="max-w-[1900px] mx-auto space-y-3 md:space-y-4 relative z-10">
        <div className="bg-black/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 flex flex-col lg:flex-row justify-between items-center gap-3 md:gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-cyan-500 flex items-center justify-center text-lg md:text-xl font-bold shadow-lg shadow-cyan-500/20 text-white">
              {playerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-white text-base md:text-lg font-bold font-['Orbitron'] leading-tight">{playerName}</h2>
              <p className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-widest">ROUND #{roundId} • ID: {playerId}</p>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2 md:gap-4 w-full lg:w-auto">
            <div className={`flex-1 sm:flex-none px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl border-2 transition-all duration-300 ${timeLeft <= 10 ? 'border-red-500 bg-red-500/10 animate-pulse' : 'border-cyan-500/30 bg-white/5'}`}>
              <p className="text-[6px] md:text-[8px] uppercase tracking-[0.2em] text-white/40 text-center font-bold">CLOSES IN</p>
              <p className={`text-base md:text-2xl font-bold font-['Orbitron'] text-center ${timeLeft <= 10 ? 'text-red-500' : 'text-cyan-400'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>

            <div className="flex-1 sm:flex-none bg-cyan-500/10 border border-cyan-500/30 px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl flex flex-col items-center">
              <p className="text-[6px] md:text-[8px] uppercase tracking-[0.2em] text-cyan-400 font-bold mb-0.5">SYNC SLOTS</p>
              <p className="text-base md:text-2xl font-bold font-['Orbitron'] text-white">{activeParticipantCount}</p>
              <p className="text-[5px] text-cyan-500/60 uppercase font-bold tracking-widest mt-0.5">Network Nodes</p>
            </div>

            <div className="flex-1 sm:flex-none bg-emerald-500/10 border border-emerald-500/30 px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl flex flex-col items-center">
              <p className="text-[6px] md:text-[8px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-0.5">WALLET</p>
              <p className="text-base md:text-2xl font-bold font-['Orbitron'] text-white">
                {balance.toLocaleString()} <span className="text-[8px] md:text-[10px] text-white/40">ETB</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-white/5 px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-white/10 text-center flex items-center justify-center gap-3">
              <span className="text-xl md:text-2xl font-bold text-orange-500 font-['Orbitron']">{selectedCards.length}/3</span>
              <span className="text-[8px] md:text-[10px] uppercase text-white/40 font-bold tracking-widest">SELECTED</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-3 md:gap-4">
          <div className="lg:col-span-7 bg-white/5 backdrop-blur-md p-3 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex flex-row justify-between items-center mb-3 md:mb-6 px-1">
              <h2 className="text-[8px] md:text-[11px] font-['Orbitron'] font-bold text-white flex items-center gap-2 md:gap-3 uppercase tracking-[0.3em]">
                <span className="w-1.5 h-3 md:w-2 md:h-4 bg-orange-500 rounded-full"></span>
                SELECTION POOL
              </h2>
              <div className="text-[7px] md:text-[9px] text-cyan-400/60 uppercase font-bold tracking-widest bg-cyan-500/5 px-2 md:px-4 py-1 rounded-full border border-cyan-500/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live Node Sync
              </div>
            </div>
            
            <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-16 xl:grid-cols-20 gap-0.5 md:gap-1.5 overflow-y-auto max-h-[40vh] lg:max-h-[70vh] pr-1 md:pr-2 custom-scrollbar">
              {Array.from({ length: 500 }).map((_, i) => {
                const num = i + 1;
                const isSelected = selectedCards.includes(num);
                const takenInfo = networkSelections.find(n => n.id === num);
                const isTaken = !!takenInfo;
                
                return (
                  <button
                    key={num}
                    onClick={() => !isTaken && onToggleCard(num)}
                    disabled={isTaken}
                    className={`
                      aspect-square flex flex-col items-center justify-center font-bold transition-all relative border rounded-sm md:rounded-lg overflow-hidden p-0.5
                      ${isSelected 
                        ? 'bg-orange-500 border-white text-white shadow-[0_0_15px_rgba(249,115,22,0.8)] z-20 scale-[1.1] text-xs sm:text-xl md:text-4xl' 
                        : isTaken
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] cursor-not-allowed'
                          : 'bg-black/40 border-white/5 text-white hover:border-orange-500/50 text-xs sm:text-xl md:text-4xl'}
                    `}
                  >
                    {isTaken ? (
                      <span className="text-[4px] sm:text-[7px] md:text-[9px] lg:text-[11px] break-all leading-tight text-center w-full font-bold px-0.5 opacity-100">
                        {takenInfo.username.substring(0, 10)}
                      </span>
                    ) : (
                      <span>{num}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 md:gap-4">
            <div className="bg-black/40 backdrop-blur-md p-2 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 flex flex-col">
              <h2 className="text-[8px] md:text-xs font-['Orbitron'] font-bold text-white/60 mb-2 md:mb-6 uppercase tracking-widest flex justify-between items-center px-1">
                <span>Active Slots</span>
                <span className="bg-orange-500/20 text-orange-400 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px]">{selectedCards.length}/3</span>
              </h2>
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {selectedCards.length === 0 ? (
                  <div className="col-span-3 py-6 md:py-12 flex flex-col items-center justify-center text-white/10 border-2 border-dashed border-white/5 rounded-xl md:rounded-[2rem] text-center p-4">
                    <i className="fas fa-eye text-xl md:text-3xl mb-2 opacity-20"></i>
                    <p className="text-[8px] md:text-sm font-medium uppercase tracking-widest">Awaiting Selection</p>
                  </div>
                ) : (
                  [...Array(3)].map((_, idx) => {
                    const num = selectedCards[idx];
                    return num ? (
                      <div key={num} className="bg-black/40 p-0.5 rounded-md md:rounded-2xl border border-orange-500/20 overflow-hidden flex flex-col">
                         <BingoCard card={cardGenerator.generateCard(num)} markedNumbers={new Set()} compact />
                      </div>
                    ) : (
                      <div key={`empty-${idx}`} className="bg-white/5 rounded-md md:rounded-2xl border border-white/5 flex items-center justify-center aspect-[5/8] opacity-20">
                         <i className="fas fa-plus text-[8px] md:text-base"></i>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <button 
                onClick={onRandomAssign}
                className="py-3 md:py-5 rounded-xl md:rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 font-bold hover:bg-orange-500/40 transition-all uppercase tracking-widest text-[8px] md:text-[11px] flex items-center justify-center gap-2 md:gap-3 shadow-lg"
              >
                <i className="fas fa-random text-[10px] md:text-base"></i> RANDOM
              </button>
              
              <button 
                onClick={onClearSelection}
                className="py-3 md:py-5 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-white/40 font-bold hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest text-[8px] md:text-[11px]"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionPage;
