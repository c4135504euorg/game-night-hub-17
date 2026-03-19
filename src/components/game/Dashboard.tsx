import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Plus, Users, Wifi } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Dashboard() {
  const { createSession } = useGame();
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (name.trim()) createSession(name.trim());
  };

  return (
    <div className="min-h-screen game-grid-bg flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-3 mb-4">
          <Gamepad2 className="w-10 h-10 text-primary" />
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-wider text-foreground">
            GAME HUB
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">Local Multiplayer • Pass & Play</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-xl p-8 glow-primary">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-semibold text-foreground">Create Session</h2>
          </div>
          
          <div className="space-y-4">
            <Input
              placeholder="Your name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 text-lg"
            />
            <Button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full h-12 text-lg font-display font-semibold"
            >
              <Users className="w-5 h-5 mr-2" />
              Start Session
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Wifi className="w-4 h-4" />
              <span>Ready for future LAN/Socket.io integration</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
