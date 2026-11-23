import { useEffect, useRef } from "react";

/**
 * Pseudo-3D Bloch sphere: a wireframe sphere with a state vector precessing around the z-axis.
 * Drawn in SVG and rotated with requestAnimationFrame. No library. Static when the user
 * prefers reduced motion or the tab is hidden.
 */
const R = 19;
const C = 24;
const TILT = 0.42; // view elevation (radians)
const THETA = 0.95; // polar angle of the state vector

function project(x: number, y: number, z: number): [number, number, number] {
  // rotate around x by TILT, then orthographic projection
  const y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
  return [C + x * R, C - z2 * R, y2];
}

function ellipsePath(points: [number, number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ") + "Z";
}

const N = 48;
const equator = ellipsePath(
  Array.from({ length: N }, (_, i) => project(Math.cos((2 * Math.PI * i) / N), Math.sin((2 * Math.PI * i) / N), 0)),
);
const meridian = ellipsePath(
  Array.from({ length: N }, (_, i) => project(0, Math.sin((2 * Math.PI * i) / N), Math.cos((2 * Math.PI * i) / N))),
);
const [nx, ny] = project(0, 0, 1);
const [sx, sy] = project(0, 0, -1);

export function BlochLogo() {
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    const draw = (t: number) => {
      const phi = reduce ? 0.8 : (t / 2400) % (2 * Math.PI);
      const [x, y, depth] = project(
        Math.sin(THETA) * Math.cos(phi),
        Math.sin(THETA) * Math.sin(phi),
        Math.cos(THETA),
      );
      lineRef.current?.setAttribute("x2", x.toFixed(2));
      lineRef.current?.setAttribute("y2", y.toFixed(2));
      dotRef.current?.setAttribute("cx", x.toFixed(2));
      dotRef.current?.setAttribute("cy", y.toFixed(2));
      dotRef.current?.setAttribute("r", (2.6 + depth * 0.8).toFixed(2));
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg className="bloch" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx={C} cy={C} r={R} className="bloch-shell" />
      <path d={equator} className="bloch-ring" />
      <path d={meridian} className="bloch-ring faint" />
      <line x1={nx} y1={ny} x2={sx} y2={sy} className="bloch-axis" />
      <line ref={lineRef} x1={C} y1={C} x2={C} y2={C} className="bloch-vector" />
      <circle cx={C} cy={C} r={1.6} className="bloch-core" />
      <circle ref={dotRef} cx={C} cy={C} r={3} className="bloch-tip" />
    </svg>
  );
}
