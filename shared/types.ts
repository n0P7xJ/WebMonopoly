// ===== TILE TYPES =====
export type ColorGroup = 'brown' | 'light_blue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'dark_blue';

export interface PropertyTile {
  type: 'property';
  name: string;
  price: number;
  colorGroup: ColorGroup;
  rent: [number, number, number, number, number, number]; // base, 1-4 houses, hotel
  houseCost: number;
  mortgage: number;
}

export interface StationTile {
  type: 'station';
  name: string;
  price: number;
  mortgage: number;
}

export interface UtilityTile {
  type: 'utility';
  name: string;
  price: number;
  mortgage: number;
}

export interface TaxTile {
  type: 'tax';
  name: string;
  amount: number;
}

export interface SpecialTile {
  type: 'go' | 'jail' | 'free_parking' | 'go_to_jail' | 'chance' | 'chest';
  name: string;
}

export type Tile = PropertyTile | StationTile | UtilityTile | TaxTile | SpecialTile;

// ===== CARDS =====
export type CardAction =
  | { type: 'collect'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'move_to'; position: number; collectGo?: boolean }
  | { type: 'move_back'; spaces: number }
  | { type: 'go_to_jail' }
  | { type: 'get_out_of_jail' }
  | { type: 'collect_from_each'; amount: number }
  | { type: 'pay_each'; amount: number }
  | { type: 'repairs'; perHouse: number; perHotel: number }
  | { type: 'advance_to_nearest'; tileType: 'station' | 'utility' };

export interface GameCard {
  id: string;
  text: string;
  deck: 'chance' | 'chest';
  action: CardAction;
}

// ===== PLAYER =====
export interface PlayerState {
  id: string;
  name: string;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  bankrupt: boolean;
  connected: boolean;
  color: string;
}

// ===== OWNED PROPERTY =====
export interface OwnedProperty {
  tileIndex: number;
  ownerId: string;
  houses: number; // 0-4 = houses, 5 = hotel
  mortgaged: boolean;
}

// ===== AUCTION =====
export interface AuctionState {
  tileIndex: number;
  currentBid: number;
  currentBidderId: string | null;
  remainingPlayerIds: string[];
  timer: number;
}

// ===== TRADE =====
export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  offerMoney: number;
  offerProperties: number[];
  offerJailCards: number;
  requestMoney: number;
  requestProperties: number[];
  requestJailCards: number;
}

// ===== HOUSE RULES =====
export interface HouseRules {
  freeParking: boolean;
  doubleOnGo: boolean;
  auctionOnDecline: boolean;
  turnTimerSec: number;
  startingMoney: number;
  maxPlayers: number;
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  freeParking: false,
  doubleOnGo: false,
  auctionOnDecline: true,
  turnTimerSec: 60,
  startingMoney: 1500,
  maxPlayers: 4,
};

// ===== GAME STATE =====
export type GamePhase = 'waiting' | 'playing' | 'finished';
export type TurnPhase = 'pre_roll' | 'post_roll' | 'awaiting_buy' | 'auction' | 'trade';

export interface LogEntry {
  ts: number;
  msg: string;
  type: 'system' | 'action' | 'chat';
  playerId?: string;
}

export interface GameState {
  id: string;
  name: string;
  phase: GamePhase;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  ownedProperties: OwnedProperty[];
  lastDice: [number, number] | null;
  doublesCount: number;
  auction: AuctionState | null;
  pendingTrade: TradeOffer | null;
  lastCard: GameCard | null;
  houseRules: HouseRules;
  freeParkingPool: number;
  log: LogEntry[];
  turnTimeLeft: number | null;
  winnerId: string | null;
}

// ===== LOBBY =====
export interface LobbyGame {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  phase: GamePhase;
}

// ===== CONSTANTS =====
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_POSITION = 10;
export const GO_TO_JAIL_POSITION = 30;
export const BOARD_SIZE = 40;
export const MAX_JAIL_TURNS = 3;
export const MAX_HOUSES = 5;
export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

// ===== COLOR GROUP DISPLAY =====
export const COLOR_GROUP_CSS: Record<ColorGroup, string> = {
  brown: '#8B4513',
  light_blue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#228B22',
  dark_blue: '#00008B',
};
