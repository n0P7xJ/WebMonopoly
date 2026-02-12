import { Tile, GameCard } from './types';

export const TILES: Tile[] = [
  /* 0  */ { type: 'go', name: 'GO' },
  /* 1  */ { type: 'property', name: 'Property 1', price: 60, colorGroup: 'brown', rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30 },
  /* 2  */ { type: 'chest', name: 'Community Chest' },
  /* 3  */ { type: 'property', name: 'Property 2', price: 60, colorGroup: 'brown', rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30 },
  /* 4  */ { type: 'tax', name: 'Income Tax', amount: 200 },
  /* 5  */ { type: 'station', name: 'North Station', price: 200, mortgage: 100 },
  /* 6  */ { type: 'property', name: 'Property 3', price: 100, colorGroup: 'light_blue', rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  /* 7  */ { type: 'chance', name: 'Chance' },
  /* 8  */ { type: 'property', name: 'Property 4', price: 100, colorGroup: 'light_blue', rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  /* 9  */ { type: 'property', name: 'Property 5', price: 120, colorGroup: 'light_blue', rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60 },
  /* 10 */ { type: 'jail', name: 'Jail / Just Visiting' },
  /* 11 */ { type: 'property', name: 'Property 6', price: 140, colorGroup: 'pink', rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  /* 12 */ { type: 'utility', name: 'Electric Utility', price: 150, mortgage: 75 },
  /* 13 */ { type: 'property', name: 'Property 7', price: 140, colorGroup: 'pink', rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  /* 14 */ { type: 'property', name: 'Property 8', price: 160, colorGroup: 'pink', rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80 },
  /* 15 */ { type: 'station', name: 'East Station', price: 200, mortgage: 100 },
  /* 16 */ { type: 'property', name: 'Property 9', price: 180, colorGroup: 'orange', rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  /* 17 */ { type: 'chest', name: 'Community Chest' },
  /* 18 */ { type: 'property', name: 'Property 10', price: 180, colorGroup: 'orange', rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  /* 19 */ { type: 'property', name: 'Property 11', price: 200, colorGroup: 'orange', rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100 },
  /* 20 */ { type: 'free_parking', name: 'Free Parking' },
  /* 21 */ { type: 'property', name: 'Property 12', price: 220, colorGroup: 'red', rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  /* 22 */ { type: 'chance', name: 'Chance' },
  /* 23 */ { type: 'property', name: 'Property 13', price: 220, colorGroup: 'red', rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  /* 24 */ { type: 'property', name: 'Property 14', price: 240, colorGroup: 'red', rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120 },
  /* 25 */ { type: 'station', name: 'South Station', price: 200, mortgage: 100 },
  /* 26 */ { type: 'property', name: 'Property 15', price: 260, colorGroup: 'yellow', rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  /* 27 */ { type: 'property', name: 'Property 16', price: 260, colorGroup: 'yellow', rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  /* 28 */ { type: 'utility', name: 'Water Utility', price: 150, mortgage: 75 },
  /* 29 */ { type: 'property', name: 'Property 17', price: 280, colorGroup: 'yellow', rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140 },
  /* 30 */ { type: 'go_to_jail', name: 'Go To Jail' },
  /* 31 */ { type: 'property', name: 'Property 18', price: 300, colorGroup: 'green', rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  /* 32 */ { type: 'property', name: 'Property 19', price: 300, colorGroup: 'green', rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  /* 33 */ { type: 'chest', name: 'Community Chest' },
  /* 34 */ { type: 'property', name: 'Property 20', price: 320, colorGroup: 'green', rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160 },
  /* 35 */ { type: 'station', name: 'West Station', price: 200, mortgage: 100 },
  /* 36 */ { type: 'chance', name: 'Chance' },
  /* 37 */ { type: 'property', name: 'Property 21', price: 350, colorGroup: 'dark_blue', rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175 },
  /* 38 */ { type: 'tax', name: 'Luxury Tax', amount: 100 },
  /* 39 */ { type: 'property', name: 'Property 22', price: 400, colorGroup: 'dark_blue', rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200 },
];

export const STATION_INDICES = [5, 15, 25, 35];
export const UTILITY_INDICES = [12, 28];

// ===== CHANCE CARDS =====
export const CHANCE_CARDS: GameCard[] = [
  { id: 'ch1', deck: 'chance', text: 'Advance to GO. Collect $200.', action: { type: 'move_to', position: 0, collectGo: true } },
  { id: 'ch2', deck: 'chance', text: 'Advance to Property 14. If you pass GO, collect $200.', action: { type: 'move_to', position: 24, collectGo: true } },
  { id: 'ch3', deck: 'chance', text: 'Advance to Property 12. If you pass GO, collect $200.', action: { type: 'move_to', position: 11, collectGo: true } },
  { id: 'ch4', deck: 'chance', text: 'Advance to the nearest Station.', action: { type: 'advance_to_nearest', tileType: 'station' } },
  { id: 'ch5', deck: 'chance', text: 'Advance to the nearest Station.', action: { type: 'advance_to_nearest', tileType: 'station' } },
  { id: 'ch6', deck: 'chance', text: 'Advance to the nearest Utility.', action: { type: 'advance_to_nearest', tileType: 'utility' } },
  { id: 'ch7', deck: 'chance', text: 'Bank pays you $50.', action: { type: 'collect', amount: 50 } },
  { id: 'ch8', deck: 'chance', text: 'Get Out of Jail Free.', action: { type: 'get_out_of_jail' } },
  { id: 'ch9', deck: 'chance', text: 'Go back 3 spaces.', action: { type: 'move_back', spaces: 3 } },
  { id: 'ch10', deck: 'chance', text: 'Go to Jail. Do not pass GO.', action: { type: 'go_to_jail' } },
  { id: 'ch11', deck: 'chance', text: 'Make general repairs: $25 per house, $100 per hotel.', action: { type: 'repairs', perHouse: 25, perHotel: 100 } },
  { id: 'ch12', deck: 'chance', text: 'Pay poor tax of $15.', action: { type: 'pay', amount: 15 } },
  { id: 'ch13', deck: 'chance', text: 'Advance to North Station. If you pass GO, collect $200.', action: { type: 'move_to', position: 5, collectGo: true } },
  { id: 'ch14', deck: 'chance', text: 'You have been elected chairman. Pay each player $50.', action: { type: 'pay_each', amount: 50 } },
  { id: 'ch15', deck: 'chance', text: 'Your building loan matures. Collect $150.', action: { type: 'collect', amount: 150 } },
  { id: 'ch16', deck: 'chance', text: 'You have won a crossword competition. Collect $100.', action: { type: 'collect', amount: 100 } },
];

// ===== COMMUNITY CHEST CARDS =====
export const COMMUNITY_CHEST_CARDS: GameCard[] = [
  { id: 'cc1', deck: 'chest', text: 'Advance to GO. Collect $200.', action: { type: 'move_to', position: 0, collectGo: true } },
  { id: 'cc2', deck: 'chest', text: 'Bank error in your favor. Collect $200.', action: { type: 'collect', amount: 200 } },
  { id: 'cc3', deck: 'chest', text: "Doctor's fee. Pay $50.", action: { type: 'pay', amount: 50 } },
  { id: 'cc4', deck: 'chest', text: 'From sale of stock you get $50.', action: { type: 'collect', amount: 50 } },
  { id: 'cc5', deck: 'chest', text: 'Get Out of Jail Free.', action: { type: 'get_out_of_jail' } },
  { id: 'cc6', deck: 'chest', text: 'Go to Jail. Do not pass GO.', action: { type: 'go_to_jail' } },
  { id: 'cc7', deck: 'chest', text: 'Holiday fund matures. Collect $100.', action: { type: 'collect', amount: 100 } },
  { id: 'cc8', deck: 'chest', text: 'Income tax refund. Collect $20.', action: { type: 'collect', amount: 20 } },
  { id: 'cc9', deck: 'chest', text: 'It is your birthday. Collect $10 from every player.', action: { type: 'collect_from_each', amount: 10 } },
  { id: 'cc10', deck: 'chest', text: 'Life insurance matures. Collect $100.', action: { type: 'collect', amount: 100 } },
  { id: 'cc11', deck: 'chest', text: 'Pay hospital fees of $100.', action: { type: 'pay', amount: 100 } },
  { id: 'cc12', deck: 'chest', text: 'Pay school fees of $50.', action: { type: 'pay', amount: 50 } },
  { id: 'cc13', deck: 'chest', text: 'Receive $25 consultancy fee.', action: { type: 'collect', amount: 25 } },
  { id: 'cc14', deck: 'chest', text: 'Street repair assessment: $40 per house, $115 per hotel.', action: { type: 'repairs', perHouse: 40, perHotel: 115 } },
  { id: 'cc15', deck: 'chest', text: 'You have won second prize in a beauty contest. Collect $10.', action: { type: 'collect', amount: 10 } },
  { id: 'cc16', deck: 'chest', text: 'You inherit $100.', action: { type: 'collect', amount: 100 } },
];

/**
 * Board layout — maps tile index to CSS-grid position { row, col } (1-based, 11×11).
 * Bottom-right = GO, clockwise.
 */
export function tileGridPosition(index: number): { row: number; col: number } {
  if (index <= 10) return { row: 11, col: 11 - index };           // bottom row, right→left
  if (index <= 19) return { row: 11 - (index - 10), col: 1 };     // left col, bottom→top
  if (index <= 30) return { row: 1, col: index - 19 };            // top row, left→right
  return { row: index - 29, col: 11 };                             // right col, top→bottom
}
