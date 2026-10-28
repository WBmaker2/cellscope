import { describe, expect, it } from 'vitest';
import {
  ANIMAL_CRENATION_VOLUME,
  ANIMAL_LYSIS_VOLUME,
  PLANT_MAX_VOLUME,
  PLANT_MIN_VOLUME,
  PLANT_PLASMOLYSIS_VOLUME,
} from '../../bio/constants';
import {
  createOsmosis,
  fluxFor,
  internalOsmolarityForVolume,
  setExternalOsmolarity,
  simulateOsmosis,
  stepOsmosis,
  turgorForVolume,
} from '../../bio/osmosis';

describe('osmosis model', () => {
  it('increases animal cell volume in a hypotonic solution', () => {
    const start = createOsmosis('animal', 150);
    const next = stepOsmosis(start, 0.5);
    expect(next.volumeRatio).toBeGreaterThan(start.volumeRatio);
    expect(next.flux).toBeGreaterThan(0);
  });

  it('decreases animal cell volume in a hypertonic solution', () => {
    const start = createOsmosis('animal', 600);
    const next = stepOsmosis(start, 0.5);
    expect(next.volumeRatio).toBeLessThan(start.volumeRatio);
    expect(next.flux).toBeLessThan(0);
  });

  it('is stable in an isotonic solution', () => {
    const start = createOsmosis('animal', 300);
    expect(start.stable).toBe(true);
    const after = simulateOsmosis('animal', 300, 30);
    expect(after.volumeRatio).toBeCloseTo(1, 6);
    expect(after.state).toBe('isotonic');
  });

  it('lyses the animal cell at the defined threshold', () => {
    const result = simulateOsmosis('animal', 100, 60);
    expect(result.volumeRatio).toBeCloseTo(ANIMAL_LYSIS_VOLUME, 6);
    expect(result.state).toBe('lysed');
    expect(result.stable).toBe(true);
  });

  it('crenates the animal cell at the defined threshold', () => {
    const result = simulateOsmosis('animal', 600, 60);
    expect(result.volumeRatio).toBeCloseTo(ANIMAL_CRENATION_VOLUME, 6);
    expect(result.state).toBe('crenated');
    expect(result.stable).toBe(true);
  });

  it('never lyses a plant cell because of the wall limit', () => {
    const result = simulateOsmosis('plant', 50, 60);
    expect(result.volumeRatio).toBeCloseTo(PLANT_MAX_VOLUME, 6);
    expect(result.state).toBe('turgid');
    expect(result.state).not.toBe('lysed');
  });

  it('plasmolyzes a plant cell in a strongly hypertonic solution', () => {
    const result = simulateOsmosis('plant', 600, 60);
    expect(result.volumeRatio).toBeCloseTo(PLANT_MIN_VOLUME, 6);
    expect(result.volumeRatio).toBeLessThanOrEqual(PLANT_PLASMOLYSIS_VOLUME);
    expect(result.state).toBe('plasmolyzed');
  });

  it('increases turgor monotonically with plant volume', () => {
    let previous = -1;
    for (let volume = 1; volume <= PLANT_MAX_VOLUME; volume += 0.01) {
      const turgor = turgorForVolume('plant', volume);
      expect(turgor).toBeGreaterThanOrEqual(previous);
      previous = turgor;
    }
    expect(turgorForVolume('animal', 1.4)).toBe(0);
  });

  it('keeps internal osmolarity consistent with volume', () => {
    for (let volume = 0.7; volume <= 1.4; volume += 0.1) {
      expect(internalOsmolarityForVolume(volume) * volume).toBeCloseTo(300, 8);
    }
  });

  it('changes external osmolarity without changing current volume', () => {
    const start = createOsmosis('animal', 300);
    const changed = setExternalOsmolarity(start, 600);
    expect(changed.volumeRatio).toBe(start.volumeRatio);
    expect(changed.externalOsmolarity).toBe(600);
    expect(changed.stable).toBe(false);
  });

  it('returns zero flux when the animal is at a hard limit', () => {
    expect(fluxFor('animal', ANIMAL_LYSIS_VOLUME, 0)).toBe(0);
    expect(fluxFor('animal', ANIMAL_CRENATION_VOLUME, 600)).toBe(0);
    expect(fluxFor('plant', PLANT_MAX_VOLUME, 0)).toBe(0);
  });

  it('reaches equilibrium without oscillation', () => {
    let state = createOsmosis('animal', 220);
    let previous = state.volumeRatio;
    let directionChanges = 0;
    let lastDirection = 0;
    for (let index = 0; index < 3000; index += 1) {
      state = stepOsmosis(state, 1 / 60);
      const delta = state.volumeRatio - previous;
      if (Math.abs(delta) > 1e-7) {
        const direction = Math.sign(delta);
        if (lastDirection !== 0 && direction !== lastDirection) directionChanges += 1;
        lastDirection = direction;
      }
      previous = state.volumeRatio;
    }
    expect(directionChanges).toBe(0);
    expect(state.volumeRatio).toBeGreaterThan(1);
    expect(state.volumeRatio).toBeLessThan(ANIMAL_LYSIS_VOLUME);
    expect(state.stable).toBe(true);
  });

  it('produces no NaNs across the full concentration range', () => {
    for (const external of [0, 100, 200, 300, 400, 500, 600]) {
      for (const cellType of ['animal', 'plant'] as const) {
        const result = simulateOsmosis(cellType, external, 30);
        expect(Number.isFinite(result.volumeRatio)).toBe(true);
        expect(Number.isFinite(result.internalOsmolarity)).toBe(true);
        expect(Number.isFinite(result.turgor)).toBe(true);
        expect(Number.isFinite(result.flux)).toBe(true);
      }
    }
  });
});
