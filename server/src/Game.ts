import { v4 as uuid } from 'uuid';
import {
  GameState, PlayerState, OwnedProperty, AuctionState, TradeOffer,
  HouseRules, DEFAULT_HOUSE_RULES, GameCard, LogEntry, TurnPhase,
  PropertyTile, ColorGroup,
  GO_SALARY, JAIL_FINE, JAIL_POSITION, GO_TO_JAIL_POSITION,
  BOARD_SIZE, MAX_JAIL_TURNS, PLAYER_COLORS,
} from '../../shared/types';
import { TILES, CHANCE_CARDS, COMMUNITY_CHEST_CARDS, STATION_INDICES, UTILITY_INDICES } from '../../shared/board';
import {
  calculateRent, hasMonopoly, canBuildHouse, canSellHouse,
  findNearestTile, calculateTotalAssets, isPurchasable,
} from './rules';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  state: GameState;
  password: string | null;
  private chanceDeck: GameCard[];
  private chestDeck: GameCard[];
  private turnTimerHandle: ReturnType<typeof setInterval> | null = null;
  onChange: () => void = () => {};

  constructor(id: string, name: string, hostId: string, hostName: string, rules: Partial<HouseRules>, password?: string) {
    const hr: HouseRules = { ...DEFAULT_HOUSE_RULES, ...rules };
    this.password = password ?? null;
    this.chanceDeck = shuffle(CHANCE_CARDS);
    this.chestDeck = shuffle(COMMUNITY_CHEST_CARDS);
    this.state = {
      id, name,
      phase: 'waiting',
      players: [{
        id: hostId, name: hostName, money: hr.startingMoney,
        position: 0, properties: [], inJail: false, jailTurns: 0,
        getOutOfJailCards: 0, bankrupt: false, connected: true,
        color: PLAYER_COLORS[0],
      }],
      currentPlayerIndex: 0,
      turnPhase: 'pre_roll',
      ownedProperties: [],
      lastDice: null, doublesCount: 0,
      auction: null, pendingTrade: null, lastCard: null,
      houseRules: hr, freeParkingPool: 0,
      log: [], turnTimeLeft: null, winnerId: null,
    };
    this.log('system', `Game "${name}" created by ${hostName}`);
  }

  /* ── helpers ── */
  private cur(): PlayerState { return this.state.players[this.state.currentPlayerIndex]; }
  private player(id: string): PlayerState | undefined { return this.state.players.find(p => p.id === id); }
  private activePlayers(): PlayerState[] { return this.state.players.filter(p => !p.bankrupt); }
  private ownedAt(idx: number): OwnedProperty | undefined { return this.state.ownedProperties.find(p => p.tileIndex === idx); }

  private log(type: LogEntry['type'], msg: string, playerId?: string) {
    this.state.log.push({ ts: Date.now(), msg, type, playerId });
    if (this.state.log.length > 200) this.state.log.splice(0, this.state.log.length - 200);
  }

  private emit() { this.onChange(); }

  /* ── player management ── */
  addPlayer(id: string, name: string): boolean {
    if (this.state.phase !== 'waiting') return false;
    if (this.state.players.length >= this.state.houseRules.maxPlayers) return false;
    if (this.state.players.some(p => p.id === id)) return false;
    this.state.players.push({
      id, name, money: this.state.houseRules.startingMoney,
      position: 0, properties: [], inJail: false, jailTurns: 0,
      getOutOfJailCards: 0, bankrupt: false, connected: true,
      color: PLAYER_COLORS[this.state.players.length % PLAYER_COLORS.length],
    });
    this.log('system', `${name} joined the game`);
    this.emit();
    return true;
  }

  reconnectPlayer(id: string): boolean {
    const p = this.player(id);
    if (!p) return false;
    p.connected = true;
    this.log('system', `${p.name} reconnected`);
    this.emit();
    return true;
  }

  disconnectPlayer(id: string) {
    const p = this.player(id);
    if (!p) return;
    p.connected = false;
    this.log('system', `${p.name} disconnected`);
    this.emit();
  }

  removePlayer(id: string) {
    if (this.state.phase === 'waiting') {
      this.state.players = this.state.players.filter(p => p.id !== id);
      this.emit();
    }
  }

  /* ── start ── */
  startGame(requesterId: string): boolean {
    if (this.state.phase !== 'waiting') return false;
    if (this.state.players[0].id !== requesterId) return false;
    if (this.state.players.length < 2) return false;
    this.state.phase = 'playing';
    this.state.currentPlayerIndex = 0;
    this.state.turnPhase = 'pre_roll';
    this.log('system', 'Game started!');
    this.startTurnTimer();
    this.emit();
    return true;
  }

  /* ── turn timer ── */
  private startTurnTimer() {
    this.clearTurnTimer();
    const sec = this.state.houseRules.turnTimerSec;
    if (sec <= 0) { this.state.turnTimeLeft = null; return; }
    this.state.turnTimeLeft = sec;
    this.turnTimerHandle = setInterval(() => {
      if (this.state.turnTimeLeft !== null) {
        this.state.turnTimeLeft--;
        if (this.state.turnTimeLeft <= 0) {
          this.log('system', `${this.cur().name}'s turn timed out`);
          this.forceEndTurn();
        }
        this.emit();
      }
    }, 1000);
  }

  private clearTurnTimer() {
    if (this.turnTimerHandle) { clearInterval(this.turnTimerHandle); this.turnTimerHandle = null; }
  }

  private forceEndTurn() {
    // If awaiting buy, decline
    if (this.state.turnPhase === 'awaiting_buy') this.declineProperty(this.cur().id);
    // If auction, end it immediately
    if (this.state.turnPhase === 'auction' && this.state.auction) this.endAuction();
    // If trade, reject
    if (this.state.turnPhase === 'trade' && this.state.pendingTrade) this.rejectTrade(this.cur().id);
    this.state.doublesCount = 0;
    this.nextTurn();
  }

  /* ── dice ── */
  rollDice(playerId: string): string | null {
    if (this.state.phase !== 'playing') return 'Game not in progress';
    const p = this.cur();
    if (p.id !== playerId) return 'Not your turn';
    if (p.bankrupt) return 'You are bankrupt';

    if (p.inJail) return this.rollDiceInJail(p);
    if (this.state.turnPhase !== 'pre_roll') return 'Cannot roll now';

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const doubles = d1 === d2;
    this.state.lastDice = [d1, d2];

    if (doubles) {
      this.state.doublesCount++;
      if (this.state.doublesCount >= 3) {
        this.log('action', `${p.name} rolled doubles 3 times — go to Jail!`, p.id);
        this.sendToJail(p);
        this.state.turnPhase = 'post_roll';
        this.emit();
        return null;
      }
    }

    this.log('action', `${p.name} rolled ${d1}+${d2}=${d1 + d2}${doubles ? ' (doubles!)' : ''}`, p.id);
    this.movePlayer(p, d1 + d2);
    this.handleLanding(p, d1 + d2);
    this.emit();
    return null;
  }

  private rollDiceInJail(p: PlayerState): string | null {
    if (this.state.turnPhase !== 'pre_roll') return 'Cannot roll now';
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.state.lastDice = [d1, d2];
    p.jailTurns++;

    if (d1 === d2) {
      p.inJail = false;
      p.jailTurns = 0;
      this.log('action', `${p.name} rolled doubles ${d1}+${d2} and escaped Jail!`, p.id);
      this.movePlayer(p, d1 + d2);
      this.handleLanding(p, d1 + d2);
    } else if (p.jailTurns >= MAX_JAIL_TURNS) {
      p.money -= JAIL_FINE;
      p.inJail = false;
      p.jailTurns = 0;
      this.log('action', `${p.name} paid $${JAIL_FINE} after 3 turns in Jail`, p.id);
      this.movePlayer(p, d1 + d2);
      this.handleLanding(p, d1 + d2);
      if (p.money < 0) this.handleDebt(p, null);
    } else {
      this.log('action', `${p.name} rolled ${d1}+${d2} — still in Jail (turn ${p.jailTurns}/${MAX_JAIL_TURNS})`, p.id);
      this.state.turnPhase = 'post_roll';
      this.state.doublesCount = 0;
    }
    this.emit();
    return null;
  }

  payJailFine(playerId: string): string | null {
    const p = this.cur();
    if (p.id !== playerId || !p.inJail) return 'Cannot pay jail fine';
    if (this.state.turnPhase !== 'pre_roll') return 'Cannot pay now';
    if (p.money < JAIL_FINE) return 'Not enough money';
    p.money -= JAIL_FINE;
    p.inJail = false;
    p.jailTurns = 0;
    if (this.state.houseRules.freeParking) this.state.freeParkingPool += JAIL_FINE;
    this.log('action', `${p.name} paid $${JAIL_FINE} to leave Jail`, p.id);
    this.emit();
    return null;
  }

  useJailCard(playerId: string): string | null {
    const p = this.cur();
    if (p.id !== playerId || !p.inJail) return 'Cannot use card';
    if (this.state.turnPhase !== 'pre_roll') return 'Cannot use now';
    if (p.getOutOfJailCards <= 0) return 'No jail cards';
    p.getOutOfJailCards--;
    p.inJail = false;
    p.jailTurns = 0;
    this.log('action', `${p.name} used Get Out of Jail card`, p.id);
    this.emit();
    return null;
  }

  /* ── movement ── */
  private movePlayer(p: PlayerState, spaces: number) {
    const oldPos = p.position;
    p.position = (p.position + spaces) % BOARD_SIZE;
    if (p.position < oldPos) {
      // Passed GO
      const salary = (this.state.houseRules.doubleOnGo && p.position === 0) ? GO_SALARY * 2 : GO_SALARY;
      p.money += salary;
      this.log('action', `${p.name} passed GO, collected $${salary}`, p.id);
    }
  }

  private movePlayerTo(p: PlayerState, position: number, collectGo: boolean) {
    if (collectGo && position < p.position) {
      const salary = (this.state.houseRules.doubleOnGo && position === 0) ? GO_SALARY * 2 : GO_SALARY;
      p.money += salary;
      this.log('action', `${p.name} passed GO, collected $${salary}`, p.id);
    }
    p.position = position;
  }

  /* ── landing ── */
  private handleLanding(p: PlayerState, diceTotal: number) {
    const tile = TILES[p.position];

    if (isPurchasable(tile)) {
      const owned = this.ownedAt(p.position);
      if (!owned) {
        this.state.turnPhase = 'awaiting_buy';
        return;
      }
      if (owned.ownerId !== p.id && !owned.mortgaged) {
        const rent = calculateRent(p.position, owned, this.state.ownedProperties, diceTotal);
        const owner = this.player(owned.ownerId)!;
        p.money -= rent;
        owner.money += rent;
        this.log('action', `${p.name} pays $${rent} rent to ${owner.name}`, p.id);
        if (p.money < 0) { this.handleDebt(p, owned.ownerId); return; }
      }
      this.state.turnPhase = 'post_roll';
      return;
    }

    switch (tile.type) {
      case 'tax': {
        p.money -= tile.amount;
        if (this.state.houseRules.freeParking) this.state.freeParkingPool += tile.amount;
        this.log('action', `${p.name} pays $${tile.amount} ${tile.name}`, p.id);
        if (p.money < 0) { this.handleDebt(p, null); return; }
        break;
      }
      case 'chance': {
        const card = this.drawCard(this.chanceDeck, CHANCE_CARDS);
        this.state.lastCard = card;
        this.log('action', `${p.name} drew Chance: "${card.text}"`, p.id);
        this.executeCard(p, card, diceTotal);
        return;
      }
      case 'chest': {
        const card = this.drawCard(this.chestDeck, COMMUNITY_CHEST_CARDS);
        this.state.lastCard = card;
        this.log('action', `${p.name} drew Community Chest: "${card.text}"`, p.id);
        this.executeCard(p, card, diceTotal);
        return;
      }
      case 'go_to_jail': {
        this.sendToJail(p);
        break;
      }
      case 'free_parking': {
        if (this.state.houseRules.freeParking && this.state.freeParkingPool > 0) {
          p.money += this.state.freeParkingPool;
          this.log('action', `${p.name} collects $${this.state.freeParkingPool} from Free Parking`, p.id);
          this.state.freeParkingPool = 0;
        }
        break;
      }
    }
    this.state.turnPhase = 'post_roll';
  }

  /* ── cards ── */
  private drawCard(deck: GameCard[], source: GameCard[]): GameCard {
    if (deck.length === 0) {
      deck.push(...shuffle(source.filter(c => c.action.type !== 'get_out_of_jail')));
    }
    return deck.shift()!;
  }

  private executeCard(p: PlayerState, card: GameCard, diceTotal: number) {
    const a = card.action;
    switch (a.type) {
      case 'collect':
        p.money += a.amount;
        break;
      case 'pay':
        p.money -= a.amount;
        if (this.state.houseRules.freeParking) this.state.freeParkingPool += a.amount;
        if (p.money < 0) { this.handleDebt(p, null); return; }
        break;
      case 'move_to':
        this.movePlayerTo(p, a.position, a.collectGo ?? false);
        this.handleLanding(p, diceTotal);
        return;
      case 'move_back':
        p.position = (p.position - a.spaces + BOARD_SIZE) % BOARD_SIZE;
        this.handleLanding(p, diceTotal);
        return;
      case 'go_to_jail':
        this.sendToJail(p);
        break;
      case 'get_out_of_jail':
        p.getOutOfJailCards++;
        break;
      case 'collect_from_each': {
        const others = this.activePlayers().filter(o => o.id !== p.id);
        for (const o of others) { o.money -= a.amount; p.money += a.amount; }
        break;
      }
      case 'pay_each': {
        const others = this.activePlayers().filter(o => o.id !== p.id);
        for (const o of others) { o.money += a.amount; }
        p.money -= a.amount * others.length;
        if (p.money < 0) { this.handleDebt(p, null); return; }
        break;
      }
      case 'repairs': {
        const myProps = this.state.ownedProperties.filter(op => op.ownerId === p.id);
        let cost = 0;
        for (const op of myProps) {
          if (op.houses === 5) cost += a.perHotel;
          else cost += op.houses * a.perHouse;
        }
        p.money -= cost;
        this.log('action', `${p.name} pays $${cost} for repairs`, p.id);
        if (p.money < 0) { this.handleDebt(p, null); return; }
        break;
      }
      case 'advance_to_nearest': {
        const target = findNearestTile(p.position, a.tileType);
        const passedGo = target < p.position;
        this.movePlayerTo(p, target, passedGo);
        this.handleLanding(p, diceTotal);
        return;
      }
    }
    this.state.turnPhase = 'post_roll';
  }

  /* ── jail ── */
  private sendToJail(p: PlayerState) {
    p.position = JAIL_POSITION;
    p.inJail = true;
    p.jailTurns = 0;
    this.state.doublesCount = 0;
    this.log('action', `${p.name} goes to Jail!`, p.id);
    this.state.turnPhase = 'post_roll';
  }

  /* ── buy / decline ── */
  buyProperty(playerId: string): string | null {
    const p = this.cur();
    if (p.id !== playerId) return 'Not your turn';
    if (this.state.turnPhase !== 'awaiting_buy') return 'Cannot buy now';
    const tile = TILES[p.position];
    if (!isPurchasable(tile)) return 'Not a property';
    if (p.money < tile.price) return 'Not enough money';
    p.money -= tile.price;
    p.properties.push(p.position);
    this.state.ownedProperties.push({ tileIndex: p.position, ownerId: p.id, houses: 0, mortgaged: false });
    this.log('action', `${p.name} bought ${tile.name} for $${tile.price}`, p.id);
    this.state.turnPhase = 'post_roll';
    this.emit();
    return null;
  }

  declineProperty(playerId: string): string | null {
    const p = this.cur();
    if (p.id !== playerId) return 'Not your turn';
    if (this.state.turnPhase !== 'awaiting_buy') return 'Cannot decline now';
    if (this.state.houseRules.auctionOnDecline) {
      this.startAuction(p.position);
    } else {
      this.state.turnPhase = 'post_roll';
    }
    this.emit();
    return null;
  }

  /* ── auction ── */
  private startAuction(tileIndex: number) {
    const active = this.activePlayers().map(p => p.id);
    this.state.auction = {
      tileIndex,
      currentBid: 0,
      currentBidderId: null,
      remainingPlayerIds: active,
      timer: 15,
    };
    this.state.turnPhase = 'auction';
    this.log('system', `Auction started for ${TILES[tileIndex].name}`);
  }

  placeBid(playerId: string, amount: number): string | null {
    const a = this.state.auction;
    if (!a || this.state.turnPhase !== 'auction') return 'No auction';
    const p = this.player(playerId);
    if (!p || !a.remainingPlayerIds.includes(playerId)) return 'Not in auction';
    if (amount <= a.currentBid) return 'Bid too low';
    if (amount > p.money) return 'Not enough money';
    a.currentBid = amount;
    a.currentBidderId = playerId;
    a.timer = 10;
    this.log('action', `${p.name} bids $${amount}`, playerId);
    this.emit();
    return null;
  }

  withdrawBid(playerId: string): string | null {
    const a = this.state.auction;
    if (!a || this.state.turnPhase !== 'auction') return 'No auction';
    a.remainingPlayerIds = a.remainingPlayerIds.filter(id => id !== playerId);
    const pName = this.player(playerId)?.name ?? playerId;
    this.log('action', `${pName} withdrew from auction`, playerId);
    if (a.remainingPlayerIds.length <= 1 || (a.remainingPlayerIds.length === 0)) {
      this.endAuction();
    }
    this.emit();
    return null;
  }

  private endAuction() {
    const a = this.state.auction;
    if (!a) return;
    if (a.currentBidderId && a.currentBid > 0) {
      const winner = this.player(a.currentBidderId)!;
      const tile = TILES[a.tileIndex];
      winner.money -= a.currentBid;
      winner.properties.push(a.tileIndex);
      this.state.ownedProperties.push({ tileIndex: a.tileIndex, ownerId: winner.id, houses: 0, mortgaged: false });
      this.log('action', `${winner.name} won the auction for ${tile.name} at $${a.currentBid}`);
    } else {
      this.log('system', `Auction ended with no winner`);
    }
    this.state.auction = null;
    this.state.turnPhase = 'post_roll';
    this.emit();
  }

  /* ── building ── */
  buildHouse(playerId: string, tileIndex: number): string | null {
    const p = this.cur();
    if (p.id !== playerId) return 'Not your turn';
    if (this.state.turnPhase !== 'post_roll' && this.state.turnPhase !== 'pre_roll') return 'Cannot build now';
    if (!canBuildHouse(tileIndex, playerId, this.state.ownedProperties)) return 'Cannot build here';
    const tile = TILES[tileIndex] as PropertyTile;
    if (p.money < tile.houseCost) return 'Not enough money';
    p.money -= tile.houseCost;
    const owned = this.ownedAt(tileIndex)!;
    owned.houses++;
    const label = owned.houses === 5 ? 'hotel' : `house #${owned.houses}`;
    this.log('action', `${p.name} built ${label} on ${tile.name} ($${tile.houseCost})`, playerId);
    this.emit();
    return null;
  }

  sellHouse(playerId: string, tileIndex: number): string | null {
    const p = this.cur();
    if (p.id !== playerId) return 'Not your turn';
    if (!canSellHouse(tileIndex, playerId, this.state.ownedProperties)) return 'Cannot sell house';
    const tile = TILES[tileIndex] as PropertyTile;
    const owned = this.ownedAt(tileIndex)!;
    owned.houses--;
    const refund = Math.floor(tile.houseCost / 2);
    p.money += refund;
    this.log('action', `${p.name} sold a house on ${tile.name} (+$${refund})`, playerId);
    this.emit();
    return null;
  }

  /* ── mortgage ── */
  mortgageProperty(playerId: string, tileIndex: number): string | null {
    const owned = this.ownedAt(tileIndex);
    if (!owned || owned.ownerId !== playerId) return 'Not your property';
    if (owned.mortgaged) return 'Already mortgaged';
    if (owned.houses > 0) return 'Sell all houses first';
    const tile = TILES[tileIndex];
    if (!('mortgage' in tile)) return 'Cannot mortgage';
    owned.mortgaged = true;
    const p = this.player(playerId)!;
    p.money += tile.mortgage;
    this.log('action', `${p.name} mortgaged ${tile.name} (+$${tile.mortgage})`, playerId);
    this.emit();
    return null;
  }

  unmortgageProperty(playerId: string, tileIndex: number): string | null {
    const owned = this.ownedAt(tileIndex);
    if (!owned || owned.ownerId !== playerId) return 'Not your property';
    if (!owned.mortgaged) return 'Not mortgaged';
    const tile = TILES[tileIndex];
    if (!('mortgage' in tile)) return 'Cannot unmortgage';
    const cost = Math.floor(tile.mortgage * 1.1);
    const p = this.player(playerId)!;
    if (p.money < cost) return 'Not enough money';
    p.money -= cost;
    owned.mortgaged = false;
    this.log('action', `${p.name} unmortgaged ${tile.name} (-$${cost})`, playerId);
    this.emit();
    return null;
  }

  /* ── trade ── */
  proposeTrade(fromId: string, trade: Omit<TradeOffer, 'id'>): string | null {
    if (this.state.pendingTrade) return 'Trade already pending';
    if (this.state.phase !== 'playing') return 'Game not playing';
    const from = this.player(fromId);
    const to = this.player(trade.toId);
    if (!from || !to || from.bankrupt || to.bankrupt) return 'Invalid players';
    if (from.money < trade.offerMoney) return 'Not enough money';
    if (from.getOutOfJailCards < trade.offerJailCards) return 'Not enough jail cards';
    // validate properties belong to offerer
    for (const ti of trade.offerProperties) {
      const o = this.ownedAt(ti);
      if (!o || o.ownerId !== fromId || o.houses > 0) return 'Invalid offer property';
    }
    for (const ti of trade.requestProperties) {
      const o = this.ownedAt(ti);
      if (!o || o.ownerId !== trade.toId || o.houses > 0) return 'Invalid request property';
    }
    this.state.pendingTrade = { ...trade, id: uuid(), fromId };
    this.state.turnPhase = 'trade';
    this.log('action', `${from.name} proposed a trade to ${to.name}`, fromId);
    this.emit();
    return null;
  }

  acceptTrade(playerId: string): string | null {
    const t = this.state.pendingTrade;
    if (!t || t.toId !== playerId) return 'No trade to accept';
    const from = this.player(t.fromId)!;
    const to = this.player(t.toId)!;
    // transfer money
    from.money -= t.offerMoney;
    to.money += t.offerMoney;
    to.money -= t.requestMoney;
    from.money += t.requestMoney;
    // transfer jail cards
    from.getOutOfJailCards -= t.offerJailCards;
    to.getOutOfJailCards += t.offerJailCards;
    to.getOutOfJailCards -= t.requestJailCards;
    from.getOutOfJailCards += t.requestJailCards;
    // transfer properties
    for (const ti of t.offerProperties) {
      const o = this.ownedAt(ti)!;
      o.ownerId = to.id;
      from.properties = from.properties.filter(x => x !== ti);
      to.properties.push(ti);
    }
    for (const ti of t.requestProperties) {
      const o = this.ownedAt(ti)!;
      o.ownerId = from.id;
      to.properties = to.properties.filter(x => x !== ti);
      from.properties.push(ti);
    }
    this.log('action', `Trade accepted between ${from.name} and ${to.name}`);
    this.state.pendingTrade = null;
    this.state.turnPhase = 'post_roll';
    this.emit();
    return null;
  }

  rejectTrade(playerId: string): string | null {
    const t = this.state.pendingTrade;
    if (!t) return 'No trade';
    if (t.toId !== playerId && t.fromId !== playerId) return 'Not your trade';
    const rejector = this.player(playerId)!;
    this.log('action', `${rejector.name} rejected the trade`);
    this.state.pendingTrade = null;
    this.state.turnPhase = 'post_roll';
    this.emit();
    return null;
  }

  /* ── end turn ── */
  endTurn(playerId: string): string | null {
    const p = this.cur();
    if (p.id !== playerId) return 'Not your turn';
    if (this.state.turnPhase === 'pre_roll') return 'Roll first';
    if (this.state.turnPhase === 'awaiting_buy') return 'Decide whether to buy';
    if (this.state.turnPhase === 'auction') return 'Auction in progress';

    // If doubles and not in jail, roll again
    if (this.state.lastDice && this.state.lastDice[0] === this.state.lastDice[1] && !p.inJail && this.state.doublesCount > 0) {
      this.state.turnPhase = 'pre_roll';
      this.log('action', `${p.name} rolls again (doubles!)`, p.id);
      this.emit();
      return null;
    }

    this.state.doublesCount = 0;
    this.nextTurn();
    this.emit();
    return null;
  }

  private nextTurn() {
    const players = this.state.players;
    let next = (this.state.currentPlayerIndex + 1) % players.length;
    let safety = 0;
    while (players[next].bankrupt && safety < players.length) {
      next = (next + 1) % players.length;
      safety++;
    }
    this.state.currentPlayerIndex = next;
    this.state.turnPhase = 'pre_roll';
    this.state.lastDice = null;
    this.state.doublesCount = 0;
    this.state.lastCard = null;
    this.startTurnTimer();
    this.log('system', `It's ${this.cur().name}'s turn`);
  }

  /* ── debt / bankruptcy ── */
  private handleDebt(debtor: PlayerState, creditorId: string | null) {
    const totalAssets = calculateTotalAssets(debtor, this.state.ownedProperties);
    if (totalAssets < 0) {
      this.bankruptPlayer(debtor, creditorId);
    } else {
      // Player needs to raise money (mortgage/sell) — MVP: auto-sell
      this.autoRaiseMoney(debtor);
      if (debtor.money < 0) this.bankruptPlayer(debtor, creditorId);
    }
  }

  private autoRaiseMoney(p: PlayerState) {
    // Sell houses first
    for (const op of this.state.ownedProperties.filter(o => o.ownerId === p.id && o.houses > 0)) {
      while (op.houses > 0 && p.money < 0) {
        const tile = TILES[op.tileIndex] as PropertyTile;
        op.houses--;
        p.money += Math.floor(tile.houseCost / 2);
      }
    }
    // Then mortgage
    for (const op of this.state.ownedProperties.filter(o => o.ownerId === p.id && !o.mortgaged)) {
      if (p.money >= 0) break;
      const tile = TILES[op.tileIndex];
      if ('mortgage' in tile) {
        op.mortgaged = true;
        p.money += tile.mortgage;
      }
    }
  }

  private bankruptPlayer(p: PlayerState, creditorId: string | null) {
    p.bankrupt = true;
    this.log('system', `${p.name} is BANKRUPT!`, p.id);

    if (creditorId) {
      // Transfer all assets to creditor
      const creditor = this.player(creditorId)!;
      for (const op of this.state.ownedProperties.filter(o => o.ownerId === p.id)) {
        op.ownerId = creditorId;
        creditor.properties.push(op.tileIndex);
      }
      creditor.money += Math.max(0, p.money);
      creditor.getOutOfJailCards += p.getOutOfJailCards;
    } else {
      // Return to bank (remove ownership)
      this.state.ownedProperties = this.state.ownedProperties.filter(o => o.ownerId !== p.id);
    }
    p.properties = [];
    p.money = 0;
    p.getOutOfJailCards = 0;

    this.checkGameOver();
  }

  private checkGameOver() {
    const alive = this.activePlayers();
    if (alive.length <= 1) {
      this.state.phase = 'finished';
      this.state.winnerId = alive.length === 1 ? alive[0].id : null;
      this.clearTurnTimer();
      if (alive.length === 1) {
        this.log('system', `🏆 ${alive[0].name} wins the game!`);
      }
      this.emit();
    }
  }

  /* ── chat ── */
  chat(playerId: string, text: string) {
    const p = this.player(playerId);
    if (!p) return;
    const clean = text.slice(0, 200).trim();
    if (!clean) return;
    this.log('chat', `${p.name}: ${clean}`, playerId);
    this.emit();
  }

  /* ── public state (hide decks) ── */
  getPublicState(): GameState {
    return { ...this.state };
  }

  /* ── cleanup ── */
  destroy() {
    this.clearTurnTimer();
  }
}
