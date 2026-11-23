import { useCallback, useMemo } from "react";
import type { Bits } from "../lib/bits";
import { Canvas3D, type Frame } from "./Canvas3D";
import { mix, project, rgba, rotate, type Vec3 } from "./math3d";

const SIDE = 8;
const CAP = SIDE * SIDE * SIDE; // 512 bits, the preset length
const HALF = 0.34; // voxel half-size (grid pitch 1)

/** Bit i sits at column i mod 8, row floor(i/8) mod 8, layer floor(i/64) (top layer first). */
function position(i: number): Vec3 {
  const gx = i % SIDE;
  const gy = Math.floor(i / SIDE) % SIDE;
  const gz = Math.floor(i / (SIDE * SIDE));
  const c = (SIDE - 1) / 2;
  return { x: gx - c, y: c - gz, z: gy - c };
}

const FACES: { n: Vec3; corners: [number, number, number][] }[] = [
  { n: { x: 1, y: 0, z: 0 }, corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { n: { x: -1, y: 0, z: 0 }, corners: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { n: { x: 0, y: 1, z: 0 }, corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: { x: 0, y: -1, z: 0 }, corners: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  { n: { x: 0, y: 0, z: 1 }, corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: { x: 0, y: 0, z: -1 }, corners: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] },
];
const LIGHT = (() => {
  const l = { x: -0.45, y: 0.8, z: -0.55 };
  const m = Math.hypot(l.x, l.y, l.z);
  return { x: l.x / m, y: l.y / m, z: l.z / m };
})();

export function BitCube({ bits }: { bits: Bits }) {
  const shown = Math.min(bits.length, CAP);
  const items = useMemo(() => Array.from({ length: shown }, (_, i) => ({ p: position(i), on: bits[i] === 1, layer: Math.floor(i / 64) })), [bits, shown]);

  const draw = useCallback(
    ({ ctx, w, h, cam, palette }: Frame) => {
      if (shown === 0) {
        ctx.fillStyle = rgba(palette.muted, 1);
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No bits loaded", w / 2, h / 2);
        return;
      }
      // Bounding frame of the lattice.
      const e = SIDE / 2;
      const corner = (sx: number, sy: number, sz: number) => project({ x: sx * e, y: sy * e, z: sz * e }, cam);
      const edges: [number[], number[]][] = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) {
        edges.push([[-1, a, b], [1, a, b]], [[a, -1, b], [a, 1, b]], [[a, b, -1], [a, b, 1]]);
      }
      ctx.lineWidth = 1;
      for (const [p, q] of edges) {
        const A = corner(p[0], p[1], p[2]);
        const B = corner(q[0], q[1], q[2]);
        ctx.strokeStyle = rgba(palette.border, (A.z + B.z) / 2 > 0 ? 0.35 : 0.75);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }

      // Faces facing the camera are the same for every axis-aligned voxel: work them out once.
      const visible = FACES.map((f) => {
        const r = rotate(f.n, cam.yaw, cam.pitch);
        const light = Math.max(0, r.x * LIGHT.x + r.y * LIGHT.y + r.z * LIGHT.z);
        return { ...f, show: r.z < 0, shade: 0.42 + 0.58 * light };
      }).filter((f) => f.show);

      const order = items
        .map((it, i) => ({ i, z: rotate(it.p, cam.yaw, cam.pitch).z }))
        .sort((a, b) => b.z - a.z);
      const zMax = (SIDE / 2) * Math.sqrt(3);

      for (const { i, z } of order) {
        const it = items[i];
        const depth = 1 - (z + zMax) / (2 * zMax); // 1 near, 0 far
        if (!it.on) {
          const c = project(it.p, cam);
          ctx.fillStyle = rgba(palette.muted, 0.25 + 0.35 * depth);
          ctx.beginPath();
          ctx.arc(c.x, c.y, Math.max(1, 1.6 * c.f), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const base = mix(palette.cyan, palette.emerald, it.layer / (SIDE - 1));
        for (const f of visible) {
          ctx.beginPath();
          f.corners.forEach(([sx, sy, sz], k) => {
            const q = project({ x: it.p.x + sx * HALF, y: it.p.y + sy * HALF, z: it.p.z + sz * HALF }, cam);
            if (k === 0) ctx.moveTo(q.x, q.y);
            else ctx.lineTo(q.x, q.y);
          });
          ctx.closePath();
          ctx.fillStyle = rgba(base, 0.55 + 0.45 * depth, f.shade);
          ctx.fill();
        }
      }
    },
    [items, shown],
  );

  return (
    <Canvas3D
      draw={draw}
      height={330}
      sceneRadius={(SIDE / 2) * Math.sqrt(3)}
      fill={1.12}
      initial={{ yaw: 0.65, pitch: 0.5 }}
      spin={0.22}
      label={`3D lattice of the first ${shown} bits: a lit cube is a 1, a dot is a 0.`}
    />
  );
}
