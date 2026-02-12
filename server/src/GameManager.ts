import { v4 as uuid } from 'uuid';
import { Game } from './Game';
import { LobbyGame, HouseRules } from '../../shared/types';

export class GameManager {
  private games = new Map<string, Game>();
  /** maps socket.id → { gameId, playerId } */
  private sessions = new Map<string, { gameId: string; playerId: string }>();

  createGame(
    socketId: string,
    playerName: string,
    gameName: string,
    rules: Partial<HouseRules>,
    password?: string,
  ): { game: Game; playerId: string } {
    const gameId = uuid().slice(0, 8);
    const playerId = uuid().slice(0, 8);
    const game = new Game(gameId, gameName, playerId, playerName, rules, password);
    this.games.set(gameId, game);
    this.sessions.set(socketId, { gameId, playerId });
    return { game, playerId };
  }

  joinGame(
    socketId: string,
    gameId: string,
    playerName: string,
    password?: string,
  ): { game: Game; playerId: string } | string {
    const game = this.games.get(gameId);
    if (!game) return 'Game not found';
    if (game.password && game.password !== password) return 'Wrong password';

    // Check if player is reconnecting
    const existing = game.state.players.find(p => p.name === playerName && !p.connected);
    if (existing) {
      game.reconnectPlayer(existing.id);
      this.sessions.set(socketId, { gameId, playerId: existing.id });
      return { game, playerId: existing.id };
    }

    const playerId = uuid().slice(0, 8);
    if (!game.addPlayer(playerId, playerName)) return 'Cannot join game';
    this.sessions.set(socketId, { gameId, playerId });
    return { game, playerId };
  }

  getSession(socketId: string) {
    return this.sessions.get(socketId);
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  handleDisconnect(socketId: string) {
    const session = this.sessions.get(socketId);
    if (!session) return;
    const game = this.games.get(session.gameId);
    if (game) {
      game.disconnectPlayer(session.playerId);
      // Remove game if no connected players in waiting phase
      if (game.state.phase === 'waiting' && game.state.players.every(p => !p.connected)) {
        game.destroy();
        this.games.delete(session.gameId);
      }
    }
    this.sessions.delete(socketId);
  }

  getLobbyList(): LobbyGame[] {
    const list: LobbyGame[] = [];
    for (const [, game] of this.games) {
      list.push({
        id: game.state.id,
        name: game.state.name,
        playerCount: game.state.players.length,
        maxPlayers: game.state.houseRules.maxPlayers,
        hasPassword: !!game.password,
        phase: game.state.phase,
      });
    }
    return list;
  }

  removeGame(gameId: string) {
    const game = this.games.get(gameId);
    if (game) {
      game.destroy();
      this.games.delete(gameId);
    }
  }
}
