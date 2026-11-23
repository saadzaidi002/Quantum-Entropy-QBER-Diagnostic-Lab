import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { type Cam, type Palette, prefersReducedMotion, readPalette } from "./math3d";

export interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  cam: Cam;
  t: number;
  palette: Palette;
}

interface Props {
  draw: (f: Frame) => void;
  label: string;
  height: number;
  /** Radius of the scene in scene units, used to fit it into the canvas. */
  sceneRadius: number;
  /** Fraction of the half-size the scene radius fills. */
  fill?: number;
  initial?: { yaw: number; pitch: number };
  /** Auto-rotation speed in radians per second (0 = still). */
  spin?: number;
  className?: string;
}

/**
 * A drag-to-orbit canvas. Draws only while on screen and the tab is visible, scales for HiDPI,
 * follows the theme tokens, and supports arrow keys. Reduced motion turns auto-rotation off.
 */
export function Canvas3D({ draw, label, height, sceneRadius, fill = 0.82, initial, spin = 0.25, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const view = useRef({ yaw: initial?.yaw ?? 0.6, pitch: initial?.pitch ?? 0.45, dragging: false, lastX: 0, lastY: 0, idleUntil: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
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
    let onScreen = true;
    let last = performance.now();
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

    const frame = (now: number) => {
      raf = 0;
      if (!ctx) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const v = view.current;
      if (!reduced && spin && !v.dragging && now > v.idleUntil) v.yaw += dt * spin;
      const scale = (Math.min(w, h) / 2 / sceneRadius) * fill;
      ctx.clearRect(0, 0, w, h);
      drawRef.current({
        ctx,
        w,
        h,
        cam: { yaw: v.yaw, pitch: v.pitch, dist: sceneRadius * 3.4, scale, cx: w / 2, cy: h / 2 },
        t: now / 1000,
        palette: readPalette(canvas),
      });
      if (onScreen && !document.hidden && (!reduced || v.dragging)) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    (canvas as HTMLCanvasElement & { __kick?: () => void }).__kick = kick;

    resize();
    kick();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (resize(), kick())) : null;
    ro?.observe(canvas);
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => {
            onScreen = entries[0]?.isIntersecting ?? true;
            if (onScreen) kick();
          })
        : null;
    io?.observe(canvas);
    const onVis = () => !document.hidden && kick();
    document.addEventListener("visibilitychange", onVis);
    const mo = new MutationObserver(kick); // theme / projector switches
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-projector"] });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sceneRadius, fill, spin]);

  // Redraw when the scene content changes (needed when animation is off).
  useEffect(() => {
    (canvasRef.current as (HTMLCanvasElement & { __kick?: () => void }) | null)?.__kick?.();
  }, [draw]);

  const kick = () => (canvasRef.current as (HTMLCanvasElement & { __kick?: () => void }) | null)?.__kick?.();

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    v.dragging = true;
    v.lastX = e.clientX;
    v.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    kick();
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    if (!v.dragging) return;
    v.yaw += (e.clientX - v.lastX) * 0.01;
    v.pitch = Math.max(-1.35, Math.min(1.35, v.pitch + (e.clientY - v.lastY) * 0.01));
    v.lastX = e.clientX;
    v.lastY = e.clientY;
  };
  const onUp = () => {
    view.current.dragging = false;
    view.current.idleUntil = performance.now() + 2500;
    kick();
  };
  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const v = view.current;
    const step = 0.15;
    if (e.key === "ArrowLeft") v.yaw -= step;
    else if (e.key === "ArrowRight") v.yaw += step;
    else if (e.key === "ArrowUp") v.pitch = Math.max(-1.35, v.pitch - step);
    else if (e.key === "ArrowDown") v.pitch = Math.min(1.35, v.pitch + step);
    else return;
    e.preventDefault();
    e.stopPropagation();
    v.idleUntil = performance.now() + 2500;
    kick();
  };

  return (
    <canvas
      ref={canvasRef}
      className={`scene3d${className ? ` ${className}` : ""}`}
      style={{ height }}
      role="img"
      aria-label={`${label} Drag or use the arrow keys to rotate.`}
      tabIndex={0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      onDoubleClick={() => {
        view.current.yaw = initial?.yaw ?? 0.6;
        view.current.pitch = initial?.pitch ?? 0.45;
        kick();
      }}
    />
  );
}
