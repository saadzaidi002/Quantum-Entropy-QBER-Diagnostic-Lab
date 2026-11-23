import { useCallback, useEffect, useMemo, useState } from "react";
import { bitsToString, sanitizeBits } from "../lib/bits";
import { biasedPreset, lfsrPreset, qrngPreset } from "../lib/presets";
import { randomSeed } from "../lib/rng";
import { analyzeBits, classify, type McvMode } from "../lib/verdict";

export type QrngPresetKind = "qrng" | "biased" | "lfsr";

const DEBOUNCE_MS = 200;

export function useQrng() {
  const [text, setTextRaw] = useState("");
  /** The text that analysis actually ran on (debounced while typing). */
  const [analyzed, setAnalyzed] = useState("");
  const [source, setSource] = useState("Manual input");
  const [mcvMode, setMcvMode] = useState<McvMode>("plain");

  useEffect(() => {
    if (text === analyzed) return;
    const t = window.setTimeout(() => setAnalyzed(text), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [text, analyzed]);

  const setText = useCallback((v: string) => {
    setTextRaw(v);
    setSource("Manual input");
  }, []);

  /** Load text and analyse it at once (no debounce), e.g. from a preset or file. */
  const load = useCallback((v: string, label: string) => {
    setTextRaw(v);
    setAnalyzed(v);
    setSource(label);
  }, []);

  const loadPreset = useCallback(
    (kind: QrngPresetKind) => {
      if (kind === "qrng") load(bitsToString(qrngPreset()), "True QRNG sample (crypto.getRandomValues, 512 bits)");
      else if (kind === "biased") {
        const seed = randomSeed();
        load(bitsToString(biasedPreset(512, 0.68, seed)), `Biased optical source P(1)=0.68 (seed ${seed})`);
      } else load(bitsToString(lfsrPreset()), "Classical PRNG: 15-bit LFSR x^15+x+1 (512 bits)");
    },
    [load],
  );

  const sanitized = useMemo(() => sanitizeBits(analyzed), [analyzed]);
  const analysis = useMemo(() => analyzeBits(sanitized.bits), [sanitized]);
  const verdict = useMemo(() => classify(analysis, mcvMode), [analysis, mcvMode]);
  const pending = text !== analyzed;

  return { text, setText, load, loadPreset, source, mcvMode, setMcvMode, sanitized, analysis, verdict, pending };
}

export type QrngState = ReturnType<typeof useQrng>;
