import { useState } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';
import { TILES } from '@shared/board';

export function ActionBar() {
  const gameState = useStore(s => s.gameState);
  const playerId = useStore(s => s.playerId);
  const [tradeToIdx, setTradeToIdx] = useState(0);
  const [tradeMoney, setTradeMoney] = useState(0);

  if (!gameState || gameState.phase !== 'playing') return null;

  const me = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  const tp = gameState.turnPhase;

  if (!me || me.bankrupt) return <div className="action-bar"><p>You're out of the game.</p></div>;

  const myProperties = gameState.ownedProperties.filter(op => op.ownerId === playerId);

  return (
    <div className="action-bar">
      {isMyTurn && (
        <div className="actions-section">
          <h4>Your Turn</h4>
          {tp === 'pre_roll' && !me.inJail && (
            <button className="btn-primary" onClick={() => socket.emit('roll_dice')}>🎲 Roll Dice</button>
          )}
          {tp === 'pre_roll' && me.inJail && (
            <div className="jail-actions">
              <p>🔒 You're in Jail!</p>
              <button className="btn-primary" onClick={() => socket.emit('roll_dice')}>🎲 Try Doubles</button>
              <button onClick={() => socket.emit('pay_jail_fine')}>💰 Pay $50</button>
              {me.getOutOfJailCards > 0 && (
                <button onClick={() => socket.emit('use_jail_card')}>🎫 Use Card</button>
              )}
            </div>
          )}
          {tp === 'awaiting_buy' && (
            <div className="buy-actions">
              <p>Buy <strong>{TILES[me.position]?.name}</strong> for ${(TILES[me.position] as any)?.price}?</p>
              <button className="btn-primary" onClick={() => socket.emit('buy_property')}>💵 Buy</button>
              <button onClick={() => socket.emit('decline_property')}>❌ Decline</button>
            </div>
          )}
          {tp === 'post_roll' && (
            <button className="btn-primary" onClick={() => socket.emit('end_turn')}>⏭ End Turn</button>
          )}
        </div>
      )}

      {/* Build/Sell/Mortgage always available on your turn */}
      {isMyTurn && (tp === 'post_roll' || tp === 'pre_roll') && myProperties.length > 0 && (
        <div className="actions-section">
          <h4>Property Actions</h4>
          <div className="prop-action-list">
            {myProperties.map(op => {
              const tile = TILES[op.tileIndex];
              return (
                <div key={op.tileIndex} className="prop-action-row">
                  <span className="prop-name">{tile.name}{op.mortgaged ? ' (M)' : ''}</span>
                  {tile.type === 'property' && op.houses < 5 && !op.mortgaged && (
                    <button className="btn-tiny" onClick={() => socket.emit('build_house', { tileIndex: op.tileIndex })}>+🏠</button>
                  )}
                  {tile.type === 'property' && op.houses > 0 && (
                    <button className="btn-tiny" onClick={() => socket.emit('sell_house', { tileIndex: op.tileIndex })}>-🏠</button>
                  )}
                  {!op.mortgaged && op.houses === 0 && (
                    <button className="btn-tiny" onClick={() => socket.emit('mortgage', { tileIndex: op.tileIndex })}>Mortgage</button>
                  )}
                  {op.mortgaged && (
                    <button className="btn-tiny" onClick={() => socket.emit('unmortgage', { tileIndex: op.tileIndex })}>Unmortgage</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Simple trade UI */}
      {isMyTurn && tp === 'post_roll' && gameState.players.filter(p => !p.bankrupt && p.id !== playerId).length > 0 && (
        <div className="actions-section">
          <h4>Trade</h4>
          <div className="trade-quick">
            <select value={tradeToIdx} onChange={e => setTradeToIdx(+e.target.value)}>
              {gameState.players.filter(p => !p.bankrupt && p.id !== playerId).map((p, i) => (
                <option key={p.id} value={i}>{p.name}</option>
              ))}
            </select>
            <input type="number" placeholder="Offer $" min={0} value={tradeMoney} onChange={e => setTradeMoney(+e.target.value)} />
            <button className="btn-tiny" onClick={() => {
              const others = gameState.players.filter(p => !p.bankrupt && p.id !== playerId);
              const to = others[tradeToIdx];
              if (!to) return;
              socket.emit('propose_trade', {
                fromId: playerId,
                toId: to.id,
                offerMoney: tradeMoney,
                offerProperties: [],
                offerJailCards: 0,
                requestMoney: 0,
                requestProperties: [],
                requestJailCards: 0,
              });
            }}>Propose</button>
          </div>
        </div>
      )}
    </div>
  );
}
