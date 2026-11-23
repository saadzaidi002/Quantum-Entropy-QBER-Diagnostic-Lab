import { describe, expect, it } from "vitest";
import { bitsFromString, sanitizeBits } from "../src/lib/bits";
import {
  autocorrelation,
  markovMinEntropy,
  mcvMinEntropyNist,
  mcvMinEntropyPlain,
  shannonEntropy,
} from "../src/lib/entropy";
import { vonNeumann } from "../src/lib/vonNeumann";
import { analyzeBits, classify } from "../src/lib/verdict";
import { biasedPreset } from "../src/lib/presets";
import { mulberry32 } from "../src/lib/rng";

const alternating = (n: number) => bitsFromString("01".repeat(n / 2));

describe("sanitize", () => {
  it("strips non-binary characters and counts them", () => {
    const s = sanitizeBits("01 10\nab1");
    expect(Array.from(s.bits)).toEqual([0, 1, 1, 0, 1]);
    expect(s.stripped).toBe(4);
  });
});

describe("MCV min-entropy", () => {
  it("P(1)=0.68 gives 0.5564", () => {
    expect(mcvMinEntropyPlain(680, 1000)).toBeCloseTo(0.5564, 3);
    expect(Math.abs(mcvMinEntropyPlain(680, 1000) - 0.5564)).toBeLessThan(0.001);
  });
  it("balanced stream gives 1.0", () => {
    expect(mcvMinEntropyPlain(256, 512)).toBe(1);
  });
  it("NIST 99% bound is lower than the plain value", () => {
    const nist = mcvMinEntropyNist(256, 512);
    expect(nist).toBeLessThan(1);
    // p_u = 0.5 + 2.576*sqrt(0.25/511)
    expect(nist).toBeCloseTo(-Math.log2(0.5 + 2.576 * Math.sqrt(0.25 / 511)), 10);
  });
});

describe("alternating 0101... (n=512)", () => {
  const bits = alternating(512);
  const a = analyzeBits(bits);
  it("has P(0)=P(1)=0.5", () => {
    expect(a.p0).toBe(0.5);
    expect(a.p1).toBe(0.5);
  });
  it("has r1 close to -1 and the correlation flag set", () => {
    expect(a.autocorr[0]).toBeCloseTo(-1, 6);
    expect(a.autocorrFlagged).toBe(true);
  });
  it("has Markov H_min near 0", () => {
    expect(a.markov.hMin).toBeLessThan(0.01);
  });
  it("is not reported as random; period 2 makes it deterministic first", () => {
    const v = classify(a);
    expect(a.period).toBe(2);
    expect(v.kind).toBe("deterministic");
  });
  it("is classified 'correlated' when the deterministic check is not the first hit", () => {
    // Alternating structure plus 10% random flips: no exact period and no short LFSR, but r1 ~ -0.64.
    const rnd = mulberry32(9);
    const noisy = alternating(512).map((b) => (rnd() < 0.1 ? b ^ 1 : b));
    const a2 = analyzeBits(noisy);
    expect(a2.lcFlagged).toBe(false);
    expect(a2.autocorr[0]).toBeLessThan(-0.4);
    expect(classify(a2).kind).toBe("correlated");
  });
});

describe("all-zeros stream", () => {
  const bits = new Uint8Array(512);
  const a = analyzeBits(bits);
  it("gives H_min 0 with no NaN or Infinity", () => {
    expect(a.hMinPlain).toBe(0);
    expect(a.hMinNist).toBe(0);
    expect(a.markov.hMin).toBe(0);
    expect(a.shannon).toBe(0);
    const values = [a.hMinPlain, a.hMinNist, a.markov.hMin, a.shannon, ...a.autocorr, a.postVn.hMin, a.vn.bitEfficiency];
    for (const v of values) expect(Number.isFinite(v)).toBe(true);
    expect(classify(a).kind).toBe("deterministic");
  });
  it("empty and 1-bit inputs are safe", () => {
    for (const b of [new Uint8Array(0), new Uint8Array([1])]) {
      const x = analyzeBits(b);
      expect(Number.isFinite(x.markov.hMin)).toBe(true);
      expect(Number.isFinite(x.shannon)).toBe(true);
    }
    expect(shannonEntropy(0, 0)).toBe(0);
  });
});

describe("Von Neumann", () => {
  it("01 10 00 11 01 -> 1 0 1", () => {
    const r = vonNeumann(bitsFromString("0110001101"));
    expect(Array.from(r.output).join("")).toBe("101");
    expect(r.pairs).toBe(5);
    expect(r.emittedPairs).toBe(3);
    expect(r.pairEfficiency).toBeCloseTo(0.6);
    expect(r.bitEfficiency).toBeCloseTo(0.3);
    expect(r.trace.map((t) => t.out)).toEqual(["1", "0", null, null, "1"]);
  });
});

describe("Markov estimator", () => {
  it("memoryless biased source gives about -log2(0.68)", () => {
    const m = markovMinEntropy(biasedPreset(20000, 0.68, 3));
    expect(m.hMin).toBeGreaterThan(0.53);
    expect(m.hMin).toBeLessThan(0.58);
  });
  it("autocorrelation of a constant stream is 0, not NaN", () => {
    expect(autocorrelation(new Uint8Array(100).fill(1), 4)).toEqual([0, 0, 0, 0]);
  });
});
