# WebMonopoly

Browser-based multiplayer board game — a clone of the classic property trading game.

## Architecture

```
WebMonopoly/
├── shared/              # Shared TypeScript types + board data
│   ├── types.ts         # Interfaces, constants, color groups
│   └── board.ts         # 40 tiles, Chance/Community Chest cards, grid helpers
├── server/              # Node.js + Express + Socket.IO (authoritative)
│   └── src/
│       ├── index.ts     # HTTP + WS entry point
│       ├── GameManager.ts  # Lobby: create/join/reconnect
│       ├── Game.ts      # Full game state machine & rules
│       ├── rules.ts     # Pure functions: rent, monopoly, building rules
│       └── __tests__/rules.test.ts
├── client/              # React 18 + Vite + Zustand SPA
│   └── src/
│       ├── App.tsx / store.ts / socket.ts
│       └── components/  # Lobby, GameBoard, PlayerPanel, ActionBar, ChatLog, etc.
├── Dockerfile.server / Dockerfile.client / docker-compose.yml
└── nginx.conf           # Prod reverse proxy for WS
```

**Stack rationale:**
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + TS + Vite | Fast HMR, strong typing, huge ecosystem |
| State mgmt | Zustand | Minimal boilerplate, works great with Socket.IO |
| Backend | Express + Socket.IO | Easy rooms, reconnection, binary fallback |
| Game state | In-memory (server) | Simplest for MVP; Redis/PG can be added later |
| Deploy | Docker Compose | One-command launch for dev and prod |

## Quick Start (local dev)

```bash
# 1. Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Start server (port 3001)
cd server && npm run dev &

# 3. Start client (port 3000, proxies WS to 3001)
cd client && npm run dev
```

Open **http://localhost:3000** in two browser tabs to test multiplayer.

## Quick Start (Docker)

```bash
docker compose up --build
# → Client at http://localhost:8080
# → Server at http://localhost:3001
```

## Run Tests

```bash
cd server && npx vitest run
```

## WebSocket Protocol

### Client → Server (intents)

| Event | Payload | Description |
|-------|---------|-------------|
| `create_game` | `{ name, playerName, password?, houseRules? }` | Create a new game room |
| `join_game` | `{ gameId, playerName, password? }` | Join existing game |
| `start_game` | — | Host starts the game (≥2 players) |
| `roll_dice` | — | Roll 2d6 |
| `buy_property` | — | Buy the property you landed on |
| `decline_property` | — | Decline → triggers auction if house rule on |
| `end_turn` | — | End current turn |
| `build_house` | `{ tileIndex }` | Build house/hotel on property |
| `sell_house` | `{ tileIndex }` | Sell a house |
| `mortgage` | `{ tileIndex }` | Mortgage a property |
| `unmortgage` | `{ tileIndex }` | Pay to unmortgage |
| `pay_jail_fine` | — | Pay $50 to leave jail |
| `use_jail_card` | — | Use "Get Out of Jail" card |
| `place_bid` | `{ amount }` | Bid in auction |
| `withdraw_bid` | — | Withdraw from auction |
| `propose_trade` | `TradeOffer` | Propose trade to another player |
| `accept_trade` | — | Accept pending trade |
| `reject_trade` | — | Reject/cancel pending trade |
| `chat` | `{ text }` | Send chat message |
| `leave_game` | — | Leave the game |

### Server → Client (events)

| Event | Payload | Description |
|-------|---------|-------------|
| `game_list` | `LobbyGame[]` | Available games in lobby |
| `game_joined` | `{ gameId, playerId }` | Confirmation of joining |
| `game_state` | `GameState` | Full game state (sent after every action) |
| `error` | `{ message }` | Validation error |

### Example WebSocket Messages

```jsonc
// Client creates a game
{ "event": "create_game", "data": { "name": "Friday Night", "playerName": "Alice", "houseRules": { "freeParking": true, "maxPlayers": 4 } } }

// Server responds with join confirmation
{ "event": "game_joined", "data": { "gameId": "a1b2c3d4", "playerId": "x9y8z7" } }

// Client rolls dice
{ "event": "roll_dice" }

// Server broadcasts updated state (abbreviated)
{ "event": "game_state", "data": { "id": "a1b2c3d4", "phase": "playing", "currentPlayerIndex": 0, "turnPhase": "awaiting_buy", "lastDice": [4, 3], "players": [{ "name": "Alice", "money": 1500, "position": 7 }], "log": [{ "msg": "Alice rolled 4+3=7", "type": "action" }] } }

// Client buys property
{ "event": "buy_property" }

// Client places auction bid
{ "event": "place_bid", "data": { "amount": 150 } }
```

## Card Data Format

```typescript
interface GameCard {
  id: string;          // e.g. "ch1", "cc5"
  text: string;        // Display text
  deck: 'chance' | 'chest';
  action: CardAction;  // Discriminated union — see shared/types.ts
}

// CardAction variants:
// collect | pay | move_to | move_back | go_to_jail |
// get_out_of_jail | collect_from_each | pay_each |
// repairs | advance_to_nearest
```

## House Rules (configurable per room)

| Rule | Default | Description |
|------|---------|-------------|
| `freeParking` | `false` | Fines/taxes pool goes to Free Parking lander |
| `doubleOnGo` | `false` | Landing exactly on GO pays $400 |
| `auctionOnDecline` | `true` | Auction if buyer declines |
| `turnTimerSec` | `60` | Seconds per turn (0 = unlimited) |
| `startingMoney` | `1500` | Starting cash |
| `maxPlayers` | `4` | 2–6 players |

## Not Included in MVP

- 3D graphics / animations (board is 2D CSS grid)
- AI/bot players
- Persistent game state (Redis/Postgres) — games live in memory
- Player accounts / auth / ratings
- Spectator mode
- Mobile-optimized gestures (responsive CSS only)
- Sound effects
- i18n / localization
- Comprehensive trade UI (MVP has money-only quick trade)
- Undo/redo
- Game replay / history export
