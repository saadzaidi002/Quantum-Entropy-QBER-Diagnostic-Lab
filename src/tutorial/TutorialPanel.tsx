import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { STEPS, type TutorialStep } from "./steps";

export type Answers = Record<string, string>;

interface Props {
  open: boolean;
  step: number;
  setStep: (i: number) => void;
  answers: Answers;
  setAnswer: (key: string, value: string) => void;
  onClose: () => void;
  onDoIt: (s: TutorialStep) => void;
  onFlip3: () => void;
  onPrint: () => void;
  onClearAnswers: () => void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export function TutorialPanel(p: Props) {
  const { open, step, setStep } = p;
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const s = STEPS[step];

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" && step < STEPS.length - 1) setStep(step + 1);
      else if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, setStep]);

  if (!open) return null;
  const shown = revealed[s.id] ?? false;

  return (
    <aside className="tutorial-panel no-print" aria-label="Tutorial" id="tutorial-panel">
      <div className="tp-head">
        <h2 ref={headingRef} tabIndex={-1}>
          Lab tutorial
        </h2>
        <button type="button" className="btn btn-small" onClick={p.onClose} aria-label="Close tutorial">
          <Icon name="close" /> Close
        </button>
      </div>

      <div className="tp-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            className={`tp-dot${i === step ? " current" : ""}${i < step ? " done" : ""}`}
            onClick={() => setStep(i)}
            aria-label={`Go to ${x.title}`}
            aria-current={i === step ? "step" : undefined}
          >
            {i + 1}
          </button>
        ))}
        <div className="tp-bar" aria-hidden="true">
          <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="tp-body">
        <div className="tp-field">
          <label htmlFor="tp-name">Your name (for the printout)</label>
          <input id="tp-name" type="text" value={p.answers._name ?? ""} onChange={(e) => p.setAnswer("_name", e.target.value)} />
        </div>
        <h3>{s.title}</h3>
        <ol className="tp-todo">
          {s.todo.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <div className="btn-group">
          <button type="button" className="btn btn-cyan" onClick={() => p.onDoIt(s)}>
            <Icon name="wand" /> Do it for me
          </button>
          {s.id === "bb84" && (
            <button type="button" className="btn" onClick={p.onFlip3}>
              Flip 3 KEEP bits for me
            </button>
          )}
        </div>

        {s.discussion && (
          <p className="tp-discussion">
            <strong>Discuss:</strong> {s.discussion}
          </p>
        )}

        <fieldset className="tp-fields">
          <legend>Your measurements</legend>
          {s.fields.map((f) => {
            const key = `${s.id}.${f.id}`;
            const id = `tp-${s.id}-${f.id}`;
            return (
              <div className="tp-field" key={key}>
                <label htmlFor={id}>{f.label}</label>
                {f.multiline ? (
                  <textarea id={id} rows={3} value={p.answers[key] ?? ""} onChange={(e) => p.setAnswer(key, e.target.value)} />
                ) : (
                  <input id={id} type="text" value={p.answers[key] ?? ""} onChange={(e) => p.setAnswer(key, e.target.value)} />
                )}
              </div>
            );
          })}
        </fieldset>

        <button
          type="button"
          className="btn btn-small"
          aria-expanded={shown}
          aria-controls={`tp-expected-${s.id}`}
          onClick={() => setRevealed({ ...revealed, [s.id]: !shown })}
        >
          <Icon name="eye" /> {shown ? "Hide expected" : "Show expected"}
        </button>
        {shown && (
          <ul className="tp-expected" id={`tp-expected-${s.id}`}>
            {s.expected.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="tp-foot">
        <div className="btn-group">
          <button type="button" className="btn" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <Icon name="arrowLeft" /> Back
          </button>
          <button type="button" className="btn btn-cyan" onClick={() => setStep(step + 1)} disabled={step === STEPS.length - 1}>
            Next <Icon name="arrowRight" />
          </button>
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-small" onClick={p.onPrint}>
            <Icon name="printer" /> Print my answers
          </button>
          <button type="button" className="btn btn-small" onClick={p.onClearAnswers}>
            Clear answers
          </button>
        </div>
        <p className="tp-hint secondary">Arrow keys ← → change step. Answers are saved in this browser if storage is allowed.</p>
      </div>
    </aside>
  );
}
