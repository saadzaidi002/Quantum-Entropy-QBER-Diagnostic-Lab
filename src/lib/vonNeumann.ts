import type { Bits } from "./bits";

export interface VnTraceItem {
  pair: string;
  /** Emitted bit, or null when the pair was discarded. */
  out: "0" | "1" | null;
}

export interface VonNeumannResult {
  output: Bits;
  pairs: number;
  emittedPairs: number;
  /** Output bits / input bits (at most 0.25 for a fair source). */
  bitEfficiency: number;
  /** Fraction of pairs that emit a bit: the handout's eta = 2p(1-p). */
  pairEfficiency: number;
  trace: VnTraceItem[];
}

/** Von Neumann extractor on non-overlapping pairs: 00 drop, 01 -> 1, 10 -> 0, 11 drop. */
export function vonNeumann(bits: Bits, traceLimit = 48): VonNeumannResult {
  const pairs = Math.floor(bits.length / 2);
  const out = new Uint8Array(pairs);
  const trace: VnTraceItem[] = [];
  let k = 0;
  for (let p = 0; p < pairs; p++) {
    const a = bits[2 * p];
    const b = bits[2 * p + 1];
    const emit = a !== b;
    if (emit) out[k++] = b; // 01 -> 1 and 10 -> 0 both emit the second bit
    if (trace.length < traceLimit) trace.push({ pair: `${a}${b}`, out: emit ? (b ? "1" : "0") : null });
  }
  return {
    output: out.slice(0, k),
    pairs,
    emittedPairs: k,
    bitEfficiency: bits.length > 0 ? k / bits.length : 0,
    pairEfficiency: pairs > 0 ? k / pairs : 0,
    trace,
  };
}
