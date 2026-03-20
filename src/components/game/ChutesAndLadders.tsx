import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
const PLAYER_COLORS_CSS = [
  'hsl(160, 80%, 45%)',
  'hsl(280, 70%, 60%)',
  'hsl(35, 90%, 55%)',
  'hsl(350, 75%, 58%)',
];

// Get row/col from square number (1-100)
function squareToRowCol(num: number): { row: number; col: number } {
  const fromBottom = num - 1;
  const row = 9 - Math.floor(fromBottom / 10);
  const colInRow = fromBottom % 10;
  const isEvenRowFromBottom = Math.floor(fromBottom / 10) % 2 === 0;
  const col = isEvenRowFromBottom ? colInRow : 9 - colInRow;
  return { row, col };
}

// Get center position as percentage
function squareCenter(num: number): { x: number; y: number } {
  const { row, col } = squareToRowCol(num);
  return { x: (col + 0.5) * 10, y: (row + 0.5) * 10 };
}

export default function ChutesAndLadders() {
  const { session, resetToLobby } = useGame();
  const playerCount = session?.players.length ?? 2;

  const [positions, setPositions] = useState<number[]>(Array(playerCount).fill(0));
  const [displayPositions, setDisplayPositions] = useState<number[]>(Array(playerCount).fill(0));
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [message, setMessage] = useState(`${session?.players[0]?.name}'s turn — Roll the dice!`);

  // Animate piece movement step by step
  const animateMovement = useCallback((playerIdx: number, from: number, to: number, finalPos: number, onDone: () => void) => {
    setAnimating(true);
    const steps: number[] = [];

    if (to > from) {
      for (let i = from + 1; i <= to; i++) steps.push(i);
    } else {
      for (let i = from - 1; i >= to; i--) steps.push(i);
    }

    // If there's a chute/ladder jump after reaching 'to', add the final position
    if (finalPos !== to) {
      steps.push(finalPos);
    }

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setDisplayPositions(prev => {
          const next = [...prev];
          next[playerIdx] = steps[stepIdx];
          return next;
        });
        stepIdx++;
      } else {
        clearInterval(interval);
        setAnimating(false);
        onDone();
      }
    }, 200);
  }, []);

  const rollDice = useCallback(() => {
    if (rolling || winner !== null || animating) return;
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
        setMessage(msg);
        animateMovement(currentPlayer, currentPos, target, finalTarget, () => {
          setPositions(prev => {
            const np = [...prev];
            np[currentPlayer] = 100;
            return np;
          });
          setWinner(currentPlayer);
          setMessage(`${session?.players[currentPlayer]?.name} wins! 🎉`);
        });
        return;
      }

      setMessage(msg);
      animateMovement(currentPlayer, currentPos, target, finalTarget, () => {
        setPositions(prev => {
          const np = [...prev];
          np[currentPlayer] = finalTarget;
          return np;
        });
        const next = (currentPlayer + 1) % playerCount;
        setCurrentPlayer(next);
      });
    }, 600);
  }, [rolling, winner, animating, currentPlayer, playerCount, session, positions, animateMovement]);

  const reset = () => {
    setPositions(Array(playerCount).fill(0));
    setDisplayPositions(Array(playerCount).fill(0));
    setCurrentPlayer(0);
    setDiceValue(1);
    setWinner(null);
    setAnimating(false);
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
        <div className="relative w-full max-w-lg aspect-square">
          {/* SVG overlay for chutes and ladders lines */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ overflow: 'visible' }}
          >
            {/* Ladders */}
            {Object.entries(LADDERS).map(([fromStr, to]) => {
              const from = Number(fromStr);
              const start = squareCenter(from);
              const end = squareCenter(to);
              return (
                <g key={`ladder-${from}`}>
                  {/* Ladder rails */}
                  <line
                    x1={start.x - 1.2} y1={start.y} x2={end.x - 1.2} y2={end.y}
                    stroke="hsl(160, 80%, 45%)" strokeWidth="0.8" opacity="0.8"
                  />
                  <line
                    x1={start.x + 1.2} y1={start.y} x2={end.x + 1.2} y2={end.y}
                    stroke="hsl(160, 80%, 45%)" strokeWidth="0.8" opacity="0.8"
                  />
                  {/* Rungs */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const t = (i + 1) / 5;
                    const rx = start.x + (end.x - start.x) * t;
                    const ry = start.y + (end.y - start.y) * t;
                    return (
                      <line key={i}
                        x1={rx - 1.2} y1={ry} x2={rx + 1.2} y2={ry}
                        stroke="hsl(160, 80%, 55%)" strokeWidth="0.5" opacity="0.7"
                      />
                    );
                  })}
                  {/* Start dot */}
                  <circle cx={start.x} cy={start.y} r="1.5" fill="hsl(160, 80%, 50%)" />
                  {/* End arrow dot */}
                  <circle cx={end.x} cy={end.y} r="1.5" fill="hsl(160, 80%, 65%)" />
                  {/* Label */}
                  <text x={start.x} y={start.y + 3.5} textAnchor="middle" fontSize="2.2" fill="hsl(160, 80%, 60%)" fontWeight="bold">↑{to}</text>
                </g>
              );
            })}
            {/* Chutes (Snakes) */}
            {Object.entries(CHUTES).map(([fromStr, to]) => {
              const from = Number(fromStr);
              const start = squareCenter(from);
              const end = squareCenter(to);
              // Create a curved snake path
              const midX = (start.x + end.x) / 2 + (Math.random() > 0.5 ? 3 : -3);
              const midY = (start.y + end.y) / 2;
              return (
                <g key={`chute-${from}`}>
                  <path
                    d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                    stroke="hsl(0, 72%, 55%)" strokeWidth="1.2" fill="none" opacity="0.7"
                    strokeLinecap="round"
                  />
                  {/* Snake head at start */}
                  <circle cx={start.x} cy={start.y} r="1.8" fill="hsl(0, 72%, 50%)" />
                  <text x={start.x} y={start.y - 2} textAnchor="middle" fontSize="3" fill="hsl(0, 72%, 55%)">🐍</text>
                  {/* Snake tail at end */}
                  <circle cx={end.x} cy={end.y} r="1.2" fill="hsl(0, 72%, 45%)" />
                  <text x={end.x} y={end.y + 3.5} textAnchor="middle" fontSize="2.2" fill="hsl(0, 72%, 55%)" fontWeight="bold">↓{to}</text>
                </g>
              );
            })}
          </svg>

          {/* Grid */}
          <div className="grid grid-cols-10 gap-0.5 w-full h-full">
            {squares.map((num) => {
              const isLadderStart = LADDERS[num] !== undefined;
              const isLadderEnd = Object.values(LADDERS).includes(num);
              const isChuteStart = CHUTES[num] !== undefined;
              const isChuteEnd = Object.values(CHUTES).includes(num);
              const playersHere = displayPositions.map((_, i) => i).filter(i => displayPositions[i] === num);

              return (
                <div
                  key={num}
                  className={`relative flex items-center justify-center text-[8px] md:text-xs rounded-sm border border-border ${
                    isLadderStart ? 'bg-primary/25 border-primary/40'
                    : isLadderEnd ? 'bg-primary/10 border-primary/30'
                    : isChuteStart ? 'bg-destructive/25 border-destructive/40'
                    : isChuteEnd ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-secondary'
                  }`}
                >
                  <span className="text-muted-foreground font-mono">{num}</span>
                  {isLadderStart && <span className="absolute top-0 left-0 text-[6px] md:text-[8px]">🪜</span>}
                  {isChuteStart && <span className="absolute top-0 left-0 text-[6px] md:text-[8px]">🐍</span>}
                  {playersHere.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center gap-0.5 z-20">
                      {playersHere.map(pi => (
                        <motion.div
                          key={pi}
                          layout
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full ${PLAYER_BG[pi % PLAYER_BG.length]} border border-background shadow-lg`}
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
              <div className={`w-3 h-3 rounded-full ${PLAYER_BG[i % PLAYER_BG.length]}`} />
              <span className="text-xs text-foreground">{p.name}: {positions[i]}</span>
            </div>
          ))}
        </div>
        <Dice value={diceValue} rolling={rolling} onRoll={rollDice} disabled={winner !== null || animating} />
      </div>

      {winner !== null && (
        <div className="text-center pb-4">
          <Button onClick={reset} className="font-display">Play Again</Button>
        </div>
      )}
    </div>
  );
}
