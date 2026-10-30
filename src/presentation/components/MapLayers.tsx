// Everything drawn on the map itself (see MapLayers below), apart from the
// panel that holds it, pans and zooms it (MapPanel).
import { memo, useMemo, type Dispatch, type SetStateAction } from "react";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import { getNation, getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { getParty } from "../../domain/parties/partyRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding } from "../../domain/provinces/types";
import { RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { MapSettlements, type UnderwayBuilding } from "./MapSettlements";
import { nationShapes } from "../nationFrontiers";
import type { ProvinceStatus } from "../../application/getProvinceOverview";
import { UnrestStageIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import { CrisisIcon } from "./CrisisIcon";
import { SeasonLand, SeasonSea } from "./MapSeasons";

import { TERRAIN_PATTERN, TERRAIN_TINT, inkier, washColor, roadLineWidth, OCEAN_RECT, type MapMode, MODE_COLORS, getModeLevel } from "./mapCommon";
import { Waterlines, CompassRose, NationName, CapitalBadge, StatusFlag } from "./MapDecor";

interface MapLayersProps {
  nation: Nation;
  buildingsByProvince: Map<string, PlacedBuilding[]>;
  underway: UnderwayBuilding[];
  roadCountByProvince: Map<string, number>;
  selectedProvinceId: string;
  hoveredProvinceId: string | null;
  zoomedIn: boolean; // past LABEL_ZOOM_THRESHOLD: every province labeled, nation names hidden
  scoutedIslandIds: string[];
  expeditionIslandIds: string[];
  selectedIslandId: string | null;
  foreignRulers: Record<string, string>;
  provinceStatus: Record<string, ProvinceStatus>;
  mapMode: MapMode;
  onProvinceClick: (provinceId: string) => void;
  onProvinceKeySelect: (provinceId: string) => void;
  onIslandClick: (islandId: string) => void;
  venturesOpen: boolean;
  onHoverProvince: Dispatch<SetStateAction<string | null>>;
  lostProvinceIds: string[];
  settledIslandIds: string[];
  foreignIslands: Record<string, string>;
}

// Everything drawn on the map, as its own memoized component: panning and
// zooming only change the <svg>'s viewBox in MapPanel, so none of these
// hundreds of nodes are re-rendered while the map moves — only when what's
// on it changes (a building, a selection, a hover, crossing the label zoom).
export const MapLayers = memo(function MapLayers({
  nation,
  buildingsByProvince,
  underway,
  roadCountByProvince,
  selectedProvinceId,
  hoveredProvinceId,
  zoomedIn,
  scoutedIslandIds,
  expeditionIslandIds,
  selectedIslandId,
  foreignRulers,
  provinceStatus,
  mapMode,
  onProvinceClick,
  onProvinceKeySelect,
  onIslandClick,
  venturesOpen,
  onHoverProvince,
  lostProvinceIds,
  settledIslandIds,
  foreignIslands,
}: MapLayersProps) {
  const { coastPath, provinces, islands } = MAP_GEOMETRY;
  // Yours: your nation's provinces and the islands you settled, unless
  // one broke away and is free.
  const owns = (provinceId: string) =>
    (nation.provinceIds.includes(provinceId) || settledIslandIds.includes(provinceId)) && !lostProvinceIds.includes(provinceId);
  // Everywhere a province of yours can be: the mainland and held islands.
  const places = [...provinces, ...islands.filter((island) => owns(island.id))];
  const capital = provinces.find((p) => p.id === nation.capitalProvinceId);
  const ownedIds = useMemo(
    () => [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands].map((p) => p.id).filter((id) => (nation.provinceIds.includes(id) || settledIslandIds.includes(id)) && !lostProvinceIds.includes(id)),
    [nation.provinceIds, settledIslandIds, lostProvinceIds],
  );
  // Frontiers and nation names follow the land each nation holds today.
  const shapes = nationShapes(lostProvinceIds);

  return (
    <>
    <defs>
      {/* Each nation's shape, to keep its border band on its own side
          of the frontier. */}
      {shapes.map((shape) => (
        <clipPath id={`nation-clip-${shape.nationId}`} key={shape.nationId}>
          <path d={shape.outline} />
        </clipPath>
      ))}

      {/* The open sea, engraved: fine level lines ruled across the whole
          chart, broken here and there by a little stroke of swell. */}
      <pattern id="ocean-engraving" width={120} height={12} patternUnits="userSpaceOnUse">
        <line x1={0} y1={6} x2={120} y2={6} stroke="#4c6a78" strokeWidth={0.7} opacity={0.32} />
      </pattern>
      <pattern id="ocean-swell" width={260} height={150} patternUnits="userSpaceOnUse">
        <path d="M20,40 q10,-6 20,0 t20,0" stroke="#3e5a68" strokeWidth={1} fill="none" opacity={0.4} strokeLinecap="round" />
        <path d="M150,115 q10,-6 20,0 t20,0" stroke="#3e5a68" strokeWidth={1} fill="none" opacity={0.4} strokeLinecap="round" />
      </pattern>

      {/* Terrain, drawn as an engraver would, each with its own shape so the
          four tell apart even without their colour: rows of shaded molehills,
          clumps of round trees, grass tufts over faint furrows, and the short
          level dashes of salt-marsh along the coast. */}
      <pattern id="terrain-hills" width={84} height={60} patternUnits="userSpaceOnUse">
        {[
          [6, 24],
          [48, 54],
        ].map(([x, y]) => (
          <g key={x}>
            <path d={`M${x},${y} Q${x + 10},${y - 16} ${x + 20},${y}`} fill="#c2a473" stroke="#4a3826" strokeWidth={0.9} />
            <path d={`M${x + 12},${y - 8} L${x + 15},${y - 1} M${x + 15},${y - 5} L${x + 17},${y - 1}`} stroke="#4a3826" strokeWidth={0.7} />
          </g>
        ))}
      </pattern>
      <pattern id="terrain-forest" width={60} height={52} patternUnits="userSpaceOnUse">
        {[
          [12, 16, 5],
          [21, 13, 4.5],
          [44, 42, 5],
        ].map(([x, y, r]) => (
          <g key={x}>
            <path d={`M${x},${y + r} L${x},${y + r + 3.5}`} stroke="#4a3826" strokeWidth={0.8} />
            <circle cx={x} cy={y} r={r} fill="#7d8a60" stroke="#3a4228" strokeWidth={0.8} />
          </g>
        ))}
      </pattern>
      <pattern id="terrain-coast" width={48} height={22} patternUnits="userSpaceOnUse">
        <path d="M4,7 H16 M28,7 H40 M16,16 H28" stroke="#4f6670" strokeWidth={0.9} strokeLinecap="round" />
      </pattern>
      {/* Map-mode hatching: diagonal lines for "tight", a cross-hatch for
          "trouble" — so the shading never relies on colour alone. */}
      <pattern id="mode-hatch-warn" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={14} stroke="#2b1d12" strokeWidth={2.4} opacity={0.5} />
      </pattern>
      <pattern id="mode-hatch-alert" width={11} height={11} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={11} stroke="#2b1d12" strokeWidth={2.2} opacity={0.55} />
        <line x1={0} y1={0} x2={11} y2={0} stroke="#2b1d12" strokeWidth={2.2} opacity={0.55} />
      </pattern>
      <pattern id="terrain-plains" width={56} height={44} patternUnits="userSpaceOnUse">
        <path d="M8,14 L7,9 M10,14 L10,8 M12,14 L13,9 M38,38 L37,33 M40,38 L40,32 M42,38 L43,33" stroke="#5c4a24" strokeWidth={0.8} strokeLinecap="round" />
      </pattern>
    </defs>

    <rect x={OCEAN_RECT.x} y={OCEAN_RECT.y} width={OCEAN_RECT.width} height={OCEAN_RECT.height} className="map-panel__sea" />
    {["ocean-engraving", "ocean-swell"].map((id) => (
      <rect
        key={id}
        x={OCEAN_RECT.x}
        y={OCEAN_RECT.y}
        width={OCEAN_RECT.width}
        height={OCEAN_RECT.height}
        fill={`url(#${id})`}
        pointerEvents="none"
      />
    ))}
    <SeasonSea x={OCEAN_RECT.x} y={OCEAN_RECT.y} width={OCEAN_RECT.width} height={OCEAN_RECT.height} />

    <CompassRose />

    {/* Water-lining round every shore, then a blue wash along it, the way
        a colourist went over the coasts of a printed chart. All drawn
        before the land, so only the water side shows. */}
    <g pointerEvents="none">
      <Waterlines d={coastPath} />
      {islands.map((land) => (
        <Waterlines key={`${land.id}-waterlines`} d={land.path} />
      ))}
      <path d={coastPath} className="map-panel__shallows" />
      {islands.map((land) => (
        <path key={`${land.id}-shallows`} d={land.path} className="map-panel__shallows" />
      ))}
    </g>

    {/* Bare paper under the continent: each nation's colour is a
        translucent wash laid over it. */}
    <path d={coastPath} className="map-panel__land-paper" pointerEvents="none" />

    {/* Other landmasses: unowned, but chartable via ventures. */}
    <g>
      {islands.map((land) => {
        if (owns(land.id)) {
          const isSelected = land.id === selectedProvinceId;
          return (
            <path
              key={land.id}
              d={land.path}
              className={["map-panel__province", "is-owned", isSelected ? "is-selected" : ""].join(" ")}
              onClick={() => onProvinceClick(land.id)}
              tabIndex={0}
              role="button"
              aria-label={`${land.name}${isSelected ? ", selected" : ""}`}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onProvinceKeySelect(land.id);
                }
              }}
              onMouseEnter={() => onHoverProvince(land.id)}
              onMouseLeave={() => onHoverProvince((prev) => (prev === land.id ? null : prev))}
            >
              <title>{land.name} (yours)</title>
            </path>
          );
        }
        const isScouted = scoutedIslandIds.includes(land.id);
        const isExpeditionActive = expeditionIslandIds.includes(land.id);
        const isSelected = land.id === selectedIslandId;
        const holder = foreignIslands[land.id] ? getNation(foreignIslands[land.id]) : undefined;
        const status = holder
          ? `${holder.name}'s`
          : lostProvinceIds.includes(land.id)
          ? "broke away: free. March regiments here to take it back"
          : isScouted
            ? "charted"
            : isExpeditionActive
              ? "venture under way"
              : venturesOpen
                ? "uncharted: click to charter a venture"
                : "uncharted";
        return (
          <path
            key={land.id}
            d={land.path}
            className={[
              "map-panel__unclaimed-land",
              venturesOpen ? "map-panel__unclaimed-land--clickable" : "",
              isSelected ? "is-selected" : "",
            ].join(" ")}
            onClick={venturesOpen || lostProvinceIds.includes(land.id) || holder ? () => onIslandClick(land.id) : undefined}
          >
            <title>
              {land.name} ({status})
            </title>
          </path>
        );
      })}
      {/* A neighbour's island: their colour washed over the paper, as their
          provinces are on the continent. */}
      {islands.map((land) =>
        foreignIslands[land.id] ? (
          <path
            key={`${land.id}-holder`}
            d={land.path}
            fill={washColor(getNation(foreignIslands[land.id]).color)}
            fillOpacity={0.3}
            pointerEvents="none"
          />
        ) : null,
      )}
      {/* A hint of vegetation so unclaimed islands read as actual
          islands, not flat brown blobs. */}
      {islands.map((land) =>
        owns(land.id) ? (
          <path key={`${land.id}-terrain`} d={land.path} fill={TERRAIN_PATTERN[land.terrain]} opacity={0.5} pointerEvents="none" />
        ) : (
          <path key={`${land.id}-terrain`} d={land.path} fill="url(#terrain-forest)" opacity={0.25} pointerEvents="none" />
        ),
      )}
    </g>
    {/* A held island is labelled with your provinces, below. */}
    {islands
      .filter((land) => !owns(land.id))
      .map((land) => (
        <text key={`${land.id}-label`} x={land.labelX} y={land.labelY} className="map-panel__label is-foreign" pointerEvents="none">
          {land.name}
        </text>
      ))}

    <g>
      <path d={coastPath} className="map-panel__coast" />

      {provinces.map((province) => {
        const isOwned = owns(province.id);
        const isFree = lostProvinceIds.includes(province.id);
        const owner = isOwned ? nation : isFree ? undefined : getNationForProvince(province.id);
        const isSelected = isOwned && province.id === selectedProvinceId;
        return (
          <path
            key={province.id}
            d={province.path}
            className={[
              "map-panel__province",
              isOwned ? "is-owned" : "is-foreign",
              isSelected ? "is-selected" : "",
            ].join(" ")}
            style={!isOwned ? { fill: owner ? washColor(owner.color) : "#a8946c" } : undefined}
            onClick={isOwned || isFree ? () => onProvinceClick(province.id) : undefined}
            tabIndex={isOwned ? 0 : undefined}
            role={isOwned ? "button" : undefined}
            aria-label={isOwned ? `${province.name}${isSelected ? ", selected" : ""}` : undefined}
            aria-pressed={isOwned ? isSelected : undefined}
            onKeyDown={
              isOwned
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onProvinceKeySelect(province.id);
                    }
                  }
                : undefined
            }
            onMouseEnter={isOwned ? () => onHoverProvince(province.id) : undefined}
            onMouseLeave={isOwned ? () => onHoverProvince((prev) => (prev === province.id ? null : prev)) : undefined}
          >
            <title>
              {province.name}
              {isOwned ? " (yours)" : isFree ? " (broke away: free. March regiments here to take it back)" : owner ? ` (${owner.name})` : " (unclaimed)"}
            </title>
          </path>
        );
      })}

      {/* Terrain tint: a faint multiply wash in the terrain's own
          color, underneath its texture — the two together make hills,
          forest, plains, and coast actually look different from each
          other, instead of only differing by which pattern is
          stamped on the same flat political fill. */}
      {provinces.map((province) => {
        const isOwned = owns(province.id);
        return (
          <path
            key={`${province.id}-tint`}
            d={province.path}
            fill={TERRAIN_TINT[province.terrain]}
            opacity={isOwned ? 0.08 : 0.06}
            className="map-panel__terrain-tint"
            pointerEvents="none"
          />
        );
      })}

      {/* Terrain props for every province — a quiet landscape cue
          (sparse trees/rocks/wheat/surf), not a competing pattern.
          Owned provinces get them a little clearer, foreign ones
          quieter still. */}
      {provinces.map((province) => {
        const isOwned = owns(province.id);
        return (
          <path
            key={`${province.id}-terrain`}
            d={province.path}
            fill={TERRAIN_PATTERN[province.terrain]}
            opacity={isOwned ? 0.5 : 0.35}
            pointerEvents="none"
          />
        );
      })}

      <SeasonLand />

      {/* Map modes (HOI4-style): your provinces shaded by how their homes,
          jobs or order stand — three steps, each with its own hatching.
          Driven by the same coarse province status as the info-bar flags,
          so this only redraws when a province tips from one step to the
          next. No filters, just fills. */}
      {mapMode !== "political" &&
        places.map((province) => {
          const status = provinceStatus[province.id];
          // Other nations fade back, so their colours can't be read as a step.
          if (!status) return <path key={`${province.id}-mode`} d={province.path} fill="#c9b083" opacity={0.75} pointerEvents="none" />;
          const level = getModeLevel(mapMode, status);
          return (
            <g key={`${province.id}-mode`} pointerEvents="none">
              <path d={province.path} fill={MODE_COLORS[level]} opacity={0.6} />
              {level !== "ok" && <path d={province.path} fill={`url(#mode-hatch-${level})`} />}
            </g>
          );
        })}
    </g>

    {/* National frontiers: a deeper band of each nation's colour just
        inside its edge, as a colourist ran the brush along a border, and a
        dash-and-dot ink line on the frontier itself. */}
    <g pointerEvents="none">
      {shapes.map((shape) => (
        <path
          key={`${shape.nationId}-border`}
          d={shape.frontier}
          clipPath={`url(#nation-clip-${shape.nationId})`}
          stroke={shape.color}
          strokeOpacity={shape.nationId === nation.id ? 0.55 : 0.4}
          className="map-panel__nation-border"
        />
      ))}
      {shapes.map((shape) => (
        <path key={`${shape.nationId}-frontier`} d={shape.frontier} className="map-panel__nation-frontier" />
      ))}
    </g>

    {/* Road network: every road built in the capital grows its hub;
        every road built elsewhere thickens the single line connecting
        that province to the capital, with a "×N" badge carrying the
        exact count — a clean, single connection per province instead
        of a fan of parallel lines. */}
    {capital &&
      [...roadCountByProvince.entries()].map(([provinceId, count]) => {
        const province = provinces.find((p) => p.id === provinceId);
        if (!province) return null;

        if (provinceId === nation.capitalProvinceId) {
          return (
            <g key={`road-hub-${provinceId}`}>
              <circle
                cx={province.labelX}
                cy={province.labelY - 24}
                r={Math.min(2.5 + count * 1.2, 10)}
                className="map-panel__road-hub"
              />
              {count > 1 && (
                <text x={province.labelX + 14} y={province.labelY - 20} className="map-panel__road-count">
                  ×{count}
                </text>
              )}
            </g>
          );
        }

        const width = roadLineWidth(count);

        return (
          <g key={`road-${provinceId}`}>
            <line
              x1={capital.labelX}
              y1={capital.labelY}
              x2={province.labelX}
              y2={province.labelY}
              className="map-panel__road-line-base"
              style={{ strokeWidth: width }}
            />
            <line
              x1={capital.labelX}
              y1={capital.labelY}
              x2={province.labelX}
              y2={province.labelY}
              className="map-panel__road-line-top"
              style={{ strokeWidth: width * 0.4 }}
            />
            {count > 1 && (
              <text
                x={(capital.labelX + province.labelX) / 2}
                y={(capital.labelY + province.labelY) / 2 - 8}
                className="map-panel__road-count"
              >
                ×{count}
              </text>
            )}
          </g>
        );
      })}

    <MapSettlements provinceIds={ownedIds} buildingsByProvince={buildingsByProvince} underway={underway} provinceStatus={provinceStatus} />

    {/* Big, spaced-out nation names across each country (EU4-style),
        with the party currently ruling each neighbor underneath. They
        give way to the per-province labels once zoomed in. */}
    {!zoomedIn && (
      <g pointerEvents="none">
        {shapes.map((shape) => {
          const isYou = shape.nationId === nation.id;
          const rulerId = foreignRulers[shape.nationId];
          const ruler = rulerId ? getParty(rulerId) : null;
          return (
            <NationName
              key={`${shape.nationId}-name`}
              x={shape.labelX}
              y={shape.labelY}
              width={shape.labelWidth}
              name={shape.name}
              isYou={isYou}
              party={ruler ? { name: ruler.name, fill: inkier(ruler.color, 0.3) } : null}
            />
          );
        })}
      </g>
    )}

    {places.map((province) => {
      const isCapital = province.id === nation.capitalProvinceId;
      // The continent packs a lot of small provinces close together —
      // at the fully-zoomed-out default view, every name label at full
      // size collides with its neighbors into unreadable clutter,
      // so only the province the player's attention is already on
      // (selected/hovered) stays labeled until they zoom in past
      // LABEL_ZOOM_THRESHOLD, same as EU4/HOI4-style province maps.
      const isFocused = province.id === selectedProvinceId || province.id === hoveredProvinceId;
      const showLabel = isCapital || isFocused || zoomedIn;
      if (!showLabel) return null;
      return (
        <g key={`${province.id}-label`}>
          {isCapital && <CapitalBadge x={province.labelX} y={province.labelY - 13} />}
          <text
            x={province.labelX}
            y={province.labelY}
            className={`map-panel__label ${owns(province.id) ? "" : "is-foreign"}`}
            pointerEvents="none"
          >
            {province.name}
          </text>
        </g>
      );
    })}

    {/* Province info bar, on its own translucent backing so it reads
        clearly whatever lies underneath. Zoomed out, it appears only on a
        province with something wrong, and shows only that — broken
        buildings, short homes or work, unrest. Zoom in, or point at or pick
        a province, and it adds what the province produces. What's built
        there stands on the land itself (MapSettlements). */}
    {places.map((province) => {
      if (!owns(province.id)) return null;

      const buildings = buildingsByProvince.get(province.id) ?? [];
      // Held by rebels is not broken: the banner says why they stand idle.
      const brokenCount = buildings.filter((b) => !isWorking(b) && b.condition !== "seized" && b.condition !== "ruined").length;
      // Only what's wrong gets a flag: tight or overflowing homes, short
      // or idle hands, unrest. A quiet province shows none.
      const status = provinceStatus[province.id];
      const flags: Array<"crisis" | "homes" | "jobs" | "stage"> = [];
      if (status?.crisis) flags.push("crisis");
      if (status && status.homes !== "ok") flags.push("homes");
      if (status && status.jobs !== "ok") flags.push("jobs");
      if (status && status.stage !== "calm") flags.push("stage");

      const showDetail = zoomedIn || province.id === selectedProvinceId || province.id === hoveredProvinceId;
      if (!showDetail && flags.length === 0 && brokenCount === 0) return null;
      const lead = showDetail ? 1 : 0; // the resource slot, when shown

      const itemWidth = 20;
      const itemCount = lead + (brokenCount > 0 ? 1 : 0) + flags.length; // resource + a broken marker + the flags
      const barWidth = itemCount * itemWidth + 6;
      const barX = province.labelX - barWidth / 2;
      const barY = province.labelY + 10;
      const itemCenterY = barY + 11;

      return (
        <g key={`${province.id}-info`} pointerEvents="none">
          <rect x={barX} y={barY} width={barWidth} height={22} rx={5} className="map-panel__info-bar" />
          {showDetail && (
            <ResourceIcon
              type={RESOURCE_BY_TERRAIN[province.terrain]}
              x={barX + itemWidth / 2 + 3}
              y={itemCenterY}
              size={7}
            />
          )}
          {brokenCount > 0 && (
            <g>
              <circle cx={barX + itemWidth * lead + itemWidth / 2 + 3} cy={itemCenterY} r={7} className="map-panel__broken-marker" />
              <text x={barX + itemWidth * lead + itemWidth / 2 + 3} y={itemCenterY + 3.5} className="map-panel__broken-count">
                !
              </text>
            </g>
          )}
          {flags.map((flag, index) => {
            const cx = barX + itemWidth * (lead + (brokenCount > 0 ? 1 : 0) + index) + itemWidth / 2 + 3;
            if (flag === "crisis") return <CrisisIcon key={flag} kind={status.crisis!} size={15} x={cx} y={itemCenterY} />;
            if (flag === "stage") {
              return (
                <g key={flag} transform={`translate(${cx - 7} ${itemCenterY - 7})`}>
                  {status.risen ? <StatIcon type="uprising" size={14} /> : <UnrestStageIcon stage={status.stage} size={14} />}
                </g>
              );
            }
            const level = flag === "homes" ? (status.homes === "over" ? "alert" : "warn") : status.jobs === "jobless" ? "alert" : "warn";
            return <StatusFlag key={flag} kind={flag} level={level} cx={cx} cy={itemCenterY} />;
          })}
        </g>
      );
    })}
    </>
  );
});

