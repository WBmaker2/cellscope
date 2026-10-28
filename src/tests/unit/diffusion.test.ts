import { describe, expect, it } from 'vitest';
import { MAX_PARTICLES } from '../../bio/constants';
import {
  advanceParticles,
  createParticleSimulation,
  mulberry32,
  particleCounts,
  resetParticleSimulation,
} from '../../bio/diffusion';

describe('particle diffusion model', () => {
  it('produces a deterministic pseudo-random stream', () => {
    const first = mulberry32(1234);
    const second = mulberry32(1234);
    const a = Array.from({ length: 10 }, () => first());
    const b = Array.from({ length: 10 }, () => second());
    expect(a).toEqual(b);
  });

  it('is deterministic for a fixed seed and inputs', () => {
    const first = createParticleSimulation(200, 42);
    const second = createParticleSimulation(200, 42);
    for (let step = 0; step < 120; step += 1) {
      advanceParticles(first, 1 / 60, 0.04, 1.1);
      advanceParticles(second, 1 / 60, 0.04, 1.1);
    }
    expect(first).toEqual(second);
  });

  it('keeps the particle count within the performance cap', () => {
    const simulation = createParticleSimulation(9999, 1);
    expect(simulation.particles.length).toBe(MAX_PARTICLES);
    const counts = particleCounts(simulation);
    expect(counts.inside + counts.outside).toBe(MAX_PARTICLES);
  });

  it('bias crossing toward the inside when flux is positive', () => {
    const simulation = createParticleSimulation(360, 7);
    const before = particleCounts(simulation).inside;
    for (let step = 0; step < 240; step += 1) {
      advanceParticles(simulation, 1 / 60, 0.06, 1.1);
    }
    const after = particleCounts(simulation).inside;
    expect(after).toBeGreaterThan(before);
  });

  it('bias crossing toward the outside when flux is negative', () => {
    const simulation = createParticleSimulation(360, 7);
    const before = particleCounts(simulation).inside;
    for (let step = 0; step < 240; step += 1) {
      advanceParticles(simulation, 1 / 60, -0.06, 0.9);
    }
    const after = particleCounts(simulation).inside;
    expect(after).toBeLessThan(before);
  });

  it('resets to the same deterministic starting state', () => {
    const simulation = createParticleSimulation(120, 99);
    const reset = resetParticleSimulation(simulation);
    expect(reset).toEqual(createParticleSimulation(120, 99));
    expect(reset.seed).toBe(99);
    expect(reset.step).toBe(0);
  });

  it('keeps all positions finite after many steps', () => {
    const simulation = createParticleSimulation(300, 2026);
    for (let step = 0; step < 600; step += 1) {
      advanceParticles(simulation, 1 / 60, step % 120 < 60 ? 0.05 : -0.05, 1 + Math.sin(step / 40) * 0.1);
    }
    for (const particle of simulation.particles) {
      expect(Number.isFinite(particle.x)).toBe(true);
      expect(Number.isFinite(particle.y)).toBe(true);
      expect(Number.isFinite(particle.z)).toBe(true);
    }
  });
});
