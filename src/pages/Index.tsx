import { GameProvider, useGame } from '@/context/GameContext';
import Dashboard from '@/components/game/Dashboard';
import Lobby from '@/components/game/Lobby';
import CrazyEights from '@/components/game/CrazyEights';
import ChutesAndLadders from '@/components/game/ChutesAndLadders';
import Ludo from '@/components/game/Ludo';
import CourtPiece from '@/components/game/CourtPiece';

function GameRouter() {
  const { session } = useGame();

  if (!session) return <Dashboard />;
  if (session.status === 'lobby') return <Lobby />;

  switch (session.selectedGame) {
    case 'crazy-eights': return <CrazyEights />;
    case 'chutes-ladders': return <ChutesAndLadders />;
    case 'ludo': return <Ludo />;
    case 'court-piece': return <CourtPiece />;
    default: return <Lobby />;
  }
}

export default function Index() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
