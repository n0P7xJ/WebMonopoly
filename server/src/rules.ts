import {
  Tile, PropertyTile, OwnedProperty, PlayerState, ColorGroup,
  BOARD_SIZE, GO_SALARY
} from '../../shared/types';
import { TILES, STATION_INDICES, UTILITY_INDICES } from '../../shared/board';

/* ── rent ── */
export function calculateRent(
  tileIndex: number,
  owned: OwnedProperty,
  ownedProperties: OwnedProperty[],
  diceTotal: number,
): number {
  if (owned.mortgaged) return 0;
  const tile = TILES[tileIndex];

  if (tile.type === 'property') {
    if (owned.houses > 0) return tile.rent[owned.houses];
    const mono = hasMonopoly(owned.ownerId, tile.colorGroup, ownedProperties);
    return mono ? tile.rent[0] * 2 : tile.rent[0];
  }

  if (tile.type === 'station') {
    const count = STATION_INDICES.filter(si =>
      ownedProperties.some(p => p.tileIndex === si && p.ownerId === owned.ownerId && !p.mortgaged),
    ).length;
    return 25 * Math.pow(2, count - 1);
  }

  if (tile.type === 'utility') {
    const count = UTILITY_INDICES.filter(ui =>
      ownedProperties.some(p => p.tileIndex === ui && p.ownerId === owned.ownerId && !p.mortgaged),
    ).length;
    return count === 1 ? diceTotal * 4 : diceTotal * 10;
  }

  return 0;
}

/* ── monopoly check ── */
export function hasMonopoly(
  playerId: string,
  colorGroup: ColorGroup,
  ownedProperties: OwnedProperty[],
): boolean {
  const groupIndices = TILES.reduce<number[]>((acc, t, i) => {
    if (t.type === 'property' && t.colorGroup === colorGroup) acc.push(i);
    return acc;
  }, []);
  return groupIndices.every(ti =>
    ownedProperties.some(p => p.tileIndex === ti && p.ownerId === playerId),
  );
}

/* ── building ── */
export function canBuildHouse(
  tileIndex: number,
  playerId: string,
  ownedProperties: OwnedProperty[],
): boolean {
  const tile = TILES[tileIndex];
  if (tile.type !== 'property') return false;
  const owned = ownedProperties.find(p => p.tileIndex === tileIndex);
  if (!owned || owned.ownerId !== playerId || owned.mortgaged || owned.houses >= 5) return false;
  if (!hasMonopoly(playerId, tile.colorGroup, ownedProperties)) return false;
  // any property in the group mortgaged?
  const groupMortgaged = ownedProperties.some(
    p =>
      p.ownerId === playerId &&
      p.mortgaged &&
      TILES[p.tileIndex].type === 'property' &&
      (TILES[p.tileIndex] as PropertyTile).colorGroup === tile.colorGroup,
  );
  if (groupMortgaged) return false;
  // even-building rule
  const groupHouses = getGroupHouses(tile.colorGroup, playerId, ownedProperties);
  const minH = Math.min(...groupHouses);
  return owned.houses <= minH;
}

export function canSellHouse(
  tileIndex: number,
  playerId: string,
  ownedProperties: OwnedProperty[],
): boolean {
  const tile = TILES[tileIndex];
  if (tile.type !== 'property') return false;
  const owned = ownedProperties.find(p => p.tileIndex === tileIndex);
  if (!owned || owned.ownerId !== playerId || owned.houses <= 0) return false;
  const groupHouses = getGroupHouses(tile.colorGroup, playerId, ownedProperties);
  const maxH = Math.max(...groupHouses);
  return owned.houses >= maxH;
}

function getGroupHouses(
  colorGroup: ColorGroup,
  playerId: string,
  ownedProperties: OwnedProperty[],
): number[] {
  return TILES.reduce<number[]>((acc, t, i) => {
    if (t.type === 'property' && t.colorGroup === colorGroup) {
      const p = ownedProperties.find(op => op.tileIndex === i && op.ownerId === playerId);
      acc.push(p ? p.houses : 0);
    }
    return acc;
  }, []);
}

/* ── nearest tile ── */
export function findNearestTile(position: number, tileType: 'station' | 'utility'): number {
  const indices = tileType === 'station' ? STATION_INDICES : UTILITY_INDICES;
  for (const idx of indices) {
    if (idx > position) return idx;
  }
  return indices[0]; // wrap around
}

/* ── total assets (for bankruptcy check) ── */
export function calculateTotalAssets(
  player: PlayerState,
  ownedProperties: OwnedProperty[],
): number {
  let total = player.money;
  for (const prop of ownedProperties.filter(p => p.ownerId === player.id)) {
    const tile = TILES[prop.tileIndex];
    if ('price' in tile) {
      if (!prop.mortgaged) total += tile.mortgage;
      if (tile.type === 'property') total += prop.houses * Math.floor(tile.houseCost / 2);
    }
  }
  return total;
}

/* ── helpers ── */
export function isPurchasable(tile: Tile): tile is PropertyTile & { price: number } {
  return tile.type === 'property' || tile.type === 'station' || tile.type === 'utility';
}
