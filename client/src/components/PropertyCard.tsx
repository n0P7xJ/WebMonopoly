import { useStore } from '../store';
import { TILES } from '@shared/board';
import { COLOR_GROUP_CSS, PropertyTile } from '@shared/types';

export function PropertyCard({ tileIndex }: { tileIndex: number }) {
  const setSelectedTile = useStore(s => s.setSelectedTile);
  const gameState = useStore(s => s.gameState);
  const tile = TILES[tileIndex];
  if (!tile) return null;

  const owned = gameState?.ownedProperties.find(p => p.tileIndex === tileIndex);
  const owner = owned ? gameState?.players.find(p => p.id === owned.ownerId) : null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedTile(null)}>
      <div className="property-card" onClick={e => e.stopPropagation()}>
        {tile.type === 'property' && (
          <div className="pc-color-bar" style={{ backgroundColor: COLOR_GROUP_CSS[tile.colorGroup] }}>
            <span>{tile.name}</span>
          </div>
        )}
        {tile.type !== 'property' && <div className="pc-header">{tile.name}</div>}

        <div className="pc-body">
          {tile.type === 'property' && (
            <>
              <Row label="Price" value={`$${tile.price}`} />
              <div className="pc-divider" />
              <Row label="Rent (base)" value={`$${tile.rent[0]}`} />
              <Row label="With 1 house" value={`$${tile.rent[1]}`} />
              <Row label="With 2 houses" value={`$${tile.rent[2]}`} />
              <Row label="With 3 houses" value={`$${tile.rent[3]}`} />
              <Row label="With 4 houses" value={`$${tile.rent[4]}`} />
              <Row label="With hotel" value={`$${tile.rent[5]}`} />
              <div className="pc-divider" />
              <Row label="House cost" value={`$${tile.houseCost}`} />
              <Row label="Mortgage" value={`$${tile.mortgage}`} />
            </>
          )}

          {tile.type === 'station' && (
            <>
              <Row label="Price" value={`$${tile.price}`} />
              <div className="pc-divider" />
              <Row label="Rent (1 owned)" value="$25" />
              <Row label="Rent (2 owned)" value="$50" />
              <Row label="Rent (3 owned)" value="$100" />
              <Row label="Rent (4 owned)" value="$200" />
              <div className="pc-divider" />
              <Row label="Mortgage" value={`$${tile.mortgage}`} />
            </>
          )}

          {tile.type === 'utility' && (
            <>
              <Row label="Price" value={`$${tile.price}`} />
              <div className="pc-divider" />
              <Row label="1 utility" value="4× dice" />
              <Row label="2 utilities" value="10× dice" />
              <div className="pc-divider" />
              <Row label="Mortgage" value={`$${tile.mortgage}`} />
            </>
          )}

          {tile.type === 'tax' && (
            <Row label="Tax amount" value={`$${tile.amount}`} />
          )}

          {(tile.type === 'go' || tile.type === 'jail' || tile.type === 'free_parking' || tile.type === 'go_to_jail' || tile.type === 'chance' || tile.type === 'chest') && (
            <p className="pc-special">{specialDescription(tile.type)}</p>
          )}

          {owned && (
            <div className="pc-ownership">
              <div className="pc-divider" />
              <Row label="Owner" value={owner?.name ?? '—'} />
              {owned.houses > 0 && <Row label="Buildings" value={owned.houses === 5 ? 'Hotel' : `${owned.houses} house(s)`} />}
              {owned.mortgaged && <div className="pc-mortgaged">MORTGAGED</div>}
            </div>
          )}
        </div>

        <button className="btn-small" onClick={() => setSelectedTile(null)}>Close</button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="pc-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function specialDescription(type: string): string {
  const map: Record<string, string> = {
    go: 'Collect $200 salary as you pass.',
    jail: 'Just visiting — or locked up!',
    free_parking: 'Take a rest. (With house rules, collect fines!)',
    go_to_jail: 'Go directly to Jail!',
    chance: 'Draw a Chance card.',
    chest: 'Draw a Community Chest card.',
  };
  return map[type] ?? '';
}
