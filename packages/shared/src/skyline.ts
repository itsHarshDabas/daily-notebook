/**
 * Isometric "skyline" projection of the contribution grid, like GitHub Skyline:
 * each day is a box on a weeks × weekdays floor, its height set by the day's value.
 * Pure math so it can be tested and drawn with plain SVG on every platform.
 */

export interface SkylineBar {
  week: number;
  weekday: number;
  /** 0-1 of the tallest bar. */
  height: number;
  key: string;
}

export interface Face {
  key: string;
  points: [number, number][];
  /** 'top' | 'left' | 'right' so the renderer can shade sides differently. */
  side: 'top' | 'left' | 'right';
  depth: number;
}

export interface SkylineOptions {
  /** Rotation around the vertical axis in degrees. */
  angle: number;
  /** Camera tilt; 0 = looking straight down, 90 = side on. */
  tilt?: number;
  cell?: number;
  maxHeight?: number;
}

/** Projects a 3D point (x along weeks, y along weekdays, z up) to 2D screen space. */
export function project(x: number, y: number, z: number, angle: number, tilt: number): [number, number, number] {
  const a = (angle * Math.PI) / 180;
  const t = (tilt * Math.PI) / 180;
  const rx = x * Math.cos(a) - y * Math.sin(a);
  const ry = x * Math.sin(a) + y * Math.cos(a);
  // Screen y: floor depth compressed by tilt, height lifted by sin(tilt).
  const sx = rx;
  const sy = ry * Math.cos(t) - z * Math.sin(t);
  // Depth: larger = closer to the viewer, drawn later.
  const depth = ry;
  return [sx, sy, depth];
}

export function skylineFaces(bars: SkylineBar[], opts: SkylineOptions): Face[] {
  const tilt = opts.tilt ?? 55;
  const cell = opts.cell ?? 10;
  const maxH = opts.maxHeight ?? 80;
  const gap = cell * 0.15;
  const faces: Face[] = [];

  // Centre the floor on the origin so rotation spins around the middle.
  const weeks = Math.max(1, ...bars.map((b) => b.week + 1));
  const cx = (weeks * cell) / 2;
  const cy = (7 * cell) / 2;

  for (const b of bars) {
    const h = Math.max(1.5, b.height * maxH);
    const x0 = b.week * cell - cx + gap / 2;
    const y0 = b.weekday * cell - cy + gap / 2;
    const s = cell - gap;
    const corners = [
      [x0, y0],
      [x0 + s, y0],
      [x0 + s, y0 + s],
      [x0, y0 + s],
    ] as const;
    const bottom = corners.map(([x, y]) => project(x, y, 0, opts.angle, tilt));
    const top = corners.map(([x, y]) => project(x, y, h, opts.angle, tilt));
    const pt = (p: [number, number, number]): [number, number] => [p[0], p[1]];

    // Only the side walls facing the viewer are visible: those whose outward edge is nearer.
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const wallDepth = (bottom[i][2] + bottom[j][2]) / 2;
      const centreDepth = bottom.reduce((s2, p) => s2 + p[2], 0) / 4;
      if (wallDepth <= centreDepth) continue;
      faces.push({
        key: `${b.key}-w${i}`,
        points: [pt(bottom[i]), pt(bottom[j]), pt(top[j]), pt(top[i])],
        side: i % 2 === 0 ? 'left' : 'right',
        depth: wallDepth,
      });
    }
    faces.push({
      key: `${b.key}-top`,
      points: top.map(pt),
      side: 'top',
      depth: top.reduce((s2, p) => s2 + p[2], 0) / 4 + 0.01,
    });
  }
  // Painter's algorithm: far faces first.
  return faces.sort((a, b) => a.depth - b.depth);
}

export function bounds(faces: Face[]): { minX: number; minY: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of faces) {
    for (const [x, y] of f.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, width: 1, height: 1 };
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
