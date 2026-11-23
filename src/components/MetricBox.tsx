import type { ReactNode } from "react";
import { useTilt } from "../hooks/useTilt";
import { Icon } from "./Icon";
import { Meter } from "./Meter";

export type MetricTone = "default" | "cyan" | "emerald" | "amber" | "rose";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: MetricTone;
  /** Shown as a text badge so colour is never the only signal. */
  flag?: string;
  tour?: string;
  compact?: boolean;
  /** Smaller value text for long values such as "0.488 / 0.512". */
  smallValue?: boolean;
  /** Optional 0..1 scale with a threshold tick. */
  meter?: { value: number; threshold?: number };
}

export function MetricBox({ label, value, sub, tone = "default", flag, tour, compact, smallValue, meter }: Props) {
  const ref = useTilt<HTMLDivElement>(compact ? 5 : 7);
  return (
    <div
      ref={ref}
      className={`metric-box tilt tone-box-${tone}${compact ? " compact" : ""}${flag ? " flagged" : ""}`}
      data-tour={tour}
    >
      <span className="metric-label">{label}</span>
      <span className={`metric-value tone-${tone}${smallValue ? " small" : ""}`}>{value}</span>
      {meter && <Meter value={meter.value} threshold={meter.threshold} label={`${label} on a 0 to 1 scale`} />}
      {flag && (
        <span className="metric-flag">
          <Icon name="alert" size={13} />
          {flag}
        </span>
      )}
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}
