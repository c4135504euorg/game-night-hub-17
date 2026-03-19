import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import Dice from './Dice';
import { Button } from '@/components/ui/button';

const PLAYER_COLORS_CSS = [
  'hsl(160, 80%, 45%)',
  'hsl(280, 70%, 60%)',
  'hsl(35, 90%, 55%)',
  'hsl(350, 75%, 58%)',
];
const PLAYER_BG = ['bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4'];
const PLAYER_LABELS = ['Green', 'Purple', 'Orange', 'Red'];

// Simplified Ludo: Each player has 4 pieces, track is 52 squares
const TRACK_LENGTH = 52;
const HOME_STRETCH = 6; // 6 squares to reach home
const START_POSITIONS = [0, 13, 26, 39]; // Where each player enters the track

interface Piece {
  state: 'yard' | 'track' | 'home-stretch' | 'home';
  trackPos: number; // 0-51 for track, 0-5 for home-stretch
}

interface LudoState {
  pieces: Piece[][]; // [player][piece]
  currentPlayer: number;
  diceValue: number;
  rolled: boolean;
  extraTurn: boolean;
  winner: number | null;
}

function createInitialState(playerCount: number): LudoState {
  return {
    pieces: Array.from({ length: playerCount }, () =>
      Array.from({ length: 4 }, () => ({ state: 'yard' as const, trackPos: 0 }))
    ),
    currentPlayer: 0,
    diceValue: 1,
    rolled: false,
    extraTurn: false,
    winner: null,
  };
}

export default function Ludo() {
  const { session, resetToLobby } = useGame();
  const playerCount = session?.players.length ?? 2;
  const [state, setState] = useState<LudoState>(() => createInitialState(playerCount));
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState(`${session?.players[0]?.name}'s turn — Roll the dice!`);

  const rollDice = useCallback(() => {
    if (rolling || state.rolled || state.winner !== null) return;
    setRolling(true);
    const value = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      setRolling(false);
      const cp = state.currentPlayer;
      const playerPieces = state.pieces[cp];
      
      // Check if any move is possible
      const canMoveAny = playerPieces.some(p => {
        if (p.state === 'home') return false;
        if (p.state === 'yard') return value === 6;
        return true;
      });

      if (!canMoveAny) {
        const next = (cp + 1) % playerCount;
        setMessage(`${session?.players[cp]?.name} rolled ${value} — no moves! ${session?.players[next]?.name}'s turn`);
        setState(prev => ({ ...prev, diceValue: value, currentPlayer: next, rolled: false }));
      } else {
        setMessage(`${session?.players[cp]?.name} rolled ${value} — select a piece to move`);
        setState(prev => ({ ...prev, diceValue: value, rolled: true, extraTurn: value === 6 }));
      }
    }, 500);
  }, [rolling, state, playerCount, session]);

  const movePiece = useCallback((pieceIdx: number) => {
    setState(prev => {
      if (!prev.rolled || prev.winner !== null) return prev;
      const cp = prev.currentPlayer;
      const piece = { ...prev.pieces[cp][pieceIdx] };
      const value = prev.diceValue;

      if (piece.state === 'home') return prev;
      if (piece.state === 'yard' && value !== 6) return prev;

      const newPieces = prev.pieces.map(pp => pp.map(p => ({ ...p })));

      if (piece.state === 'yard' && value === 6) {
        // Enter the track
        newPieces[cp][pieceIdx] = { state: 'track', trackPos: START_POSITIONS[cp] };
      } else if (piece.state === 'track') {
        let newPos = (piece.trackPos + value) % TRACK_LENGTH;
        // Check if entering home stretch
        const startPos = START_POSITIONS[cp];
        const homeEntry = (startPos + TRACK_LENGTH - 1) % TRACK_LENGTH;
        
        // Simple check: count steps from start
        const stepsFromStart = (piece.trackPos - startPos + TRACK_LENGTH) % TRACK_LENGTH;
        const newSteps = stepsFromStart + value;

        if (newSteps >= TRACK_LENGTH - 1 && newSteps < TRACK_LENGTH - 1 + HOME_STRETCH) {
          const homePos = newSteps - (TRACK_LENGTH - 1);
          newPieces[cp][pieceIdx] = { state: 'home-stretch', trackPos: homePos };
        } else if (newSteps === TRACK_LENGTH - 1 + HOME_STRETCH) {
          newPieces[cp][pieceIdx] = { state: 'home', trackPos: 0 };
        } else if (newSteps > TRACK_LENGTH - 1 + HOME_STRETCH) {
          return prev; // Can't overshoot
        } else {
          newPieces[cp][pieceIdx] = { state: 'track', trackPos: newPos };
          // Capture: send opponent pieces back to yard
          for (let op = 0; op < playerCount; op++) {
            if (op === cp) continue;
            for (let oi = 0; oi < newPieces[op].length; oi++) {
              if (newPieces[op][oi].state === 'track' && newPieces[op][oi].trackPos === newPos) {
                newPieces[op][oi] = { state: 'yard', trackPos: 0 };
                setMessage(m => m + ` — Captured ${session?.players[op]?.name}'s piece!`);
              }
            }
          }
        }
      } else if (piece.state === 'home-stretch') {
        const newPos = piece.trackPos + value;
        if (newPos === HOME_STRETCH) {
          newPieces[cp][pieceIdx] = { state: 'home', trackPos: 0 };
        } else if (newPos < HOME_STRETCH) {
          newPieces[cp][pieceIdx] = { state: 'home-stretch', trackPos: newPos };
        } else {
          return prev; // Can't overshoot
        }
      }

      // Check win
      const allHome = newPieces[cp].every(p => p.state === 'home');
      if (allHome) {
        setMessage(`${session?.players[cp]?.name} wins! 🎉`);
        return { ...prev, pieces: newPieces, winner: cp, rolled: false };
      }

      const next = prev.extraTurn ? cp : (cp + 1) % playerCount;
      if (!prev.extraTurn) {
        setMessage(`${session?.players[next]?.name}'s turn — Roll the dice!`);
      } else {
        setMessage(`${session?.players[cp]?.name} rolled a 6 — extra turn!`);
      }

      return { ...prev, pieces: newPieces, currentPlayer: next, rolled: false, extraTurn: false };
    });
  }, [playerCount, session]);

  const reset = () => {
    setState(createInitialState(playerCount));
    setMessage(`${session?.players[0]?.name}'s turn — Roll the dice!`);
  };

  if (!session) return null;

  const cp = state.currentPlayer;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={resetToLobby}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <h2 className="font-display font-bold text-foreground">Ludo</h2>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <motion.p key={message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-semibold text-primary mb-3">
        {message}
      </motion.p>

      {/* Player yards and pieces overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {session.players.map((p, pi) => (
          <div key={p.id} className={`bg-card border rounded-lg p-3 ${pi === cp ? 'border-primary glow-primary' : 'border-border'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded-full ${PLAYER_BG[pi]}`} />
              <span className="text-sm font-semibold text-foreground">{p.name}</span>
            </div>
            <div className="flex gap-1">
              {state.pieces[pi].map((piece, i) => (
                <motion.button
                  key={i}
                  whileHover={pi === cp && state.rolled ? { scale: 1.2 } : undefined}
                  onClick={() => pi === cp && state.rolled ? movePiece(i) : undefined}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    piece.state === 'home' 
                      ? 'bg-muted border-muted-foreground opacity-40' 
                      : `${PLAYER_BG[pi]} border-background`
                  } ${pi === cp && state.rolled && piece.state !== 'home' ? 'cursor-pointer ring-1 ring-primary' : 'cursor-default'}`}
                  disabled={pi !== cp || !state.rolled || piece.state === 'home'}
                >
                  {piece.state === 'yard' ? 'Y' : piece.state === 'home' ? '✓' : piece.state === 'home-stretch' ? `H${piece.trackPos + 1}` : piece.trackPos}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Simplified visual board */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md">
          {/* Track ring visualization */}
          <svg viewBox="0 0 400 400" className="w-full">
            {/* Draw track squares */}
            {Array.from({ length: TRACK_LENGTH }).map((_, i) => {
              const angle = (i / TRACK_LENGTH) * Math.PI * 2 - Math.PI / 2;
              const r = 160;
              const cx = 200 + Math.cos(angle) * r;
              const cy = 200 + Math.sin(angle) * r;
              const isStart = START_POSITIONS.includes(i);
              
              return (
                <g key={i}>
                  <circle
                    cx={cx} cy={cy} r={10}
                    fill={isStart ? PLAYER_COLORS_CSS[START_POSITIONS.indexOf(i)] : 'hsl(220, 15%, 20%)'}
                    stroke="hsl(220, 15%, 30%)"
                    strokeWidth={1}
                    opacity={isStart ? 0.8 : 0.5}
                  />
                  {/* Render pieces on this position */}
                  {state.pieces.flatMap((pp, pi) =>
                    pp.filter(p => p.state === 'track' && p.trackPos === i).map((_, idx) => (
                      <circle
                        key={`${pi}-${idx}`}
                        cx={cx + (idx - 0.5) * 5}
                        cy={cy - 5}
                        r={6}
                        fill={PLAYER_COLORS_CSS[pi]}
                        stroke="hsl(220, 20%, 10%)"
                        strokeWidth={2}
                      />
                    ))
                  )}
                </g>
              );
            })}
            {/* Center home */}
            <circle cx={200} cy={200} r={40} fill="hsl(220, 18%, 13%)" stroke="hsl(160, 80%, 45%)" strokeWidth={2} />
            <text x={200} y={205} textAnchor="middle" fill="hsl(210, 20%, 90%)" fontSize={12} fontFamily="Orbitron">HOME</text>
          </svg>
        </div>
      </div>

      {/* Dice */}
      <div className="flex justify-center mt-4 pb-4">
        <Dice value={state.diceValue} rolling={rolling} onRoll={rollDice} disabled={state.rolled || state.winner !== null} />
      </div>

      {state.winner !== null && (
        <div className="text-center pb-4">
          <Button onClick={reset} className="font-display">Play Again</Button>
        </div>
      )}
    </div>
  );
}
