import { useState } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';
import { DEFAULT_HOUSE_RULES, HouseRules } from '@shared/types';

export function Lobby() {
  const lobbyGames = useStore(s => s.lobbyGames);
  const error = useStore(s => s.error);
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [playerName, setPlayerName] = useState('');
  const [gameName, setGameName] = useState('');
  const [password, setPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [rules, setRules] = useState<HouseRules>({ ...DEFAULT_HOUSE_RULES });

  const createGame = () => {
    if (!playerName.trim() || !gameName.trim()) return;
    socket.emit('create_game', { name: gameName, playerName, password: password || undefined, houseRules: rules });
  };

  const joinGame = (gameId: string) => {
    if (!playerName.trim()) return;
    socket.emit('join_game', { gameId, playerName, password: joinPassword || undefined });
  };

  return (
    <div className="lobby">
      <h1>🎲 WebMonopoly</h1>
      {error && <div className="toast-error">{error}</div>}

      <div className="lobby-name">
        <label>Your Name:</label>
        <input value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={20} placeholder="Enter your name" />
      </div>

      <div className="lobby-tabs">
        <button className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>Join Game</button>
        <button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>Create Game</button>
      </div>

      {tab === 'join' && (
        <div className="lobby-join">
          <button className="btn-small" onClick={() => socket.emit('refresh_lobby')}>Refresh</button>
          {lobbyGames.length === 0 && <p className="muted">No games available. Create one!</p>}
          <ul className="game-list">
            {lobbyGames.map(g => (
              <li key={g.id}>
                <div className="game-info">
                  <strong>{g.name}</strong>
                  <span>{g.playerCount}/{g.maxPlayers} players</span>
                  <span className={`phase-${g.phase}`}>{g.phase}</span>
                  {g.hasPassword && <span>🔒</span>}
                </div>
                <div className="game-actions">
                  {g.hasPassword && (
                    <input placeholder="Password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} />
                  )}
                  <button onClick={() => joinGame(g.id)} disabled={g.phase !== 'waiting'}>
                    {g.phase === 'waiting' ? 'Join' : g.phase}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'create' && (
        <div className="lobby-create">
          <label>Game Name:</label>
          <input value={gameName} onChange={e => setGameName(e.target.value)} maxLength={30} placeholder="My Game" />

          <label>Password (optional):</label>
          <input value={password} onChange={e => setPassword(e.target.value)} maxLength={20} placeholder="Leave blank for public" />

          <div className="house-rules">
            <h3>House Rules</h3>
            <label>
              <input type="checkbox" checked={rules.freeParking} onChange={e => setRules({ ...rules, freeParking: e.target.checked })} />
              Free Parking collects fines
            </label>
            <label>
              <input type="checkbox" checked={rules.doubleOnGo} onChange={e => setRules({ ...rules, doubleOnGo: e.target.checked })} />
              Double salary on exact GO landing
            </label>
            <label>
              <input type="checkbox" checked={rules.auctionOnDecline} onChange={e => setRules({ ...rules, auctionOnDecline: e.target.checked })} />
              Auction if property declined
            </label>
            <label>Max Players:
              <select value={rules.maxPlayers} onChange={e => setRules({ ...rules, maxPlayers: +e.target.value })}>
                {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>Turn Timer (sec, 0 = off):
              <input type="number" min={0} max={300} value={rules.turnTimerSec} onChange={e => setRules({ ...rules, turnTimerSec: +e.target.value })} />
            </label>
            <label>Starting Money:
              <input type="number" min={500} max={5000} step={100} value={rules.startingMoney} onChange={e => setRules({ ...rules, startingMoney: +e.target.value })} />
            </label>
          </div>

          <button className="btn-primary" onClick={createGame}>Create Game</button>
        </div>
      )}
    </div>
  );
}
