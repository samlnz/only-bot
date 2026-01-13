
import React from 'react';
import { PlayerWinData } from '../types';
import BingoCard from '../components/BingoCard';

interface WinnerPageProps {
  data: PlayerWinData;
  onRestart: () => void;
  currentPlayerId?: string;
  userDidParticipate: boolean;
}

const WinnerPage: React.FC<WinnerPageProps> = ({ data, currentPlayerId, userDidParticipate }) => {
  const isLocalWinner = userDidParticipate && currentPlayerId === data.playerId;
  
  const winIdx = data.cardData.card1.winningCells.length > 0 ? 0 : 1;
  const winCardId = data.cardNumbers[winIdx];
  const winCardData = winIdx === 0 ? data.cardData.card1 : data.cardData.card2;

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-2 md:p-6 relative overflow-hidden font-['Rajdhani']">
      {/* Dynamic Aura Background */}
      <div className={`absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${isLocalWinner ? 'from-emerald-500/40' : 'from-orange-500/20'} via-transparent to-transparent`}></div>
      
      {/* Main Container */}
      <div className={`w-full max-w-2xl bg-[#0a0f1e]/80 backdrop-blur-2xl border-2 ${isLocalWinner ? 'border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.2)]' : 'border-white/10'} p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] z-10 flex flex-col gap-4 md:gap-8 animate-fade-in`}>
        
        {/* Compact Winner Header */}
        <div className="text-center space-y-1">
          <div className={`text-4xl md:text-6xl ${isLocalWinner ? 'text-yellow-400 animate-bounce' : 'text-orange-500'}`}>
            <i className={`fas ${isLocalWinner ? 'fa-crown' : 'fa-trophy'}`}></i>
          </div>
          <h1 className={`text-3xl md:text-5xl font-['Orbitron'] font-bold tracking-tighter ${isLocalWinner ? 'text-emerald-400' : 'text-white'}`}>
            {isLocalWinner ? 'YOU WON!' : 'WINNER DECLARED'}
          </h1>
        </div>

        {/* Hero Section: Winning Node & Slot */}
        <div className="flex flex-col gap-4">
          {/* Winner Profile Chip */}
          <div className="flex items-center justify-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${isLocalWinner ? 'from-emerald-400 to-emerald-800' : 'from-orange-400 to-orange-800'} flex items-center justify-center text-xl font-bold text-white shadow-lg`}>
              {data.playerName.charAt(0)}
            </div>
            <div className="text-left">
              <h2 className="text-lg md:text-2xl font-bold font-['Orbitron'] text-white leading-none">{data.playerName}</h2>
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-bold mt-1">Node: {data.playerId}</p>
            </div>
            {isLocalWinner && (
              <div className="ml-auto bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/40">
                <span className="text-emerald-400 font-bold text-sm">+840 ETB</span>
              </div>
            )}
          </div>

          {/* Winning Slot (Hero Bingo Card) */}
          <div className="relative group mx-auto w-full max-w-[400px]">
            <div className={`absolute -inset-2 rounded-[2.5rem] blur-xl opacity-50 transition-opacity ${isLocalWinner ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
            <div className="relative">
              <BingoCard 
                card={{ id: winCardId, numbers: winCardData.numbers, type: 'Fixed' }} 
                markedNumbers={new Set(winCardData.markedNumbers)} 
                winningCells={winCardData.winningCells} 
                compact 
              />
              {/* Overlay Label */}
              <div className="absolute top-4 right-4 bg-orange-500 text-white text-[8px] md:text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest shadow-xl">
                Winning Slot
              </div>
            </div>
          </div>
        </div>

        {/* Minimized Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/40 p-2 rounded-xl border border-white/5 text-center">
            <div className="text-xs md:text-lg font-bold font-['Orbitron'] text-white">{data.totalLines}</div>
            <div className="text-[7px] text-white/30 uppercase font-bold">Lines</div>
          </div>
          <div className="bg-black/40 p-2 rounded-xl border border-white/5 text-center">
            <div className="text-xs md:text-lg font-bold font-['Orbitron'] text-white">{data.calledNumbersCount}</div>
            <div className="text-[7px] text-white/30 uppercase font-bold">Balls</div>
          </div>
          <div className="bg-black/40 p-2 rounded-xl border border-white/5 text-center">
            <div className="text-xs md:text-lg font-bold font-['Orbitron'] text-white">{Math.floor(data.gameTime)}s</div>
            <div className="text-[7px] text-white/30 uppercase font-bold">Time</div>
          </div>
        </div>

        {/* Reduced Footer */}
        <div className="pt-2">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden max-w-[200px]">
              <div className="h-full bg-cyan-500 animate-[shimmer_2s_infinite]"></div>
            </div>
            <span className="text-[8px] md:text-[10px] font-['Orbitron'] font-bold text-cyan-400/60 uppercase tracking-widest">
              Awaiting Next Cycle...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinnerPage;
