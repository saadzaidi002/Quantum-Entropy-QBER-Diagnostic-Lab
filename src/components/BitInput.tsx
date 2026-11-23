import { useRef, type ChangeEvent } from "react";
import type { QrngPresetKind, QrngState } from "../hooks/useQrng";
import { THRESHOLDS } from "../lib/verdict";
import { readClipboard } from "../utils/dom";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

export function BitInput({ q }: { q: QrngState }) {
  const notify = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const n = q.analysis.n;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      q.load(String(reader.result ?? ""), `File: ${file.name}`);
      notify(`Loaded ${file.name}`);
    };
    reader.onerror = () => notify("Could not read that file.");
    reader.readAsText(file);
  };

  const onPaste = async () => {
    const t = await readClipboard();
    if (t === null) notify("The browser blocked clipboard access. Click the box and press Ctrl+V instead.");
    else {
      q.load(t, "Pasted from clipboard");
      notify("Pasted from clipboard");
    }
  };

  const presetBtn = (kind: QrngPresetKind, cls: string, label: string, swatch: string) => (
    <button type="button" className={`btn preset ${cls}`} onClick={() => q.loadPreset(kind)} data-tour={`preset-${kind}`}>
      <span className={`swatch ${swatch}`} aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <Card
      title="Raw bitstream"
      subtitle="Paste 0s and 1s from a detector, hardware TRNG or PRNG, or load a preset."
      tour="bit-input"
      icon="dice"
    >
      <div className="preset-row">
        <div className="btn-group" role="group" aria-label="Presets">
          {presetBtn("qrng", "btn-cyan", "True QRNG sample", "sw-cyan")}
          {presetBtn("biased", "btn-amber", "Biased optical source P(1)=0.68", "sw-amber")}
          {presetBtn("lfsr", "btn-rose", "Predictable classical PRNG (LFSR)", "sw-rose")}
        </div>
        <div className="btn-group" role="group" aria-label="Input">
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Load file…
          </button>
          <button type="button" className="btn btn-ghost" onClick={onPaste}>
            <Icon name="clipboard" /> Paste
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => q.load("", "Manual input")}>
            <Icon name="trash" /> Clear
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={onFile} aria-label="Load a .txt file of bits" />
      </div>
      <label htmlFor="raw-bits" className="sr-only">
        Raw bits
      </label>
      <textarea
        id="raw-bits"
        rows={4}
        value={q.text}
        spellCheck={false}
        placeholder="Paste raw 0 and 1 bits here, e.g. 0110100111001010…"
        onChange={(e) => q.setText(e.target.value)}
      />
      <div className="helper-bar">
        <span>
          Source: <strong>{q.source}</strong>
          {q.sanitized.stripped > 0 && <> · stripped {q.sanitized.stripped.toLocaleString()} non-binary characters</>}
          {q.pending && <> · analysing…</>}
        </span>
        <span className={n > 0 && n < THRESHOLDS.minBits ? "warn-text with-icon" : ""}>
          {n > 0 && n < THRESHOLDS.minBits && (
            <>
              <Icon name="alert" size={13} /> Under 16 bits: results are not meaningful.{" "}
            </>
          )}
          256+ bits recommended
        </span>
      </div>
    </Card>
  );
}
