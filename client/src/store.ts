import { create } from 'zustand';
import { GameState, LobbyGame } from '@shared/types';
import { socket } from './socket';

export type Screen = 'lobby' | 'game';

interface Store {
  screen: Screen;
  playerId: string | null;
  gameId: string | null;
  gameState: GameState | null;
  lobbyGames: LobbyGame[];
  error: string | null;
  selectedTile: number | null;
  setScreen: (s: Screen) => void;
  setSelectedTile: (idx: number | null) => void;
  clearError: () => void;
}

export const useStore = create<Store>((set) => ({
  screen: 'lobby',
  playerId: null,
  gameId: null,
  gameState: null,
  lobbyGames: [],
  error: null,
  selectedTile: null,
  setScreen: (screen) => set({ screen }),
  setSelectedTile: (selectedTile) => set({ selectedTile }),
  clearError: () => set({ error: null }),
}));

/* ── socket listeners ── */
socket.on('game_list', (games: LobbyGame[]) => {
  useStore.setState({ lobbyGames: games });
});

socket.on('game_joined', (data: { gameId: string; playerId: string }) => {
  useStore.setState({ gameId: data.gameId, playerId: data.playerId, screen: 'game' });
});

socket.on('game_state', (state: GameState) => {
  useStore.setState({ gameState: state });
});

socket.on('error', (data: { message: string }) => {
  useStore.setState({ error: data.message });
  setTimeout(() => useStore.setState({ error: null }), 4000);
});

socket.on('disconnect', () => {
  console.log('[ws] disconnected');
});

socket.on('connect', () => {
  console.log('[ws] connected');
  socket.emit('refresh_lobby');
});
