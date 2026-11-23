import { expectedQber } from "../lib/bb84";

interface Props {
  /** Current run's f in [0, 1], or null when data was typed by hand. */
  runF: number | null;
  qber: number;
  noise: number;
  threshold: number;
}

const W = 600;
const H = 260;
const PAD = { l: 48, r: 16, t: 16, b: 40 };
const Y_MAX = 0.3;

/** Expected QBER = f/4 versus Eve's intercept fraction f, with the abort line and the current run. */
export function QberChart({ runF, qber, noise, threshold }: Props) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (f: number) => PAD.l + plotW * f;
  const y = (q: number) => PAD.t + plotH * (1 - Math.min(Y_MAX, Math.max(0, q)) / Y_MAX);
  const line = (fn: (f: number) => number) =>
    Array.from({ length: 21 }, (_, i) => i / 20)
      .map((f, i) => `${i ? "L" : "M"}${x(f).toFixed(1)},${y(fn(f)).toFixed(1)}`)
      .join(" ");
  const crossover = threshold * 4;
  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Expected QBER equals f over 4. Abort line at ${(threshold * 100).toFixed(0)} percent. Current run QBER ${(qber * 100).toFixed(2)} percent.`}
      >
        {[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3].map((q) => (
          <g key={q}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(q)} y2={y(q)} className="grid" />
            <text x={PAD.l - 8} y={y(q) + 4} className="axis" textAnchor="end">
              {(q * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={x(f)} y={H - 20} className="axis" textAnchor="middle">
            {(f * 100).toFixed(0)}%
          </text>
        ))}
        <text x={PAD.l + plotW / 2} y={H - 4} className="axis" textAnchor="middle">
          Eve intercept fraction f
        </text>
        <rect x={PAD.l} y={y(Y_MAX)} width={plotW} height={y(threshold) - y(Y_MAX)} className="zone-danger" />
        <path d={`${line((f) => f / 4)} L${x(1)},${y(0)} L${x(0)},${y(0)}Z`} className="series-area" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(threshold)} y2={y(threshold)} className="ref danger" />
        <text x={W - PAD.r - 4} y={y(threshold) - 6} className="axis danger-text" textAnchor="end">
          abort zone ≥ {(threshold * 100).toFixed(0)}%
        </text>
        <line x1={x(crossover)} x2={x(crossover)} y1={y(threshold)} y2={PAD.t + plotH} className="ref faint" />
        <text x={x(crossover) + 4} y={PAD.t + plotH - 6} className="axis">
          f ≈ {(crossover * 100).toFixed(0)}%
        </text>
        {noise > 0 && <path d={line((f) => expectedQber(f, noise))} className="series faint-series" />}
        <path d={line((f) => f / 4)} className="series" />
        {runF !== null && (
          <g>
            <circle cx={x(runF)} cy={y(qber)} r={7} className={`dot ${qber >= threshold ? "danger" : "ok"}`}>
              <title>{`This run: f = ${(runF * 100).toFixed(0)}%, QBER = ${(qber * 100).toFixed(2)}%`}</title>
            </circle>
            {qber > Y_MAX && (
              <text x={x(runF)} y={PAD.t + 12} className="axis" textAnchor="middle">
                ↑ {(qber * 100).toFixed(1)}%
              </text>
            )}
          </g>
        )}
      </svg>
      <figcaption className="chart-legend">
        <span>
          <span className="legend-line" aria-hidden="true" /> expected QBER = f/4 (no noise)
        </span>
        {noise > 0 && (
          <span>
            <span className="legend-line faint" aria-hidden="true" /> with {(noise * 100).toFixed(1)}% channel noise
          </span>
        )}
        <span>
          <span className="legend-dot" aria-hidden="true" /> this run {runF === null ? "(hidden: manual data has no f)" : ""}
        </span>
      </figcaption>
    </figure>
  );
}
