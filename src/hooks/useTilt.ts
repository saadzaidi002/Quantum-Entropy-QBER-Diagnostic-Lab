import { useEffect, useRef } from "react";

/**
 * Pointer-driven 3D tilt with a soft glare, for small panels such as metric boxes.
 * Writes CSS variables (--rx, --ry, --gx, --gy); the stylesheet does the transform.
 * Off for touch pointers and reduced motion.
 */
export function useTilt<T extends HTMLElement>(maxDeg = 7) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = (q: string) => window.matchMedia?.(q)?.matches ?? false;
    if (mq("(prefers-reduced-motion: reduce)") || mq("(pointer: coarse)")) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", `${((0.5 - py) * maxDeg).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((px - 0.5) * maxDeg).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
      el.classList.add("tilting");
    };
    const leave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.classList.remove("tilting");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [maxDeg]);
  return ref;
}
