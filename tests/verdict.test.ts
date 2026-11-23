import { describe, expect, it } from "vitest";
import { biasedPreset, lfsrPreset } from "../src/lib/presets";
import { mulberry32 } from "../src/lib/rng";
import { analyzeBits, classify, THRESHOLDS } from "../src/lib/verdict";

const seededRandom = (n: number, seed: number) => {
  const r = mulberry32(seed);
  return new Uint8Array(n).map(() => (r() < 0.5 ? 1 : 0));
};

describe("verdict classification", () => {
  it("LFSR preset is flagged Classical / deterministic (old-tool bug 1)", () => {
    const a = analyzeBits(lfsrPreset(512));
    // The frequency tests alone would pass it, as in the old tool:
    expect(a.hMinPlain).toBeGreaterThan(0.85);
    expect(Math.abs(a.autocorr[0])).toBeLessThan(0.25);
    const v = classify(a);
    expect(v.kind).toBe("deterministic");
    expect(v.badge).toBe("Classical / deterministic");
    expect(v.reason).toMatch(/LFSR can reproduce this stream/);
  });

  it("P(1)=0.68 preset is 'Biased physical source', never Classical (old-tool bug 2)", () => {
    for (const seed of [1, 7, 68, 1234, 99999]) {
      const a = analyzeBits(biasedPreset(512, 0.68, seed));
      const v = classify(a);
      expect(v.kind).toBe("biased");
      expect(v.badge).toBe("Biased physical source");
      // New Markov estimator is close to the IID value for a memoryless source.
      expect(Math.abs(a.markov.hMin - a.hMinPlain)).toBeLessThan(0.12);
      expect(a.memoryFlagged).toBe(false);
    }
  });

  it("post-VN output of the biased preset is close to full entropy", () => {
    const a = analyzeBits(biasedPreset(512, 0.68, 1));
    expect(a.vn.pairEfficiency).toBeGreaterThan(0.33);
    expect(a.vn.pairEfficiency).toBeLessThan(0.54); // 2p(1-p) = 0.435
    expect(a.postVn.hMin).toBeGreaterThan(0.75);
  });

  it("a good random stream is Quantum-grade", () => {
    const v = classify(analyzeBits(seededRandom(512, 2024)));
    expect(v.kind).toBe("quantum");
    expect(v.title).toMatch(/consistent with a full-entropy source/i);
    expect(v.title).not.toMatch(/verified/i);
  });

  it("short samples are reported as too short", () => {
    expect(classify(analyzeBits(seededRandom(10, 1))).kind).toBe("short");
  });

  it("all thresholds live in one config", () => {
    expect(THRESHOLDS.autocorrFlag).toBe(0.25);
    expect(THRESHOLDS.linearComplexityRatio).toBe(0.4);
    expect(THRESHOLDS.qberAbort).toBe(0.11);
  });
});

describe("performance", () => {
  it("full analysis of 100,000 bits runs under 50 ms", () => {
    const bits = seededRandom(100_000, 5);
    analyzeBits(bits); // warm-up (JIT)
    const t0 = performance.now();
    analyzeBits(bits);
    const ms = performance.now() - t0;
    console.log(`analyzeBits(100k) took ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(50);
  });
});
