import { MAX_PARTICLES, PARTICLE_SEED, WATER_PARTICLE_COUNT } from './constants';

export type ParticleRegion = 'inside' | 'outside';

export interface Particle {
  region: ParticleRegion;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface ParticleSimulation {
  seed: number;
  step: number;
  particles: Particle[];
}

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

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function randomDirection(random: () => number): [number, number, number] {
  const u = random() * 2 - 1;
  const theta = random() * TAU;
  const radius = Math.sqrt(Math.max(0, 1 - u * u));
  return [radius * Math.cos(theta), u, radius * Math.sin(theta)];
}

function insidePoint(random: () => number, radius = 0.82): [number, number, number] {
  while (true) {
    const x = random() * 2 - 1;
    const y = random() * 2 - 1;
    const z = random() * 2 - 1;
    if (x * x + y * y + z * z <= 1) {
      return [x * radius, y * radius, z * radius];
    }
  }
}

function outsidePoint(random: () => number): [number, number, number] {
  while (true) {
    const theta = random() * TAU;
    const radius = 1.2 + random() * 1.5;
    const y = (random() * 2 - 1) * 2.1;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    if (x * x + y * y + z * z > 1.18 * 1.18) return [x, y, z];
  }
}

export function createParticleSimulation(
  count = WATER_PARTICLE_COUNT,
  seed = PARTICLE_SEED,
): ParticleSimulation {
  const safeCount = clamp(Math.floor(count), 0, MAX_PARTICLES);
  const random = mulberry32(seed);
  const insideCount = Math.round(safeCount * 0.42);
  const particles: Particle[] = [];
  for (let index = 0; index < safeCount; index += 1) {
    const region: ParticleRegion = index < insideCount ? 'inside' : 'outside';
    const [x, y, z] = region === 'inside' ? insidePoint(random) : outsidePoint(random);
    const [vx, vy, vz] = randomDirection(random);
    particles.push({
      region,
      x,
      y,
      z,
      vx: vx * 0.02,
      vy: vy * 0.02,
      vz: vz * 0.02,
    });
  }
  return { seed, step: 0, particles };
}

export function particleCounts(simulation: ParticleSimulation): {
  inside: number;
  outside: number;
} {
  let inside = 0;
  let outside = 0;
  for (const particle of simulation.particles) {
    if (particle.region === 'inside') inside += 1;
    else outside += 1;
  }
  return { inside, outside };
}

export function advanceParticles(
  simulation: ParticleSimulation,
  dtSec: number,
  flux: number,
  volumeRatio: number,
): void {
  const dt = clamp(dtSec, 0, 0.05);
  if (dt === 0) return;
  simulation.step += 1;
  const random = mulberry32(simulation.seed + simulation.step * 7919);
  const cellRadius = clamp(Math.cbrt(volumeRatio), 0.6, 1.4);
  const crossingChance = Math.min(0.24, Math.abs(flux) * dt * 1.8);
  const wantsInside = flux > 0.0002;
  const wantsOutside = flux < -0.0002;

  for (const particle of simulation.particles) {
    const wobble = 0.55;
    const [rx, ry, rz] = randomDirection(random);
    particle.vx = particle.vx * 0.93 + rx * wobble * dt;
    particle.vy = particle.vy * 0.93 + ry * wobble * dt;
    particle.vz = particle.vz * 0.93 + rz * wobble * dt;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.z += particle.vz;

    if (particle.region === 'inside') {
      const distance = Math.hypot(particle.x, particle.y, particle.z);
      const limit = 0.92 * cellRadius;
      if (distance > limit) {
        const normal = distance === 0 ? 1 : limit / distance;
        particle.x *= normal;
        particle.y *= normal;
        particle.z *= normal;
        if (wantsOutside && random() < crossingChance) {
          const [ox, oy, oz] = outsidePoint(random);
          particle.region = 'outside';
          particle.x = ox;
          particle.y = oy;
          particle.z = oz;
        }
      }
    } else {
      const theta = Math.atan2(particle.z, particle.x);
      const radial = Math.hypot(particle.x, particle.z);
      const beakerLimit = 2.65;
      if (radial > beakerLimit) {
        particle.x = (particle.x / radial) * beakerLimit;
        particle.z = (particle.z / radial) * beakerLimit;
      }
      particle.y = clamp(particle.y, -2.05, 2.05);
      const distance = Math.hypot(particle.x, particle.y, particle.z);
      if (wantsInside && distance < cellRadius * 1.32 && random() < crossingChance) {
        const [ix, iy, iz] = insidePoint(random, 0.7);
        particle.region = 'inside';
        particle.x = ix * cellRadius;
        particle.y = iy * cellRadius;
        particle.z = iz * cellRadius;
      } else if (radial < cellRadius * 0.95) {
        particle.x = Math.cos(theta) * cellRadius * 0.98;
        particle.z = Math.sin(theta) * cellRadius * 0.98;
      }
    }
  }
}

export function resetParticleSimulation(
  simulation: ParticleSimulation,
): ParticleSimulation {
  return createParticleSimulation(simulation.particles.length, simulation.seed);
}
