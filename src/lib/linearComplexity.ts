import type { Bits } from "./bits";

/**
 * Linear complexity of a binary sequence via the Berlekamp-Massey algorithm over GF(2).
 * Returns L, the length of the shortest LFSR that generates the sequence.
 * A random n-bit sequence has L close to n/2; the output of an m-bit LFSR has L <= m at any length.
 * Cost is O(n^2), so callers cap n (see THRESHOLDS.linearComplexityMaxBits).
 */
export function berlekampMassey(s: Bits): number {
  const n = s.length;
  const c = new Uint8Array(n + 1);
  let b = new Uint8Array(n + 1);
  let t = new Uint8Array(n + 1);
  c[0] = 1;
  b[0] = 1;
  let L = 0;
  let m = -1;
  for (let N = 0; N < n; N++) {
    // Discrepancy between s[N] and what the current LFSR (connection polynomial c) predicts.
    let d = s[N];
    for (let i = 1; i <= L; i++) d ^= c[i] & s[N - i];
    if (d === 1) {
      t.set(c);
      const shift = N - m;
      for (let i = 0; i + shift <= n; i++) c[i + shift] ^= b[i];
      if (2 * L <= N) {
        L = N + 1 - L;
        m = N;
        const tmp = b;
        b = t;
        t = tmp;
      }
    }
  }
  return L;
}

/**
 * Smallest exact repeat period p (bits[i] === bits[i+p] for every valid i), reported only when the
 * stream holds at least two full periods (n >= 2p). Uses the KMP prefix function: the smallest
 * period of a string of length n is n - pi[n-1]. O(n). Returns null when there is no such period.
 */
export function repeatPeriod(bits: Bits): number | null {
  const n = bits.length;
  if (n < 2) return null;
  const pi = new Int32Array(n);
  for (let i = 1; i < n; i++) {
    let k = pi[i - 1];
    while (k > 0 && bits[i] !== bits[k]) k = pi[k - 1];
    if (bits[i] === bits[k]) k++;
    pi[i] = k;
  }
  const p = n - pi[n - 1];
  return n >= 2 * p ? p : null;
}
