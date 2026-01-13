
import React, { useState, useEffect, useMemo } from 'react';
import { PlayerWinData, SYNC_CONFIG } from '../types';
import { cardGenerator } from '../services/cardGenerator';
import BingoCard from '../components/BingoCard';

interface GamePageProps {
  selectedCards: number[];
  playerName: string;
  playerId: string;
  balance: number;
  onWin: (data: PlayerWinData) => void;
  globalTime: number;
  roundStartTime: number;
  roundId: number;
  activeParticipantCount: number;
}

const COLUMN_CONFIG = {
  'B': { color: 'text-cyan-400', bg: 'bg-cyan-600' },
  'I': { color: 'text-purple-400', bg: 'bg-purple-600' },
  'N': { color: 'text-rose-400', bg: 'bg-rose-600' },
  'G': { color: 'text-emerald-400', bg: 'bg-emerald-600' },
  'O': { color: 'text-amber-400', bg: 'bg-amber-600' }
};

const BET_AMOUNT = 10;

const GamePage: React.FC<GamePageProps> = ({ selectedCards, playerName, balance, globalTime, roundStartTime, roundId, activeParticipantCount }) => {
  const effectiveCards = selectedCards;
  const isSpectator = selectedCards.length === 0;
  
  const [marked, setMarked] = useState<{ [key: number]: Set<number> }>({});
  const [autoMark, setAutoMark] = useState(true);

  const timeInGame = Math.max(0, globalTime - roundStartTime);
  const prizePool = Math.floor(activeParticipantCount * BET_AMOUNT * 0.80);

  const globalCallSequence = useMemo(() =>