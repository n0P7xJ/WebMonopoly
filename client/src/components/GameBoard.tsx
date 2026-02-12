import { useStore } from '../store';
import { TILES } from '@shared/board';
import { tileGridPosition } from '@shared/board';
import { COLOR_GROUP_CSS } from '@shared/types';
import type { PropertyTile } from '@shared/types';

export function GameBoard() {
  const gameState = useStore(s => s.gameState);
  const setSelectedTile = useStore(s => s.setSelectedTile);
  if (!gameState) return null;

  return (
    <div className="board">
      {TILES.map((tile, idx) => {
        const pos = tileGridPosition(idx);
        const isCorner = [0, 10, 20, 30].includes(idx);
        const owned = gameState.ownedProperties.find(p => p.tileIndex === idx);
        const playersHere = gameState.players.filter(p => p.position === idx && !p.bankrupt);
        const colorBar = tile.type === 'property' ? COLOR_GROUP_CSS[tile.colorGroup] : undefined;

        return (
          <div
            key={idx}
            className={`tile ${isCorner ? 'tile-corner' : ''} ${owned?.mortgaged ? 'mortgaged' : ''}`}
            style={{ gridRow: pos.row, gridColumn: pos.col }}
            onClick={() => setSelectedTile(idx)}
            title={tile.name}
          >
            {colorBar && <div className="tile-color-bar" style={{ backgroundColor: colorBar }} />}
            <div className="tile-name">{tileName(tile, idx)}</div>
            {tile.type === 'property' || tile.type === 'station' || tile.type === 'utility' ? (
              <div className="tile-price">${(tile as any).price}</div>
            ) : null}
            {owned && !owned.mortgaged && owned.houses > 0 && (
              <div className="tile-houses">
                {owned.houses === 5 ? '🏨' : '🏠'.repeat(owned.houses)}
              </div>
            )}
            {owned && (
              <div className="tile-owner-dot" style={{ backgroundColor: gameState.players.find(p => p.id === owned.ownerId)?.color ?? '#ccc' }} />
            )}
            {playersHere.length > 0 && (
              <div className="tile-players">
                {playersHere.map(p => (
                  <div key={p.id} className="player-token" style={{ backgroundColor: p.color }} title={p.name}>
                    {p.name[0]}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {/* Center area */}
      <div className="board-center" style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}>
        <div className="center-content">
          <h2>WebMonopoly</h2>
          {gameState.lastDice && (
            <div className="dice-display">
              <span className="die">{diceEmoji(gameState.lastDice[0])}</span>
              <span className="die">{diceEmoji(gameState.lastDice[1])}</span>
            </div>
          )}
          {gameState.lastCard && (
            <div className="last-card">
              <div className="card-label">{gameState.lastCard.deck === 'chance' ? '❓ Chance' : '📦 Community Chest'}</div>
              <p>{gameState.lastCard.text}</p>
            </div>
          )}
          {gameState.phase === 'finished' && (
            <div className="winner-banner">
              🏆 {gameState.players.find(p => p.id === gameState.winnerId)?.name ?? '???'} wins!
            </div>
          )}
          {gameState.turnTimeLeft !== null && gameState.turnTimeLeft > 0 && (
            <div className="turn-timer">⏱ {gameState.turnTimeLeft}s</div>
          )}
        </div>
      </div>
    </div>
  );
}

function tileName(tile: any, idx: number): string {
  const names: Record<number, string> = {
    0: 'GO →', 10: 'JAIL', 20: 'FREE\nPARKING', 30: 'GO TO\nJAIL',
  };
  if (names[idx]) return names[idx];
  if (tile.type === 'chance') return '❓';
  if (tile.type === 'chest') return '📦';
  if (tile.type === 'tax') return `TAX\n$${tile.amount}`;
  return tile.name;
}

function diceEmoji(n: number): string {
  return ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][n] || String(n);
}
