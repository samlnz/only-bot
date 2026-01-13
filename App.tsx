
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GamePhase, PlayerWinData, SYNC_CONFIG, CardResult } from './types';
import LobbyPage from './pages/LobbyPage';
import SelectionPage from './pages/SelectionPage';
import GamePage from './pages/GamePage';
import WinnerPage from './pages/WinnerPage';
import { cardGenerator } from './services/cardGenerator';

const API_BASE = import.meta.env.VITE_API_URL || '';

const App: React.FC = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [networkSelections, setNetworkSelections] = useState<{id: number, username: string, playerId: string}[]>([]);
  const [playerName, setPlayerName] = useState('SyncPlayer');
  const [playerId, setPlayerId] = useState('0000');
  const [balance, setBalance] = useState(0);
  const [globalTime, setGlobalTime] = useState(Math.floor(Date.now() / 1000));
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  
  const hasDeductedEntry = useRef<Record<number, boolean>>({});
  const hasCreditedWin = useRef<Record<number, boolean>>({});

  useEffect(() => {
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    setPlayerId(randomId);
    setPlayerName(`User-${randomId}`);
    
    if ((window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.expand();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setPlayerName(user.first_name + (user.last_name ? ` ${user.last_name}` : ''));
        setPlayerId(user.id.toString());
      }
    }

    const ticker = setInterval(() => {
      setGlobalTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/balance/${playerId}`);
      const data = await res.json();
      if (typeof data.balance === 'number') setBalance(data.balance);
    } catch (e) {}
  };

  useEffect(() => {
    if (playerId === '0000') return;
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [playerId]);

  const roundInfo = useMemo(() => {
    const patterns = [
      [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
      [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
      [0,6,12,18,24], [4,8,12,16,20], [0,4,20,24]
    ];

    const cycleDuration = SYNC_CONFIG.SELECTION_DURATION + SYNC_CONFIG.WINNER_ANNOUNCEMENT_DURATION + 300; // simplified base
    let currentTime = Math.max(SYNC_CONFIG.GENESIS_EPOCH, Math.floor(globalTime / 3600) * 3600 - 3600);
    let rId = Math.floor((currentTime - SYNC_CONFIG.GENESIS_EPOCH) / 300);

    while (true) {
      const sequence: number[] = [];
      const available = Array.from({ length: 75 }, (_, i) => i + 1);
      let seed = rId * 987654;
      const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      const tempAvailable = [...available];
      while (tempAvailable.length > 0) sequence.push(tempAvailable.splice(Math.floor(rng() * tempAvailable.length), 1)[0]);

      // Shared participant calculation
      const participantCards = new Map<number, string>();
      networkSelections.forEach(ns => participantCards.set(ns.id, ns.username));
      selectedCards.forEach(id => participantCards.set(id, playerName));

      const ballMap = new Map();
      sequence.forEach((num, idx) => ballMap.set(num, idx));

      let earliestBallIndex = 75;
      let winnerCardId = -1;
      let winningPatternCells: number[] = [];

      participantCards.forEach((uname, cid) => {
        const card = cardGenerator.generateCard(cid);
        patterns.forEach((p) => {
          let maxIdx = 0;
          let possible = true;
          for (const cellIdx of p) {
            const num = card.numbers[cellIdx];
            if (num === 0) continue;
            const bIdx = ballMap.get(num);
            if (bIdx === undefined) { possible = false; break; }
            maxIdx = Math.max(maxIdx, bIdx);
          }
          if (possible && maxIdx < earliestBallIndex) {
            earliestBallIndex = maxIdx;
            winnerCardId = cid;
            winningPatternCells = p;
          }
        });
      });

      const selectionEnd = currentTime + SYNC_CONFIG.SELECTION_DURATION;
      const playDuration = SYNC_CONFIG.READY_DURATION + (earliestBallIndex * SYNC_CONFIG.CALL_INTERVAL);
      const playEnd = selectionEnd + playDuration;
      const winnerEnd = playEnd + SYNC_CONFIG.WINNER_ANNOUNCEMENT_DURATION;

      if (globalTime < winnerEnd) {
        let phase = GamePhase.SELECTION;
        if (globalTime >= playEnd) phase = GamePhase.WINNER;
        else if (globalTime >= selectionEnd) phase = GamePhase.PLAYING;

        return {
          roundId: rId, phase, selectionEnd, playEnd, winnerEnd,
          activeParticipantCount: participantCards.size,
          winnerInfo: { ballIndex: earliestBallIndex, cardId: winnerCardId, sequence, winningPatternCells }
        };
      }
      currentTime = winnerEnd;
      rId++;
    }
  }, [globalTime, selectedCards, networkSelections, playerName]);

  // Polling network selections
  useEffect(() => {
    if (roundInfo.phase !== GamePhase.SELECTION) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/game/participants/${roundInfo.roundId}`);
        const data = await res.json();
        const others = data
          .filter((p: any) => p.playerId !== playerId)
          .map((p: any) => ({ id: p.cardId, username: p.username, playerId: p.playerId }));
        setNetworkSelections(others);
      } catch (e) {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [roundInfo.roundId, roundInfo.phase, playerId]);

  const handleToggleCard = async (id: number) => {
    const newCards = selectedCards.includes(id) 
      ? selectedCards.filter(c => c !== id) 
      : (selectedCards.length < 3 ? [...selectedCards, id] : selectedCards);
    
    setSelectedCards(newCards);
    
    try {
      await fetch(`${API_BASE}/api/game/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, username: playerName, cardIds: newCards, roundId: roundInfo.roundId })
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (roundInfo.phase === GamePhase.PLAYING && selectedCards.length > 0 && !hasDeductedEntry.current[roundInfo.roundId]) {
      hasDeductedEntry.current[roundInfo.roundId] = true;
      fetch(`${API_BASE}/api/game/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, amount: selectedCards.length * SYNC_CONFIG.ENTRY_FEE, roundId: roundInfo.roundId })
      }).then(fetchBalance);
    }
  }, [roundInfo.phase, selectedCards, roundInfo.roundId, playerId]);

  useEffect(() => {
    if (roundInfo.phase === GamePhase.WINNER && selectedCards.includes(roundInfo.winnerInfo.cardId) && !hasCreditedWin.current[roundInfo.roundId]) {
      hasCreditedWin.current[roundInfo.roundId] = true;
      const prize = Math.floor(roundInfo.activeParticipantCount * SYNC_CONFIG.ENTRY_FEE * 0.80);
      fetch(`${API_BASE}/api/game/win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, amount: prize, roundId: roundInfo.roundId })
      }).then(fetchBalance);
    }
  }, [roundInfo.phase, roundInfo.winnerInfo.cardId, selectedCards, roundInfo.roundId, playerId]);

  useEffect(() => {
    if (activeRoundId !== roundInfo.roundId) {
      setSelectedCards([]);
      setNetworkSelections([]);
      setActiveRoundId(roundInfo.roundId);
    }
  }, [roundInfo.roundId, activeRoundId]);

  const winData: PlayerWinData = useMemo(() => {
    const { winnerInfo } = roundInfo;
    const cardId = winnerInfo?.cardId || 0;
    const card = cardGenerator.generateCard(cardId);
    const sequence = winnerInfo?.sequence || [];
    const ballIdx = winnerInfo?.ballIndex || 0;
    const called = sequence.slice(0, ballIdx + 1);
    
    const winnerObj = networkSelections.find(n => n.id === cardId) || { username: playerName, playerId: playerId };

    const cardRes: CardResult = {
      numbers: card.numbers,
      markedNumbers: card.numbers.filter(n => called.includes(n) || n === 0),
      winningCells: winnerInfo?.winningPatternCells || [],
      winningLines: ['BINGO']
    };

    return {
      playerName: winnerObj.username,
      playerId: winnerObj.playerId,
      cardNumbers: [cardId],
      winningLines: { card1: ['BINGO'], card2: [] },
      totalLines: 1,
      gameTime: ballIdx * SYNC_CONFIG.CALL_INTERVAL,
      calledNumbersCount: ballIdx + 1,
      cardData: {
        card1: cardRes,
        card2: { numbers: [], markedNumbers: [], winningCells: [], winningLines: [] }
      }
    };
  }, [roundInfo.winnerInfo, playerId, playerName, networkSelections]);

  if (!hasEntered) return <LobbyPage onStart={() => setHasEntered(true)} />;

  return (
    <div className="min-h-screen bg-[#020617] font-['Rajdhani']">
      {roundInfo.phase === GamePhase.SELECTION && (
        <SelectionPage 
          playerName={playerName} playerId={playerId} balance={balance}
          selectedCards={selectedCards} networkSelections={networkSelections}
          onToggleCard={handleToggleCard}
          onRandomAssign={async () => {
            const available = Array.from({ length: 500 }, (_, i) => i + 1).filter(n => !networkSelections.find(ns => ns.id === n));
            const randoms = available.sort(() => 0.5 - Math.random()).slice(0, 3);
            setSelectedCards(randoms);
            await fetch(`${API_BASE}/api/game/participate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerId, username: playerName, cardIds: randoms, roundId: roundInfo.roundId })
            });
          }}
          onClearSelection={async () => {
            setSelectedCards([]);
            await fetch(`${API_BASE}/api/game/participate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerId, username: playerName, cardIds: [], roundId: roundInfo.roundId })
            });
          }} 
          globalTime={globalTime}
          roundEndTime={roundInfo.selectionEnd} roundId={roundInfo.roundId}
          activeParticipantCount={roundInfo.activeParticipantCount}
        />
      )}
      {roundInfo.phase === GamePhase.PLAYING && (
        <GamePage 
          selectedCards={selectedCards} playerName={playerName} playerId={playerId} balance={balance}
          onWin={() => {}} globalTime={globalTime} roundStartTime={roundInfo.selectionEnd}
          roundId={roundInfo.roundId} activeParticipantCount={roundInfo.activeParticipantCount}
        />
      )}
      {roundInfo.phase === GamePhase.WINNER && (
        <WinnerPage 
          data={winData} currentPlayerId={playerId} userDidParticipate={selectedCards.length > 0} 
          onRestart={() => {}}
        />
      )}
    </div>
  );
};

export default App;
