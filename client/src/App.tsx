import { useStore } from './store';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { ActionBar } from './components/ActionBar';
import { ChatLog } from './components/ChatLog';
import { PropertyCard } from './components/PropertyCard';
import { TradeDialog } from './components/TradeDialog';
import { AuctionOverlay } from './components/AuctionOverlay';

export default function App() {
  const { screen, error, gameState, selectedTile } = useStore();

  if (screen === 'lobby') return <Lobby />;

  return (
    <div className="game-layout">
      {error && <div className="toast-error">{error}</div>}

      <div className="game-top">
        <PlayerPanel />
      </div>

      <div className="game-middle">
        <div className="board-area">
          <GameBoard />
        </div>
        <div className="sidebar">
          <ActionBar />
          <ChatLog />
        </div>
      </div>

      {selectedTile !== null && <PropertyCard tileIndex={selectedTile} />}
      {gameState?.turnPhase === 'auction' && gameState.auction && <AuctionOverlay />}
      {gameState?.turnPhase === 'trade' && gameState.pendingTrade && <TradeDialog />}
    </div>
  );
}
