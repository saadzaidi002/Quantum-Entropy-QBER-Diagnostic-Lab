import { useEffect, useRef } from "react";
import { type Cam, prefersReducedMotion, project, readPalette, rgba } from "./math3d";

const NX = 56;
const NZ = 18;

/**
 * Two-source interference surface (like light from a double slit) drawn as a perspective
 * wireframe behind the header. Decorative, so it is aria-hidden; pauses off-screen and
 * stays still under reduced motion.
 */
export function WaveField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const sources = [
      { x: -0.45, z: -0.2 },
      { x: 0.45, z: -0.2 },
    ];
    const draw = (now: number) => {
      raf = 0;
      if (!ctx) return;
      const t = reduced ? 1.2 : now / 1000;
      const P = readPalette(canvas);
      ctx.clearRect(0, 0, w, h);
      const cam: Cam = { yaw: 0, pitch: 0.62, dist: 3.2, scale: w * 0.52, cx: w * 0.5, cy: h * 0.18 };
      for (let iz = 0; iz < NZ; iz++) {
        const z = (iz / (NZ - 1)) * 1.6 - 0.4;
        ctx.beginPath();
        let peak = 0;
        for (let ix = 0; ix < NX; ix++) {
          const x = (ix / (NX - 1)) * 2.2 - 1.1;
          let y = 0;
          for (const s of sources) y += Math.sin(Math.hypot(x - s.x, z - s.z) * 16 - t * 2.2);
          y *= 0.035;
          peak = Math.max(peak, y);
          const q = project({ x, y, z }, cam);
          if (ix === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        const near = 1 - iz / (NZ - 1);
        ctx.strokeStyle = rgba(iz % 2 ? P.cyan : P.emerald, (P.light ? 0.16 : 0.22) + near * (P.light ? 0.2 : 0.3));
        ctx.lineWidth = 0.8 + near * 0.8;
        ctx.stroke();
      }
      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    resize();
    kick();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (resize(), kick())) : null;
    ro?.observe(canvas);
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((en) => {
            visible = en[0]?.isIntersecting ?? true;
            if (visible) kick();
          })
        : null;
    io?.observe(canvas);
    const onVis = () => !document.hidden && kick();
    document.addEventListener("visibilitychange", onVis);
    const mo = new MutationObserver(kick);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="wave-field" aria-hidden="true" />;
}
