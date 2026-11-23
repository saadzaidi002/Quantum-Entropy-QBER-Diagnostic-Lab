import { describe, expect, it } from "vitest";
import { bitsFromString } from "../src/lib/bits";
import { berlekampMassey, repeatPeriod } from "../src/lib/linearComplexity";
import { lfsr15StatePeriod, lfsr15Step, lfsrPreset, LFSR_SEED_STATE } from "../src/lib/presets";
import { cryptoBits, mulberry32 } from "../src/lib/rng";

describe("15-bit LFSR preset (x^15 + x + 1)", () => {
  it("is maximal length: state period 32767", () => {
    expect(lfsr15StatePeriod(LFSR_SEED_STATE)).toBe(32767);
    expect(lfsr15StatePeriod(1)).toBe(32767);
  });
  it("obeys the recurrence s[k+15] = s[k] xor s[k+1]", () => {
    const s = lfsrPreset(512);
    for (let k = 0; k + 15 < s.length; k++) expect(s[k + 15]).toBe(s[k] ^ s[k + 1]);
  });
  it("step keeps the state in 15 bits and non-zero", () => {
    let st = LFSR_SEED_STATE;
    for (let i = 0; i < 1000; i++) {
      st = lfsr15Step(st);
      expect(st).toBeGreaterThan(0);
      expect(st).toBeLessThan(1 << 15);
    }
  });
  it("has linear complexity L <= 15 for n = 512 (exactly 15)", () => {
    const L = berlekampMassey(lfsrPreset(512));
    expect(L).toBeLessThanOrEqual(15);
    expect(L).toBe(15);
  });
});

describe("Berlekamp-Massey on random data", () => {
  it("crypto random 512-bit streams have L within n/2 +/- 8", () => {
    for (let run = 0; run < 8; run++) {
      const L = berlekampMassey(cryptoBits(512));
      expect(Math.abs(L - 256)).toBeLessThanOrEqual(8);
    }
  });
  it("seeded random streams have L within n/2 +/- 8", () => {
    for (const seed of [1, 2, 3, 42, 2026]) {
      const r = mulberry32(seed);
      const bits = new Uint8Array(512).map(() => (r() < 0.5 ? 1 : 0));
      expect(Math.abs(berlekampMassey(bits) - 256)).toBeLessThanOrEqual(8);
    }
  });
  it("known small cases", () => {
    expect(berlekampMassey(bitsFromString("0000"))).toBe(0);
    expect(berlekampMassey(bitsFromString("0001"))).toBe(4);
    expect(berlekampMassey(bitsFromString("1111"))).toBe(1);
    expect(berlekampMassey(bitsFromString("010101"))).toBe(2);
  });
});

describe("repeat period", () => {
  it("finds the smallest period when two full periods exist", () => {
    expect(repeatPeriod(bitsFromString("011011011011"))).toBe(3);
    expect(repeatPeriod(bitsFromString("0000"))).toBe(1);
    expect(repeatPeriod(bitsFromString("0110100"))).toBe(null);
  });
  it("finds nothing in the 512-bit LFSR preset (its period is 32767)", () => {
    expect(repeatPeriod(lfsrPreset(512))).toBe(null);
  });
});
