import type { ReactNode } from "react";
import type { Tone } from "../lib/verdict";
import { Icon, type IconName } from "./Icon";

const ICONS: Record<Tone, IconName> = {
  neutral: "circle",
  quantum: "check",
  biased: "alert",
  classical: "stop",
};

interface Props {
  tone: Tone;
  badge: string;
  title: string;
  desc: ReactNode;
  side?: ReactNode;
  tour?: string;
}

export function VerdictBanner({ tone, badge, title, desc, side, tour }: Props) {
  return (
    <section className={`verdict-banner ${tone}`} data-tour={tour} aria-label="Verdict">
      {/* Keyed by badge so a changed verdict replays the settle animation; same verdict stays still. */}
      <div className="verdict-emblem" key={`e-${badge}`}>
        <Icon name={ICONS[tone]} size={26} />
      </div>
      <div className="verdict-main" aria-live="polite" aria-atomic="true" key={`m-${badge}`}>
        <span className="verdict-badge">{badge}</span>
        <div className="verdict-title">{title}</div>
        <div className="verdict-desc">{desc}</div>
      </div>
      {side && <div className="verdict-side">{side}</div>}
    </section>
  );
}
