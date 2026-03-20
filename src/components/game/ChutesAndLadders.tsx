import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import Dice from './Dice';
import { Button } from '@/components/ui/button';

// Reduced set of chutes and ladders
const CHUTES: Record<number, number> = {
  16: 6, 49: 11, 62: 19, 87: 24, 95: 75,
};
const LADDERS: Record<number, number> = {
  4: 14, 9: 31, 28: 84, 51: 67, 80: 100,
};

const PLAYER_BG = ['bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4'];
const PLAYER_COLORS_CSS = [
  'hsl(160, 80%, 45%)',
  'hsl(280, 70%, 60%)',
  'hsl(35, 90%, 55%)',
  'hsl(350, 75%, 58%)',
  'hsl(200, 70%, 50%)',
  'hsl(320, 60%, 55%)',
  'hsl(60, 80%, 45%)',
  'hsl(100, 60%, 45%)',
];

function squareToRowCol(num: number): { row: number; col: number } {
  const fromBottom = num - 1;
  const row = 9 - Math.floor(fromBottom / 10);
  const colInRow = fromBottom % 10;
  const isEvenRowFromBottom = Math.floor(fromBottom / 10) % 2 === 0;
  const col = isEvenRowFromBottom ? colInRow : 9 - colInRow;
  return { row, col };
}

function squareCenter(num: number): { x: number; y: number } {
  const { row, col } = squareToRowCol(num);
  return { x: (col + 0.5) * 10, y: (row + 0.5) * 10 };
}

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

      const currentPos = positions[currentPlayer];
      let target = currentPos + value;

      if (target > 100) {
        const next = (currentPlayer + 1) % playerCount;
        setMessage(`${session?.players[currentPlayer]?.name} rolled ${value} — too high! ${session?.players[next]?.name}'s turn`);
        setCurrentPlayer(next);
        return;
      }

      let finalTarget = target;
      let msg = `${session?.players[currentPlayer]?.name} rolled ${value} → square ${target}`;

      if (LADDERS[target]) {
        msg += ` 🪜 Ladder to ${LADDERS[target]}!`;
        finalTarget = LADDERS[target];
      } else if (CHUTES[target]) {
        msg += ` 🐍 Chute to ${CHUTES[target]}!`;
        finalTarget = CHUTES[target];
      }

      if (finalTarget === 100) {
        setPositions(prev => {
          const np = [...prev];
          np[currentPlayer] = 100;
          return np;
        });
        setWinner(currentPlayer);
        setMessage(`${session?.players[currentPlayer]?.name} wins! 🎉`);
        return;
      }

      setMessage(msg);
      setPositions(prev => {
        const np = [...prev];
        np[currentPlayer] = finalTarget;
        return np;
      });
      const next = (currentPlayer + 1) % playerCount;
      setCurrentPlayer(next);
    }, 600);
  }, [rolling, winner, currentPlayer, playerCount, session, positions]);

  const reset = () => {
    setPositions(Array(playerCount).fill(0));
    setCurrentPlayer(0);
    setDiceValue(1);
    setWinner(null);
    setMessage(`${session?.players[0]?.name}'s turn — Roll the dice!`);
  };

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

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-lg aspect-square">
          {/* SVG overlay for chutes and ladders */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          >
            {/* Ladders - thin green lines */}
            {Object.entries(LADDERS).map(([fromStr, to]) => {
              const from = Number(fromStr);
              const start = squareCenter(from);
              const end = squareCenter(to);
              return (
                <g key={`ladder-${from}`}>
                  <line
                    x1={start.x - 0.8} y1={start.y} x2={end.x - 0.8} y2={end.y}
                    stroke="hsl(140, 70%, 42%)" strokeWidth="0.5" opacity="0.9"
                  />
                  <line
                    x1={start.x + 0.8} y1={start.y} x2={end.x + 0.8} y2={end.y}
                    stroke="hsl(140, 70%, 42%)" strokeWidth="0.5" opacity="0.9"
                  />
                  {Array.from({ length: 3 }).map((_, i) => {
                    const t = (i + 1) / 4;
                    const rx = start.x + (end.x - start.x) * t;
                    const ry = start.y + (end.y - start.y) * t;
                    return (
                      <line key={i}
                        x1={rx - 0.8} y1={ry} x2={rx + 0.8} y2={ry}
                        stroke="hsl(140, 70%, 50%)" strokeWidth="0.35" opacity="0.8"
                      />
                    );
                  })}
                  <circle cx={start.x} cy={start.y} r="1" fill="hsl(140, 70%, 45%)" />
                  <circle cx={end.x} cy={end.y} r="1" fill="hsl(140, 70%, 60%)" />
                </g>
              );
            })}
            {/* Snakes - thin red curves */}
            {Object.entries(CHUTES).map(([fromStr, to]) => {
              const from = Number(fromStr);
              const start = squareCenter(from);
              const end = squareCenter(to);
              const midX = (start.x + end.x) / 2 + (from % 2 === 0 ? 4 : -4);
              const midY = (start.y + end.y) / 2;
              return (
                <g key={`chute-${from}`}>
                  <path
                    d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                    stroke="hsl(0, 72%, 50%)" strokeWidth="0.6" fill="none" opacity="0.9"
                    strokeLinecap="round"
                  />
                  <circle cx={start.x} cy={start.y} r="1.2" fill="hsl(0, 72%, 45%)" />
                  <circle cx={end.x} cy={end.y} r="0.8" fill="hsl(0, 72%, 55%)" />
                </g>
              );
            })}
          </svg>

          {/* Grid */}
          <div className="grid grid-cols-10 gap-0.5 w-full h-full">
            {squares.map((num) => {
              const isLadderStart = LADDERS[num] !== undefined;
              const isChuteStart = CHUTES[num] !== undefined;
              const playersHere = positions.map((_, i) => i).filter(i => positions[i] === num && num > 0);

              return (
                <div
                  key={num}
                  className={`relative flex items-center justify-center text-[8px] md:text-xs rounded-sm border border-border ${
                    isLadderStart ? 'bg-primary/20 border-primary/30'
                    : isChuteStart ? 'bg-destructive/20 border-destructive/30'
                    : 'bg-secondary'
                  }`}
                >
                  <span className="text-muted-foreground font-mono">{num}</span>
                  {isLadderStart && <span className="absolute top-0 left-0 text-[6px] md:text-[8px]">🪜</span>}
                  {isChuteStart && <span className="absolute top-0 left-0 text-[6px] md:text-[8px]">🐍</span>}
                  {/* Show all players on this square */}
                  {playersHere.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center gap-0.5 z-20 flex-wrap">
                      {playersHere.map(pi => (
                        <div
                          key={pi}
                          className="w-2 h-2 md:w-3 md:h-3 rounded-full border border-background shadow-md"
                          style={{ backgroundColor: PLAYER_COLORS_CSS[pi % PLAYER_COLORS_CSS.length] }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mt-4 pb-4">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {session?.players.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-1 px-2 py-1 rounded ${i === currentPlayer ? 'bg-secondary ring-1 ring-primary' : ''}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS_CSS[i % PLAYER_COLORS_CSS.length] }} />
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
