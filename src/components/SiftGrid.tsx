import type { Bb84Strings, SiftResult } from "../lib/bb84";
import { sanitizeBases, sanitizeBitString } from "../lib/bb84";

export const SIFT_RENDER_CAP = 1024;

interface Props {
  inputs: Bb84Strings;
  sift: SiftResult;
  flipped: number[];
  onFlip: (index: number) => void;
  /** Pulse shown on the Bloch sphere. */
  selected?: number;
  onSelect?: (index: number) => void;
}

const STATUS_TEXT = { "match-ok": "KEEP", "match-err": "ERR", discard: "—" } as const;

/** Pulse-by-pulse sifting inspector. Bob's bit on a sifted column is a button that flips it. */
export function SiftGrid({ inputs, sift, flipped, onFlip, selected, onSelect }: Props) {
  const aBits = sanitizeBitString(inputs.aliceBits);
  const aBases = sanitizeBases(inputs.aliceBases);
  const bBases = sanitizeBases(inputs.bobBases);
  const bBits = sanitizeBitString(inputs.bobBits);
  const shown = Math.min(sift.n, SIFT_RENDER_CAP);
  const flippedSet = new Set(flipped);

  if (sift.n === 0) return <div className="sift-scroll empty">No pulses to inspect yet.</div>;

  const cols = [];
  for (let i = 0; i < shown; i++) {
    const st = sift.status[i];
    const sifted = st !== "discard";
    cols.push(
      <div
        key={i}
        className={`sift-col ${st}${flippedSet.has(i) ? " flipped" : ""}${selected === i ? " selected" : ""}`}
        onMouseEnter={() => onSelect?.(i)}
        onPointerDown={() => onSelect?.(i)}
        onFocus={() => onSelect?.(i)}
      >
        <span className="pulse-no">{i + 1}</span>
        <span>{aBits[i]}</span>
        <span className="basis">{aBases[i] === "x" ? "×" : "+"}</span>
        <span className="basis">{bBases[i] === "x" ? "×" : "+"}</span>
        {sifted ? (
          <button
            type="button"
            className="bob-bit"
            onClick={() => onFlip(i)}
            aria-label={`Pulse ${i + 1}: Bob's bit is ${bBits[i]}. Press to flip it.`}
            title="Click to flip Bob's bit"
          >
            {bBits[i]}
          </button>
        ) : (
          <span>{bBits[i]}</span>
        )}
        <span className="sift-status">{STATUS_TEXT[st]}</span>
      </div>,
    );
  }

  return (
    <>
      <div className="sift-scroll" data-tour="sift-grid" tabIndex={0} aria-label="Sifting inspector, scroll sideways">
        <div className="sift-grid">
          <div className="sift-row-label" aria-hidden="true">
            <span>Pulse #</span>
            <span>Alice bit</span>
            <span>Alice basis</span>
            <span>Bob basis</span>
            <span>Bob bit</span>
            <span>Sift</span>
          </div>
          {cols}
        </div>
      </div>
      <div className="helper-bar">
        <span>
          Showing pulses 1–{shown}
          {sift.n > shown ? ` of ${sift.n} (rendering capped at ${SIFT_RENDER_CAP}; metrics use all pulses)` : ""}. Scroll
          sideways for more.
        </span>
        <span>KEEP = bases match, bits agree · ERR = bases match, bits differ · — = discarded</span>
      </div>
    </>
  );
}
