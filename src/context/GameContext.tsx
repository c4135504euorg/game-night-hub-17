import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameSession, GameType, Player } from '@/types/game';

interface GameContextType {
  session: GameSession | null;
  currentPlayer: Player | null;
  createSession: (playerName: string) => void;
  joinSession: (sessionId: string, playerName: string) => void;
  addBot: (name: string) => void;
  selectGame: (game: GameType) => void;
  startGame: () => void;
  leaveSession: () => void;
  resetToLobby: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

let nextId = 1;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const createSession = useCallback((playerName: string) => {
    const player: Player = { id: `p${nextId++}`, name: playerName, color: 1, isHost: true };
    const s: GameSession = {
      id: `s${Date.now()}`,
      name: `${playerName}'s Game`,
      host: player,
      players: [player],
      selectedGame: null,
      status: 'lobby',
    };
    setSession(s);
    setCurrentPlayer(player);
  }, []);

  const joinSession = useCallback((_sessionId: string, playerName: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const color = (prev.players.length + 1) as 1 | 2 | 3 | 4;
      const player: Player = { id: `p${nextId++}`, name: playerName, color, isHost: false };
      setCurrentPlayer(player);
      return { ...prev, players: [...prev.players, player] };
    });
  }, []);

  const addBot = useCallback((name: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const color = ((prev.players.length % 4) + 1) as 1 | 2 | 3 | 4;
      const bot: Player = { id: `bot${nextId++}`, name, color, isHost: false };
      const newPlayers = [...prev.players, bot];
      // Auto-deselect game if it can't support this many players
      let selectedGame = prev.selectedGame;
      if (selectedGame) {
        const { GAME_INFO } = require('@/types/game');
        const info = GAME_INFO[selectedGame];
        if (info.maxPlayers !== null && newPlayers.length > info.maxPlayers) {
          selectedGame = null;
        }
      }
      return { ...prev, players: newPlayers, selectedGame };
    });
  }, []);

  const selectGame = useCallback((game: GameType) => {
    setSession(prev => prev ? { ...prev, selectedGame: game } : prev);
  }, []);

  const startGame = useCallback(() => {
    setSession(prev => prev ? { ...prev, status: 'playing' } : prev);
  }, []);

  const leaveSession = useCallback(() => {
    setSession(null);
    setCurrentPlayer(null);
  }, []);

  const resetToLobby = useCallback(() => {
    setSession(prev => prev ? { ...prev, status: 'lobby' } : prev);
  }, []);

  return (
    <GameContext.Provider value={{ session, currentPlayer, createSession, joinSession, addBot, selectGame, startGame, leaveSession, resetToLobby }}>
      {children}
    </GameContext.Provider>
  );
}
