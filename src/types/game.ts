export type GameType = 'court-piece' | 'crazy-eights' | 'chutes-ladders' | 'ludo';

export interface Player {
  id: string;
  name: string;
  color: number; // 1-4
  isHost: boolean;
}

export interface GameSession {
  id: string;
  name: string;
  host: Player;
  players: Player[];
  selectedGame: GameType | null;
  status: 'lobby' | 'playing' | 'finished';
}

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const GAME_INFO: Record<GameType, { name: string; description: string; minPlayers: number; maxPlayers: number | null; icon: string }> = {
  'court-piece': {
    name: 'Court Piece',
    description: 'Classic trick-taking card game for 4 players in partnerships',
    minPlayers: 4,
    maxPlayers: 4,
    icon: '♠',
  },
  'crazy-eights': {
    name: 'Crazy Eights',
    description: 'Match cards by rank or suit — 8s are wild!',
    minPlayers: 2,
    maxPlayers: null,
    icon: '🃏',
  },
  'chutes-ladders': {
    name: 'Chutes & Ladders',
    description: 'Race to square 100 — watch out for chutes!',
    minPlayers: 2,
    maxPlayers: null,
    icon: '🪜',
  },
  'ludo': {
    name: 'Ludo',
    description: 'Roll a 6 to enter, race your pieces home!',
    minPlayers: 2,
    maxPlayers: 4,
    icon: '🎲',
  },
};
