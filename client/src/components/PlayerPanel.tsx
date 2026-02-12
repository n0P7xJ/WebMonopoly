import { useStore } from '../store';
import { socket } from '../socket';

export function PlayerPanel() {
  const gameState = useStore(s => s.gameState);
  const playerId = useStore(s => s.playerId);
  if (!gameState) return null;

  const isHost = gameState.players[0]?.id === playerId;
  const isWaiting = gameState.phase === 'waiting';

  return (
    <div className="player-panel">
      <div className="panel-header">
        <span className="game-name">{gameState.name}</span>
        <span className="game-id">ID: {gameState.id}</span>
        {isWaiting && isHost && gameState.players.length >= 2 && (
          <button className="btn-primary" onClick={() => socket.emit('start_game')}>Start Game</button>
        )}
        <button className="btn-small btn-danger" onClick={() => { socket.emit('leave_game'); useStore.setState({ screen: 'lobby', gameState: null, gameId: null }); }}>
          Leave
        </button>
      </div>

      <div className="players-row">
        {gameState.players.map((p, i) => {
          const isCurrent = gameState.phase === 'playing' && i === gameState.currentPlayerIndex;
          return (
            <div key={p.id} className={`player-card ${isCurrent ? 'current-player' : ''} ${p.bankrupt ? 'bankrupt' : ''} ${!p.connected ? 'disconnected' : ''}`}>
              <div className="player-color" style={{ backgroundColor: p.color }} />
              <div className="player-info">
                <div className="player-name">
                  {p.name} {p.id === playerId && '(you)'}
                  {isCurrent && ' 👈'}
                </div>
                <div className="player-money">${p.money}</div>
                <div className="player-status">
                  {p.bankrupt && '💀 Bankrupt'}
                  {p.inJail && !p.bankrupt && '🔒 In Jail'}
                  {!p.connected && !p.bankrupt && '📴 Offline'}
                </div>
                <div className="player-props-count">{p.properties.length} properties</div>
                {p.getOutOfJailCards > 0 && <div className="player-cards">🎫 ×{p.getOutOfJailCards}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
