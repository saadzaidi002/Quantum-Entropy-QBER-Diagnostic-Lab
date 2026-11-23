import { useId } from "react";

export interface Bar {
  label: string;
  value: number;
  tone: "cyan" | "amber" | "emerald" | "rose";
}

interface Props {
  bars: Bar[];
  /** Dashed reference line value in [0, 1]. */
  reference?: number;
  title: string;
}

const W = 600;
const H = 240;
const PAD = { l: 44, r: 12, t: 22, b: 36 };

/** Probability bar chart on a fixed 0..1 axis, drawn as responsive SVG. */
export function BarChart({ bars, reference = 0.5, title }: Props) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + plotH * (1 - Math.max(0, Math.min(1, v)));
  const slot = plotW / Math.max(1, bars.length);
  const bw = Math.min(56, slot * 0.6);
  const gid = useId().replace(/:/g, "");
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <title>{title}</title>
        <defs>
          {(["cyan", "amber", "emerald", "rose"] as const).map((t) => (
            <linearGradient key={t} id={`${gid}-${t}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className={`stop-${t}`} stopOpacity="1" />
              <stop offset="100%" className={`stop-${t}`} stopOpacity="0.35" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.l - 8} y={y(t) + 4} className="axis" textAnchor="end">
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(reference)} y2={y(reference)} className="ref" />
        {bars.map((b, i) => {
          const x = PAD.l + i * slot + (slot - bw) / 2;
          const top = y(b.value);
          return (
            <g key={b.label}>
              <rect x={x} y={top} width={bw} height={PAD.t + plotH - top} rx={5} className="bar" fill={`url(#${gid}-${b.tone})`} />
              <text x={x + bw / 2} y={Math.max(PAD.t - 6, top - 6)} className="value" textAnchor="middle">
                {b.value.toFixed(2)}
              </text>
              <text x={x + bw / 2} y={H - 12} className="axis" textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
