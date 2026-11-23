/** Minimal 3D math for canvas scenes: rotate (yaw about y, then pitch about x) and perspective-project. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Cam {
  yaw: number;
  pitch: number;
  /** Camera distance from the origin, in scene units. Must exceed the scene radius. */
  dist: number;
  /** Pixels per scene unit at the origin. */
  scale: number;
  cx: number;
  cy: number;
}

export interface Projected {
  x: number;
  y: number;
  /** View-space depth: larger is farther from the camera. */
  z: number;
  /** Perspective factor (1 at the origin). */
  f: number;
}

export function rotate(p: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { x: x1, y: p.y * cp - z1 * sp, z: p.y * sp + z1 * cp };
}

export function project(p: Vec3, c: Cam): Projected {
  const r = rotate(p, c.yaw, c.pitch);
  const f = c.dist / (c.dist + r.z);
  return { x: c.cx + r.x * c.scale * f, y: c.cy - r.y * c.scale * f, z: r.z, f };
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse "#rrggbb" / "#rgb" / "rgb(...)"; falls back to a neutral grey. */
export function parseColor(s: string): Rgb {
  const t = s.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = /rgba?\(([^)]+)\)/i.exec(t);
  if (m) {
    const [r, g, b] = m[1].split(/[ ,/]+/).map(Number);
    return { r: r || 0, g: g || 0, b: b || 0 };
  }
  return { r: 128, g: 140, b: 160 };
}

export function rgba(c: Rgb, a: number, k = 1): string {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

export interface Palette {
  cyan: Rgb;
  emerald: Rgb;
  amber: Rgb;
  rose: Rgb;
  text: Rgb;
  muted: Rgb;
  border: Rgb;
  surface: Rgb;
  light: boolean;
}

/** Read the theme tokens from CSS so canvases follow dark / light / projector modes. */
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (n: string) => parseColor(cs.getPropertyValue(n) || "#888");
  return {
    cyan: v("--accent-cyan"),
    emerald: v("--accent-emerald"),
    amber: v("--accent-amber"),
    rose: v("--accent-rose"),
    text: v("--text-primary"),
    muted: v("--text-muted"),
    border: v("--border-highlight"),
    surface: v("--bg-input"),
    light: document.documentElement.getAttribute("data-theme") === "light",
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);
}
