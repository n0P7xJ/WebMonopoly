import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';

export function ChatLog() {
  const gameState = useStore(s => s.gameState);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.log.length]);

  if (!gameState) return null;

  const send = () => {
    if (!text.trim()) return;
    socket.emit('chat', { text: text.trim() });
    setText('');
  };

  return (
    <div className="chat-log">
      <h4>Game Log & Chat</h4>
      <div className="log-scroll">
        {gameState.log.slice(-80).map((entry, i) => (
          <div key={i} className={`log-entry log-${entry.type}`}>
            <span className="log-msg">{entry.msg}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          maxLength={200}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
