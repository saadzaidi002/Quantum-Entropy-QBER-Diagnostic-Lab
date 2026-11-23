# Quantum Entropy & QBER Diagnostic Lab

A hands-on, fully offline lab for a 90-minute workshop on quantum cryptography and QRNG
verification (NED University of Engineering & Technology, NCQC / Center for Quantum Technologies).

The whole tool is one HTML file: **[dist/quantum-lab.html](dist/quantum-lab.html)**. Download it and
double-click. No server, no install, no network requests.

## What it does

**Tab 1: QRNG & min-entropy validator**
- Shannon entropy, MCV min-entropy (plain and NIST SP 800-90B 6.3.1 with 99% bound),
  Markov min-entropy (most likely 128-bit path), autocorrelation for lags 1–16.
- Linear complexity (Berlekamp–Massey) and exact repeat-period detection, so a predictable LFSR is
  flagged as *Classical / deterministic*.
- Von Neumann extractor with both efficiencies, output, pair trace, copy and download.
- 3D bit lattice of the first 512 bits.

**Tab 2: BB84 QBER & Eve simulator**
- Seeded simulation with intercept-resend eavesdropping and channel noise; the 25% QBER at full
  interception emerges from the physics.
- QBER with a 95% Wilson interval, the 11% abort rule (≥ aborts), Eve-fraction estimate.
- Interactive 3D Bloch sphere linked to a pulse-by-pulse sifting inspector where you can flip
  Bob's bits by hand.

**Also:** a guided tutorial panel for the four lab exercises, projector mode, light theme, and export
to text, JSON, CSV and a one-page printed report.

A 26-page user guide with step-by-step exercises is in
**[Quantum_Lab_Tutorial_Guide.docx](Quantum_Lab_Tutorial_Guide.docx)**.

## Develop

Requires Node 18+.

```bash
npm install
npm test          # unit tests for the math + UI smoke tests
npm run dev       # http://localhost:5173
npm run build     # -> dist/quantum-lab.html (single file)
npm run preview   # serves the build at http://localhost:4173/quantum-lab.html
```

Stack: Vite, React 18, TypeScript (strict), plain CSS, SVG and canvas graphics with no chart or 3D
library. Runtime dependencies: `react` and `react-dom` only.

```
src/lib/       pure math: entropy, Berlekamp–Massey, Von Neumann, verdict + thresholds, BB84, reports
src/components UI pieces (metric boxes, banners, charts, sifting grid, Bloch card)
src/scene/     dependency-free 3D canvas engine, bit lattice, Bloch sphere, header wave field
src/tabs/      the two lab tabs
src/tutorial/  tutorial steps, panel and spotlight
tests/         Vitest tests
```

See [NOTES.md](NOTES.md) for design decisions, thresholds and where they come from, and the limits
of the estimators.

## Limits

Educational tool. The estimators follow the ideas of NIST SP 800-90B but are not the full NIST test
suite. Passing these tests does not prove a source is unpredictable; failing them proves it is not.
