# Quantum Entropy & QBER Diagnostic Lab — build notes

## How to run

```
npm install
npm test          # 43 tests (math + UI smoke tests)
npm run build     # -> dist/quantum-lab.html (single file, ~219 KB, opens by double-click)
npm run dev       # development server on http://localhost:5173/
npm run preview   # serves the built file at http://localhost:4173/quantum-lab.html
```

`dist/quantum-lab.html` has all JS and CSS inlined and a Content-Security-Policy meta tag
(`default-src 'none'; connect-src 'none'; …`), so the page cannot make any network request even
if someone adds one later. There is no analytics, CDN, font or image download. Vite's
module-preload polyfill (which contains a `fetch`) is turned off.

## What was built

- **Stack:** Vite 5 + React 18 + TypeScript strict, plain CSS with the original colour tokens,
  SVG charts (no chart library), Vitest + React Testing Library, `vite-plugin-singlefile`.
  Runtime dependencies: `react`, `react-dom` only.
- **`src/lib/`** (pure functions, no React): `bits.ts`, `entropy.ts` (Shannon, MCV plain and NIST
  99%, Markov DP, autocorrelation), `linearComplexity.ts` (Berlekamp-Massey, KMP repeat period),
  `vonNeumann.ts`, `verdict.ts` (single `THRESHOLDS` config + `analyzeBits` + `classify`),
  `bb84.ts` (simulation with Eve, sifting, Wilson interval, abort rule), `rng.ts` (mulberry32,
  `crypto.getRandomValues` wrapper), `presets.ts`, `report.ts` (text / JSON / CSV).
- **Tab 1 (QRNG):** textarea with sanitising and stripped-character count, the three presets,
  Clear, Load file, Paste from clipboard, 256+ hint and under-16 warning. Eight metric boxes,
  MCV toggle (plain = default, drives verdict; NIST 99% bound optional), Markov table with
  counts and highlighted cells, raw vs post-VN bar chart, autocorrelation chart for lags 1–16,
  Von Neumann card (both efficiencies labelled, output, 48-pair trace, copy, download, memory
  warning), verdict banner with reason and "copy diagnostic summary".
- **Tab 2 (BB84):** qubit count, noise slider, Eve fraction slider, seed + new seed, three presets,
  manual strings, banner (>= 11% aborts, < 50 sifted warning), metrics with Wilson interval and
  Eve estimate, QBER-vs-f chart with the current run's dot, sifted key, clickable sifting
  inspector with sticky row labels and "Reset to original run".
- **Tutorial:** right-side panel with the four exercises from deck slide 14, "Do it for me"
  (loads preset, switches tab, scrolls, spotlights the metrics with an SVG mask overlay),
  answer fields, "Show expected", progress dots/bar, Next/Back, ← → keys, Esc closes the
  spotlight, localStorage persistence inside try/catch, "Print my answers" one-page sheet.
- **Cross-cutting:** projector mode (125% root size, higher contrast, secondary text hidden),
  light theme (#0F172A / #0284C7 / #0F766E / #D97706 on white), export menu (copy summary,
  JSON, CSV, print report), print stylesheet with a dedicated one-page report sheet,
  `aria-live` verdicts, text/icon next to every colour signal, focus rings.

## The two bugs from the old tool

1. **LFSR preset was not flagged.** The preset is still a maximal-length 15-bit LFSR
   (x^15 + x + 1, state period 32767, checked in tests). Its frequency/memory numbers still
   pass (H_min IID ≈ 0.92, Markov ≈ 0.93, r1 ≈ −0.05), but Berlekamp-Massey gives L = 15 for
   512 bits (random ≈ 256), so it is now **Classical / deterministic** with the reason
   "A 15-bit LFSR can reproduce this stream".
2. **The P(1)=0.68 preset was called Classical.** The old Markov shortcut gave ≈ 0.64 and
   tripped a 0.65 cutoff. The new Markov estimator gives ≈ 0.56 (same as the IID value, as it
   should for a memoryless source), Markov is no longer a verdict gate, and memory is judged by
   autocorrelation. Tested over five seeds: always **Biased physical source**.

## Deviations and choices (please review)

- **Order of the verdict and the `0101…` test.** Section 7 says `0101…` should be "flagged as
  correlated". It is: r1 = −1 and the correlation flag is set. But the verdict order in 3.4 puts
  the deterministic check first, and `0101…` has period 2, so its *verdict* is
  "Classical / deterministic". The test checks the flag and the period-2 verdict, and a second
  test shows a noisy alternating stream (10% random flips) is classified "Correlated source".
- **Markov estimator uses point estimates.** NIST SP 800-90B 6.3.3 widens P_i and P_ij with
  confidence bounds before the DP. That is not done here; the value is the DP over the fitted
  chain only. So it is slightly optimistic compared with the real NIST tool.
- **Markov H_min is not a verdict gate** (the spec's 5-step order does not use it). It is shown
  and used in the "memory" warning only through r_k / transition rows.
- **"Memory" warning for Von Neumann** fires when any |r_k| > 0.25, when
  |P(1|1) − P(1|0)| > 0.2, or when the stream is deterministic. I used the row difference rather
  than "a cell far from 0.5", because a memoryless biased source has cells far from 0.5 without
  any memory.
- **Berlekamp-Massey is capped at the first 4096 bits** (it is O(n²)). The UI says so when it
  applies. An LFSR of length ≤ 15 is still caught; the 0.4·n test uses the capped length.
- **Repeat period** is reported only when at least two full periods are present (n ≥ 2p), and
  only for n ≥ 16.
- **Eve preset** uses noise 0 so the 25% emerges cleanly; the clean preset uses 1.5% noise and
  f = 0; the high-noise preset uses 14% noise and f = 0. Presets keep the current seed and qubit
  count. Changing any slider re-runs the simulation with the same seed (flips are cleared).
- **BB84 RNG draws 8 numbers per pulse** whatever happens, so with one seed, changing f or noise
  keeps Alice's and Bob's choices the same. Useful for showing the effect of f alone.
- **Clicking an ERR column also flips** (back to KEEP), so a participant can undo one flip.
- **Sifting inspector** renders up to 1024 pulses (metrics always use all pulses).
- **QRNG preset** is 512 bits taken from `crypto.getRandomValues` (a CSPRNG standing in for a
  real QRNG; the page says so in the source label). The biased preset uses a random seed each
  press, and shows it.
- **Projector mode** hides elements marked secondary: card subtitles, metric sub-lines and the
  header subtitle.

## Limits of the estimators (say this in the workshop)

- This is **not** the NIST SP 800-90B test suite. Only the ideas of the MCV (6.3.1) and Markov
  (6.3.3) estimators are used; the other non-IID estimators (collision, compression, t-tuple,
  LRS, the predictors) and the IID permutation tests are not implemented.
- Passing these tests does not prove a source is unpredictable; failing them proves it is not.
  Any good PRNG (AES-CTR, ChaCha) passes everything here.
- At N = 512, sampling noise is large: about 2.5% of truly random 512-bit samples have plain
  MCV H_min below 0.86, so a few percent of honest random samples will be called "biased".
  With the NIST 99% bound selected, even a perfect 512-bit stream scores ≈ 0.83 and is called
  "biased"; that is the intended effect of a confidence bound on a short sample.
- Thresholds and where they come from:
  - **0.85** H_min(IID) and **0.08** |P(1) − 0.5|: original tool.
  - **0.25** |r_k|: handout ("|r1| > 0.25 flags PRNG periodicity or detector dead-time").
    A workshop heuristic, not a NIST constant; applied here to lags 1–16.
  - **0.4 · n** linear complexity (n ≥ 128): this tool's choice. Random sequences sit at
    ≈ n/2 ± 1, so 0.4 n leaves a wide margin.
  - **0.2** Markov cell highlight: original tool.
  - **11.0%** QBER abort (≥, not >): handout, from the Shor–Preskill bound for BB84 with one-way
    post-processing.
  - **50** sifted bits for the "too few" warning: this tool's choice; at 50 bits the 95% Wilson
    interval around 0% already reaches ≈ 7%.
- The Eve estimate 4 × QBER assumes zero channel noise and a full intercept-resend attack.

## Verification done

- `npm test`: 43 tests pass (all items of section 7, plus Wilson reference values, BM small
  cases, LFSR recurrence, a 100k-bit timing test: ≈ 28 ms for the full analysis on this machine).
- `npm run build` produces `dist/quantum-lab.html`; scanned for `http`, `fetch`, `XMLHttpRequest`,
  `sendBeacon`, `WebSocket`, external `<script src>` / `<link href>`: none (only XML namespace
  strings and a React error-message URL in text).
- Checked in the browser at 1366×768 and 1920×1080, both tabs, tutorial open and closed:
  LFSR flagged, biased preset labelled correctly, BB84 flips update QBER/banner/chart live,
  abort switches at the predicted error count, projector + light theme, the file opened
  directly from disk (no server), no console errors.
- Tutorial "Show expected" ranges were checked against 2000 simulated runs per exercise.

## Not verified

- Printing to paper / PDF was not done; the print sheets were checked on screen with the
  print styles applied, not through the browser print dialog.
- Browsers other than Chromium (Firefox, Safari) were not tested.
- Clipboard read ("Paste from clipboard") on `file://` depends on the browser; if it is blocked
  the app shows a message telling the user to press Ctrl+V in the box.

## Visual refresh (second pass)

Design skills were downloaded to `C:\Users\saad\Downloads\claude-skills\` (13 repositories) and
used as reference reading only; none of their scripts or launchers were run, and no library from
them was added, so the app still has no runtime dependency other than React and stays offline.
What applied (mainly `pbakaus/impeccable` craft-floor and "Operate mode" guidance, plus the
pseudo-3D idea from `freshtechbro/claudedesignskills` lightweight-3d-effects):

- One SVG icon set (`components/Icon.tsx`) replaces the unicode glyphs (✓ ! ✕ ⚠ ▾ ← →).
- Animated Bloch-sphere logo drawn in SVG (`components/BlochLogo.tsx`), static under
  `prefers-reduced-motion`.
- Entropy metrics get a 0–1 meter with the 0.85 threshold tick for the H_min that drives the verdict.
- Verdict banner: tinted state emblem; a changed verdict "settles" into focus (the one authored animation).
- Charts: gradient bars, shaded abort / flag zones, area under the f/4 line.
- Browser surfaces themed: text selection, scrollbars, caret, fixed-width (tabular) numerals.
- Removed "01./02." tab numbers; one-sided accent border replaced by a full tint.
- Kept: colour tokens' roles, both themes, projector mode, print sheets, all behaviour.
- Not used: the taste skill (aimed at marketing sites with photographs), Vanta/Zdog/GSAP/three.js
  (would add runtime libraries).

## 3D effects (third pass)

All hand-written on `<canvas>` with a ~60-line projection module (`src/scene/math3d.ts`); no
three.js or other library, so the file stays ~250 KB and fully offline.

- **3D bit lattice** (QRNG tab, `scene/BitCube.tsx`): the first 512 bits as an 8×8×8 cube of
  shaded voxels (1 = lit block, 0 = dot). Drag or arrow keys to rotate, double-click to reset.
- **3D Bloch sphere** (BB84 tab, `scene/BlochSphere.tsx`, `components/BlochCard.tsx`): the four
  BB84 states; hovering or focusing a pulse in the sifting inspector shows Alice's state (cyan
  arrow) and Bob's measurement axis (amber), with a plain-language caption. Play / step buttons.
- **Interference wave field** behind the header (`scene/WaveField.tsx`), decorative and aria-hidden.
- **Pointer tilt with glare** on metric boxes (`hooks/useTilt.ts`), values lift on a 3D layer.
- All scenes pause off-screen and in hidden tabs, follow the theme tokens, and stop moving under
  `prefers-reduced-motion`; tilt is off for touch pointers.
- Tests: jsdom has no canvas, so `tests/setup.ts` stubs `getContext` to return null (the scenes
  already skip drawing in that case).
