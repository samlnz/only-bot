
import React from 'react';

interface LobbyPageProps {
  onStart: () => void;
}

const LobbyPage: React.FC<LobbyPageProps> = ({ onStart }) => {
  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#050b1a] via-[#101827] to-[#1e1b4b] flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <div className="max-w-4xl w-full h-full md:h-auto max-h-[95vh] bg-black/60 backdrop-blur-xl p-6 md:p-10 rounded-3xl border-2 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-fade-in text-center relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-white to-amber-500 animate-shimmer"></div>
        
        {/* Branding Section */}
        <div className="mt-2">
          <div className="text-5xl md:text-7xl text-amber-400 mb-2 md:mb-6 animate-star inline-block">
            <i className="fas fa-star"></i>
          </div>
          <h1 className="text-4xl md:text-7xl font-['Orbitron'] font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-white to-amber-200 mb-1 drop-shadow-lg tracking-tighter">
            STAR BINGO
          </h1>
          <p className="text-xs md:text-xl text-amber-100/70 tracking-[0.2em] md:tracking-widest uppercase font-light">Celestial Network</p>
        </div>

        {/* Feature Grid - Optimized for Mobile */}
        <div className="grid grid-cols-3 gap-2 md:gap-6 my-4">
          {[
            { icon: 'comet', title: 'Rounds', desc: 'Every 5 mins' },
            { icon: 'eye', title: 'Live', desc: 'Spectate now' },
            { icon: 'user-astronaut', title: 'Secure', desc: 'Verified' }
          ].map((item, i) => (
            <div key={i} className="bg-amber-500/10 p-2 md:p-6 rounded-xl border border-amber-500/20 flex flex-col items-center">
              <i className={`fas fa-${item.icon} text-xl md:text-3xl text-amber-400 mb-1 md:mb-4`}></i>
              <h3 className="text-amber-300 font-bold text-[8px] md:text-base font-['Orbitron'] truncate w-full">{item.title}</h3>
              <p className="hidden md:block text-amber-100/60 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Action Section */}
        <div className="mb-4">
          <button 
            onClick={onStart}
            className="group relative inline-flex items-center gap-2 md:gap-4 px-10 md:px-16 py-4 md:py-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full text-xl md:text-3xl font-bold shadow-[0_10px_30px_rgba(245,158,11,0.4)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.6)] hover:scale-105 transition-all active:scale-95 text-white"
          >
            <i className="fas fa-rocket text-base md:text-xl"></i>
            ገባ በሉ
            <div className="absolute -inset-1 rounded-full bg-amber-400/20 blur-md group-hover:blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {/* Status Section - Compact for Mobile */}
        <div className="bg-black/40 rounded-xl p-3 md:p-6 border-l-4 border-amber-500 text-left">
          <h2 className="text-amber-400 font-bold text-[10px] md:text-base mb-1 md:mb-4 flex items-center gap-2 font-['Orbitron']">
            <i className="fas fa-satellite-dish"></i>
            COSMOS STATUS
          </h2>
          <p className="text-amber-100/70 text-[9px] md:text-sm leading-relaxed mb-0 md:mb-4">
            A stellar cycle is currently concluding. <span className="hidden md:inline">If you missed the launch window, you will enter as an observer until the next celestial alignment.</span>
          </p>
          <ul className="hidden md:block space-y-3 text-amber-100/70 text-xs">
            <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Automatic transition to Selection Phase.</li>
            <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Live broadcasting is always active.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
