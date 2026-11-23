import { useCallback } from "react";
import { Canvas3D, type Frame } from "./Canvas3D";
import { type Cam, project, rgba, type Rgb, type Vec3 } from "./math3d";

export type Basis = "+" | "x";

export interface BlochState {
  aliceBit: "0" | "1";
  aliceBasis: Basis;
  bobBasis: Basis;
}

/** BB84 states on the Bloch sphere: + basis is the z axis (|0>, |1>), × basis is the x axis (|+>, |->). */
export function stateVector(bit: "0" | "1", basis: Basis): Vec3 {
  if (basis === "+") return { x: 0, y: bit === "0" ? 1 : -1, z: 0 };
  return { x: bit === "0" ? 1 : -1, y: 0, z: 0 };
}

const LABELS: { p: Vec3; text: string }[] = [
  { p: { x: 0, y: 1.22, z: 0 }, text: "|0⟩" },
  { p: { x: 0, y: -1.26, z: 0 }, text: "|1⟩" },
  { p: { x: 1.3, y: 0, z: 0 }, text: "|+⟩" },
  { p: { x: -1.3, y: 0, z: 0 }, text: "|−⟩" },
];

function circle(ctx: CanvasRenderingContext2D, cam: Cam, pt: (a: number) => Vec3, color: Rgb, width: number) {
  const N = 72;
  for (let i = 0; i < N; i++) {
    const a = project(pt((2 * Math.PI * i) / N), cam);
    const b = project(pt((2 * Math.PI * (i + 1)) / N), cam);
    ctx.strokeStyle = rgba(color, (a.z + b.z) / 2 > 0 ? 0.18 : 0.6);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function line(ctx: CanvasRenderingContext2D, cam: Cam, p: Vec3, q: Vec3, color: string, width: number, dash: number[] = []) {
  const a = project(p, cam);
  const b = project(q, cam);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function BlochSphere({ state }: { state: BlochState | null }) {
  const draw = useCallback(
    ({ ctx, cam, palette }: Frame) => {
      const P = palette;
      // Glassy sphere body: silhouette radius of a unit sphere under perspective.
      const o = project({ x: 0, y: 0, z: 0 }, cam);
      const R = (cam.scale * cam.dist) / Math.sqrt(cam.dist * cam.dist - 1);
      const g = ctx.createRadialGradient(o.x - R * 0.35, o.y - R * 0.4, R * 0.05, o.x, o.y, R);
      g.addColorStop(0, rgba(P.cyan, P.light ? 0.18 : 0.22));
      g.addColorStop(0.6, rgba(P.cyan, P.light ? 0.06 : 0.07));
      g.addColorStop(1, rgba(P.cyan, P.light ? 0.14 : 0.18));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(P.border, 0.8);
      ctx.lineWidth = 1;
      ctx.stroke();

      circle(ctx, cam, (a) => ({ x: Math.cos(a), y: 0, z: Math.sin(a) }), P.text, 1.2); // equator
      circle(ctx, cam, (a) => ({ x: Math.cos(a), y: Math.sin(a), z: 0 }), P.text, 1); // x-z meridian
      circle(ctx, cam, (a) => ({ x: 0, y: Math.sin(a), z: Math.cos(a) }), P.muted, 0.8);

      const axis = rgba(P.muted, 0.7);
      line(ctx, cam, { x: 0, y: -1.15, z: 0 }, { x: 0, y: 1.15, z: 0 }, axis, 1, [3, 4]);
      line(ctx, cam, { x: -1.15, y: 0, z: 0 }, { x: 1.15, y: 0, z: 0 }, axis, 1, [3, 4]);
      line(ctx, cam, { x: 0, y: 0, z: -1.15 }, { x: 0, y: 0, z: 1.15 }, rgba(P.muted, 0.35), 1, [2, 5]);

      // Bob's measurement axis.
      if (state) {
        const bob = state.bobBasis === "+" ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        line(ctx, cam, { x: -bob.x * 1.08, y: -bob.y * 1.08, z: 0 }, { x: bob.x * 1.08, y: bob.y * 1.08, z: 0 }, rgba(P.amber, 0.85), 5);
      }

      // The four BB84 states and their labels.
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const s of [
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ]) {
        const q = project(s, cam);
        ctx.fillStyle = rgba(P.text, q.z > 0 ? 0.45 : 0.9);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3.2 * q.f, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const l of LABELS) {
        const q = project(l.p, cam);
        ctx.fillStyle = rgba(P.text, q.z > 0 ? 0.5 : 0.95);
        ctx.fillText(l.text, q.x, q.y);
      }

      // Alice's state vector with a soft halo at the tip.
      if (state) {
        const v = stateVector(state.aliceBit, state.aliceBasis);
        const a = project({ x: 0, y: 0, z: 0 }, cam);
        const b = project(v, cam);
        ctx.strokeStyle = rgba(P.cyan, 1);
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        const halo = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 22 * b.f);
        halo.addColorStop(0, rgba(P.cyan, 0.55));
        halo.addColorStop(1, rgba(P.cyan, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 22 * b.f, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(P.cyan, 1);
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6 * b.f, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [state],
  );

  return (
    <Canvas3D
      draw={draw}
      height={320}
      sceneRadius={1.35}
      fill={0.9}
      initial={{ yaw: 0.55, pitch: 0.32 }}
      spin={0.18}
      label="Bloch sphere with the four BB84 states. Cyan arrow: the state Alice sent. Amber bar: the axis Bob measures along."
    />
  );
}
