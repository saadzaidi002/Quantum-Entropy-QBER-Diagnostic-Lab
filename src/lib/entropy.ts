import { type Bits, countOnes } from "./bits";

/** Turn -0, NaN and ±Infinity into safe display values. */
function finite(x: number): number {
  if (!Number.isFinite(x) || x === 0) return 0;
  return x;
}

/**
 * Shannon entropy per bit: H1 = -p0 log2 p0 - p1 log2 p1, with 0·log 0 = 0.
 * Average information per bit; it overestimates security when the source is biased.
 */
export function shannonEntropy(ones: number, n: number): number {
  if (n <= 0) return 0;
  const p1 = ones / n;
  const p0 = 1 - p1;
  let h = 0;
  if (p0 > 0) h -= p0 * Math.log2(p0);
  if (p1 > 0) h -= p1 * Math.log2(p1);
  return finite(h);
}

/**
 * Most Common Value min-entropy, plain form used by the workshop handout:
 * H_min = -log2(max(p0, p1)).
 */
export function mcvMinEntropyPlain(ones: number, n: number): number {
  if (n <= 0) return 0;
  const pMax = Math.max(ones, n - ones) / n;
  return finite(-Math.log2(pMax));
}

/**
 * NIST SP 800-90B section 6.3.1 Most Common Value estimate (IID track).
 * p_hat is the most-common-value frequency; the 99% upper confidence bound is
 *   p_u = min(1, p_hat + 2.576 * sqrt(p_hat (1 - p_hat) / (n - 1)))
 * and H_min = -log2(p_u). It penalises short samples, so even a perfect 512-bit stream scores below 1.
 */
export function mcvMinEntropyNist(ones: number, n: number): number {
  if (n < 2) return 0;
  const pHat = Math.max(ones, n - ones) / n;
  const pU = Math.min(1, pHat + 2.576 * Math.sqrt((pHat * (1 - pHat)) / (n - 1)));
  return finite(-Math.log2(pU));
}

export type Matrix2 = [[number, number], [number, number]];

export interface MarkovModel {
  /** counts[a][b] = number of transitions a -> b. */
  counts: Matrix2;
  rowTotals: [number, number];
  /** P[a][b] = P(next = b | previous = a). A row with no transitions is all zeros. */
  P: Matrix2;
  /** Initial-state probabilities (overall bit frequencies). */
  init: [number, number];
  /** log2 of the probability of the most likely sequence of length seqLen. */
  pMaxLog2: number;
  seqLen: number;
  /** Per-bit min-entropy, min(-log2(p_max) / seqLen, 1). */
  hMin: number;
}

/**
 * Markov min-entropy, following the idea of NIST SP 800-90B section 6.3.3.
 * Fit a first-order chain (initial probabilities P_i and transitions P_ij from counts), then find
 * the probability of the single most likely seqLen-bit sequence by dynamic programming:
 *   m_j(1) = P_j,   m_j(t+1) = max_i m_i(t) * P_ij,   p_max = max_j m_j(seqLen).
 * Computed in log2 space so 128 multiplications never underflow. H = min(-log2(p_max)/seqLen, 1).
 * Point estimates are used; the NIST confidence-bound adjustment of P_i and P_ij is not applied.
 */
export function markovMinEntropy(bits: Bits, seqLen = 128): MarkovModel {
  const n = bits.length;
  const counts: Matrix2 = [
    [0, 0],
    [0, 0],
  ];
  for (let i = 0; i + 1 < n; i++) counts[bits[i]][bits[i + 1]]++;
  const rowTotals: [number, number] = [counts[0][0] + counts[0][1], counts[1][0] + counts[1][1]];
  const row = (a: 0 | 1): [number, number] =>
    rowTotals[a] > 0 ? [counts[a][0] / rowTotals[a], counts[a][1] / rowTotals[a]] : [0, 0];
  const P: Matrix2 = [row(0), row(1)];
  const ones = countOnes(bits);
  const init: [number, number] = n > 0 ? [(n - ones) / n, ones / n] : [0, 0];

  if (n < 2) return { counts, rowTotals, P, init, pMaxLog2: 0, seqLen, hMin: 0 };

  const lg = (x: number) => (x > 0 ? Math.log2(x) : -Infinity);
  const lP = [
    [lg(P[0][0]), lg(P[0][1])],
    [lg(P[1][0]), lg(P[1][1])],
  ];
  let m0 = lg(init[0]);
  let m1 = lg(init[1]);
  for (let t = 1; t < seqLen; t++) {
    const n0 = Math.max(m0 + lP[0][0], m1 + lP[1][0]);
    const n1 = Math.max(m0 + lP[0][1], m1 + lP[1][1]);
    m0 = n0;
    m1 = n1;
  }
  const pMaxLog2 = Math.max(m0, m1);
  // Every path dying (pMaxLog2 = -Infinity) cannot happen for n >= 2; guard anyway.
  const h = Number.isFinite(pMaxLog2) ? -pMaxLog2 / seqLen : 1;
  return { counts, rowTotals, P, init, pMaxLog2, seqLen, hMin: finite(Math.min(1, Math.max(0, h))) };
}

/**
 * Sample autocorrelation r_k for lags 1..maxLag:
 *   r_k = [ (1/(n-k)) * sum_{i<n-k} (x_i - m)(x_{i+k} - m) ] / (m(1-m)),  m = mean.
 * A lag is 0 when the variance is 0 or there are no pairs. Index 0 holds lag 1.
 */
export function autocorrelation(bits: Bits, maxLag = 16): number[] {
  const n = bits.length;
  const m = n > 0 ? countOnes(bits) / n : 0;
  const v = m * (1 - m);
  const out: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    const pairs = n - k;
    if (pairs <= 0 || v === 0) {
      out.push(0);
      continue;
    }
    // sum (x_i - m)(x_{i+k} - m) = S_xy - m(S_x + S_y) + pairs·m², accumulated with integers.
    let sxy = 0;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < pairs; i++) {
      const a = bits[i];
      const b = bits[i + k];
      sxy += a & b;
      sx += a;
      sy += b;
    }
    const cov = (sxy - m * (sx + sy) + pairs * m * m) / pairs;
    out.push(finite(Math.max(-1, Math.min(1, cov / v))));
  }
  return out;
}
