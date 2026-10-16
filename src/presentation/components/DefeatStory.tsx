import "./DefeatStory.css";
import type { DefeatStory as Story } from "../../domain/ledger/defeatRules";
import { formatChange, getCauseInfo, getDefeatTip } from "../causes";

const WIDTH = 300;
const HEIGHT = 84;
const PAD = 8;

// The defeat screen's account of a loss: the number that failed over its
// last months against the line it had to hold, what pulled it down, and
// one thing to do differently next time.
export function DefeatStory({ story }: { story: Story }) {
  const { metric, trail, line, losses } = story;
  const show = (v: number) => (metric === "support" ? `${Math.round(v)}%` : `${Math.round(v)}`);

  // Scale to the values shown, the line included, so a slide of a few
  // points still reads as a slide.
  const low = Math.min(line, ...trail) - 4;
  const high = Math.max(line, ...trail) + 4;
  const x = (i: number) => PAD + (i * (WIDTH - 2 * PAD)) / (trail.length - 1);
  const y = (v: number) => PAD + ((high - v) * (HEIGHT - 2 * PAD)) / (high - low);
  const path = trail.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = trail.length - 1;

  return (
    <section className="defeat-story" aria-label="How it happened">
      <h2 className="defeat-story__title">How it happened</h2>

      <figure className="defeat-story__chart">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${metric === "support" ? "Support" : "Stability"} went from ${show(trail[0])} to ${show(trail[last])} over the last ${last} months; it had to stay above ${show(line)}`}
        >
          <line className="defeat-story__line" x1={PAD} x2={WIDTH - PAD} y1={y(line)} y2={y(line)} />
          <path className="defeat-story__trail" d={path} />
          {trail.map((v, i) => (
            <circle key={i} className={i === last ? "defeat-story__end" : "defeat-story__point"} cx={x(i)} cy={y(v)} r={i === last ? 4 : 2.5} />
          ))}
        </svg>
        <figcaption>
          <span>
            {metric === "support" ? "Support" : "Stability"} {show(trail[0])} → <strong>{show(trail[last])}</strong>
          </span>
          <span className="defeat-story__needed">{metric === "support" ? `${show(line)} needed` : "Collapse at 0"}</span>
        </figcaption>
      </figure>

      {losses.length > 0 && (
        <ul className="defeat-story__causes">
          {losses.map(({ cause, value }) => {
            const info = getCauseInfo(metric, cause);
            return (
              <li key={cause} title={info.hint}>
                {info.icon(18)}
                <span>{info.label}</span>
                <span className="defeat-story__amount">{formatChange(metric, value)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="defeat-story__tip">{getDefeatTip(metric, losses[0]?.cause)}</p>
    </section>
  );
}
