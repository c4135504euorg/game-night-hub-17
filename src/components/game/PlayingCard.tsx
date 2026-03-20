import { motion } from 'framer-motion';
import { Card } from '@/types/game';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

function rankToNumber(rank: string): number {
  const map: Record<string, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
  };
  return map[rank] ?? 0;
}

// Pip positions for each count (as [row%, col%] in the card center area)
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 50], [75, 50]],
  3: [[25, 50], [50, 50], [75, 50]],
  4: [[25, 30], [25, 70], [75, 30], [75, 70]],
  5: [[25, 30], [25, 70], [50, 50], [75, 30], [75, 70]],
  6: [[25, 30], [25, 70], [50, 30], [50, 70], [75, 30], [75, 70]],
  7: [[20, 30], [20, 70], [40, 50], [50, 30], [50, 70], [75, 30], [75, 70]],
  8: [[20, 30], [20, 70], [35, 50], [50, 30], [50, 70], [65, 50], [80, 30], [80, 70]],
  9: [[18, 30], [18, 70], [38, 30], [38, 70], [50, 50], [62, 30], [62, 70], [82, 30], [82, 70]],
  10: [[15, 30], [15, 70], [33, 30], [33, 70], [25, 50], [50, 30], [50, 70], [67, 30], [67, 70], [85, 50]],
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

  const num = rankToNumber(card.rank);
  const symbol = SUIT_SYMBOLS[card.suit];
  const colorClass = SUIT_COLORS[card.suit];
  const isFace = num >= 11;
  const faceLabel = num === 11 ? 'J' : num === 12 ? 'Q' : num === 13 ? 'K' : '';
  const pipCount = isFace ? 0 : num;
  const pips = PIP_LAYOUTS[pipCount] ?? [];

  return (
    <motion.button
      whileHover={!disabled ? { y: -8 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`${w} rounded-lg bg-white border-2 border-gray-200 flex flex-col items-start justify-between p-1 cursor-pointer select-none transition-all relative overflow-hidden ${
        selected ? 'ring-2 ring-primary -translate-y-2' : ''
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'}`}
    >
      {/* Top left rank + suit */}
      <div className="flex flex-col items-center leading-none z-10">
        <span className={`text-[9px] md:text-xs font-bold ${colorClass}`}>
          {card.rank}
        </span>
        <span className={`text-[9px] md:text-xs ${colorClass}`}>
          {symbol}
        </span>
      </div>

      {/* Center area with pips or face letter */}
      <div className="absolute inset-0 top-[18%] bottom-[18%] left-[8%] right-[8%]">
        {isFace ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`text-xl md:text-2xl font-bold ${colorClass}`}>{faceLabel}</span>
            <span className={`text-lg md:text-xl ${colorClass} ml-0.5`}>{symbol}</span>
          </div>
        ) : (
          pips.map(([top, left], i) => (
            <span
              key={i}
              className={`absolute text-[8px] md:text-[11px] ${colorClass}`}
              style={{
                top: `${top}%`,
                left: `${left}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {symbol}
            </span>
          ))
        )}
      </div>

      {/* Bottom right rank + suit (inverted) */}
      <div className="flex flex-col items-center leading-none self-end rotate-180 z-10">
        <span className={`text-[9px] md:text-xs font-bold ${colorClass}`}>
          {card.rank}
        </span>
        <span className={`text-[9px] md:text-xs ${colorClass}`}>
          {symbol}
        </span>
      </div>
    </motion.button>
  );
}

// Sort cards by suit then by rank value
export function sortHand(cards: Card[]): Card[] {
  const SUIT_ORDER: Record<string, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...cards].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a.suit] ?? 0) - (SUIT_ORDER[b.suit] ?? 0);
    if (suitDiff !== 0) return suitDiff;
    return rankToNumber(a.rank) - rankToNumber(b.rank);
  });
}
