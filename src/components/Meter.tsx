interface Props {
  /** Value on a 0..1 scale. */
  value: number;
  /** Threshold tick on the same scale. Values below it are shown as failing. */
  threshold?: number;
  label: string;
}

/** Thin scale under a metric: where the value sits between 0 and 1, and where the threshold is. */
export function Meter({ value, threshold, label }: Props) {
  const v = Math.max(0, Math.min(1, value));
  const failing = threshold !== undefined && v < threshold;
  return (
    <div
      className={`meter${failing ? " failing" : ""}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(v.toFixed(4))}
      aria-label={label}
    >
      <div className="meter-fill" style={{ width: `${v * 100}%` }} />
      {threshold !== undefined && <div className="meter-tick" style={{ left: `${threshold * 100}%` }} title={`threshold ${threshold}`} />}
    </div>
  );
}
