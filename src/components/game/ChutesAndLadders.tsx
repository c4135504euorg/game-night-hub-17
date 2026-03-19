import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import Dice from './Dice';
import { Button } from '@/components/ui/button';

const CHUTES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};
const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};

const PLAYER_BG = ['bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4'];

export default function ChutesAndLadders() {
  const { session, resetToLobby } = useGame();
  const playerCount = session?.players.length ?? 2;
  
  const [positions, setPositions] = useState<number[]>(Array(playerCount).fill(0));
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [message, setMessage] = useState(`${session?.players[0]?.name}'s turn — Roll the dice!`);

  const rollDice = useCallback(() => {
    if (rolling || winner !== null) return;
    setRolling(true);
    const value = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      setDiceValue(value);
      setRolling(false);

      setPositions(prev => {
        const newPos = [...prev];
        let target = newPos[currentPlayer] + value;
        
        if (target > 100) {
          const next = (currentPlayer + 1) % playerCount;
          setMessage(`${session?.players[currentPlayer]?.name} rolled ${value} — too high! ${session?.players[next]?.name}'s turn`);
          setCurrentPlayer(next);
          return prev;
        }

        if (target === 100) {
          newPos[currentPlayer] = 100;
          setWinner(currentPlayer);
          setMessage(`${session?.players[currentPlayer]?.name} wins! 🎉`);
          return newPos;
        }

        // Check chutes and ladders
        let msg = `${session?.players[currentPlayer]?.name} rolled ${value} → square ${target}`;
        if (LADDERS[target]) {
          msg += ` 🪜 Ladder to ${LADDERS[target]}!`;
          target = LADDERS[target];
        } else if (CHUTES[target]) {
          msg += ` 🛝 Chute to ${CHUTES[target]}!`;
          target = CHUTES[target];
        }

        if (target === 100) {
          newPos[currentPlayer] = 100;
          setWinner(currentPlayer);
          setMessage(`${session?.players[currentPlayer]?.name} wins! 🎉`);
          return newPos;
        }

        newPos[currentPlayer] = target;
        const next = (currentPlayer + 1) % playerCount;
        setMessage(msg);
        setCurrentPlayer(next);
        return newPos;
      });
    }, 600);
  }, [rolling, winner, currentPlayer, playerCount, session]);

  const reset = () => {
    setPositions(Array(playerCount).fill(0));
    setCurrentPlayer(0);
    setDiceValue(1);
    setWinner(null);
    setMessage(`${session?.players[0]?.name}'s turn — Roll the dice!`);
  };

  // Build 10x10 board (100 down to 1, snake pattern)
  const squares: number[] = [];
  for (let row = 0; row < 10; row++) {
    const rowSquares = [];
    for (let col = 0; col < 10; col++) {
      rowSquares.push(100 - row * 10 + (row % 2 === 0 ? -col : col - 9));
    }
    squares.push(...rowSquares);
  }

  return (
    <div className="min-h-screen bg-background p-2 md:p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={resetToLobby}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <h2 className="font-display font-bold text-foreground text-sm md:text-base">Chutes & Ladders</h2>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <motion.p
        key={message}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-sm md:text-base font-semibold text-primary mb-2"
      >
        {message}
      </motion.p>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-10 gap-0.5 w-full max-w-lg aspect-square">
          {squares.map((num) => {
            const isLadderStart = LADDERS[num] !== undefined;
            const isChuteStart = CHUTES[num] !== undefined;
            const playersHere = positions.map((pos, i) => i).filter(i => positions[i] === num);
            
            return (
              <div
                key={num}
                className={`relative flex items-center justify-center text-[8px] md:text-xs rounded-sm border border-border ${
                  isLadderStart ? 'bg-primary/20' : isChuteStart ? 'bg-destructive/20' : 'bg-secondary'
                }`}
              >
                <span className="text-muted-foreground">{num}</span>
                {isLadderStart && <span className="absolute top-0 right-0 text-[6px]">🪜</span>}
                {isChuteStart && <span className="absolute top-0 right-0 text-[6px]">🛝</span>}
                {playersHere.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                    {playersHere.map(pi => (
                      <motion.div
                        key={pi}
                        layoutId={`piece-${pi}`}
                        className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full ${PLAYER_BG[pi]} border border-background`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mt-4 pb-4">
        <div className="flex items-center gap-3">
          {session?.players.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-1 px-2 py-1 rounded ${i === currentPlayer ? 'bg-secondary ring-1 ring-primary' : ''}`}>
              <div className={`w-3 h-3 rounded-full ${PLAYER_BG[i]}`} />
              <span className="text-xs text-foreground">{p.name}: {positions[i]}</span>
            </div>
          ))}
        </div>
        <Dice value={diceValue} rolling={rolling} onRoll={rollDice} disabled={winner !== null} />
      </div>

      {winner !== null && (
        <div className="text-center pb-4">
          <Button onClick={reset} className="font-display">Play Again</Button>
        </div>
      )}
    </div>
  );
}
