import type { Bb84Params, Bb84Strings, QberDecision, SiftResult } from "./bb84";
import { type BitAnalysis, hMinIid, type McvMode, type Verdict } from "./verdict";

export interface QrngReportInput {
  bits: string;
  stripped: number;
  mcvMode: McvMode;
  source: string;
  analysis: BitAnalysis;
  verdict: Verdict;
}

export interface Bb84ReportInput {
  params: Bb84Params;
  /** f of the simulation that produced the current data, or null for manual data. */
  runEveFraction: number | null;
  inputs: Bb84Strings;
  flipped: number[];
  sift: SiftResult;
  decision: QberDecision;
}

export interface ReportInput {
  generatedAt: string;
  qrng: QrngReportInput;
  bb84: Bb84ReportInput;
}

const pct = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;

export function decisionLabel(d: QberDecision): string {
  return d === "abort" ? "ABORT (QBER >= 11.0%)" : d === "secure" ? "SECURE (QBER < 11.0%)" : "NO SIFTED BITS";
}

/** Plain-text summary for copy/paste. */
export function textSummary(r: ReportInput, which: "qrng" | "bb84" | "both" = "both"): string {
  const lines: string[] = [];
  if (which !== "bb84") {
    const a = r.qrng.analysis;
    lines.push(
      `QRNG audit (N=${a.n}, source: ${r.qrng.source})`,
      `Verdict: ${r.qrng.verdict.badge}. ${r.qrng.verdict.reason}`,
      `P(0)/P(1) = ${a.p0.toFixed(3)} / ${a.p1.toFixed(3)}, |P(1)-0.5| = ${a.biasDelta.toFixed(3)}`,
      `Shannon H1 = ${a.shannon.toFixed(4)}`,
      `H_min IID plain = ${a.hMinPlain.toFixed(4)}, NIST 99% = ${a.hMinNist.toFixed(4)} (verdict uses ${r.qrng.mcvMode})`,
      `H_min Markov (128-bit DP) = ${a.markov.hMin.toFixed(4)}`,
      `r1 = ${a.autocorr[0]?.toFixed(3) ?? "0.000"}, max |r_k| (k<=16) = ${Math.abs(a.maxAbsAutocorr.value).toFixed(3)} at lag ${a.maxAbsAutocorr.lag}`,
      `Linear complexity L = ${a.linearComplexity} over ${a.lcBits} bits (random ~${Math.round(a.lcBits / 2)}); repeat period: ${a.period ?? "none"}`,
      `Von Neumann: ${a.vn.output.length} bits out, ${pct(a.vn.bitEfficiency, 1)} of input bits, ${pct(a.vn.pairEfficiency, 1)} of pairs; post H_min = ${a.postVn.hMin.toFixed(4)}`,
    );
  }
  if (which === "both") lines.push("");
  if (which !== "qrng") {
    const b = r.bb84;
    const s = b.sift;
    lines.push(
      `BB84 audit (seed ${b.params.seed}, f=${pct(b.params.eveFraction, 0)}, noise=${pct(b.params.noise, 1)})`,
      `Transmitted ${s.n}, sifted ${s.sifted} (${s.n ? pct(s.sifted / s.n, 1) : "0%"}), errors ${s.errors}`,
      `QBER = ${pct(s.qber)} (95% Wilson ${pct(s.interval.lo)} to ${pct(s.interval.hi)}), est. Eve fraction ${pct(s.eveEstimate, 0)} (assumes zero noise)`,
      `Decision: ${decisionLabel(b.decision)}${b.flipped.length ? `; ${b.flipped.length} bit(s) flipped by hand` : ""}`,
    );
  }
  return lines.join("\n");
}

export function jsonReport(r: ReportInput): string {
  const a = r.qrng.analysis;
  const s = r.bb84.sift;
  const out = {
    tool: "Quantum Entropy & QBER Diagnostic Lab",
    generatedAt: r.generatedAt,
    qrng: {
      inputs: { bits: r.qrng.bits, strippedCharacters: r.qrng.stripped, source: r.qrng.source, mcvMode: r.qrng.mcvMode },
      metrics: {
        n: a.n,
        zeros: a.zeros,
        ones: a.ones,
        p0: a.p0,
        p1: a.p1,
        biasDelta: a.biasDelta,
        shannon: a.shannon,
        hMinIidPlain: a.hMinPlain,
        hMinIidNist: a.hMinNist,
        hMinIidUsed: hMinIid(a, r.qrng.mcvMode),
        hMinMarkov: a.markov.hMin,
        markovCounts: a.markov.counts,
        markovP: a.markov.P,
        autocorrelation: a.autocorr,
        linearComplexity: a.linearComplexity,
        linearComplexityBits: a.lcBits,
        repeatPeriod: a.period,
        vonNeumann: {
          outputBits: a.vn.output.length,
          bitEfficiency: a.vn.bitEfficiency,
          pairEfficiency: a.vn.pairEfficiency,
          postP0: a.postVn.p0,
          postP1: a.postVn.p1,
          postHMin: a.postVn.hMin,
        },
      },
      verdict: r.qrng.verdict,
    },
    bb84: {
      inputs: { ...r.bb84.inputs, params: r.bb84.params, runEveFraction: r.bb84.runEveFraction, flippedPulses: r.bb84.flipped },
      metrics: {
        transmitted: s.n,
        sifted: s.sifted,
        errors: s.errors,
        qber: s.qber,
        wilson95: s.interval,
        eveEstimate: s.eveEstimate,
        siftedKey: s.siftedKey,
      },
      decision: r.bb84.decision,
    },
  };
  return JSON.stringify(out, null, 2);
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvReport(r: ReportInput): string {
  const a = r.qrng.analysis;
  const s = r.bb84.sift;
  const rows: [string, string, string | number][] = [
    ["section", "metric", "value"],
    ["qrng", "source", r.qrng.source],
    ["qrng", "n", a.n],
    ["qrng", "zeros", a.zeros],
    ["qrng", "ones", a.ones],
    ["qrng", "p0", a.p0.toFixed(6)],
    ["qrng", "p1", a.p1.toFixed(6)],
    ["qrng", "bias_delta", a.biasDelta.toFixed(6)],
    ["qrng", "shannon_h1", a.shannon.toFixed(6)],
    ["qrng", "hmin_iid_plain", a.hMinPlain.toFixed(6)],
    ["qrng", "hmin_iid_nist99", a.hMinNist.toFixed(6)],
    ["qrng", "mcv_mode", r.qrng.mcvMode],
    ["qrng", "hmin_markov", a.markov.hMin.toFixed(6)],
    ...a.autocorr.map((v, i): [string, string, string] => ["qrng", `r${i + 1}`, v.toFixed(6)]),
    ["qrng", "linear_complexity", a.linearComplexity],
    ["qrng", "linear_complexity_bits", a.lcBits],
    ["qrng", "repeat_period", a.period ?? ""],
    ["qrng", "vn_output_bits", a.vn.output.length],
    ["qrng", "vn_bit_efficiency", a.vn.bitEfficiency.toFixed(6)],
    ["qrng", "vn_pair_efficiency", a.vn.pairEfficiency.toFixed(6)],
    ["qrng", "vn_post_hmin", a.postVn.hMin.toFixed(6)],
    ["qrng", "verdict", r.qrng.verdict.badge],
    ["bb84", "seed", r.bb84.params.seed],
    ["bb84", "qubits_setting", r.bb84.params.qubits],
    ["bb84", "noise", r.bb84.params.noise],
    ["bb84", "eve_fraction", r.bb84.params.eveFraction],
    ["bb84", "transmitted", s.n],
    ["bb84", "sifted", s.sifted],
    ["bb84", "errors", s.errors],
    ["bb84", "qber", s.qber.toFixed(6)],
    ["bb84", "wilson95_lo", s.interval.lo.toFixed(6)],
    ["bb84", "wilson95_hi", s.interval.hi.toFixed(6)],
    ["bb84", "eve_estimate", s.eveEstimate.toFixed(6)],
    ["bb84", "flipped_pulses", r.bb84.flipped.join(" ")],
    ["bb84", "decision", r.bb84.decision],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}
