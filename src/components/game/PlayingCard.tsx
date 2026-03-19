import { motion } from 'framer-motion';
import { Card } from '@/types/game';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-destructive',
  diamonds: 'text-destructive',
  clubs: 'text-foreground',
  spades: 'text-foreground',
};

interface Props {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
}

export default function PlayingCard({ card, onClick, disabled, selected, faceDown, small }: Props) {
  const w = small ? 'w-12 h-18' : 'w-16 h-24 md:w-20 md:h-30';

  if (faceDown) {
    return (
      <div className={`${w} rounded-lg bg-primary/20 border-2 border-primary/40 flex items-center justify-center`}>
        <span className="text-primary text-xl">?</span>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={!disabled ? { y: -8 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`${w} rounded-lg bg-foreground border-2 flex flex-col items-center justify-center cursor-pointer select-none transition-all ${
        selected ? 'ring-2 ring-primary -translate-y-2' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`text-xs font-bold ${SUIT_COLORS[card.suit]}`}>
        {card.rank}
      </span>
      <span className={`text-lg ${SUIT_COLORS[card.suit]}`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </motion.button>
  );
}
