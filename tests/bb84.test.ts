import { describe, expect, it } from "vitest";
import { flipBitAt, qberDecision, siftBb84, simulateBb84, wilsonInterval } from "../src/lib/bb84";

describe("BB84 simulation", () => {
  it("f=0, noise=0 gives QBER 0 and about 50% sifted", () => {
    const run = simulateBb84({ qubits: 4096, noise: 0, eveFraction: 0, seed: 11 });
    const s = siftBb84(run);
    expect(s.errors).toBe(0);
    expect(s.qber).toBe(0);
    expect(s.sifted / s.n).toBeGreaterThan(0.46);
    expect(s.sifted / s.n).toBeLessThan(0.54);
  });

  it("f=1, noise=0, 4096 qubits gives QBER 25% +/- 2 points (emergent)", () => {
    for (const seed of [1, 2, 3]) {
      const s = siftBb84(simulateBb84({ qubits: 4096, noise: 0, eveFraction: 1, seed }));
      expect(Math.abs(s.qber - 0.25)).toBeLessThan(0.02);
    }
  });

  it("noise 14% with f=0 gives about 14%", () => {
    const s = siftBb84(simulateBb84({ qubits: 4096, noise: 0.14, eveFraction: 0, seed: 5 }));
    expect(Math.abs(s.qber - 0.14)).toBeLessThan(0.025);
  });

  it("the same seed reproduces the run exactly; a different seed does not", () => {
    const p = { qubits: 512, noise: 0.05, eveFraction: 0.4, seed: 777 };
    const a = simulateBb84(p);
    const b = simulateBb84(p);
    expect(b).toEqual(a);
    const c = simulateBb84({ ...p, seed: 778 });
    expect(c.aliceBits).not.toBe(a.aliceBits);
  });

  it("flipping one sifted bit raises errors by exactly 1", () => {
    const run = simulateBb84({ qubits: 128, noise: 0.015, eveFraction: 0, seed: 3 });
    const before = siftBb84(run);
    const idx = before.status.findIndex((s) => s === "match-ok");
    const after = siftBb84({ ...run, bobBits: flipBitAt(run.bobBits, idx) });
    expect(after.errors).toBe(before.errors + 1);
    expect(after.sifted).toBe(before.sifted);
  });
});

describe("QBER threshold", () => {
  it("QBER exactly 11.0% aborts", () => {
    expect(qberDecision(11, 100)).toBe("abort");
    expect(qberDecision(110, 1000)).toBe("abort");
    expect(qberDecision(10, 100)).toBe("secure");
    expect(qberDecision(0, 0)).toBe("empty");
  });
});

describe("Wilson interval", () => {
  it("contains the point estimate and stays in [0, 1]", () => {
    const w = wilsonInterval(5, 64);
    expect(w.lo).toBeLessThan(5 / 64);
    expect(w.hi).toBeGreaterThan(5 / 64);
    const z = wilsonInterval(0, 64);
    expect(z.lo).toBe(0);
    expect(z.hi).toBeGreaterThan(0.04);
  });
  it("matches a reference value (k=10, n=100)", () => {
    const w = wilsonInterval(10, 100);
    expect(w.lo).toBeCloseTo(0.0552, 3);
    expect(w.hi).toBeCloseTo(0.1744, 3);
  });
});
