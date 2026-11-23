import { mulberry32 } from "./rng";
import { THRESHOLDS } from "./verdict";

export interface Bb84Params {
  qubits: number;
  /** Independent bit-flip probability on Bob's result, 0..1. */
  noise: number;
  /** Fraction of pulses Eve intercepts and resends, 0..1. */
  eveFraction: number;
  seed: number;
}

export interface Bb84Strings {
  aliceBits: string;
  aliceBases: string;
  bobBases: string;
  bobBits: string;
}

export interface Bb84Run extends Bb84Strings {
  /** '1' where Eve intercepted that pulse. */
  eveMask: string;
  params: Bb84Params;
}

/**
 * Simulate BB84 with an intercept-resend eavesdropper and channel noise.
 * Each pulse draws exactly 8 random numbers, so a seed gives the same Alice/Bob choices for any f or noise.
 * Physics per pulse:
 *  - Alice picks bit a and basis A; Bob picks basis B.
 *  - With probability f, Eve measures in a random basis E: she gets a if E = A, else a random bit,
 *    and resends that bit in basis E.
 *  - Bob gets the incoming bit if B equals the incoming basis, else a random bit.
 *  - Channel noise flips Bob's result with probability `noise`.
 * The 25% QBER at f = 1 is not coded anywhere; it emerges from these rules.
 */
export function simulateBb84(p: Bb84Params): Bb84Run {
  const rnd = mulberry32(p.seed);
  const n = Math.max(0, Math.floor(p.qubits));
  const aB: string[] = new Array(n);
  const aS: string[] = new Array(n);
  const bS: string[] = new Array(n);
  const bB: string[] = new Array(n);
  const eve: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
    const aliceBit = r[0] < 0.5 ? 0 : 1;
    const aliceBasis = r[1] < 0.5 ? "+" : "x";
    const bobBasis = r[2] < 0.5 ? "+" : "x";
    let stateBit = aliceBit;
    let stateBasis = aliceBasis;
    const intercepted = r[3] < p.eveFraction;
    if (intercepted) {
      const eveBasis = r[4] < 0.5 ? "+" : "x";
      const eveBit = eveBasis === aliceBasis ? aliceBit : r[5] < 0.5 ? 0 : 1;
      stateBit = eveBit;
      stateBasis = eveBasis;
    }
    let bobBit = bobBasis === stateBasis ? stateBit : r[6] < 0.5 ? 0 : 1;
    if (r[7] < p.noise) bobBit ^= 1;
    aB[i] = aliceBit ? "1" : "0";
    aS[i] = aliceBasis;
    bS[i] = bobBasis;
    bB[i] = bobBit ? "1" : "0";
    eve[i] = intercepted ? "1" : "0";
  }
  return {
    aliceBits: aB.join(""),
    aliceBases: aS.join(""),
    bobBases: bS.join(""),
    bobBits: bB.join(""),
    eveMask: eve.join(""),
    params: { ...p },
  };
}

/** Keep '+' and 'x' (also accepts X and ×). */
export function sanitizeBases(raw: string): string {
  let s = "";
  for (const ch of raw) {
    if (ch === "+") s += "+";
    else if (ch === "x" || ch === "X" || ch === "×") s += "x";
  }
  return s;
}

export function sanitizeBitString(raw: string): string {
  return raw.replace(/[^01]/g, "");
}

export interface Interval {
  lo: number;
  hi: number;
}

/** Wilson score interval for k successes out of n (z = 1.96 for 95%). */
export function wilsonInterval(k: number, n: number, z = 1.96): Interval {
  if (n <= 0) return { lo: 0, hi: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

export type SiftStatus = "match-ok" | "match-err" | "discard";

export interface SiftResult {
  /** Pulses used: the shortest of the four inputs. */
  n: number;
  lengths: [number, number, number, number];
  sifted: number;
  errors: number;
  qber: number;
  interval: Interval;
  siftedKey: string;
  status: SiftStatus[];
  /** 4 x QBER capped at 1. Assumes zero channel noise. */
  eveEstimate: number;
}

export function siftBb84(s: Bb84Strings): SiftResult {
  const aBits = sanitizeBitString(s.aliceBits);
  const aBases = sanitizeBases(s.aliceBases);
  const bBases = sanitizeBases(s.bobBases);
  const bBits = sanitizeBitString(s.bobBits);
  const lengths: [number, number, number, number] = [aBits.length, aBases.length, bBases.length, bBits.length];
  const n = Math.min(...lengths);
  const status: SiftStatus[] = new Array(n);
  let sifted = 0;
  let errors = 0;
  const key: string[] = [];
  for (let i = 0; i < n; i++) {
    if (aBases[i] !== bBases[i]) {
      status[i] = "discard";
      continue;
    }
    sifted++;
    key.push(bBits[i]);
    if (aBits[i] !== bBits[i]) {
      errors++;
      status[i] = "match-err";
    } else status[i] = "match-ok";
  }
  const qber = sifted > 0 ? errors / sifted : 0;
  return {
    n,
    lengths,
    sifted,
    errors,
    qber,
    interval: wilsonInterval(errors, sifted),
    siftedKey: key.join(""),
    status,
    eveEstimate: Math.min(1, 4 * qber),
  };
}

export type QberDecision = "empty" | "secure" | "abort";

/** QBER >= 11.0% aborts (the handout rule). Compared on integers so exactly 11.0% is not lost to rounding. */
export function qberDecision(errors: number, sifted: number, threshold: number = THRESHOLDS.qberAbort): QberDecision {
  if (sifted <= 0) return "empty";
  const thresholdPerMille = Math.round(threshold * 1000);
  return errors * 1000 >= thresholdPerMille * sifted ? "abort" : "secure";
}

/** Expected QBER for intercept fraction f and channel flip rate eta: e = q(1-eta) + (1-q)eta, q = f/4. */
export function expectedQber(f: number, noise = 0): number {
  const q = f / 4;
  return q * (1 - noise) + (1 - q) * noise;
}

/** Flip one character of a 0/1 string. */
export function flipBitAt(bits: string, index: number): string {
  if (index < 0 || index >= bits.length) return bits;
  const c = bits[index] === "1" ? "0" : "1";
  return bits.slice(0, index) + c + bits.slice(index + 1);
}
