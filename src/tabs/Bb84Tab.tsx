import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { MetricBox } from "../components/MetricBox";
import { QberChart } from "../components/QberChart";
import { BlochCard } from "../components/BlochCard";
import { SIFT_RENDER_CAP, SiftGrid } from "../components/SiftGrid";
import { VerdictBanner } from "../components/VerdictBanner";
import { type Bb84State, BB84_PRESETS, type Bb84PresetKind, QUBIT_OPTIONS } from "../hooks/useBb84";
import type { Bb84Strings } from "../lib/bb84";
import { THRESHOLDS } from "../lib/verdict";

interface Props {
  b: Bb84State;
  onCopySummary: () => void;
}

const pct = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;

const FIELDS: { key: keyof Bb84Strings; label: string; placeholder: string }[] = [
  { key: "aliceBits", label: "1. Alice bits (0 or 1)", placeholder: "e.g. 01101001…" },
  { key: "aliceBases", label: "2. Alice bases (+ or x)", placeholder: "e.g. +x++x+x…" },
  { key: "bobBases", label: "3. Bob bases (+ or x)", placeholder: "e.g. ++x+x+xx…" },
  { key: "bobBits", label: "4. Bob bits (0 or 1)", placeholder: "e.g. 01001011…" },
];

function SeedInput({ seed, onCommit }: { seed: number; onCommit: (s: number) => void }) {
  const [draft, setDraft] = useState(String(seed));
  useEffect(() => setDraft(String(seed)), [seed]);
  const commit = () => {
    const n = Number(draft.trim());
    if (Number.isInteger(n) && n >= 0 && n <= 4294967295) {
      if (n !== seed) onCommit(n);
    } else setDraft(String(seed));
  };
  return (
    <input
      id="bb84-seed"
      type="text"
      inputMode="numeric"
      className="seed-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

export function Bb84Tab({ b, onCopySummary }: Props) {
  const [selected, setSelected] = useState(0);
  const s = b.sift;
  const { params } = b;
  const tooFew = s.sifted > 0 && s.sifted < THRESHOLDS.minSifted;
  const mismatch = new Set(s.lengths).size > 1;
  const abortAt = Math.ceil(THRESHOLDS.qberAbort * s.sifted - 1e-9);

  const banner =
    b.decision === "empty"
      ? {
          tone: "neutral" as const,
          badge: "Awaiting sifted pulses",
          title: "Run a preset or enter four strings of equal length",
          desc: "Sifting keeps the pulses where Alice and Bob used the same basis.",
        }
      : b.decision === "secure"
        ? {
            tone: "quantum" as const,
            badge: "Channel secure: proceed",
            title: `QBER ${pct(s.qber)} is below the 11.0% threshold`,
            desc: "Proceed to error reconciliation (Cascade/LDPC) and privacy amplification.",
          }
        : {
            tone: "classical" as const,
            badge: "Abort key",
            title: `QBER ${pct(s.qber)} is at or above the 11.0% threshold`,
            desc: `Discard this key. If the channel had no noise, this error rate would mean Eve intercepted about ${pct(s.eveEstimate, 0)} of pulses.`,
          };

  return (
    <>
      <Card
        title="BB84 channel simulator"
        icon="key"
        subtitle="Alice sends qubits in + or × bases, Eve may intercept and resend, Bob measures in a random basis."
        tour="bb84-controls"
        actions={(Object.keys(BB84_PRESETS) as Bb84PresetKind[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`btn preset ${k === "clean" ? "btn-cyan" : k === "eve" ? "btn-rose" : "btn-amber"}`}
            onClick={() => b.preset(k)}
            data-tour={`bb84-preset-${k}`}
          >
            <span className={`swatch ${k === "clean" ? "sw-cyan" : k === "eve" ? "sw-rose" : "sw-amber"}`} aria-hidden="true" />
            {BB84_PRESETS[k].label}
          </button>
        ))}
      >
        <div className="controls-grid">
          <div className="control">
            <label htmlFor="bb84-qubits">Qubits sent</label>
            <select
              id="bb84-qubits"
              value={params.qubits}
              onChange={(e) => b.update({ qubits: Number(e.target.value) })}
            >
              {QUBIT_OPTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div className="control">
            <label htmlFor="bb84-noise">
              Channel noise: <strong>{pct(params.noise, 1)}</strong>
            </label>
            <input
              id="bb84-noise"
              type="range"
              min={0}
              max={30}
              step={0.5}
              value={params.noise * 100}
              onChange={(e) => b.update({ noise: Number(e.target.value) / 100 })}
            />
          </div>
          <div className="control">
            <label htmlFor="bb84-eve">
              Eve intercepts f: <strong>{pct(params.eveFraction, 0)}</strong>
            </label>
            <input
              id="bb84-eve"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(params.eveFraction * 100)}
              onChange={(e) => b.update({ eveFraction: Number(e.target.value) / 100 })}
            />
          </div>
          <div className="control">
            <label htmlFor="bb84-seed">Seed (same seed = same run)</label>
            <div className="seed-row">
              <SeedInput seed={params.seed} onCommit={(seed) => b.update({ seed })} />
              <button type="button" className="btn btn-ghost" onClick={b.newSeed}>
                <Icon name="shuffle" /> New seed
              </button>
            </div>
          </div>
        </div>

        <details className="manual-data">
          <summary>Manual data: paste your own Alice and Bob strings</summary>
          <div className="bb84-inputs">
            {FIELDS.map((f) => (
              <div className="input-block" key={f.key}>
                <label htmlFor={`bb84-${f.key}`}>{f.label}</label>
                <input
                  id={`bb84-${f.key}`}
                  type="text"
                  spellCheck={false}
                  placeholder={f.placeholder}
                  value={b.inputs[f.key]}
                  onChange={(e) => b.setField(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
          {mismatch && (
            <p className="inline-warning" role="note">
              <Icon name="alert" size={14} /> The four strings have different lengths ({s.lengths.join(" / ")}). Only the
              first {s.n} pulses are used.
            </p>
          )}
        </details>
      </Card>

      <VerdictBanner
        tone={banner.tone}
        badge={banner.badge}
        title={banner.title}
        tour="bb84-banner"
        desc={
          <>
            {banner.desc}
            {tooFew && (
              <span className="banner-warning">
                <br />
                <Icon name="alert" size={14} /> Too few sifted bits for a reliable QBER ({s.sifted}): the 95% interval is{" "}
                {pct(s.interval.lo, 1)} to {pct(s.interval.hi, 1)}.
              </span>
            )}
          </>
        }
        side={
          <div className="banner-side">
            <div>Abort threshold: QBER ≥ 11.0%</div>
            <div className="danger-text">Full intercept-resend: 25.0%</div>
            <button type="button" className="btn btn-ghost" onClick={onCopySummary}>
              <Icon name="copy" /> Copy summary
            </button>
          </div>
        }
      />

      <div className="metrics-grid">
        <MetricBox label="Transmitted qubits" value={s.n.toLocaleString()} sub={`seed ${params.seed}`} />
        <MetricBox
          label="Sifted key length"
          tone="cyan"
          value={s.sifted.toLocaleString()}
          sub={`matching bases: ${s.n ? pct(s.sifted / s.n, 1) : "0.0%"}`}
        />
        <MetricBox
          label="Sifted errors"
          value={s.errors}
          sub={s.sifted ? `abort at ≥ ${abortAt} errors for this length` : "mismatches in matching bases"}
          tour="bb84-errors"
        />
        <MetricBox
          label="Measured QBER"
          tone={b.decision === "abort" ? "rose" : b.decision === "secure" ? "emerald" : "default"}
          value={pct(s.qber)}
          sub={`95% Wilson: ${pct(s.interval.lo, 1)} to ${pct(s.interval.hi, 1)}`}
          tour="bb84-qber"
          flag={b.decision === "abort" ? "at or above 11%" : undefined}
        />
        <MetricBox
          label="Estimated Eve fraction"
          value={pct(s.eveEstimate, 0)}
          sub="4 × QBER, capped at 100%; assumes zero channel noise"
        />
      </div>

      <div className="grid-2">
        <BlochCard
          inputs={b.inputs}
          sift={s}
          eveMask={b.original?.eveMask ?? null}
          selected={Math.min(selected, Math.max(0, s.n - 1))}
          onSelect={setSelected}
          limit={SIFT_RENDER_CAP}
        />
        <Card title="QBER versus Eve's intercept fraction" subtitle="Intercept-resend gives QBER = f/4 on average." icon="eye">
          <QberChart runF={b.runF} qber={s.qber} noise={params.noise} threshold={THRESHOLDS.qberAbort} />
        </Card>
      </div>

      <Card
        title="Pulse-by-pulse sifting inspector"
        icon="shuffle"
        subtitle="Click Bob's bit on a KEEP or ERR column to flip it. QBER, banner and chart update at once."
        tour="sift-card"
        actions={
          <button type="button" className="btn btn-ghost" onClick={b.reset} disabled={!b.original || b.flipped.length === 0}>
            <Icon name="reset" /> Reset to original run{b.flipped.length ? ` (${b.flipped.length} flipped)` : ""}
          </button>
        }
      >
        <SiftGrid inputs={b.inputs} sift={s} flipped={b.flipped} onFlip={b.flip} selected={selected} onSelect={setSelected} />
      </Card>

      <Card title="Sifted key" subtitle="Bob's bits where bases matched." icon="key">
        <p className="qber-formula">
          QBER = sifted errors / sifted bits = {s.errors} / {s.sifted} = <strong>{pct(s.qber)}</strong>
        </p>
        <div className="extracted-output" tabIndex={0} aria-label="Sifted key bits">
          {s.siftedKey || "No matching bases yet."}
        </div>
      </Card>
    </>
  );
}
