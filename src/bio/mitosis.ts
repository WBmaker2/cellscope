import { CHROMOSOME_COUNT, CHROMATID_COUNT } from './constants';

export type MitosisStageId =
  | 'interphase'
  | 'prophase'
  | 'metaphase'
  | 'anaphase'
  | 'telophase'
  | 'cytokinesis';

export type NuclearEnvelopeState = 'intact' | 'breaking' | 'gone' | 'reforming';
export type SpindleState = 'none' | 'forming' | 'full' | 'pulling' | 'disassembling';
export type CellShapeState = 'normal' | 'elongating' | 'pinching' | 'two-cells';
export type ChromosomeState = 'chromatin' | 'condensing' | 'aligned' | 'separating' | 'clustered';

export interface MitosisStage {
  id: MitosisStageId;
  index: number;
  nameKo: string;
  nameEn: string;
  descriptionKo: string;
  tipKo: string;
  durationSec: number;
  nuclearEnvelope: NuclearEnvelopeState;
  spindle: SpindleState;
  cellShape: CellShapeState;
  chromosomeState: ChromosomeState;
}

export interface ChromosomeCount {
  cells: number;
  chromosomesPerCell: number;
  totalChromosomes: number;
  chromatids: number;
  labelKo: string;
}

export const MITOSIS_STAGES: MitosisStage[] = [
  {
    id: 'interphase',
    index: 0,
    nameKo: '간기',
    nameEn: 'Interphase',
    descriptionKo:
      '세포가 나뉘기 전 DNA를 복제하고 필요한 물질을 준비합니다. 염색체는 가느다란 염색질로 풀려 있습니다.',
    tipKo: '간기는 분열 자체는 아니지만, 분열을 준비하는 가장 긴 단계입니다.',
    durationSec: 4.4,
    nuclearEnvelope: 'intact',
    spindle: 'none',
    cellShape: 'normal',
    chromosomeState: 'chromatin',
  },
  {
    id: 'prophase',
    index: 1,
    nameKo: '전기',
    nameEn: 'Prophase',
    descriptionKo:
      '염색질이 굵은 염색체로 응축되고 핵막이 분해되기 시작합니다. 방추사가 만들어집니다.',
    tipKo: '전기에는 염색체가 짧고 굵어져 현미경으로도 구분할 수 있게 됩니다.',
    durationSec: 3.2,
    nuclearEnvelope: 'breaking',
    spindle: 'forming',
    cellShape: 'normal',
    chromosomeState: 'condensing',
  },
  {
    id: 'metaphase',
    index: 2,
    nameKo: '중기',
    nameEn: 'Metaphase',
    descriptionKo:
      '염색체가 세포의 적도면에 나란히 정렬합니다. 방추사가 각 염색체의 동원체에 붙습니다.',
    tipKo: '중기는 염색체를 관찰하기 가장 좋은 단계입니다. 염색체가 한 줄로 늘어서기 때문입니다.',
    durationSec: 2.8,
    nuclearEnvelope: 'gone',
    spindle: 'full',
    cellShape: 'normal',
    chromosomeState: 'aligned',
  },
  {
    id: 'anaphase',
    index: 3,
    nameKo: '후기',
    nameEn: 'Anaphase',
    descriptionKo:
      '자매 염색분체가 분리되어 방추사에 끌려 양쪽 극으로 이동합니다. 세포가 길어지기 시작합니다.',
    tipKo: '후기의 핵심은 자매 염색분체의 분리입니다. 이때 각 염색분체는 독립된 염색체가 됩니다.',
    durationSec: 3.0,
    nuclearEnvelope: 'gone',
    spindle: 'pulling',
    cellShape: 'elongating',
    chromosomeState: 'separating',
  },
  {
    id: 'telophase',
    index: 4,
    nameKo: '말기',
    nameEn: 'Telophase',
    descriptionKo:
      '양극에 도착한 염색체 주위로 핵막이 다시 만들어집니다. 세포 가운데가 잘록해집니다.',
    tipKo: '말기에는 두 개의 새 핵이 만들어지고, 방추사가 사라지기 시작합니다.',
    durationSec: 2.8,
    nuclearEnvelope: 'reforming',
    spindle: 'disassembling',
    cellShape: 'pinching',
    chromosomeState: 'clustered',
  },
  {
    id: 'cytokinesis',
    index: 5,
    nameKo: '세포질 분열',
    nameEn: 'Cytokinesis',
    descriptionKo:
      '세포질이 나뉘어 두 개의 딸세포가 됩니다. 각 딸세포는 모세포와 같은 수의 염색체를 가집니다.',
    tipKo: '핵분열이 끝난 뒤 세포질이 나뉘어야 비로소 두 세포가 완성됩니다.',
    durationSec: 3.4,
    nuclearEnvelope: 'intact',
    spindle: 'none',
    cellShape: 'two-cells',
    chromosomeState: 'clustered',
  },
];

export const MITOSIS_STAGE_ORDER: MitosisStageId[] = MITOSIS_STAGES.map((stage) => stage.id);

export function stageAt(index: number): MitosisStage {
  const safeIndex = Math.min(MITOSIS_STAGES.length - 1, Math.max(0, Math.floor(index)));
  return MITOSIS_STAGES[safeIndex];
}

export function stageIndexById(id: MitosisStageId): number {
  return MITOSIS_STAGES.findIndex((stage) => stage.id === id);
}

export function clampStageIndex(index: number): number {
  return Math.min(MITOSIS_STAGES.length - 1, Math.max(0, Math.round(index)));
}

export function chromosomeCountAt(stageIndex: number): ChromosomeCount {
  const safeIndex = clampStageIndex(stageIndex);
  if (safeIndex <= 2) {
    return {
      cells: 1,
      chromosomesPerCell: CHROMOSOME_COUNT,
      totalChromosomes: CHROMOSOME_COUNT,
      chromatids: CHROMATID_COUNT,
      labelKo: `${CHROMOSOME_COUNT}염색체 · ${CHROMATID_COUNT}염색분체`,
    };
  }
  if (safeIndex <= 4) {
    return {
      cells: 1,
      chromosomesPerCell: CHROMATID_COUNT,
      totalChromosomes: CHROMATID_COUNT,
      chromatids: 0,
      labelKo: '분리된 염색분체 8개가 양극으로 이동',
    };
  }
  return {
    cells: 2,
    chromosomesPerCell: CHROMOSOME_COUNT,
    totalChromosomes: CHROMOSOME_COUNT * 2,
    chromatids: 0,
    labelKo: `딸세포 2개 · 각 ${CHROMOSOME_COUNT}염색체`,
  };
}

export function isValidStageOrder(ids: string[]): boolean {
  if (ids.length !== MITOSIS_STAGE_ORDER.length) return false;
  return ids.every((id, index) => id === MITOSIS_STAGE_ORDER[index]);
}

export function stageOrderSummary(ids: string[]): string {
  return ids
    .map((id) => MITOSIS_STAGES.find((stage) => stage.id === id)?.nameKo ?? '?')
    .join(' → ');
}

export function mitosisNarrative(stageIndex: number): string {
  const stage = stageAt(stageIndex);
  const count = chromosomeCountAt(stageIndex);
  return `${stage.nameKo}: ${stage.descriptionKo} ${count.labelKo}.`;
}

export function isAnaphaseSeparating(stageIndex: number, progress: number): boolean {
  return stageIndex === 3 && progress > 0.05;
}

export function producesTwoCells(stageIndex: number, progress: number): boolean {
  return stageIndex === 5 && progress > 0.55;
}
