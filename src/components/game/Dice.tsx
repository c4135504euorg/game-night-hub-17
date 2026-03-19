import { useState } from 'react';
import { motion } from 'framer-motion';

const DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

interface Props {
  value: number;
  rolling: boolean;
  onRoll: () => void;
  disabled?: boolean;
}

export default function Dice({ value, rolling, onRoll, disabled }: Props) {
  return (
    <motion.button
      animate={rolling ? { rotate: [0, 180, 360], scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.5 }}
      onClick={onRoll}
      disabled={disabled || rolling}
      className="w-16 h-16 bg-foreground rounded-xl p-2 grid grid-cols-3 grid-rows-3 gap-0.5 cursor-pointer hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasDot = DOTS[value]?.some(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {hasDot && <div className="w-2.5 h-2.5 rounded-full bg-background" />}
          </div>
        );
      })}
    </motion.button>
  );
}
