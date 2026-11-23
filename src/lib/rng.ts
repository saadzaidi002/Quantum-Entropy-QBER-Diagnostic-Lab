/** mulberry32: small, fast, seedable 32-bit PRNG. Returns floats in [0, 1). Not for cryptography. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cryptoObj(): Crypto | null {
  return typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function"
    ? globalThis.crypto
    : null;
}

/** n bits from crypto.getRandomValues (the browser CSPRNG). Falls back to Math.random if missing. */
export function cryptoBits(n: number): Uint8Array {
  const words = new Uint32Array(Math.ceil(n / 32));
  const c = cryptoObj();
  if (c) {
    // getRandomValues accepts at most 65536 bytes per call.
    for (let i = 0; i < words.length; i += 16384) c.getRandomValues(words.subarray(i, i + 16384));
  } else {
    for (let i = 0; i < words.length; i++) words[i] = Math.floor(Math.random() * 4294967296);
  }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (words[i >>> 5] >>> (i & 31)) & 1;
  return out;
}

/** A random 32-bit seed. */
export function randomSeed(): number {
  const c = cryptoObj();
  if (c) return c.getRandomValues(new Uint32Array(1))[0] >>> 0;
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
