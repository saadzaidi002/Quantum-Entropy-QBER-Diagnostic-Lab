import { AutocorrChart } from "../components/AutocorrChart";
import { BitCube } from "../scene/BitCube";
import { BarChart } from "../components/BarChart";
import { BitInput } from "../components/BitInput";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { MarkovTable } from "../components/MarkovTable";
import { MetricBox } from "../components/MetricBox";
import { VerdictBanner } from "../components/VerdictBanner";
import { VonNeumannCard } from "../components/VonNeumannCard";
import type { QrngState } from "../hooks/useQrng";
import { THRESHOLDS } from "../lib/verdict";

interface Props {
  q: QrngState;
  onCopySummary: () => void;
}

export function QrngTab({ q, onCopySummary }: Props) {
  const a = q.analysis;
  const v = q.verdict;
  const r1 = a.autocorr[0] ?? 0;
  const lcExpected = Math.round(a.lcBits / 2);
  const hasData = a.n > 0;

  return (
    <>
      <BitInput q={q} />

      <VerdictBanner
        tone={v.tone}
        badge={v.badge}
        title={v.title}
        desc={v.reason}
        tour="qrng-verdict"
        side={
          <button type="button" className="btn btn-ghost" onClick={onCopySummary}>
            <Icon name="copy" /> Copy diagnostic summary
          </button>
        }
      />
      <p className="disclaimer">Passing these tests does not prove a source is unpredictable. Failing them proves it is not.</p>

      <div className="mcv-toggle" role="radiogroup" aria-label="Which MCV estimate drives the verdict">
        <span className="mcv-toggle-label">Verdict uses:</span>
        <label>
          <input type="radio" name="mcv" checked={q.mcvMode === "plain"} onChange={() => q.setMcvMode("plain")} /> plain MCV
          (handout)
        </label>
        <label>
          <input type="radio" name="mcv" checked={q.mcvMode === "nist"} onChange={() => q.setMcvMode("nist")} /> NIST 6.3.1
          with 99% upper bound
        </label>
      </div>

      <div className="metrics-grid metrics-8" data-tour="qrng-metrics">
        <MetricBox label="Sample size N" value={a.n.toLocaleString()} sub={`0s: ${a.zeros} | 1s: ${a.ones}`} />
        <MetricBox
          label="P(0) / P(1)"
          smallValue
          value={`${a.p0.toFixed(3)} / ${a.p1.toFixed(3)}`}
          sub={`|P(1) - 0.5| = ${a.biasDelta.toFixed(3)}`}
          flag={hasData && a.biasDelta > THRESHOLDS.biasDelta ? `bias > ${THRESHOLDS.biasDelta}` : undefined}
        />
        <MetricBox label="Shannon entropy H1" value={a.shannon.toFixed(4)} meter={{ value: a.shannon }} sub="bits per bit (max 1)" />
        <MetricBox
          label="H_min IID, plain MCV"
          tone="cyan"
          tour={q.mcvMode === "plain" ? "hmin-iid" : undefined}
          value={a.hMinPlain.toFixed(4)}
          meter={{ value: a.hMinPlain, threshold: q.mcvMode === "plain" ? THRESHOLDS.hMinIid : undefined }}
          sub={<>-log2(max(P0, P1)) · handout{q.mcvMode === "plain" ? " · drives verdict" : ""}</>}
          flag={hasData && q.mcvMode === "plain" && a.hMinPlain < THRESHOLDS.hMinIid ? `below ${THRESHOLDS.hMinIid}` : undefined}
        />
        <MetricBox
          label="H_min IID, NIST 99% bound"
          tone="cyan"
          tour={q.mcvMode === "nist" ? "hmin-iid" : undefined}
          value={a.hMinNist.toFixed(4)}
          meter={{ value: a.hMinNist, threshold: q.mcvMode === "nist" ? THRESHOLDS.hMinIid : undefined }}
          sub={<>SP 800-90B 6.3.1 upper bound p_u{q.mcvMode === "nist" ? " · drives verdict" : ""}</>}
          flag={hasData && q.mcvMode === "nist" && a.hMinNist < THRESHOLDS.hMinIid ? `below ${THRESHOLDS.hMinIid}` : undefined}
        />
        <MetricBox
          label="Markov H_min (non-IID)"
          tone="emerald"
          tour="hmin-markov"
          value={a.markov.hMin.toFixed(4)}
          meter={{ value: a.markov.hMin }}
          sub="most likely 128-bit path, NIST 6.3.3 idea"
        />
        <MetricBox
          label="Serial correlation r1"
          tour="r1"
          value={r1.toFixed(3)}
          sub={`max |r_k|, k ≤ 16: ${Math.abs(a.maxAbsAutocorr.value).toFixed(3)} (lag ${a.maxAbsAutocorr.lag})`}
          flag={a.autocorrFlagged ? `|r| > ${THRESHOLDS.autocorrFlag}` : undefined}
        />
        <MetricBox
          label="Linear complexity"
          tour="linear-complexity"
          tone={a.lcFlagged || a.period !== null ? "rose" : "default"}
          value={`L = ${a.linearComplexity}`}
          sub={
            <>
              random expectation ~ n/2 = {lcExpected}
              {a.lcBits < a.n && <> (first {a.lcBits} bits)</>}
              <br />
              repeat period: {a.period === null ? "none" : `${a.period} bits`}
            </>
          }
          flag={
            a.period !== null
              ? "exact repeat found"
              : a.lcFlagged
                ? `L < ${THRESHOLDS.linearComplexityRatio} n`
                : undefined
          }
        />
      </div>

      <div className="grid-2">
        <Card
          title="Markov chain model"
          subtitle="P(next | previous) shows memory that 0/1 counts cannot see. Cells more than 0.2 from 0.5 are marked."
          tour="markov-card"
          icon="shuffle"
        >
          <MarkovTable m={a.markov} />
          <div className="card-subtitle chart-title">Raw vs. post-extraction probabilities (dashed line: 0.50)</div>
          <BarChart
            title="Raw P(0), P(1), P(0|0), P(1|1), post-Von Neumann P(0), P(1)"
            bars={[
              { label: "Raw P(0)", value: a.p0, tone: "cyan" },
              { label: "Raw P(1)", value: a.p1, tone: "cyan" },
              { label: "P(0|0)", value: a.markov.P[0][0], tone: "amber" },
              { label: "P(1|1)", value: a.markov.P[1][1], tone: "amber" },
              { label: "Post P(0)", value: a.postVn.p0, tone: "emerald" },
              { label: "Post P(1)", value: a.postVn.p1, tone: "emerald" },
            ]}
          />
        </Card>
        <VonNeumannCard a={a} />
      </div>

      <div className="grid-2">
      <Card
        title="3D bit lattice"
        subtitle="The first 512 bits as an 8 × 8 × 8 cube: a lit block is a 1, a dot is a 0. Patterns your eye finds here are what the tests measure. Drag to rotate."
        tour="bit-cube"
        icon="dice"
      >
        <div className="scene-wrap">
          <BitCube bits={q.sanitized.bits} />
        </div>
      </Card>
      <Card
        title="Autocorrelation, lags 1 to 16"
        subtitle={
          <>
            Bars beyond ±{THRESHOLDS.autocorrFlag} are flagged in red and marked with !. {THRESHOLDS.autocorrFlag} is a workshop
            heuristic, not a NIST constant.
          </>
        }
        tour="autocorr-card"
        icon="eye"
      >
        <AutocorrChart values={a.autocorr} threshold={THRESHOLDS.autocorrFlag} />
      </Card>
      </div>
    </>
  );
}
