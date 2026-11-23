import type { ReportInput } from "../lib/report";
import { decisionLabel } from "../lib/report";
import { hMinIid } from "../lib/verdict";
import { STEPS } from "../tutorial/steps";
import type { Answers } from "../tutorial/TutorialPanel";

/** One-page report, shown only when printing (data-print="report"). */
export function PrintReport({ r }: { r: ReportInput }) {
  const a = r.qrng.analysis;
  const s = r.bb84.sift;
  const p = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;
  const rows: [string, string][] = [
    ["Source", r.qrng.source],
    ["N (0s / 1s)", `${a.n} (${a.zeros} / ${a.ones})`],
    ["P(0) / P(1)", `${a.p0.toFixed(3)} / ${a.p1.toFixed(3)}`],
    ["Shannon H1", a.shannon.toFixed(4)],
    ["H_min IID plain / NIST 99%", `${a.hMinPlain.toFixed(4)} / ${a.hMinNist.toFixed(4)} (verdict: ${r.qrng.mcvMode})`],
    ["Markov H_min", a.markov.hMin.toFixed(4)],
    ["r1 / max |r_k|", `${(a.autocorr[0] ?? 0).toFixed(3)} / ${Math.abs(a.maxAbsAutocorr.value).toFixed(3)} (lag ${a.maxAbsAutocorr.lag})`],
    ["Linear complexity", `L = ${a.linearComplexity} over ${a.lcBits} bits (random ~${Math.round(a.lcBits / 2)}); period: ${a.period ?? "none"}`],
    ["Von Neumann", `${a.vn.output.length} bits; ${p(a.vn.bitEfficiency, 1)} of bits, ${p(a.vn.pairEfficiency, 1)} of pairs; post H_min ${a.postVn.hMin.toFixed(4)}`],
  ];
  const bRows: [string, string][] = [
    ["Seed / qubits", `${r.bb84.params.seed} / ${s.n}`],
    ["Noise / Eve f", `${p(r.bb84.params.noise, 1)} / ${p(r.bb84.params.eveFraction, 0)}`],
    ["Sifted / errors", `${s.sifted} / ${s.errors}`],
    ["QBER (95% Wilson)", `${p(s.qber)} (${p(s.interval.lo)} to ${p(s.interval.hi)})`],
    ["Est. Eve fraction", `${p(s.eveEstimate, 0)} (assumes zero noise)`],
    ["Hand-flipped bits", String(r.bb84.flipped.length)],
  ];
  return (
    <div className="print-sheet print-report">
      <h1>Quantum Entropy &amp; QBER Diagnostic Lab: report</h1>
      <p className="print-meta">Generated {new Date(r.generatedAt).toLocaleString()}</p>
      <h2>QRNG audit: {r.qrng.verdict.badge}</h2>
      <p>{r.qrng.verdict.reason}</p>
      <table>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
          <tr>
            <th>H_min used by verdict</th>
            <td>{hMinIid(a, r.qrng.mcvMode).toFixed(4)}</td>
          </tr>
        </tbody>
      </table>
      <h2>BB84 audit: {decisionLabel(r.bb84.decision)}</h2>
      <table>
        <tbody>
          {bRows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="print-foot">
        Educational tool. The estimators follow the ideas of NIST SP 800-90B but are not the full NIST test suite. Passing these
        tests does not prove a source is unpredictable. Failing them proves it is not.
      </p>
    </div>
  );
}

/** Participant answer sheet, shown only when printing with data-print="answers". */
export function PrintAnswers({ answers, name }: { answers: Answers; name: string }) {
  return (
    <div className="print-sheet print-answers">
      <h1>Quantum Cryptography &amp; QRNG Verification: lab answers</h1>
      <p className="print-meta">
        Name: {name || "________________________"} · Date: {new Date().toLocaleDateString()}
      </p>
      {STEPS.map((s) => (
        <section key={s.id}>
          <h2>{s.title}</h2>
          <table>
            <tbody>
              {s.fields.map((f) => (
                <tr key={f.id}>
                  <th>{f.label}</th>
                  <td className="answer">{answers[`${s.id}.${f.id}`] || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="print-foot">Quantum Entropy &amp; QBER Diagnostic Lab · Educational tool</p>
    </div>
  );
}
