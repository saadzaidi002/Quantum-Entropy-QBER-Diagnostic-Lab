import { bitsToString } from "../lib/bits";
import type { BitAnalysis } from "../lib/verdict";
import { copyText, downloadText } from "../utils/dom";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { MetricBox } from "./MetricBox";
import { useToast } from "./Toast";

const DISPLAY_LIMIT = 4096;

export function VonNeumannCard({ a }: { a: BitAnalysis }) {
  const notify = useToast();
  const vn = a.vn;
  const outBits = vn.output.length;
  const full = () => bitsToString(vn.output);

  const copy = async () => {
    if (!outBits) return notify("No extracted bits yet.");
    notify((await copyText(full())) ? `Copied ${outBits} extracted bits` : "Copy failed. Select the text and copy manually.");
  };
  const download = () => {
    if (!outBits) return notify("No extracted bits yet.");
    downloadText("von-neumann-key.txt", full() + "\n");
  };

  return (
    <Card
      title="Von Neumann extractor"
      subtitle="Non-overlapping pairs: 00 → discard, 01 → 1, 10 → 0, 11 → discard."
      tour="vn-card"
      icon="sparkle"
      actions={
        <>
          <button type="button" className="btn btn-cyan" onClick={copy}>
            <Icon name="copy" /> Copy key
          </button>
          <button type="button" className="btn btn-ghost" onClick={download}>
            <Icon name="download" /> .txt
          </button>
        </>
      }
    >
      {a.memoryFlagged && a.n >= 16 && (
        <p className="inline-warning" role="note">
          <Icon name="alert" /> Von Neumann assumes independent bits. Output may still be biased.
        </p>
      )}
      <div className="metrics-grid vn-grid">
        <MetricBox
          compact
          label="Output / input bits"
          value={`${(vn.bitEfficiency * 100).toFixed(1)}%`}
          sub={`${outBits} of ${a.n} bits`}
        />
        <MetricBox
          compact
          label="Pairs that emit (η)"
          value={`${(vn.pairEfficiency * 100).toFixed(1)}%`}
          sub={`${vn.emittedPairs} of ${vn.pairs} pairs · handout η = 2p(1-p)`}
        />
        <MetricBox compact label="Post P(0) / P(1)" value={`${a.postVn.p0.toFixed(2)} / ${a.postVn.p1.toFixed(2)}`} />
        <MetricBox
          compact
          label="Post H_min"
          value={a.postVn.hMin.toFixed(4)}
          meter={{ value: a.postVn.hMin }}
          tone="emerald"
          tour="vn-hmin"
          sub="-log2 max(P0,P1) on output"
        />
      </div>
      <div className="card-subtitle">Extracted output stream</div>
      <div className="extracted-output" tabIndex={0} aria-label="Extracted output bits">
        {outBits ? bitsToString(vn.output, DISPLAY_LIMIT) : "No extracted bits yet."}
        {outBits > DISPLAY_LIMIT && <span className="muted"> … (+{outBits - DISPLAY_LIMIT} more; copy or download for all)</span>}
      </div>
      <div className="card-subtitle">Pair trace (first 48 pairs)</div>
      <div className="pair-chips">
        {vn.trace.map((t, i) => (
          <span key={i} className={`chip ${t.out ? "chip-emit" : "chip-discard"}`}>
            {t.pair}→{t.out ?? "Ø"}
          </span>
        ))}
      </div>
    </Card>
  );
}
