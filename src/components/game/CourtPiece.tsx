import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { Card, createDeck, shuffleDeck, Suit, SUITS } from '@/types/game';
import PlayingCard from './PlayingCard';
import { Button } from '@/components/ui/button';

interface CourtPieceState {
  hands: Card[][];
  trump: Suit | null;
  currentPlayer: number;
  trick: { player: number; card: Card }[];
  trickCount: [number, number]; // team A (0,2) vs team B (1,3)
  leadSuit: Suit | null;
  dealer: number;
  phase: 'choosing-trump' | 'playing' | 'finished';
  winner: string | null;
  message: string;
  sirs: [number, number]; // completed "sirs" (sets of 7 tricks)
}

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function cardValue(card: Card, trump: Suit | null, leadSuit: Suit | null): number {
  const rankVal = RANK_ORDER.indexOf(card.rank);
  if (card.suit === trump) return 100 + rankVal;
  if (card.suit === leadSuit) return 50 + rankVal;
  return rankVal;
}

export default function CourtPiece() {
  const { session, resetToLobby } = useGame();

  const initGame = useCallback((): CourtPieceState => {
    const deck = shuffleDeck(createDeck());
    // Deal 5 cards to each player first (trump choosing phase)
    const hands: Card[][] = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      hands[i] = deck.slice(i * 5, (i + 1) * 5);
    }
    const eldest = 1; // player after dealer
    return {
      hands,
      trump: null,
      currentPlayer: eldest,
      trick: [],
      trickCount: [0, 0],
      leadSuit: null,
      dealer: 0,
      phase: 'choosing-trump',
      winner: null,
      message: `${session?.players[eldest]?.name ?? 'Player 2'} — choose trump suit`,
      sirs: [0, 0],
    };
  }, [session]);

  const [state, setState] = useState<CourtPieceState>(initGame);
  const [fullDeck] = useState(() => shuffleDeck(createDeck()));

  useEffect(() => { setState(initGame()); }, [initGame]);

  const chooseTrump = useCallback((suit: Suit) => {
    setState(prev => {
      // Deal remaining cards
      const deck = shuffleDeck(createDeck());
      const hands: Card[][] = [[], [], [], []];
      for (let i = 0; i < 4; i++) {
        hands[i] = deck.slice(i * 13, (i + 1) * 13);
      }
      return {
        ...prev,
        hands,
        trump: suit,
        phase: 'playing',
        currentPlayer: prev.currentPlayer,
        message: `Trump: ${suit}. ${session?.players[prev.currentPlayer]?.name}'s lead`,
      };
    });
  }, [session]);

  const playCard = useCallback((cardIdx: number) => {
    setState(prev => {
      if (prev.phase !== 'playing' || prev.winner) return prev;
      const cp = prev.currentPlayer;
      const hand = [...prev.hands[cp]];
      const card = hand[cardIdx];

      // Must follow suit if possible
      if (prev.leadSuit && card.suit !== prev.leadSuit) {
        const hasLead = hand.some(c => c.suit === prev.leadSuit);
        if (hasLead) return prev; // Must follow suit
      }

      hand.splice(cardIdx, 1);
      const newHands = [...prev.hands.map(h => [...h])];
      newHands[cp] = hand;

      const newTrick = [...prev.trick, { player: cp, card }];
      const leadSuit = prev.trick.length === 0 ? card.suit : prev.leadSuit;

      // Trick complete
      if (newTrick.length === 4) {
        let winnerIdx = 0;
        let bestVal = -1;
        for (let i = 0; i < 4; i++) {
          const val = cardValue(newTrick[i].card, prev.trump, leadSuit);
          if (val > bestVal) {
            bestVal = val;
            winnerIdx = i;
          }
        }
        const trickWinner = newTrick[winnerIdx].player;
        const team = trickWinner % 2; // 0,2 = team 0; 1,3 = team 1
        const newCount: [number, number] = [...prev.trickCount];
        newCount[team]++;

        let msg = `${session?.players[trickWinner]?.name} wins the trick! (${newCount[0]}-${newCount[1]})`;
        let phase = prev.phase;
        let winnerName = prev.winner;
        const sirs: [number, number] = [...prev.sirs];

        // Check for sir (7 tricks)
        if (newCount[0] >= 7 || newCount[1] >= 7) {
          const winTeam = newCount[0] >= 7 ? 0 : 1;
          sirs[winTeam]++;
          const teamNames = winTeam === 0
            ? `${session?.players[0]?.name} & ${session?.players[2]?.name}`
            : `${session?.players[1]?.name} & ${session?.players[3]?.name}`;
          msg = `${teamNames} win the Sir! 🏆`;
          phase = 'finished';
          winnerName = teamNames;
        }

        // Check if all cards played
        if (newHands.every(h => h.length === 0) && phase !== 'finished') {
          const winTeam = newCount[0] > newCount[1] ? 0 : 1;
          const teamNames = winTeam === 0
            ? `${session?.players[0]?.name} & ${session?.players[2]?.name}`
            : `${session?.players[1]?.name} & ${session?.players[3]?.name}`;
          msg = `${teamNames} win! (${newCount[0]}-${newCount[1]}) 🏆`;
          phase = 'finished';
          winnerName = teamNames;
        }

        return {
          ...prev,
          hands: newHands,
          trick: [],
          trickCount: newCount,
          leadSuit: null,
          currentPlayer: trickWinner,
          phase,
          winner: winnerName,
          message: msg,
          sirs,
        };
      }

      const next = (cp + 1) % 4;
      return {
        ...prev,
        hands: newHands,
        trick: newTrick,
        leadSuit,
        currentPlayer: next,
        message: `${session?.players[next]?.name}'s turn`,
      };
    });
  }, [session]);

  if (!session || session.players.length !== 4) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">Court Piece requires exactly 4 players</p>
          <Button onClick={resetToLobby}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby</Button>
        </div>
      </div>
    );
  }

  const cp = state.currentPlayer;
  const currentHand = state.hands[cp] ?? [];

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={resetToLobby}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <h2 className="font-display font-bold text-foreground">Court Piece</h2>
        <Button variant="ghost" size="sm" onClick={() => setState(initGame())}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <motion.p key={state.message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-semibold text-primary mb-3">
        {state.message}
      </motion.p>

      {/* Trump & Score */}
      <div className="flex justify-center gap-4 mb-3 text-sm">
        {state.trump && (
          <span className="bg-secondary px-3 py-1 rounded text-foreground">
            Trump: {state.trump === 'hearts' ? '♥' : state.trump === 'diamonds' ? '♦' : state.trump === 'clubs' ? '♣' : '♠'} {state.trump}
          </span>
        )}
        <span className="bg-secondary px-3 py-1 rounded text-foreground">
          Tricks: {state.trickCount[0]} - {state.trickCount[1]}
        </span>
      </div>

      {/* Trump choosing */}
      {state.phase === 'choosing-trump' && (
        <div className="flex justify-center gap-3 mb-4">
          {SUITS.map(suit => (
            <Button key={suit} variant="outline" onClick={() => chooseTrump(suit)} className="text-lg">
              {suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'} {suit}
            </Button>
          ))}
        </div>
      )}

      {/* Trick in progress */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-3">
          {state.trick.map((t, i) => (
            <div key={i} className="text-center">
              <PlayingCard card={t.card} disabled />
              <p className="text-xs text-muted-foreground mt-1">{session.players[t.player]?.name}</p>
            </div>
          ))}
          {state.trick.length === 0 && state.phase === 'playing' && (
            <p className="text-muted-foreground">Lead a card</p>
          )}
        </div>
      </div>

      {/* Other players */}
      <div className="flex justify-center gap-4 mb-3">
        {state.hands.map((hand, i) => {
          if (i === cp) return null;
          return (
            <div key={i} className={`text-center px-3 py-1 rounded ${i === cp ? 'bg-primary/20' : 'bg-secondary'}`}>
              <span className="text-xs text-foreground">{session.players[i]?.name}: {hand.length}</span>
            </div>
          );
        })}
      </div>

      {/* Current player hand */}
      <div className="mt-2">
        <p className="text-sm text-muted-foreground text-center mb-2">
          {session.players[cp]?.name}'s Hand
        </p>
        <div className="flex flex-wrap justify-center gap-1 md:gap-2 pb-2">
          {currentHand.map((card, i) => {
            const mustFollowSuit = state.leadSuit && card.suit !== state.leadSuit && currentHand.some(c => c.suit === state.leadSuit);
            return (
              <PlayingCard
                key={`${card.rank}-${card.suit}-${i}`}
                card={card}
                onClick={() => playCard(i)}
                disabled={state.phase !== 'playing' || !!state.winner || !!mustFollowSuit}
                small={currentHand.length > 10}
              />
            );
          })}
        </div>
      </div>

      {state.winner && (
        <div className="text-center pb-4">
          <Button onClick={() => setState(initGame())} className="font-display">Play Again</Button>
        </div>
      )}
    </div>
  );
}
