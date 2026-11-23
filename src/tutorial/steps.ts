export type TutorialAction = "qrng" | "biased" | "lfsr" | "bb84-clean";

export interface TutorialField {
  id: string;
  label: string;
  multiline?: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  tab: "qrng" | "bb84";
  todo: string[];
  action: TutorialAction;
  /** data-tour ids to spotlight after "Do it for me". */
  spotlight: string[];
  fields: TutorialField[];
  expected: string[];
  discussion?: string;
}

/** The four lab exercises from deck slide 14 and the handout. */
export const STEPS: TutorialStep[] = [
  {
    id: "qrng",
    title: "1. True QRNG sample",
    tab: "qrng",
    todo: [
      "On the QRNG tab, press “True QRNG sample”.",
      "Read H_min (IID), Markov H_min and r1 from the metric boxes.",
      "Write the three values below.",
    ],
    action: "qrng",
    spotlight: ["hmin-iid", "hmin-markov", "r1"],
    fields: [
      { id: "hminIid", label: "H_min (IID)" },
      { id: "hminMarkov", label: "H_min (Markov)" },
      { id: "r1", label: "r1" },
    ],
    expected: [
      "H_min (IID) near 1.0 (95% of samples: 0.86 to 1.0 at N = 512).",
      "Markov H_min near 1.0, a little lower than IID (95% of samples: 0.81 to 0.99).",
      "r1 near 0 (95% of samples: -0.09 to +0.09).",
      "Small deviations are normal at N = 512. Press the button again: the numbers change, the verdict does not.",
    ],
  },
  {
    id: "biased",
    title: "2. Biased source, P(1) = 0.68",
    tab: "qrng",
    todo: [
      "Press “Biased optical source P(1)=0.68”.",
      "Record raw H_min (IID).",
      "Record Post H_min in the Von Neumann card.",
    ],
    action: "biased",
    spotlight: ["hmin-iid", "vn-hmin"],
    fields: [
      { id: "rawHmin", label: "Raw H_min (IID)" },
      { id: "postHmin", label: "Post-Von Neumann H_min" },
      { id: "verdict", label: "Verdict" },
    ],
    expected: [
      "Raw H_min near 0.56 in theory: -log2(0.68) = 0.556. Your sample gives roughly 0.48 to 0.64.",
      "The extracted stream should be close to 1.0. It has only about 110 bits, so anything from 0.73 to 1.0 is normal (typical 0.91).",
      "Verdict: Biased physical source, extraction required. About 43% of pairs emit a bit (η = 2p(1-p) = 0.435).",
    ],
  },
  {
    id: "lfsr",
    title: "3. Classical LFSR",
    tab: "qrng",
    todo: [
      "Press “Predictable classical PRNG (LFSR)”.",
      "Compare IID and Markov H_min, r1, and the verdict.",
      "Look at linear complexity L. Then discuss the question below.",
    ],
    action: "lfsr",
    spotlight: ["hmin-iid", "hmin-markov", "r1", "linear-complexity", "qrng-verdict"],
    fields: [
      { id: "hminIid", label: "H_min (IID)" },
      { id: "hminMarkov", label: "H_min (Markov)" },
      { id: "r1", label: "r1" },
      { id: "verdict", label: "Verdict" },
      { id: "notes", label: "Discussion notes", multiline: true },
    ],
    expected: [
      "H_min (IID) about 0.92, Markov H_min about 0.93, r1 about -0.05. Frequency and memory tests pass it.",
      "Linear complexity L = 15, while a random 512-bit stream has about 256. A 15-bit LFSR reproduces all 512 bits.",
      "Verdict: Classical / deterministic.",
      "Point: passing statistical tests does not prove a source is unpredictable. Failing them proves it is not.",
    ],
    discussion: "What can these tests prove about a source, and what can they never prove?",
  },
  {
    id: "bb84",
    title: "4. BB84, clean channel",
    tab: "bb84",
    todo: [
      "On the BB84 tab, press “Clean fiber” (128 qubits).",
      "In the inspector, click Bob's bit on 3 KEEP columns. Record the QBER.",
      "Keep flipping until the banner switches to Abort. Record how many flips that took.",
    ],
    action: "bb84-clean",
    spotlight: ["bb84-qber", "sift-grid"],
    fields: [
      { id: "qber3", label: "QBER after 3 flips (%)" },
      { id: "status3", label: "Status after 3 flips" },
      { id: "flipsToAbort", label: "Flips needed to abort" },
      { id: "qberAbort", label: "QBER at abort (%)" },
    ],
    expected: [
      "About 64 bits survive sifting. Each flip adds 1 error, about 1.6 percentage points.",
      "After 3 flips QBER is roughly 4% to 10%: still secure.",
      "Abort happens once errors ≥ 11% of the sifted length (8 errors for 64 sifted bits), usually after 4 to 8 flips. The error box shows the exact number for your run.",
    ],
  },
];
