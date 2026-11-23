import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { ToastProvider } from "../src/components/Toast";

function renderApp() {
  return render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );
}

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("UI smoke tests", () => {
  it("renders the header, footer and the QRNG verdict for the default sample", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "Quantum Entropy & QBER Diagnostic Lab" })).toBeTruthy();
    expect(screen.getByText(/NIST SP 800-90B-style estimators, Von Neumann extractor, BB84 QKD auditor/)).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toMatch(/not the full NIST test suite/);
    expect(screen.getAllByText(/Passing these tests does not prove a source is unpredictable/).length).toBeGreaterThan(0);
  });

  it("flags the LFSR preset as Classical / deterministic", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Predictable classical PRNG/ }));
    const banner = screen.getByRole("region", { name: "Verdict" });
    expect(within(banner).getByText(/Classical \/ deterministic/)).toBeTruthy();
    expect(within(banner).getByText(/LFSR can reproduce this stream/)).toBeTruthy();
  });

  it("labels the biased preset as a biased physical source", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Biased optical source/ }));
    const banner = screen.getByRole("region", { name: "Verdict" });
    expect(within(banner).getByText(/Biased physical source/)).toBeTruthy();
  });

  it("BB84: Eve preset aborts, and flipping a bit updates errors", () => {
    renderApp();
    fireEvent.click(screen.getByRole("tab", { name: /BB84/ }));
    fireEvent.click(screen.getByRole("button", { name: /Intercept-resend by Eve/ }));
    // 128 qubits with f=1 usually aborts; switch to 4096 so it is certain.
    fireEvent.change(screen.getByLabelText("Qubits sent"), { target: { value: "4096" } });
    expect(within(screen.getByRole("region", { name: "Verdict" })).getByText(/Abort key/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Clean fiber/ }));
    const errorsBox = screen.getByText("Sifted errors").parentElement as HTMLElement;
    const before = Number(errorsBox.querySelector(".metric-value")?.textContent);
    const firstFlip = screen.getAllByRole("button", { name: /Press to flip it/ })[0];
    fireEvent.click(firstFlip);
    const after = Number(errorsBox.querySelector(".metric-value")?.textContent);
    expect(Math.abs(after - before)).toBe(1);
  });

  it("tutorial opens, 'Do it for me' runs all four steps without reload", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Tutorial" }));
    const panel = screen.getByRole("complementary", { name: "Tutorial" });
    for (let i = 0; i < 4; i++) {
      act(() => {
        fireEvent.click(within(panel).getByRole("button", { name: "Do it for me" }));
      });
      if (i < 3) fireEvent.click(within(panel).getByRole("button", { name: /Next/ }));
    }
    expect(within(panel).getByText(/4\. BB84, clean channel/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /BB84/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(panel).getByRole("button", { name: "Show expected" }));
    expect(within(panel).getByText(/Abort happens once errors/)).toBeTruthy();
  });
});
