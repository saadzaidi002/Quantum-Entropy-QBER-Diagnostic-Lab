import { useCallback, useMemo, useState } from "react";
import {
  type Bb84Params,
  type Bb84Run,
  type Bb84Strings,
  flipBitAt,
  qberDecision,
  sanitizeBitString,
  siftBb84,
  simulateBb84,
} from "../lib/bb84";
import { randomSeed } from "../lib/rng";

export type Bb84PresetKind = "clean" | "eve" | "noisy";

export const QUBIT_OPTIONS = [64, 128, 512, 2048, 4096] as const;

export const BB84_PRESETS: Record<Bb84PresetKind, { label: string; noise: number; eveFraction: number }> = {
  clean: { label: "Clean fiber (noise 1.5%, f = 0)", noise: 0.015, eveFraction: 0 },
  eve: { label: "Intercept-resend by Eve (f = 100%)", noise: 0, eveFraction: 1 },
  noisy: { label: "High channel noise (14%)", noise: 0.14, eveFraction: 0 },
};

const EMPTY: Bb84Strings = { aliceBits: "", aliceBases: "", bobBases: "", bobBits: "" };

export function useBb84(initialSeed = randomSeed()) {
  const [params, setParams] = useState<Bb84Params>({ qubits: 128, noise: 0.015, eveFraction: 0, seed: initialSeed });
  const [inputs, setInputs] = useState<Bb84Strings>(EMPTY);
  const [original, setOriginal] = useState<Bb84Run | null>(null);
  /** Pulse indices whose Bob bit was flipped by hand, relative to the original run. */
  const [flipped, setFlipped] = useState<number[]>([]);

  const run = useCallback((p: Bb84Params) => {
    const r = simulateBb84(p);
    setParams(p);
    setOriginal(r);
    setInputs({ aliceBits: r.aliceBits, aliceBases: r.aliceBases, bobBases: r.bobBases, bobBits: r.bobBits });
    setFlipped([]);
  }, []);

  const update = useCallback((patch: Partial<Bb84Params>) => run({ ...params, ...patch }), [params, run]);

  const preset = useCallback(
    (kind: Bb84PresetKind) => {
      const p = BB84_PRESETS[kind];
      run({ ...params, noise: p.noise, eveFraction: p.eveFraction });
    },
    [params, run],
  );

  const newSeed = useCallback(() => run({ ...params, seed: randomSeed() }), [params, run]);

  /** Manual edit of one of the four strings. The data no longer comes from a known f. */
  const setField = useCallback((field: keyof Bb84Strings, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setOriginal(null);
    setFlipped([]);
  }, []);

  const flip = useCallback((index: number) => {
    setInputs((prev) => ({ ...prev, bobBits: flipBitAt(sanitizeBitString(prev.bobBits), index) }));
    setFlipped((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  }, []);

  const reset = useCallback(() => {
    if (!original) return;
    setInputs({
      aliceBits: original.aliceBits,
      aliceBases: original.aliceBases,
      bobBases: original.bobBases,
      bobBits: original.bobBits,
    });
    setFlipped([]);
  }, [original]);

  const sift = useMemo(() => siftBb84(inputs), [inputs]);
  const decision = qberDecision(sift.errors, sift.sifted);
  const runF = original ? original.params.eveFraction : null;

  return { params, inputs, original, flipped, sift, decision, runF, run, update, preset, newSeed, setField, flip, reset };
}

export type Bb84State = ReturnType<typeof useBb84>;
