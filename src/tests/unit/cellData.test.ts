import { describe, expect, it } from 'vitest';
import {
  CELL_TYPES,
  ORGANELLES,
  getOrganelle,
  getOrganelles,
  isBoundaryOrganelle,
} from '../../bio/cellData';

describe('cell and organelle data', () => {
  it('gives every organelle a Korean name, function, and note', () => {
    for (const organelle of ORGANELLES) {
      expect(organelle.id.length).toBeGreaterThan(0);
      expect(organelle.nameKo.trim().length).toBeGreaterThan(0);
      expect(organelle.nameEn.trim().length).toBeGreaterThan(0);
      expect(organelle.functionKo.trim().length).toBeGreaterThan(0);
      expect(organelle.noteKo.trim().length).toBeGreaterThan(0);
      expect(organelle.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('uses unique ids', () => {
    const ids = ORGANELLES.map((organelle) => organelle.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has finite positions, sizes, and label anchors', () => {
    for (const organelle of ORGANELLES) {
      for (const value of [
        organelle.position.x,
        organelle.position.y,
        organelle.position.z,
        organelle.scale.x,
        organelle.scale.y,
        organelle.scale.z,
        organelle.labelAnchor.x,
        organelle.labelAnchor.y,
        organelle.labelAnchor.z,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(organelle.scale.x).toBeGreaterThan(0);
      expect(organelle.scale.y).toBeGreaterThan(0);
      expect(organelle.scale.z).toBeGreaterThan(0);
    }
  });

  it('includes the animal-specific organelles', () => {
    const animal = getOrganelles('animal');
    const ids = animal.map((organelle) => organelle.id);
    expect(ids).toContain('mitochondria');
    expect(ids).toContain('lysosome');
    expect(ids).toContain('centrosome');
    expect(ids).not.toContain('cell-wall');
    expect(ids).not.toContain('chloroplast');
  });

  it('includes the plant-specific organelles', () => {
    const plant = getOrganelles('plant');
    const ids = plant.map((organelle) => organelle.id);
    expect(ids).toContain('cell-wall');
    expect(ids).toContain('chloroplast');
    expect(ids).toContain('central-vacuole');
    expect(ids).not.toContain('lysosome');
    expect(ids).not.toContain('centrosome');
  });

  it('shares core organelles across both cell types', () => {
    for (const id of ['cell-membrane', 'cytoplasm', 'nucleus', 'mitochondria', 'ribosomes', 'golgi']) {
      expect(getOrganelle(id, 'animal')).toBeDefined();
      expect(getOrganelle(id, 'plant')).toBeDefined();
    }
  });

  it('labels cell boundaries and the cytoplasm as boundary structures', () => {
    expect(isBoundaryOrganelle('cell-membrane')).toBe(true);
    expect(isBoundaryOrganelle('cell-wall')).toBe(true);
    expect(isBoundaryOrganelle('cytoplasm')).toBe(true);
    expect(isBoundaryOrganelle('nucleus')).toBe(false);
  });

  it('describes the expected functions', () => {
    expect(getOrganelle('nucleus')?.functionKo).toContain('DNA');
    expect(getOrganelle('mitochondria')?.functionKo).toContain('에너지');
    expect(getOrganelle('ribosomes')?.functionKo).toContain('단백질');
    expect(getOrganelle('chloroplast')?.functionKo).toContain('광합성');
    expect(getOrganelle('central-vacuole')?.functionKo).toContain('물');
    expect(getOrganelle('cell-wall')?.functionKo).toContain('팽창');
  });

  it('provides at least ten labeled structures per cell type', () => {
    expect(getOrganelles('animal').filter((organelle) => !isBoundaryOrganelle(organelle.id)).length).toBeGreaterThanOrEqual(8);
    expect(getOrganelles('plant').filter((organelle) => !isBoundaryOrganelle(organelle.id)).length).toBeGreaterThanOrEqual(8);
    expect(getOrganelles('animal').length).toBeGreaterThanOrEqual(10);
    expect(getOrganelles('plant').length).toBeGreaterThanOrEqual(10);
  });

  it('offsets the plant nucleus from the central vacuole', () => {
    const animalNucleus = getOrganelle('nucleus', 'animal');
    const plantNucleus = getOrganelle('nucleus', 'plant');
    expect(animalNucleus?.position).not.toEqual(plantNucleus?.position);
    expect(plantNucleus?.position.x).toBeLessThan(0);
  });

  it('describes each cell type in Korean', () => {
    expect(CELL_TYPES.animal.nameKo).toBe('동물세포');
    expect(CELL_TYPES.plant.nameKo).toBe('식물세포');
    expect(CELL_TYPES.animal.boundary).toBe('membrane');
    expect(CELL_TYPES.plant.boundary).toBe('wall');
  });
});
