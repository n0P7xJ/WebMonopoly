import { useStore } from '../store';
import { socket } from '../socket';

export function TradeDialog() {
  const gameState = useStore(s => s.gameState);
  const playerId = useStore(s => s.playerId);
  const trade = gameState?.pendingTrade;
  if (!trade || !gameState) return null;

  const from = gameState.players.find(p => p.id === trade.fromId);
  const to = gameState.players.find(p => p.id === trade.toId);
  const isRecipient = trade.toId === playerId;
  const isProposer = trade.fromId === playerId;

  return (
    <div className="modal-overlay">
      <div className="trade-dialog">
        <h3>Trade Offer</h3>
        <p><strong>{from?.name}</strong> offers <strong>{to?.name}</strong>:</p>
        <div className="trade-details">
          <div className="trade-side">
            <h4>Offering</h4>
            {trade.offerMoney > 0 && <p>${trade.offerMoney}</p>}
            {trade.offerProperties.length > 0 && <p>{trade.offerProperties.length} properties</p>}
            {trade.offerJailCards > 0 && <p>{trade.offerJailCards} jail card(s)</p>}
            {trade.offerMoney === 0 && trade.offerProperties.length === 0 && trade.offerJailCards === 0 && <p className="muted">Nothing</p>}
          </div>
          <div className="trade-arrow">⇄</div>
          <div className="trade-side">
            <h4>Requesting</h4>
            {trade.requestMoney > 0 && <p>${trade.requestMoney}</p>}
            {trade.requestProperties.length > 0 && <p>{trade.requestProperties.length} properties</p>}
            {trade.requestJailCards > 0 && <p>{trade.requestJailCards} jail card(s)</p>}
            {trade.requestMoney === 0 && trade.requestProperties.length === 0 && trade.requestJailCards === 0 && <p className="muted">Nothing</p>}
          </div>
        </div>
        <div className="trade-buttons">
          {isRecipient && (
            <>
              <button className="btn-primary" onClick={() => socket.emit('accept_trade')}>Accept</button>
              <button className="btn-danger" onClick={() => socket.emit('reject_trade')}>Reject</button>
            </>
          )}
          {isProposer && (
            <button className="btn-danger" onClick={() => socket.emit('reject_trade')}>Cancel</button>
          )}
          {!isRecipient && !isProposer && <p className="muted">Waiting for decision...</p>}
        </div>
      </div>
    </div>
  );
}
