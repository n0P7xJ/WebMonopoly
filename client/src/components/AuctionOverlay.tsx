import { useState } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';
import { TILES } from '@shared/board';

export function AuctionOverlay() {
  const gameState = useStore(s => s.gameState);
  const playerId = useStore(s => s.playerId);
  const [bid, setBid] = useState(0);
  const auction = gameState?.auction;
  if (!auction || !gameState) return null;

  const tile = TILES[auction.tileIndex];
  const highBidder = gameState.players.find(p => p.id === auction.currentBidderId);
  const amIn = auction.remainingPlayerIds.includes(playerId ?? '');

  return (
    <div className="modal-overlay">
      <div className="auction-dialog">
        <h3>🔨 Auction: {tile.name}</h3>
        <p className="auction-bid">
          Current bid: <strong>${auction.currentBid}</strong>
          {highBidder && <span> by {highBidder.name}</span>}
        </p>
        <p>Remaining bidders: {auction.remainingPlayerIds.length}</p>

        {amIn && (
          <div className="auction-controls">
            <input
              type="number"
              min={(auction.currentBid || 0) + 1}
              value={bid}
              onChange={e => setBid(+e.target.value)}
            />
            <button className="btn-primary" onClick={() => { socket.emit('place_bid', { amount: bid }); setBid(bid + 10); }}>
              Bid ${bid}
            </button>
            <button className="btn-danger" onClick={() => socket.emit('withdraw_bid')}>Withdraw</button>
          </div>
        )}
        {!amIn && <p className="muted">You are not in this auction.</p>}
      </div>
    </div>
  );
}
