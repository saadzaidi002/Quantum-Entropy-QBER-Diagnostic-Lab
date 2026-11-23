import { cryptoBits, mulberry32 } from "./rng";

export const PRESET_LENGTH = 512;
/** Non-zero 15-bit start state, kept from the original tool. */
export const LFSR_SEED_STATE = 0b101100111000101;

/** 512 bits from crypto.getRandomValues. */
export function qrngPreset(n = PRESET_LENGTH): Uint8Array {
  return cryptoBits(n);
}

/** Memoryless Bernoulli bits with P(1) = p, from a seeded PRNG so a seed reproduces the sample. */
export function biasedPreset(n = PRESET_LENGTH, p = 0.68, seed = 1): Uint8Array {
  const rnd = mulberry32(seed);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = rnd() < p ? 1 : 0;
  return out;
}

/** One Fibonacci LFSR step for x^15 + x + 1: s[k+15] = s[k] XOR s[k+1]. Output is bit 0. */
export function lfsr15Step(state: number): number {
  const fb = (state ^ (state >> 1)) & 1;
  return ((state >> 1) | (fb << 14)) & 0x7fff;
}

/** Maximal-length 15-bit LFSR (primitive polynomial x^15 + x + 1, period 32767). */
export function lfsrPreset(n = PRESET_LENGTH, state = LFSR_SEED_STATE): Uint8Array {
  const out = new Uint8Array(n);
  let s = state & 0x7fff;
  for (let i = 0; i < n; i++) {
    out[i] = s & 1;
    s = lfsr15Step(s);
  }
  return out;
}

/** Number of steps until the LFSR state returns to its start (used by tests). */
export function lfsr15StatePeriod(state = LFSR_SEED_STATE): number {
  let s = lfsr15Step(state);
  let k = 1;
  while (s !== state && k < 70000) {
    s = lfsr15Step(s);
    k++;
  }
  return k;
}
