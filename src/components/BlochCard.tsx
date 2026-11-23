import { useEffect, useState } from "react";
import { type Bb84Strings, sanitizeBases, sanitizeBitString, type SiftResult } from "../lib/bb84";
import { type Basis, BlochSphere, type BlochState } from "../scene/BlochSphere";
import { Card } from "./Card";
import { Icon } from "./Icon";

interface Props {
  inputs: Bb84Strings;
  sift: SiftResult;
  eveMask: string | null;
  selected: number;
  onSelect: (i: number) => void;
  limit: number;
}

const KET: Record<string, string> = { "+0": "|0⟩", "+1": "|1⟩", x0: "|+⟩", x1: "|−⟩" };
const BASIS_NAME: Record<Basis, string> = { "+": "+ (z axis)", x: "× (x axis)" };

/** Interactive Bloch sphere tied to one pulse of the sifting inspector, with step and play controls. */
export function BlochCard({ inputs, sift, eveMask, selected, onSelect, limit }: Props) {
  const [playing, setPlaying] = useState(false);
  const count = Math.min(sift.n, limit);

  useEffect(() => {
    if (!playing || count === 0) return;
    const t = window.setInterval(() => onSelect((selected + 1) % count), 1100);
    return () => window.clearInterval(t);
  }, [playing, selected, count, onSelect]);

  let state: BlochState | null = null;
  let text = "No pulses yet. Run a preset to see the states Alice sends.";
  if (count > 0 && selected < count) {
    const i = selected;
    const aBit = sanitizeBitString(inputs.aliceBits)[i] as "0" | "1";
    const aBasis = sanitizeBases(inputs.aliceBases)[i] as Basis;
    const bBasis = sanitizeBases(inputs.bobBases)[i] as Basis;
    const bBit = sanitizeBitString(inputs.bobBits)[i];
    state = { aliceBit: aBit, aliceBasis: aBasis, bobBasis: bBasis };
    const st = sift.status[i];
    const outcome =
      st === "discard"
        ? "Different basis, so his result is random. Discarded in sifting."
        : st === "match-ok"
          ? `Same basis, he reads ${bBit}. Bits agree: KEEP.`
          : `Same basis, but he reads ${bBit}. Bits differ: ERR (noise or Eve).`;
    text = `Pulse ${i + 1}: Alice sends ${KET[aBasis + aBit]} (bit ${aBit} in ${BASIS_NAME[aBasis]}). Bob measures along ${BASIS_NAME[bBasis]}. ${outcome}${eveMask?.[i] === "1" ? " Eve intercepted this pulse." : ""}`;
  }

  return (
    <Card
      title="3D Bloch sphere"
      subtitle="Hover or focus a pulse in the inspector to see it here. Cyan arrow: Alice's state. Amber bar: Bob's measurement axis."
      icon="sparkle"
      tour="bloch-card"
      actions={
        <div className="btn-group" role="group" aria-label="Step through pulses">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onSelect(Math.max(0, selected - 1))} disabled={selected <= 0} aria-label="Previous pulse">
            <Icon name="arrowLeft" />
          </button>
          <button type="button" className="btn btn-small" aria-pressed={playing} onClick={() => setPlaying(!playing)} disabled={count === 0}>
            {playing ? "Pause" : "Play pulses"}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onSelect(Math.min(count - 1, selected + 1))} disabled={selected >= count - 1} aria-label="Next pulse">
            <Icon name="arrowRight" />
          </button>
        </div>
      }
    >
      <div className="scene-wrap">
        <BlochSphere state={state} />
      </div>
      <p className="bloch-caption" aria-live="polite">
        {text}
      </p>
    </Card>
  );
}
