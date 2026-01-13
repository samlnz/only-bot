
import React from 'react';
import { Card } from '../types';

interface BingoCardProps {
  card: Card;
  markedNumbers: Set<number>;
  winningCells?: number[];
  onToggleMark?: (num: number) => void;
  compact?: boolean;
}

const BingoCard: React.FC<BingoCardProps> = ({ card, markedNumbers, winningCells = [], onToggleMark, compact = false }) => {
  const colConfigs = [
    { label: 'B', color: 'cyan', text: 'text-cyan-400', bg: 'bg-cyan-500', lightBg: 'bg-cyan-500/10', ring: 'ring-cyan-400' },
    { label: 'I', color: 'purple', text: 'text-purple-400', bg: 'bg-purple-500', lightBg: 'bg-purple-500/10', ring: 'ring-purple-400' },
    { label: 'N', color: 'rose', text: 'text-rose-400', bg: 'bg-rose-500', lightBg: 'bg-rose-500/10', ring: 'ring-rose-400' },
    { label: 'G', color: 'emerald', text: 'text-emerald-400', bg: 'bg-emerald-500', lightBg: 'bg-emerald-500/10', ring: 'ring-emerald-400' },
    { label: 'O', color: 'amber', text: 'text-amber-400', bg: 'bg-amber-500', lightBg: 'bg-amber-500/10', ring: 'ring-amber-400' },
  ];

  return (
    <div className={`bg-[#0f172a]/95 rounded-lg md:rounded-[2.5rem] border-2 border-white/10 ${compact ? 'p-1.5 md:p-5' : 'p-4 md:p-6'} transition-all hover:border-cyan-500/40 shadow-xl w-full max-w-full overflow-hidden`}>
      <div className={`flex justify-between items-center ${compact ? 'mb-2 pb-1 md:mb-5 md:pb-3' : 'mb-6 pb-4'} border-b border-white/5`}>
        <h3 className={`text-white font-bold flex items-center gap-1 md:gap-3 font-['Orbitron'] ${compact ? 'text-[8px] md:text-xl' : 'text-[10px] md:text-sm'} tracking-tight md:tracking-[0.2em]`}>
          <span className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></span>
          #{card.id}
        </h3>
        <span className={`${compact ? 'text-[6px] md:text-[10px] px-2 py-0.5' : 'text-[7px] md:text-[9px] px-2 md:px-3 py-0.5 md:py-1'} bg-white/5 text-cyan-400 rounded-full border border-white/10 uppercase font-bold`}>V</span>
      </div>

      <div className={`grid grid-cols-5 ${compact ? 'gap-1 md:gap-2.5' : 'gap-2 md:gap-3'} mb-1 md:mb-8`}>
        {colConfigs.map(cfg => (
          <div key={cfg.label} className={`text-center ${compact ? 'py-1 md:py-3.5' : 'py-2 md:py-4'} font-bold ${cfg.text} ${cfg.lightBg} rounded-sm md:rounded-2xl ${compact ? 'text-[10px] md:text-4xl' : 'text-lg md:text-3xl'} font-['Orbitron'] border border-white/5`}>
            {cfg.label}
          </div>
        ))}
        
        {Array.from({ length: 25 }).map((_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const numberIndex = col * 5 + row;
          const num = card.numbers[numberIndex];
          const isFree = num === 0;
          const isMarked = isFree || markedNumbers.has(num);
          const isWinning = winningCells.includes(i);

          return (
            <div
              key={i}
              onClick={() => !isFree && onToggleMark?.(num)}
              className={`
                aspect-square flex items-center justify-center rounded-sm md:rounded-2xl font-bold cursor-pointer transition-all border overflow-hidden
                ${compact ? 'text-[14px] md:text-[2.75rem]' : 'text-3xl md:text-5xl'}
                ${isFree ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-orange-300 shadow-sm' : 'bg-white/5 text-white border-white/5 hover:bg-white/10'}
                ${isMarked && !isFree && !isWinning ? `bg-emerald-500 border-white/20 shadow-md z-10` : ''}
                ${isWinning ? `!bg-orange-500 !border-orange-300 z-30 scale-[1.05] animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.6)]` : ''}
              `}
            >
              {isFree ? (
                <i className={`fas fa-star ${compact ? 'text-[10px] md:text-4xl' : 'text-2xl md:text-4xl'} drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]`}></i>
              ) : num}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BingoCard;
