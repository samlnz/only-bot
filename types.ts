
export type BingoLetter = 'B' | 'I' | 'N' | 'G' | 'O';

export interface Card {
  id: number;
  numbers: number[]; // 25 numbers, column-major
  type: string;
}

export interface PlayerWinData {
  playerName: string;
  playerId: string;
  cardNumbers: number[];
  winningLines: {
    card1: string[];
    card2: string[];
  };
  totalLines: number;
  gameTime: number;
  calledNumbersCount: number;
  cardData: {
    card1: CardResult;
    card2: CardResult;
  };
}

export interface CardResult {
  numbers: number[];
  markedNumbers: number[];
  winningCells: number[];
  winningLines: string[];
}

export enum GamePhase {
  SELECTION = 'SELECTION',
  PLAYING = 'PLAYING',
  WINNER = 'WINNER'
}

export interface LedgerEntry {
  id: number;
  playerId: string;
  type: 'entry' | 'win' | 'deposit' | 'withdrawal';
  amount: number;
  roundId?: number;
  date: string;
}

// Global Sync Constants
export const SYNC_CONFIG = {
  SELECTION_DURATION: 30, 
  WINNER_ANNOUNCEMENT_DURATION: 10,
  READY_DURATION: 5, 
  CALL_INTERVAL: 4, 
  GENESIS_EPOCH: 1738368000, 
  ENTRY_FEE: 10,
};
