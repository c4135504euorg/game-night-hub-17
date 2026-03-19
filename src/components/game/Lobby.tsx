import { motion } from 'framer-motion';
import { Crown, UserPlus, Play, ArrowLeft, Bot, Lock } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { GAME_INFO, GameType } from '@/types/game';
import { Button } from '@/components/ui/button';

const PLAYER_COLORS = [
  'bg-player-1', 'bg-player-2', 'bg-player-3', 'bg-player-4',
  'bg-primary', 'bg-accent', 'bg-destructive', 'bg-muted-foreground',
];
const BOT_NAMES = ['Alpha Bot', 'Beta Bot', 'Gamma Bot', 'Delta Bot', 'Epsilon Bot', 'Zeta Bot'];

export default function Lobby() {
  const { session, currentPlayer, selectGame, startGame, leaveSession, addBot } = useGame();
  if (!session || !currentPlayer) return null;

  const isHost = currentPlayer.isHost;
  const playerCount = session.players.length;
  const canStart = session.selectedGame && playerCount >= (GAME_INFO[session.selectedGame]?.minPlayers ?? 2);

  const handleAddBot = () => {
    const existingBots = session.players.filter(p => p.id.startsWith('bot')).length;
    addBot(BOT_NAMES[existingBots] || `Bot ${existingBots + 1}`);
  };

  const isGameDisabled = (info: typeof GAME_INFO[GameType]) => {
    return info.maxPlayers !== null && playerCount > info.maxPlayers;
  };

  return (
    <div className="min-h-screen game-grid-bg flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={leaveSession} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Leave
          </Button>
          <h2 className="text-2xl font-display font-bold text-foreground">{session.name}</h2>
          <div className="w-20" />
        </div>

        {/* Players */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Players ({playerCount})</h3>
            {isHost && (
              <Button size="sm" variant="outline" onClick={handleAddBot}>
                <Bot className="w-4 h-4 mr-1" /> Add Bot
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {session.players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-secondary rounded-lg p-4 text-center relative"
              >
                <div className={`w-10 h-10 rounded-full ${PLAYER_COLORS[i % PLAYER_COLORS.length]} mx-auto mb-2 flex items-center justify-center`}>
                  <span className="text-sm font-bold text-primary-foreground">
                    {p.name[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                {p.isHost && (
                  <Crown className="w-4 h-4 text-player-3 absolute top-2 right-2" />
                )}
                {p.id.startsWith('bot') && (
                  <span className="text-xs text-muted-foreground">BOT</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Game Selection */}
        {isHost && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Select Game</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.entries(GAME_INFO) as [GameType, typeof GAME_INFO[GameType]][]).map(([key, info]) => {
                const disabled = isGameDisabled(info);
                return (
                  <motion.button
                    key={key}
                    whileHover={!disabled ? { scale: 1.02 } : undefined}
                    whileTap={!disabled ? { scale: 0.98 } : undefined}
                    onClick={() => !disabled && selectGame(key)}
                    disabled={disabled}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      disabled
                        ? 'border-border bg-muted opacity-40 cursor-not-allowed'
                        : session.selectedGame === key
                          ? 'border-primary bg-primary/10 glow-primary'
                          : 'border-border bg-secondary hover:border-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{info.name}</p>
                          {disabled && <Lock className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {info.minPlayers}{info.maxPlayers ? `-${info.maxPlayers}` : '+'} players
                          {disabled && ` (max ${info.maxPlayers})`}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Start */}
        {isHost && (
          <Button
            onClick={startGame}
            disabled={!canStart}
            className="w-full h-14 text-lg font-display font-bold animate-pulse-glow"
          >
            <Play className="w-5 h-5 mr-2" /> Start Game
          </Button>
        )}
      </motion.div>
    </div>
  );
}
