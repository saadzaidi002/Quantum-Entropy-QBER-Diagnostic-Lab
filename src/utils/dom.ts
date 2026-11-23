/** Copy text: Clipboard API first, then a hidden-textarea fallback (works on file:// pages). */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Read the clipboard. Returns null when the browser blocks it. */
export async function readClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard?.readText) return await navigator.clipboard.readText();
  } catch {
    /* blocked */
  }
  return null;
}

/** Save a text file through a Blob link. No network involved. */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** localStorage wrappers. Storage may be missing or throw (private mode, file:// policies). */
export function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore: the app works without storage */
  }
}

export type PrintMode = "report" | "answers";

/** Print one of the print-only sheets. */
export function printSheet(mode: PrintMode): void {
  const root = document.documentElement;
  root.setAttribute("data-print", mode);
  const reset = () => {
    root.setAttribute("data-print", "report");
    window.removeEventListener("afterprint", reset);
  };
  window.addEventListener("afterprint", reset);
  window.print();
}
