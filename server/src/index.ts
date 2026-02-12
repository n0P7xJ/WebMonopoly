import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './GameManager';
import { Game } from './Game';
import { HouseRules, TradeOffer } from '../../shared/types';

const PORT = Number(process.env.PORT) || 3001;
const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const gm = new GameManager();

/* ── rate limiter (anti-spam) ── */
const lastMsg = new Map<string, number>();
function rateLimit(sid: string, ms = 200): boolean {
  const now = Date.now();
  if ((lastMsg.get(sid) ?? 0) + ms > now) return true;
  lastMsg.set(sid, now);
  return false;
}

/* ── helper: broadcast game state to room ── */
function broadcastState(game: Game) {
  io.to(game.state.id).emit('game_state', game.getPublicState());
}

/* ── socket handlers ── */
io.on('connection', (socket) => {
  console.log(`[ws] connect ${socket.id}`);

  // Send lobby list on connect
  socket.emit('game_list', gm.getLobbyList());

  /* ── lobby ── */
  socket.on('create_game', (data: { name: string; playerName: string; password?: string; houseRules?: Partial<HouseRules> }) => {
    const { game, playerId } = gm.createGame(socket.id, data.playerName, data.name, data.houseRules ?? {}, data.password);
    socket.join(game.state.id);
    game.onChange = () => broadcastState(game);
    socket.emit('game_joined', { gameId: game.state.id, playerId });
    socket.emit('game_state', game.getPublicState());
    io.emit('game_list', gm.getLobbyList());
  });

  socket.on('join_game', (data: { gameId: string; playerName: string; password?: string }) => {
    const result = gm.joinGame(socket.id, data.gameId, data.playerName, data.password);
    if (typeof result === 'string') {
      socket.emit('error', { message: result });
      return;
    }
    const { game, playerId } = result;
    socket.join(game.state.id);
    game.onChange = () => broadcastState(game);
    socket.emit('game_joined', { gameId: game.state.id, playerId });
    broadcastState(game);
    io.emit('game_list', gm.getLobbyList());
  });

  socket.on('refresh_lobby', () => {
    socket.emit('game_list', gm.getLobbyList());
  });

  /* ── generic action helper ── */
  function withGame(fn: (game: Game, playerId: string) => void) {
    const session = gm.getSession(socket.id);
    if (!session) { socket.emit('error', { message: 'Not in a game' }); return; }
    const game = gm.getGame(session.gameId);
    if (!game) { socket.emit('error', { message: 'Game gone' }); return; }
    fn(game, session.playerId);
  }

  function handleAction(fn: (game: Game, playerId: string) => string | null) {
    if (rateLimit(socket.id)) return;
    withGame((game, pid) => {
      const err = fn(game, pid);
      if (err) socket.emit('error', { message: err });
    });
  }

  /* ── game actions ── */
  socket.on('start_game', () => handleAction((g, pid) => g.startGame(pid) ? null : 'Cannot start'));
  socket.on('roll_dice', () => handleAction((g, pid) => g.rollDice(pid)));
  socket.on('buy_property', () => handleAction((g, pid) => g.buyProperty(pid)));
  socket.on('decline_property', () => handleAction((g, pid) => g.declineProperty(pid)));
  socket.on('end_turn', () => handleAction((g, pid) => g.endTurn(pid)));
  socket.on('build_house', (d: { tileIndex: number }) => handleAction((g, pid) => g.buildHouse(pid, d.tileIndex)));
  socket.on('sell_house', (d: { tileIndex: number }) => handleAction((g, pid) => g.sellHouse(pid, d.tileIndex)));
  socket.on('mortgage', (d: { tileIndex: number }) => handleAction((g, pid) => g.mortgageProperty(pid, d.tileIndex)));
  socket.on('unmortgage', (d: { tileIndex: number }) => handleAction((g, pid) => g.unmortgageProperty(pid, d.tileIndex)));
  socket.on('pay_jail_fine', () => handleAction((g, pid) => g.payJailFine(pid)));
  socket.on('use_jail_card', () => handleAction((g, pid) => g.useJailCard(pid)));
  socket.on('place_bid', (d: { amount: number }) => handleAction((g, pid) => g.placeBid(pid, d.amount)));
  socket.on('withdraw_bid', () => handleAction((g, pid) => g.withdrawBid(pid)));
  socket.on('propose_trade', (d: Omit<TradeOffer, 'id'>) => handleAction((g, pid) => g.proposeTrade(pid, d)));
  socket.on('accept_trade', () => handleAction((g, pid) => g.acceptTrade(pid)));
  socket.on('reject_trade', () => handleAction((g, pid) => g.rejectTrade(pid)));

  /* ── chat ── */
  socket.on('chat', (d: { text: string }) => {
    if (rateLimit(socket.id, 500)) return;
    withGame((game, pid) => game.chat(pid, d.text));
  });

  /* ── leave ── */
  socket.on('leave_game', () => {
    const session = gm.getSession(socket.id);
    if (session) {
      socket.leave(session.gameId);
      gm.handleDisconnect(socket.id);
      io.emit('game_list', gm.getLobbyList());
    }
  });

  /* ── disconnect ── */
  socket.on('disconnect', () => {
    console.log(`[ws] disconnect ${socket.id}`);
    gm.handleDisconnect(socket.id);
    io.emit('game_list', gm.getLobbyList());
    lastMsg.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✅ WebMonopoly server listening on :${PORT}`);
});
