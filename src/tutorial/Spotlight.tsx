import { useCallback, useEffect, useLayoutEffect, useState } from "react";

interface Props {
  /** data-tour ids to highlight. */
  targets: string[];
  /** Changes on every request, so the same targets can be spotlighted again. */
  token: number;
  onDone: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 6;
const DURATION_MS = 7000;

function measure(ids: string[]): Rect[] {
  return ids
    .map((id) => document.querySelector(`[data-tour="${id}"]`))
    .filter((el): el is Element => el !== null)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - PAD, y: r.top - PAD, w: r.width + 2 * PAD, h: r.height + 2 * PAD };
    });
}

/** Dims the page and cuts holes around the target elements. Click, Esc or wait to dismiss. */
export function Spotlight({ targets, token, onDone }: Props) {
  const [rects, setRects] = useState<Rect[]>([]);

  const update = useCallback(() => setRects(measure(targets)), [targets]);

  useLayoutEffect(() => {
    const first = document.querySelector(`[data-tour="${targets[0]}"]`);
    if (first && typeof first.scrollIntoView === "function") first.scrollIntoView({ block: "center", behavior: "auto" });
    update();
  }, [targets, token, update]);

  useEffect(() => {
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(onDone, DURATION_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [token, update, onDone]);

  if (rects.length === 0) return null;
  return (
    <div className="spotlight no-print" onClick={onDone} aria-hidden="true">
      <svg width="100%" height="100%">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rects.map((r, i) => (
              <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={12} fill="black" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" className="spotlight-dim" mask="url(#spotlight-mask)" />
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={12} className="spotlight-ring" />
        ))}
      </svg>
    </div>
  );
}
