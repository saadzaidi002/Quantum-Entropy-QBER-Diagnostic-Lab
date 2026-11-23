import { type Bits, countOnes } from "./bits";
import {
  autocorrelation,
  type MarkovModel,
  markovMinEntropy,
  mcvMinEntropyNist,
  mcvMinEntropyPlain,
  shannonEntropy,
} from "./entropy";
import { berlekampMassey, repeatPeriod } from "./linearComplexity";
import { vonNeumann, type VonNeumannResult } from "./vonNeumann";

/**
 * Every decision threshold in one place. Sources:
 * - minBits, hMinIid, biasDelta, autocorrFlag (0.25), qberAbort (11%): workshop handout / original tool.
 *   0.25 is a workshop heuristic, not a NIST constant.
 * - linearComplexityRatio (0.4 n): this tool's choice; random streams sit near 0.5 n.
 * - markovCellDeviation (0.2): original tool's highlight rule.
 */
export const THRESHOLDS = {
  minBits: 16,
  recommendedBits: 256,
  maxLag: 16,
  autocorrFlag: 0.25,
  hMinIid: 0.85,
  biasDelta: 0.08,
  linearComplexityRatio: 0.4,
  linearComplexityMinBits: 128,
  /** Berlekamp-Massey is O(n^2); it runs on the first this-many bits. */
  linearComplexityMaxBits: 4096,
  markovCellDeviation: 0.2,
  /** |P(1|1) - P(1|0)| above this means the next bit depends on the previous one. */
  markovMemoryGap: 0.2,
  markovSeqLen: 128,
  qberAbort: 0.11,
  minSifted: 50,
} as const;

export type McvMode = "plain" | "nist";

export interface PostVnStats {
  n: number;
  ones: number;
  p0: number;
  p1: number;
  hMin: number;
}

export interface BitAnalysis {
  n: number;
  ones: number;
  zeros: number;
  p0: number;
  p1: number;
  biasDelta: number;
  shannon: number;
  hMinPlain: number;
  hMinNist: number;
  markov: MarkovModel;
  /** r_k for k = 1..maxLag (index 0 is lag 1). */
  autocorr: number[];
  maxAbsAutocorr: { lag: number; value: number };
  autocorrFlagged: boolean;
  linearComplexity: number;
  /** Number of bits Berlekamp-Massey ran on (capped). */
  lcBits: number;
  lcFlagged: boolean;
  period: number | null;
  /** True when any memory check fires (autocorrelation, Markov rows, deterministic pattern). */
  memoryFlagged: boolean;
  vn: VonNeumannResult;
  postVn: PostVnStats;
}

function postStats(bits: Bits): PostVnStats {
  const n = bits.length;
  const ones = countOnes(bits);
  return {
    n,
    ones,
    p0: n ? (n - ones) / n : 0,
    p1: n ? ones / n : 0,
    hMin: mcvMinEntropyPlain(ones, n),
  };
}

/** Run every estimator on a bit stream. Pure; safe for 100k+ bits. */
export function analyzeBits(bits: Bits): BitAnalysis {
  const T = THRESHOLDS;
  const n = bits.length;
  const ones = countOnes(bits);
  const p1 = n ? ones / n : 0;
  const p0 = n ? 1 - p1 : 0;
  const markov = markovMinEntropy(bits, T.markovSeqLen);
  const autocorr = autocorrelation(bits, T.maxLag);
  let maxAbs = { lag: 1, value: 0 };
  autocorr.forEach((r, i) => {
    if (Math.abs(r) > Math.abs(maxAbs.value)) maxAbs = { lag: i + 1, value: r };
  });
  const autocorrFlagged = autocorr.some((r) => Math.abs(r) > T.autocorrFlag);

  const lcBits = Math.min(n, T.linearComplexityMaxBits);
  const linearComplexity = berlekampMassey(bits.subarray(0, lcBits));
  const lcFlagged = lcBits >= T.linearComplexityMinBits && linearComplexity < T.linearComplexityRatio * lcBits;
  const period = n >= T.minBits ? repeatPeriod(bits) : null;

  const rowsSeen = markov.rowTotals[0] > 0 && markov.rowTotals[1] > 0;
  const markovGap = rowsSeen ? Math.abs(markov.P[1][1] - markov.P[0][1]) : 0;
  const memoryFlagged = autocorrFlagged || markovGap > T.markovMemoryGap || lcFlagged || period !== null;

  const vn = vonNeumann(bits);
  return {
    n,
    ones,
    zeros: n - ones,
    p0,
    p1,
    biasDelta: n ? Math.abs(p1 - 0.5) : 0,
    shannon: shannonEntropy(ones, n),
    hMinPlain: mcvMinEntropyPlain(ones, n),
    hMinNist: mcvMinEntropyNist(ones, n),
    markov,
    autocorr,
    maxAbsAutocorr: maxAbs,
    autocorrFlagged,
    linearComplexity,
    lcBits,
    lcFlagged,
    period,
    memoryFlagged,
    vn,
    postVn: postStats(vn.output),
  };
}

export function hMinIid(a: BitAnalysis, mode: McvMode): number {
  return mode === "nist" ? a.hMinNist : a.hMinPlain;
}

export type VerdictKind = "empty" | "short" | "deterministic" | "correlated" | "biased" | "quantum";
export type Tone = "neutral" | "quantum" | "biased" | "classical";

export interface Verdict {
  kind: VerdictKind;
  tone: Tone;
  badge: string;
  title: string;
  reason: string;
}

const f3 = (x: number) => x.toFixed(3);
const f4 = (x: number) => x.toFixed(4);

/** Classify a stream. Order matters: short -> deterministic -> correlated -> biased -> high entropy. */
export function classify(a: BitAnalysis, mode: McvMode = "plain"): Verdict {
  const T = THRESHOLDS;
  const h = hMinIid(a, mode);
  const hLabel = mode === "nist" ? "H_min (IID, NIST 99% bound)" : "H_min (IID)";

  if (a.n === 0) {
    return {
      kind: "empty",
      tone: "neutral",
      badge: "Awaiting bitstream",
      title: "Enter or load a bitstream to evaluate entropy",
      reason: "Paste bits or press one of the preset buttons.",
    };
  }
  if (a.n < T.minBits) {
    return {
      kind: "short",
      tone: "biased",
      badge: "Sample too short",
      title: `Only ${a.n} bits. Provide at least ${T.minBits} (256+ recommended).`,
      reason: "With so few bits every estimate has a very large sampling error.",
    };
  }
  if (a.period !== null || a.lcFlagged) {
    const why =
      a.period !== null
        ? `The stream repeats exactly every ${a.period} bit${a.period === 1 ? "" : "s"}.`
        : `Linear complexity L = ${a.linearComplexity} over ${a.lcBits} bits, but a random stream would have about ${Math.round(a.lcBits / 2)}. A ${a.linearComplexity}-bit LFSR can reproduce this stream.`;
    return {
      kind: "deterministic",
      tone: "classical",
      badge: "Classical / deterministic",
      title: "Deterministic pattern: the next bits can be predicted",
      reason: why,
    };
  }
  if (a.autocorrFlagged) {
    const { lag, value } = a.maxAbsAutocorr;
    return {
      kind: "correlated",
      tone: "classical",
      badge: "Correlated source",
      title: "Bits depend on earlier bits",
      reason: `|r${lag}| = ${f3(Math.abs(value))} is above ${T.autocorrFlag} (workshop heuristic). Typical causes: detector dead-time ringing, afterpulsing, slow drift.`,
    };
  }
  if (h < T.hMinIid || a.biasDelta > T.biasDelta) {
    return {
      kind: "biased",
      tone: "biased",
      badge: "Biased physical source",
      title: "Memoryless but biased: extraction required",
      reason: `${hLabel} = ${f3(h)} with P(1) = ${f3(a.p1)}; no memory found (max |r_k| = ${f3(Math.abs(a.maxAbsAutocorr.value))}). Von Neumann output H_min = ${f3(a.postVn.hMin)}.`,
    };
  }
  return {
    kind: "quantum",
    tone: "quantum",
    badge: "Quantum-grade high entropy",
    title: "Consistent with a full-entropy source at this sample size",
    reason: `${hLabel} = ${f4(h)}, Markov H_min = ${f4(a.markov.hMin)}, max |r_k| = ${f3(Math.abs(a.maxAbsAutocorr.value))}, L = ${a.linearComplexity} (~${Math.round(a.lcBits / 2)} expected).`,
  };
}
