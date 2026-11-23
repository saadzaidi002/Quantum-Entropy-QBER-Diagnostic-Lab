interface Props {
  values: number[];
  threshold: number;
}

const W = 700;
const H = 330;
const PAD = { l: 44, r: 12, t: 14, b: 30 };

/** Autocorrelation r_k for lags 1..K on a -1..1 axis with ±threshold dashed lines. */
export function AutocorrChart({ values, threshold }: Props) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + (plotH * (1 - Math.max(-1, Math.min(1, v)))) / 2;
  const slot = plotW / Math.max(1, values.length);
  const bw = slot * 0.62;
  const flagged = values.map((v) => Math.abs(v) > threshold);
  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Autocorrelation for lags 1 to ${values.length}. ${flagged.filter(Boolean).length} lag(s) above ${threshold}.`}
      >
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? "zero" : "grid"} />
            <text x={PAD.l - 8} y={y(t) + 4} className="axis" textAnchor="end">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <rect x={PAD.l} y={y(1)} width={plotW} height={y(threshold) - y(1)} className="zone-danger" />
        <rect x={PAD.l} y={y(-threshold)} width={plotW} height={y(-1) - y(-threshold)} className="zone-danger" />
        {[threshold, -threshold].map((t) => (
          <line key={t} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="ref warn" />
        ))}
        {values.map((v, i) => {
          const x = PAD.l + i * slot + (slot - bw) / 2;
          const top = Math.min(y(v), y(0));
          const h = Math.max(1, Math.abs(y(v) - y(0)));
          return (
            <g key={i}>
              <rect x={x} y={top} width={bw} height={h} rx={2} className={`bar ${flagged[i] ? "tone-rose" : "tone-cyan"}`}>
                <title>{`r${i + 1} = ${v.toFixed(3)}${flagged[i] ? " (flagged)" : ""}`}</title>
              </rect>
              {flagged[i] && (
                <text x={x + bw / 2} y={v >= 0 ? top - 4 : top + h + 12} className="value flag" textAnchor="middle">
                  !
                </text>
              )}
              <text x={x + bw / 2} y={H - 10} className="axis" textAnchor="middle">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
