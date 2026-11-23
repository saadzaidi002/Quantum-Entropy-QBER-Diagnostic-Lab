import { useCallback, useEffect, useMemo, useState } from "react";
import { BlochLogo } from "./components/BlochLogo";
import { Icon, type IconName } from "./components/Icon";
import { PrintAnswers, PrintReport } from "./components/PrintSheets";
import { WaveField } from "./scene/WaveField";
import { useToast } from "./components/Toast";
import { useBb84 } from "./hooks/useBb84";
import { useQrng } from "./hooks/useQrng";
import { bitsToString } from "./lib/bits";
import { csvReport, jsonReport, type ReportInput, textSummary } from "./lib/report";
import { Bb84Tab } from "./tabs/Bb84Tab";
import { QrngTab } from "./tabs/QrngTab";
import { Spotlight } from "./tutorial/Spotlight";
import { STEPS, type TutorialStep } from "./tutorial/steps";
import { type Answers, TutorialPanel } from "./tutorial/TutorialPanel";
import { copyText, downloadText, loadStored, printSheet, saveStored } from "./utils/dom";

type Tab = "qrng" | "bb84";
const KEY = "quantum-lab.v1";

interface Stored {
  projector: boolean;
  theme: "dark" | "light";
  tutorialOpen: boolean;
  step: number;
  answers: Answers;
}

const DEFAULTS: Stored = { projector: false, theme: "dark", tutorialOpen: false, step: 0, answers: {} };

export function App() {
  const notify = useToast();
  const q = useQrng();
  const b = useBb84();
  const [tab, setTab] = useState<Tab>("qrng");
  const [stored, setStored] = useState<Stored>(() => ({ ...DEFAULTS, ...loadStored<Partial<Stored>>(KEY, {}) }));
  const [spot, setSpot] = useState<{ targets: string[]; token: number } | null>(null);

  const patch = useCallback((p: Partial<Stored>) => setStored((s) => ({ ...s, ...p })), []);
  useEffect(() => saveStored(KEY, stored), [stored]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", stored.theme);
    root.setAttribute("data-projector", stored.projector ? "on" : "off");
    if (!root.hasAttribute("data-print")) root.setAttribute("data-print", "report");
  }, [stored.theme, stored.projector]);

  // Initial data, like the original tool: a QRNG sample and a clean-fiber BB84 run.
  const { loadPreset } = q;
  const { preset } = b;
  useEffect(() => {
    loadPreset("qrng");
    preset("clean");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report: ReportInput = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      qrng: {
        bits: bitsToString(q.sanitized.bits),
        stripped: q.sanitized.stripped,
        mcvMode: q.mcvMode,
        source: q.source,
        analysis: q.analysis,
        verdict: q.verdict,
      },
      bb84: {
        params: b.params,
        runEveFraction: b.runF,
        inputs: b.inputs,
        flipped: b.flipped,
        sift: b.sift,
        decision: b.decision,
      },
    }),
    [q.sanitized, q.mcvMode, q.source, q.analysis, q.verdict, b.params, b.runF, b.inputs, b.flipped, b.sift, b.decision],
  );

  const copySummary = async (which: "qrng" | "bb84" | "both") => {
    notify((await copyText(textSummary(report, which))) ? "Summary copied" : "Copy failed. Use Download instead.");
  };
  const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  const doIt = (s: TutorialStep) => {
    setTab(s.tab);
    if (s.action === "bb84-clean") b.run({ ...b.params, qubits: 128, noise: 0.015, eveFraction: 0 });
    else loadPreset(s.action);
    setSpot({ targets: s.spotlight, token: Date.now() });
  };

  const flip3 = () => {
    setTab("bb84");
    const keep: number[] = [];
    b.sift.status.forEach((st, i) => {
      if (st === "match-ok" && keep.length < 3) keep.push(i);
    });
    keep.forEach((i) => b.flip(i));
    notify(keep.length ? `Flipped Bob's bit on pulses ${keep.map((i) => i + 1).join(", ")}` : "No KEEP columns to flip.");
    setSpot({ targets: ["bb84-qber", "bb84-banner"], token: Date.now() });
  };

  const endSpot = useCallback(() => setSpot(null), []);
  const tabBtn = (id: Tab, label: string, short: string, icon: IconName) => (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`panel-${id}`}
      className={`tab-btn${tab === id ? " active" : ""}`}
      onClick={() => setTab(id)}
    >
      <Icon name={icon} />
      <span className="label-long">{label}</span>
      <span className="label-short" aria-hidden="true">
        {short}
      </span>
    </button>
  );

  return (
    <>
      <div className={`app-screen${stored.tutorialOpen ? " with-tutorial" : ""}`}>
        <header>
          <WaveField />
          <div className="header-inner">
            <div className="brand">
              <div className="brand-icon">
                <BlochLogo />
              </div>
              <div>
                <h1>Quantum Entropy &amp; QBER Diagnostic Lab</h1>
                <p className="brand-sub">NIST SP 800-90B-style estimators, Von Neumann extractor, BB84 QKD auditor</p>
              </div>
            </div>
            <nav className="tab-bar" role="tablist" aria-label="Lab sections">
              {tabBtn("qrng", "QRNG & min-entropy", "QRNG", "dice")}
              {tabBtn("bb84", "BB84 QBER & Eve", "BB84", "key")}
            </nav>
            <div className="toolbar" role="toolbar" aria-label="View and export">
              <button
                type="button"
                className={`btn${stored.tutorialOpen ? " btn-cyan" : ""}`}
                aria-pressed={stored.tutorialOpen}
                aria-controls="tutorial-panel"
                onClick={() => patch({ tutorialOpen: !stored.tutorialOpen })}
              >
                <Icon name="book" />
                Tutorial
              </button>
              <button
                type="button"
                className="btn"
                aria-pressed={stored.projector}
                onClick={() => patch({ projector: !stored.projector })}
              >
                <Icon name="projector" />
                Projector
              </button>
              <button
                type="button"
                className="btn"
                aria-pressed={stored.theme === "light"}
                onClick={() => patch({ theme: stored.theme === "light" ? "dark" : "light" })}
              >
                <Icon name="sun" />
                Light theme
              </button>
              <details className="export-menu">
                <summary className="btn">
                  <Icon name="share" />
                  Export
                </summary>
                <div className="export-items">
                  <button type="button" className="btn" onClick={() => copySummary("both")}>
                    <Icon name="copy" /> Copy text summary
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => downloadText(`quantum-lab-${stamp()}.json`, jsonReport(report), "application/json")}
                  >
                    <Icon name="download" /> Download JSON
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => downloadText(`quantum-lab-${stamp()}.csv`, csvReport(report), "text/csv")}
                  >
                    <Icon name="download" /> Download CSV
                  </button>
                  <button type="button" className="btn" onClick={() => printSheet("report")}>
                    <Icon name="printer" /> Print report
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel">
            {tab === "qrng" ? (
              <QrngTab q={q} onCopySummary={() => copySummary("qrng")} />
            ) : (
              <Bb84Tab b={b} onCopySummary={() => copySummary("bb84")} />
            )}
          </div>
        </main>

        <footer>
          <span>Educational tool. The estimators follow the ideas of NIST SP 800-90B but are not the full NIST test suite.</span>
          <span className="footer-meta secondary">Quantum Cryptography &amp; QRNG Verification Workshop · NED University, NCQC</span>
        </footer>
      </div>

      <TutorialPanel
        open={stored.tutorialOpen}
        step={Math.min(Math.max(0, stored.step), STEPS.length - 1)}
        setStep={(i) => patch({ step: Math.min(Math.max(0, i), STEPS.length - 1) })}
        answers={stored.answers}
        setAnswer={(k, v) => setStored((s) => ({ ...s, answers: { ...s.answers, [k]: v } }))}
        onClose={() => patch({ tutorialOpen: false })}
        onDoIt={doIt}
        onFlip3={flip3}
        onPrint={() => printSheet("answers")}
        onClearAnswers={() => {
          if (window.confirm("Clear all typed answers?")) patch({ answers: {} });
        }}
      />
      {spot && <Spotlight targets={spot.targets} token={spot.token} onDone={endSpot} />}

      <PrintReport r={report} />
      <PrintAnswers answers={stored.answers} name={stored.answers._name ?? ""} />
    </>
  );
}
