import { CHROMATID_COUNT, CHROMOSOME_COUNT } from './constants';

export interface ChromatidSpec {
  id: number;
  chromosome: number;
  sister: 0 | 1;
  color: string;
}

export interface ChromatidFrame {
  id: number;
  chromosome: number;
  sister: 0 | 1;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  thickness: number;
  length: number;
  opacity: number;
}

interface Keyframe {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  thickness: number;
  length: number;
  opacity: number;
}

const CHROMOSOME_COLORS = ['#e28a5b', '#e28a5b', '#b79cff', '#b79cff'];

export const CHROMATID_SPECS: ChromatidSpec[] = Array.from(
  { length: CHROMATID_COUNT },
  (_, index) => ({
    id: index,
    chromosome: Math.floor(index / 2),
    sister: (index % 2) as 0 | 1,
    color: CHROMOSOME_COLORS[Math.floor(index / 2) % CHROMOSOME_COLORS.length],
  }),
);

const SCATTER = [
  { x: -0.62, y: 0.34, z: 0.24, rotZ: 0.65 },
  { x: 0.55, y: 0.58, z: -0.3, rotZ: -0.4 },
  { x: -0.25, y: -0.66, z: 0.48, rotZ: 0.2 },
  { x: 0.72, y: -0.32, z: -0.52, rotZ: -0.75 },
];

const SCATTERED_CONDENSED = [
  { x: -1.55, y: 0.92, z: 0.54, rotZ: 0.4 },
  { x: 1.35, y: 1.12, z: -0.62, rotZ: -0.6 },
  { x: -0.72, y: -1.3, z: 0.9, rotZ: 0.15 },
  { x: 1.52, y: -0.72, z: -1.0, rotZ: -0.35 },
];

const ALIGNED_Y = [-2.7, -0.9, 0.9, 2.7];
const POLE_Y = [-2.4, -0.8, 0.8, 2.4];

const sisterOffset = (spec: ChromatidSpec, amount: number): number =>
  spec.sister === 0 ? -amount : amount;

const keyframe = (
  spec: ChromatidSpec,
  values: Partial<Keyframe> &
    Pick<Keyframe, 'x' | 'y' | 'z' | 'thickness' | 'length' | 'opacity'>,
): Keyframe => ({
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  ...values,
});

function interphaseKeyframe(spec: ChromatidSpec): Keyframe {
  const base = SCATTER[spec.chromosome];
  return keyframe(spec, {
    x: base.x + sisterOffset(spec, 0.055),
    y: base.y,
    z: base.z,
    rotZ: base.rotZ + (spec.sister === 0 ? -0.18 : 0.18),
    rotX: 0.3,
    thickness: 0.38,
    length: 1.35,
    opacity: 0.52,
  });
}

function prophaseKeyframe(spec: ChromatidSpec): Keyframe {
  const base = SCATTERED_CONDENSED[spec.chromosome];
  return keyframe(spec, {
    x: base.x + sisterOffset(spec, 0.13),
    y: base.y,
    z: base.z,
    rotZ: base.rotZ,
    thickness: 0.94,
    length: 0.94,
    opacity: 1,
  });
}

function alignedKeyframe(spec: ChromatidSpec): Keyframe {
  return keyframe(spec, {
    x: sisterOffset(spec, 0.115),
    y: ALIGNED_Y[spec.chromosome],
    z: 0,
    thickness: 0.92,
    length: 0.92,
    opacity: 1,
  });
}

function poleKeyframe(spec: ChromatidSpec): Keyframe {
  const direction = spec.sister === 0 ? -1 : 1;
  return keyframe(spec, {
    x: direction * 2.28,
    y: POLE_Y[spec.chromosome],
    z: 0,
    rotZ: direction * 0.09,
    thickness: 0.92,
    length: 0.92,
    opacity: 1,
  });
}

function pinchedKeyframe(spec: ChromatidSpec): Keyframe {
  const direction = spec.sister === 0 ? -1 : 1;
  return keyframe(spec, {
    x: direction * 2.62,
    y: (spec.chromosome - 1.5) * 1.6,
    z: (spec.sister === 0 ? -1 : 1) * 0.24,
    rotZ: direction * 0.14,
    thickness: 0.88,
    length: 0.88,
    opacity: 1,
  });
}

function twoCellKeyframe(spec: ChromatidSpec): Keyframe {
  const direction = spec.sister === 0 ? -1 : 1;
  return keyframe(spec, {
    x: direction * 3.05,
    y: (spec.chromosome - 1.5) * 1.6,
    z: (spec.sister === 0 ? -1 : 1) * 0.28,
    rotZ: direction * 0.18,
    thickness: 0.86,
    length: 0.86,
    opacity: 1,
  });
}

const KEYFRAMES: Keyframe[][] = [
  CHROMATID_SPECS.map(interphaseKeyframe),
  CHROMATID_SPECS.map(prophaseKeyframe),
  CHROMATID_SPECS.map(alignedKeyframe),
  CHROMATID_SPECS.map(alignedKeyframe),
  CHROMATID_SPECS.map(poleKeyframe),
  CHROMATID_SPECS.map(pinchedKeyframe),
  CHROMATID_SPECS.map(twoCellKeyframe),
];

const fromIndexForStage = [0, 0, 1, 2, 4, 5];
const toIndexForStage = [0, 1, 2, 4, 5, 6];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function blendKeyframe(from: Keyframe, to: Keyframe, t: number): Keyframe {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    z: lerp(from.z, to.z, t),
    rotX: lerp(from.rotX, to.rotX, t),
    rotY: lerp(from.rotY, to.rotY, t),
    rotZ: lerp(from.rotZ, to.rotZ, t),
    thickness: lerp(from.thickness, to.thickness, t),
    length: lerp(from.length, to.length, t),
    opacity: lerp(from.opacity, to.opacity, t),
  };
}

export function chromatidFrames(stageIndex: number, progress: number): ChromatidFrame[] {
  const safeStage = Math.min(5, Math.max(0, Math.floor(stageIndex)));
  const t = easeInOutCubic(progress);
  const from = KEYFRAMES[fromIndexForStage[safeStage]];
  const to = KEYFRAMES[toIndexForStage[safeStage]];
  return CHROMATID_SPECS.map((spec) => {
    const frame = blendKeyframe(from[spec.id], to[spec.id], t);
    return {
      id: spec.id,
      chromosome: spec.chromosome,
      sister: spec.sister,
      ...frame,
    };
  });
}

export function sisterChromatidDistance(stageIndex: number, progress: number): number {
  const frames = chromatidFrames(stageIndex, progress);
  let maxDistance = 0;
  for (let chromosome = 0; chromosome < CHROMOSOME_COUNT; chromosome += 1) {
    const left = frames[chromosome * 2];
    const right = frames[chromosome * 2 + 1];
    maxDistance = Math.max(maxDistance, Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z));
  }
  return maxDistance;
}

export function chromosomesPerPole(stageIndex: number, progress: number): {
  left: number;
  right: number;
} {
  const frames = chromatidFrames(stageIndex, progress);
  let left = 0;
  let right = 0;
  for (const frame of frames) {
    if (frame.x < 0) left += 1;
    if (frame.x >= 0) right += 1;
  }
  return { left, right };
}
