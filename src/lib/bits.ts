/** A bit stream stored as one byte per bit (0 or 1). */
export type Bits = Uint8Array;

export interface Sanitized {
  bits: Bits;
  /** Number of characters removed because they were not '0' or '1'. */
  stripped: number;
}

/** Keep only '0' and '1' characters and count everything else that was removed. */
export function sanitizeBits(raw: string): Sanitized {
  const out = new Uint8Array(raw.length);
  let n = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c === 48) out[n++] = 0;
    else if (c === 49) out[n++] = 1;
  }
  return { bits: out.slice(0, n), stripped: raw.length - n };
}

export function bitsFromString(s: string): Bits {
  return sanitizeBits(s).bits;
}

export function bitsToString(bits: Bits, limit = bits.length): string {
  const n = Math.min(limit, bits.length);
  const parts: string[] = [];
  const CHUNK = 8192;
  for (let i = 0; i < n; i += CHUNK) {
    const end = Math.min(n, i + CHUNK);
    let part = "";
    for (let j = i; j < end; j++) part += bits[j] ? "1" : "0";
    parts.push(part);
  }
  return parts.join("");
}

export function countOnes(bits: Bits): number {
  let c = 0;
  for (let i = 0; i < bits.length; i++) c += bits[i];
  return c;
}
