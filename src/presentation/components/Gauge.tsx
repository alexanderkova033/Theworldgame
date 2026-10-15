// One bar for the whole game, so every meter reads the same way:
// - stacked fills from the left, each in a tone (good / warn / bad / ...)
// - a capacity notch, and anything past it drawn as a red hatched tail
//   (more people than homes, more workers than jobs) — "over" never looks
//   like "full"
// - background zones (the unrest stages along stability)
// - markers (50% to win, the tax people accept), labelled underneath
// - a hollow diamond for where a number is heading
// - a striped, pulsing stretch for what an action would change, shown
//   while the player points at it (see withPreview)
// - quarter ticks, and fills that ease between values (not with reduced
//   motion — see index.css)
// The meaning is always carried by more than colour: the hatching, the
// notch, the labels, and the numbers printed beside every gauge.
import "./Gauge.css";
import type { CSSProperties } from "react";

export type GaugeTone = "good" | "warn" | "bad" | "neutral" | "accent";

export interface GaugeSegment {
  value: number;
  tone: GaugeTone;
  dashed?: boolean; // an empty-but-counted stretch (jobs nobody fills)
  preview?: boolean; // what an action would add or take away, while it's pointed at
}

export interface GaugeMarker {
  at: number;
  label?: string;
}

export interface GaugeZone {
  from: number;
  to: number;
  tone: GaugeTone;
  label?: string;
  hint?: string;
}

interface GaugeProps {
  max: number; // where the bar's capacity notch sits (a full, not-over bar)
  segments: GaugeSegment[];
  overflow?: number; // past max: drawn as a hatched tail after the notch
  min?: number; // scale start (default 0)
  zones?: GaugeZone[];
  markers?: GaugeMarker[];
  heading?: number; // where it's drifting to
  size?: "sm" | "md" | "lg";
  label: string; // what it shows, for screen readers
}

// Overflow can't push the notch off the bar: the tail is shown at most
// this long relative to the bar's capacity.
const MAX_OVERFLOW_SHARE = 0.5;

export function Gauge({ max, segments, overflow = 0, min = 0, zones, markers, heading, size = "md", label }: GaugeProps) {
  const span = Math.max(0, max - min);
  // No capacity at all (a province with no jobs): the whole bar is overflow.
  const empty = span <= 0;
  const over = empty ? Math.max(0, overflow) : Math.min(Math.max(0, overflow), span * MAX_OVERFLOW_SHARE);
  const total = Math.max(1e-9, span + over);
  const pct = (value: number) => `${(Math.min(Math.max(value - min, 0), total) / total) * 100}%`;
  const width = (value: number) => `${(Math.max(0, value) / total) * 100}%`;

  let left = 0;
  return (
    <div className={`gauge gauge--${size}`} role="img" aria-label={label}>
      <div className="gauge__track">
        {!empty && [0.25, 0.5, 0.75].map((q) => (
          <span key={q} className="gauge__tick" style={{ left: pct(min + span * q) }} />
        ))}
        {segments.map((segment, i) => {
          const style: CSSProperties = { left: width(left), width: width(segment.value) };
          left += Math.max(0, segment.value);
          return <span key={i} className={`gauge__fill is-${segment.tone} ${segment.dashed ? "is-dashed" : ""} ${segment.preview ? "is-preview" : ""}`} style={style} />;
        })}
        {over > 0 && <span className="gauge__overflow" style={{ left: pct(max), width: width(over) }} />}
        {over > 0 && !empty && <span className="gauge__notch" style={{ left: pct(max) }} />}
        {markers?.map((marker) => (
          <span key={marker.at} className="gauge__marker" style={{ left: pct(marker.at) }} />
        ))}
        {heading !== undefined && <span className="gauge__heading" style={{ left: pct(heading) }} />}
      </div>
      {/* Zones as a coloured strip under the bar, so the fill never hides them. */}
      {zones && (
        <div className="gauge__zones" aria-hidden="true">
          {zones.map((zone) => (
            <span
              key={`${zone.from}-${zone.to}`}
              className={`gauge__zone is-${zone.tone}`}
              style={{ left: pct(zone.from), width: width(Math.min(zone.to, max) - Math.max(zone.from, min)) }}
            />
          ))}
        </div>
      )}
      {(markers?.some((m) => m.label) || zones?.some((z) => z.label)) && (
        <div className="gauge__labels" aria-hidden="true">
          {zones
            ?.filter((z) => z.label)
            .map((zone) => (
              <span
                key={`z-${zone.from}`}
                className={`gauge__zone-label is-${zone.tone}`}
                style={{ left: pct((zone.from + Math.min(zone.to, max)) / 2) }}
                title={zone.hint}
              >
                {zone.label}
              </span>
            ))}
          {markers
            ?.filter((m) => m.label)
            .map((marker) => (
              <span key={`m-${marker.at}`} className="gauge__marker-label" style={{ left: pct(marker.at) }}>
                {marker.label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// One filled stretch, plus what a change of delta would do to it: added
// on in green, or the part it would take away striped in red.
export function withPreview(value: number, tone: GaugeTone, delta: number | null, max = Infinity): GaugeSegment[] {
  if (!delta) return [{ value, tone }];
  if (delta > 0) return [{ value, tone }, { value: Math.min(delta, max - value), tone: "good", preview: true }];
  const lost = Math.min(-delta, value);
  return [{ value: value - lost, tone }, { value: lost, tone: "bad", preview: true }];
}

// A change either way from a centre line — grows right in green for a gain,
// left in red for a loss (the side carries the sign, as well as the colour).
export function SignedBar({ value, scale, label }: { value: number; scale: number; label: string }) {
  const share = Math.min(1, Math.abs(value) / Math.max(1e-9, scale)) * 50;
  return (
    <div className="signed-bar" role="img" aria-label={label}>
      <span className={`signed-bar__fill ${value >= 0 ? "is-gain" : "is-loss"}`} style={{ width: `${share}%` }} />
    </div>
  );
}
