import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import Dice from './Dice';
import { Button } from '@/components/ui/button';

const PLAYER_COLORS_CSS = [
  'hsl(220, 75%, 55%)',   // Blue
  'hsl(0, 72%, 55%)',     // Red
  'hsl(50, 90%, 50%)',    // Yellow
  'hsl(140, 70%, 42%)',   // Green
];
const PLAYER_BG = ['bg-blue-500', 'bg-red-500', 'bg-yellow-400', 'bg-green-500'];
const PLAYER_LABELS = ['Blue', 'Red', 'Yellow', 'Green'];
const PLAYER_BG_LIGHT = [
  'hsl(220, 75%, 85%)',
  'hsl(0, 72%, 85%)',
  'hsl(50, 90%, 85%)',
  'hsl(140, 70%, 82%)',
];

const TRACK_LENGTH = 52;
const HOME_STRETCH = 6;
const START_POSITIONS = [0, 13, 26, 39];

interface Piece {
  state: 'yard' | 'track' | 'home-stretch' | 'home';
  trackPos: number;
}

interface LudoState {
  pieces: Piece[][];
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

// Board layout: 15x15 grid
// The cross-shaped path and home bases
type CellType = 'empty' | 'path' | 'home-base' | 'home-stretch' | 'home-center' | 'start' | 'safe';

interface Cell {
  type: CellType;
  player?: number; // for home-base, home-stretch, start
  trackIndex?: number; // for path cells
  homeStretchIndex?: number; // for home-stretch cells
}

function buildBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: 15 }, () =>
    Array.from({ length: 15 }, () => ({ type: 'empty' as CellType }))
  );

  // Track positions mapped to grid coordinates (clockwise from top-left)
  // The track goes around the cross shape
  const trackCoords: [number, number][] = [
    // Top column going down (left side) - cols 6, rows 0-5
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    // Top-right going right - row 6, cols 0-5
    // Wait, let me think about standard Ludo layout
    // Standard: the cross has 4 arms, each 3 wide, 6 long
  ];

  // Let me use a simpler approach - define the path explicitly
  // The outer track in a standard 15x15 Ludo board:
  const pathCells: [number, number, number][] = []; // [row, col, trackIndex]

  // Going clockwise starting from blue's entry (top of left arm)
  // Left arm top row, going right: row 6, cols 0-5
  const path: [number, number][] = [
    // Blue start area - going up from row 6
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    // Going up
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    // Top right turn
    [0, 7], [0, 8],
    // Going down on right side
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    // Right arm
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    // Bottom right turn
    [7, 14], [8, 14],
    // Going left on bottom
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    // Going down
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    // Bottom left turn
    [14, 7], [14, 6],
    // Going up on left
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    // Left arm bottom
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    // Top left turn
    [7, 0], [6, 0],
  ];

  // Mark path cells
  path.forEach(([r, c], i) => {
    board[r][c] = { type: 'path', trackIndex: i };
  });

  // Mark start positions
  const startCells: [number, number, number][] = [
    [6, 1, 0],   // Blue start (track 0)
    [1, 8, 13],   // Red start (track 13)
    [8, 13, 26],  // Yellow start (track 26)
    [13, 6, 39],  // Green start (track 39)
  ];

  startCells.forEach(([r, c, pi]) => {
    const playerIdx = START_POSITIONS.indexOf(pi);
    board[r][c] = { type: 'start', player: playerIdx, trackIndex: pi };
  });

  // Home stretches (6 cells each, leading to center)
  const homeStretches: [number, number, number, number][][] = [
    // Blue: row 7, cols 1-6
    [[7, 1, 0, 0], [7, 2, 0, 1], [7, 3, 0, 2], [7, 4, 0, 3], [7, 5, 0, 4], [7, 6, 0, 5]],
    // Red: rows 1-6, col 7
    [[1, 7, 1, 0], [2, 7, 1, 1], [3, 7, 1, 2], [4, 7, 1, 3], [5, 7, 1, 4], [6, 7, 1, 5]],
    // Yellow: row 7, cols 13-8
    [[7, 13, 2, 0], [7, 12, 2, 1], [7, 11, 2, 2], [7, 10, 2, 3], [7, 9, 2, 4], [7, 8, 2, 5]],
    // Green: rows 13-8, col 7
    [[13, 7, 3, 0], [12, 7, 3, 1], [11, 7, 3, 2], [10, 7, 3, 3], [9, 7, 3, 4], [8, 7, 3, 5]],
  ];

  homeStretches.forEach(stretch => {
    stretch.forEach(([r, c, pi, hi]) => {
      board[r][c] = { type: 'home-stretch', player: pi, homeStretchIndex: hi };
    });
  });

  // Center home
  board[7][7] = { type: 'home-center' };

  // Home bases (yards) - 2x2 corners with padding
  // Blue: top-left
  for (let r = 1; r < 5; r++) for (let c = 1; c < 5; c++) {
    if (board[r][c].type === 'empty') board[r][c] = { type: 'home-base', player: 0 };
  }
  // Red: top-right
  for (let r = 1; r < 5; r++) for (let c = 10; c < 14; c++) {
    if (board[r][c].type === 'empty') board[r][c] = { type: 'home-base', player: 1 };
  }
  // Yellow: bottom-right
  for (let r = 10; r < 14; r++) for (let c = 10; c < 14; c++) {
    if (board[r][c].type === 'empty') board[r][c] = { type: 'home-base', player: 2 };
  }
  // Green: bottom-left
  for (let r = 10; r < 14; r++) for (let c = 1; c < 5; c++) {
    if (board[r][c].type === 'empty') board[r][c] = { type: 'home-base', player: 3 };
  }

  return board;
}

const BOARD = buildBoard();

// Map track position to grid coords
function getTrackCoords(trackPos: number): [number, number] | null {
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = BOARD[r][c];
      if ((cell.type === 'path' || cell.type === 'start') && cell.trackIndex === trackPos) {
        return [r, c];
      }
    }
  }
  return null;
}

function getHomeStretchCoords(player: number, hsIndex: number): [number, number] | null {
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = BOARD[r][c];
      if (cell.type === 'home-stretch' && cell.player === player && cell.homeStretchIndex === hsIndex) {
        return [r, c];
      }
    }
  }
  return null;
}

// Yard positions within home base
const YARD_POSITIONS: Record<number, [number, number][]> = {
  0: [[2, 2], [2, 3], [3, 2], [3, 3]],       // Blue top-left
  1: [[2, 11], [2, 12], [3, 11], [3, 12]],    // Red top-right
  2: [[11, 11], [11, 12], [12, 11], [12, 12]], // Yellow bottom-right
  3: [[11, 2], [11, 3], [12, 2], [12, 3]],     // Green bottom-left
};

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
        newPieces[cp][pieceIdx] = { state: 'track', trackPos: START_POSITIONS[cp] };
      } else if (piece.state === 'track') {
        let newPos = (piece.trackPos + value) % TRACK_LENGTH;
        const startPos = START_POSITIONS[cp];
        const stepsFromStart = (piece.trackPos - startPos + TRACK_LENGTH) % TRACK_LENGTH;
        const newSteps = stepsFromStart + value;

        if (newSteps >= TRACK_LENGTH - 1 && newSteps < TRACK_LENGTH - 1 + HOME_STRETCH) {
          const homePos = newSteps - (TRACK_LENGTH - 1);
          newPieces[cp][pieceIdx] = { state: 'home-stretch', trackPos: homePos };
        } else if (newSteps === TRACK_LENGTH - 1 + HOME_STRETCH) {
          newPieces[cp][pieceIdx] = { state: 'home', trackPos: 0 };
        } else if (newSteps > TRACK_LENGTH - 1 + HOME_STRETCH) {
          return prev;
        } else {
          newPieces[cp][pieceIdx] = { state: 'track', trackPos: newPos };
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
          return prev;
        }
      }

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

  // Collect all piece positions for rendering on the board
  const piecePositions: { row: number; col: number; player: number; pieceIdx: number }[] = [];

  state.pieces.forEach((playerPieces, pi) => {
    let yardCount = 0;
    playerPieces.forEach((piece, idx) => {
      if (piece.state === 'yard') {
        const yardPos = YARD_POSITIONS[pi]?.[yardCount];
        if (yardPos) {
          piecePositions.push({ row: yardPos[0], col: yardPos[1], player: pi, pieceIdx: idx });
        }
        yardCount++;
      } else if (piece.state === 'track') {
        const coords = getTrackCoords(piece.trackPos);
        if (coords) {
          piecePositions.push({ row: coords[0], col: coords[1], player: pi, pieceIdx: idx });
        }
      } else if (piece.state === 'home-stretch') {
        const coords = getHomeStretchCoords(pi, piece.trackPos);
        if (coords) {
          piecePositions.push({ row: coords[0], col: coords[1], player: pi, pieceIdx: idx });
        }
      } else if (piece.state === 'home') {
        // Show in center area
        piecePositions.push({ row: 7, col: 7, player: pi, pieceIdx: idx });
      }
    });
  });

  return (
    <div className="min-h-screen bg-background p-2 md:p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={resetToLobby}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <h2 className="font-display font-bold text-foreground">Ludo</h2>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <motion.p key={message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-semibold text-primary mb-2">
        {message}
      </motion.p>

      {/* Cross-shaped Board */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md aspect-square relative">
          <div className="grid grid-rows-[repeat(15,1fr)] grid-cols-[repeat(15,1fr)] w-full h-full gap-[1px] bg-border rounded-lg overflow-hidden">
            {BOARD.map((row, r) =>
              row.map((cell, c) => {
                const piecesHere = piecePositions.filter(p => p.row === r && p.col === c);
                const isCurrentPlayerPiece = piecesHere.some(p => p.player === cp);

                let bgColor = 'bg-background';
                let borderStyle = '';

                if (cell.type === 'home-base') {
                  bgColor = '';
                  borderStyle = `background-color: ${PLAYER_BG_LIGHT[cell.player ?? 0]}`;
                } else if (cell.type === 'path') {
                  bgColor = 'bg-card';
                } else if (cell.type === 'start') {
                  bgColor = '';
                  borderStyle = `background-color: ${PLAYER_COLORS_CSS[cell.player ?? 0]}`;
                } else if (cell.type === 'home-stretch') {
                  bgColor = '';
                  borderStyle = `background-color: ${PLAYER_COLORS_CSS[cell.player ?? 0]}; opacity: 0.6`;
                } else if (cell.type === 'home-center') {
                  bgColor = 'bg-card';
                } else {
                  bgColor = 'bg-background';
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative flex items-center justify-center ${bgColor} ${cell.type === 'empty' ? '' : 'border-border'}`}
                    style={borderStyle ? { ...Object.fromEntries(borderStyle.split(';').filter(Boolean).map(s => {
                      const [k, v] = s.split(':').map(x => x.trim());
                      return [k.replace(/-([a-z])/g, (_, l) => l.toUpperCase()), v];
                    })) } : undefined}
                  >
                    {cell.type === 'start' && (
                      <span className="text-[6px] md:text-[8px] font-bold text-primary-foreground">★</span>
                    )}
                    {cell.type === 'home-center' && (
                      <span className="text-[5px] md:text-[7px] font-bold text-foreground">🏠</span>
                    )}
                    {/* Render pieces */}
                    {piecesHere.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        {piecesHere.map((p, i) => (
                          <motion.button
                            key={`${p.player}-${p.pieceIdx}`}
                            layout
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={() => p.player === cp && state.rolled ? movePiece(p.pieceIdx) : undefined}
                            className={`w-3 h-3 md:w-4 md:h-4 rounded-full border border-background shadow-md ${
                              p.player === cp && state.rolled ? 'cursor-pointer ring-1 ring-foreground animate-pulse' : 'cursor-default'
                            }`}
                            style={{ backgroundColor: PLAYER_COLORS_CSS[p.player], marginLeft: i > 0 ? '-2px' : '0' }}
                            disabled={p.player !== cp || !state.rolled}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Player info + Dice */}
      <div className="flex items-center justify-center gap-4 mt-3 pb-4 flex-wrap">
        {session.players.map((p, i) => (
          <div key={p.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${i === cp ? 'ring-1 ring-primary bg-secondary' : ''}`}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS_CSS[i] }} />
            <span className="text-foreground">{p.name}</span>
            <span className="text-muted-foreground">
              ({state.pieces[i].filter(pc => pc.state === 'home').length}/4)
            </span>
          </div>
        ))}
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
