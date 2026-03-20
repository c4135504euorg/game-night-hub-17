import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { Card, createDeck, shuffleDeck, Suit, SUITS } from '@/types/game';
import PlayingCard, { sortHand } from './PlayingCard';
import { Button } from '@/components/ui/button';

interface GameState {
  hands: Card[][];
  discardPile: Card[];
  drawPile: Card[];
  currentPlayer: number;
  direction: 1 | -1;
  drawCount: number;
  choosingSuit: boolean;
  winner: number | null;
}

function canPlay(card: Card, topCard: Card, chosenSuit: Suit | null): boolean {
  if (card.rank === '8') return true;
  if (chosenSuit) return card.suit === chosenSuit;
  return card.suit === topCard.suit || card.rank === topCard.rank;
}

export default function CrazyEights() {
  const { session, resetToLobby } = useGame();
  const playerCount = session?.players.length ?? 2;

  const [state, setState] = useState<GameState | null>(null);
  const [chosenSuit, setChosenSuit] = useState<Suit | null>(null);
  const [message, setMessage] = useState('');

  const initGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const hands: Card[][] = [];
    let idx = 0;
    const cardsPerPlayer = playerCount <= 2 ? 7 : 5;
    for (let i = 0; i < playerCount; i++) {
      hands.push(deck.slice(idx, idx + cardsPerPlayer));
      idx += cardsPerPlayer;
    }
    // Find a non-8 starting card
    let startIdx = idx;
    while (deck[startIdx]?.rank === '8' && startIdx < deck.length - 1) startIdx++;
    const startCard = deck[startIdx];
    const remaining = deck.filter((_, i) => i < idx || i > startIdx ? false : i !== startIdx).length;
    const drawPile = [...deck.slice(idx, startIdx), ...deck.slice(startIdx + 1)];

    setState({
      hands,
      discardPile: [startCard],
      drawPile,
      currentPlayer: 0,
      direction: 1,
      drawCount: 0,
      choosingSuit: false,
      winner: null,
    });
    setChosenSuit(null);
    setMessage(`${session?.players[0]?.name}'s turn`);
  }, [playerCount, session]);

  useEffect(() => { initGame(); }, [initGame]);

  const playCard = useCallback((cardIndex: number) => {
    setState(prev => {
      if (!prev || prev.winner !== null) return prev;
      const hand = [...prev.hands[prev.currentPlayer]];
      const card = hand[cardIndex];
      const topCard = prev.discardPile[prev.discardPile.length - 1];
      
      if (!canPlay(card, topCard, chosenSuit)) return prev;

      hand.splice(cardIndex, 1);
      const newHands = [...prev.hands];
      newHands[prev.currentPlayer] = hand;
      const newDiscard = [...prev.discardPile, card];

      if (hand.length === 0) {
        setMessage(`${session?.players[prev.currentPlayer]?.name} wins! 🎉`);
        return { ...prev, hands: newHands, discardPile: newDiscard, winner: prev.currentPlayer };
      }

      // Wild 8
      if (card.rank === '8') {
        setChosenSuit(null);
        return { ...prev, hands: newHands, discardPile: newDiscard, choosingSuit: true };
      }

      let next = prev.currentPlayer;
      let dir = prev.direction;
      let drawCount = 0;

      // Ace reverses
      if (card.rank === 'A') dir = (dir * -1) as 1 | -1;
      
      // Queen skips
      const skip = card.rank === 'Q' ? 2 : 1;
      next = ((next + dir * skip) % playerCount + playerCount) % playerCount;
      
      // 2 draws
      if (card.rank === '2') drawCount = 2;

      setChosenSuit(null);
      setMessage(`${session?.players[next]?.name}'s turn${drawCount ? ' (must draw 2)' : ''}`);
      return { ...prev, hands: newHands, discardPile: newDiscard, currentPlayer: next, direction: dir, drawCount, choosingSuit: false };
    });
  }, [chosenSuit, playerCount, session]);

  const chooseSuitAction = useCallback((suit: Suit) => {
    setChosenSuit(suit);
    setState(prev => {
      if (!prev) return prev;
      const next = ((prev.currentPlayer + prev.direction) % playerCount + playerCount) % playerCount;
      setMessage(`${session?.players[next]?.name}'s turn (suit: ${suit})`);
      return { ...prev, currentPlayer: next, choosingSuit: false };
    });
  }, [playerCount, session]);

  const drawCard = useCallback(() => {
    setState(prev => {
      if (!prev || prev.winner !== null) return prev;
      if (prev.drawPile.length === 0) return prev;

      const count = Math.max(prev.drawCount, 1);
      const drawn = prev.drawPile.slice(0, count);
      const newDraw = prev.drawPile.slice(count);
      const newHands = [...prev.hands];
      newHands[prev.currentPlayer] = [...newHands[prev.currentPlayer], ...drawn];

      const next = ((prev.currentPlayer + prev.direction) % playerCount + playerCount) % playerCount;
      setMessage(`${session?.players[next]?.name}'s turn`);
      setChosenSuit(null);
      return { ...prev, hands: newHands, drawPile: newDraw, currentPlayer: next, drawCount: 0 };
    });
  }, [playerCount, session]);

  if (!state || !session) return null;

  const topCard = state.discardPile[state.discardPile.length - 1];
  const currentHand = state.hands[state.currentPlayer] ?? [];
  const currentName = session.players[state.currentPlayer]?.name ?? 'Player';

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={resetToLobby}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
        </Button>
        <h2 className="font-display font-bold text-foreground">Crazy Eights</h2>
        <Button variant="ghost" size="sm" onClick={initGame}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status */}
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 text-lg font-semibold text-primary"
      >
        {message}
      </motion.div>

      {/* Other players' hand counts */}
      <div className="flex justify-center gap-4 mb-4">
        {state.hands.map((hand, i) => {
          if (i === state.currentPlayer) return null;
          const p = session.players[i];
          return (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 rounded-full bg-player-${p?.color ?? 1} mx-auto flex items-center justify-center text-xs font-bold text-primary-foreground`}>
                {hand.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p?.name}</p>
            </div>
          );
        })}
      </div>

      {/* Table center */}
      <div className="flex-1 flex items-center justify-center gap-6">
        {/* Draw pile */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={drawCard}
          disabled={state.winner !== null}
          className="w-20 h-30 rounded-lg bg-primary/20 border-2 border-primary/40 flex flex-col items-center justify-center"
        >
          <span className="text-primary text-2xl">🂠</span>
          <span className="text-xs text-muted-foreground mt-1">{state.drawPile.length}</span>
        </motion.button>

        {/* Discard */}
        <div className="relative">
          <PlayingCard card={topCard} disabled />
          {chosenSuit && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
              {chosenSuit}
            </div>
          )}
        </div>
      </div>

      {/* Suit chooser */}
      <AnimatePresence>
        {state.choosingSuit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex justify-center gap-3 mb-4"
          >
            {SUITS.map(suit => (
              <Button
                key={suit}
                variant="outline"
                onClick={() => chooseSuitAction(suit)}
                className="text-lg"
              >
                {suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'} {suit}
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current player hand */}
      <div className="mt-4">
        <p className="text-sm text-muted-foreground text-center mb-2">
          {currentName}'s Hand ({currentHand.length} cards)
        </p>
        <div className="flex flex-wrap justify-center gap-1 md:gap-2 max-w-full overflow-x-auto pb-2">
          {currentHand.map((card, i) => (
            <PlayingCard
              key={`${card.rank}-${card.suit}-${i}`}
              card={card}
              onClick={() => playCard(i)}
              disabled={state.winner !== null || state.choosingSuit || !canPlay(card, topCard, chosenSuit)}
              small={currentHand.length > 10}
            />
          ))}
        </div>
      </div>

      {state.winner !== null && (
        <div className="text-center mt-4">
          <Button onClick={initGame} className="font-display">Play Again</Button>
        </div>
      )}
    </div>
  );
}
