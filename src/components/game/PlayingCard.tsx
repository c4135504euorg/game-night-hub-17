import { motion } from 'framer-motion';
import { Card } from '@/types/game';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-foreground',
  spades: 'text-foreground',
};

const SUIT_BG: Record<string, string> = {
  hearts: 'text-red-500/20',
  diamonds: 'text-red-500/20',
  clubs: 'text-foreground/20',
  spades: 'text-foreground/20',
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
        <span className="text-primary text-xl">🂠</span>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={!disabled ? { y: -8 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`${w} rounded-lg bg-white border-2 border-gray-200 flex flex-col items-start justify-between p-1.5 cursor-pointer select-none transition-all relative overflow-hidden ${
        selected ? 'ring-2 ring-primary -translate-y-2' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
    >
      {/* Top left rank + suit */}
      <div className="flex flex-col items-center leading-none">
        <span className={`text-xs md:text-sm font-bold ${SUIT_COLORS[card.suit]}`}>
          {card.rank}
        </span>
        <span className={`text-xs md:text-sm ${SUIT_COLORS[card.suit]}`}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
      {/* Center suit large */}
      <span className={`absolute inset-0 flex items-center justify-center text-2xl md:text-3xl ${SUIT_COLORS[card.suit]} opacity-30`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
      {/* Bottom right rank + suit (inverted) */}
      <div className="flex flex-col items-center leading-none self-end rotate-180">
        <span className={`text-xs md:text-sm font-bold ${SUIT_COLORS[card.suit]}`}>
          {card.rank}
        </span>
        <span className={`text-xs md:text-sm ${SUIT_COLORS[card.suit]}`}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
    </motion.button>
  );
}
