import { describe, expect, it } from 'vitest';
import {
  chromosomeCountAt,
  isValidStageOrder,
  MITOSIS_STAGE_ORDER,
  MITOSIS_STAGES,
  isAnaphaseSeparating,
  producesTwoCells,
  stageAt,
  stageOrderSummary,
} from '../../bio/mitosis';
import {
  chromatidFrames,
  chromosomesPerPole,
  sisterChromatidDistance,
} from '../../bio/chromosomes';

describe('mitosis stages', () => {
  it('orders the six stages from interphase to cytokinesis', () => {
    expect(MITOSIS_STAGE_ORDER).toEqual([
      'interphase',
      'prophase',
      'metaphase',
      'anaphase',
      'telophase',
      'cytokinesis',
    ]);
    expect(MITOSIS_STAGES.map((stage) => stage.nameKo)).toEqual([
      '간기',
      '전기',
      '중기',
      '후기',
      '말기',
      '세포질 분열',
    ]);
  });

  it('assigns sequential indices and positive durations', () => {
    MITOSIS_STAGES.forEach((stage, index) => {
      expect(stage.index).toBe(index);
      expect(stage.durationSec).toBeGreaterThan(0);
      expect(stage.descriptionKo.trim().length).toBeGreaterThan(0);
      expect(stage.tipKo.trim().length).toBeGreaterThan(0);
    });
  });

  it('clamps stage lookup', () => {
    expect(stageAt(-4).id).toBe('interphase');
    expect(stageAt(99).id).toBe('cytokinesis');
  });

  it('counts four chromosomes and eight chromatids before anaphase', () => {
    expect(chromosomeCountAt(0).chromosomesPerCell).toBe(4);
    expect(chromosomeCountAt(0).chromatids).toBe(8);
    expect(chromosomeCountAt(2).chromosomesPerCell).toBe(4);
    expect(chromosomeCountAt(2).chromatids).toBe(8);
  });

  it('reports separated chromatids as chromosomes during anaphase and telophase', () => {
    expect(chromosomeCountAt(3).chromosomesPerCell).toBe(8);
    expect(chromosomeCountAt(3).chromatids).toBe(0);
    expect(chromosomeCountAt(4).chromosomesPerCell).toBe(8);
    expect(chromosomeCountAt(4).cells).toBe(1);
  });

  it('produces two cells with four chromosomes each in cytokinesis', () => {
    const count = chromosomeCountAt(5);
    expect(count.cells).toBe(2);
    expect(count.chromosomesPerCell).toBe(4);
    expect(count.totalChromosomes).toBe(8);
    expect(count.labelKo).toContain('딸세포 2개');
    expect(producesTwoCells(5, 0.55)).toBe(false);
    expect(producesTwoCells(5, 0.6)).toBe(true);
    expect(producesTwoCells(4, 1)).toBe(false);
  });

  it('validates the exact stage order', () => {
    expect(isValidStageOrder([...MITOSIS_STAGE_ORDER])).toBe(true);
    expect(isValidStageOrder(['interphase', 'metaphase', 'prophase', 'anaphase', 'telophase', 'cytokinesis'])).toBe(false);
    expect(isValidStageOrder(MITOSIS_STAGE_ORDER.slice(0, 5))).toBe(false);
    expect(stageOrderSummary(MITOSIS_STAGE_ORDER)).toBe('간기 → 전기 → 중기 → 후기 → 말기 → 세포질 분열');
  });

  it('always separates sister chromatids in anaphase', () => {
    expect(isAnaphaseSeparating(3, 0.04)).toBe(false);
    expect(isAnaphaseSeparating(3, 0.1)).toBe(true);
    const aligned = sisterChromatidDistance(2, 1);
    const separating = sisterChromatidDistance(3, 0.7);
    expect(separating).toBeGreaterThan(aligned * 3);
    const poles = chromosomesPerPole(3, 1);
    expect(poles.left).toBe(4);
    expect(poles.right).toBe(4);
  });

  it('produces finite chromosome keyframes for every stage', () => {
    for (let stage = 0; stage < 6; stage += 1) {
      for (let progress = 0; progress <= 1; progress += 0.25) {
        const frames = chromatidFrames(stage, progress);
        expect(frames).toHaveLength(8);
        for (const frame of frames) {
          for (const value of [frame.x, frame.y, frame.z, frame.thickness, frame.length, frame.opacity]) {
            expect(Number.isFinite(value)).toBe(true);
          }
          expect(frame.opacity).toBeGreaterThan(0);
        }
      }
    }
  });

  it('moves sister chromatids in opposite directions during anaphase', () => {
    const frames = chromatidFrames(3, 1);
    for (let index = 0; index < 8; index += 2) {
      expect(frames[index].x).toBeLessThan(0);
      expect(frames[index + 1].x).toBeGreaterThan(0);
      expect(Math.abs(frames[index].x)).toBeCloseTo(Math.abs(frames[index + 1].x), 6);
    }
  });
});
