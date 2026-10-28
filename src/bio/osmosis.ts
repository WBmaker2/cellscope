import {
  ANIMAL_CRENATION_VOLUME,
  ANIMAL_LYSIS_VOLUME,
  INITIAL_INTERNAL_OSMOLARITY,
  ISOTONIC_OSMOLARITY,
  MAX_EXTERNAL_OSMOLARITY,
  MIN_EXTERNAL_OSMOLARITY,
  OSMOSIS_FIXED_DT,
  OSMOSIS_RATE_SCALE,
  OSMOSIS_STABLE_FLUX,
  PLANT_MAX_VOLUME,
  PLANT_MIN_VOLUME,
  PLANT_PLASMOLYSIS_VOLUME,
  WATER_PERMEABILITY,
  type CellTypeId,
} from './constants';

export type OsmosisStateLabel = 'lysed' | 'crenated' | 'isotonic' | 'turgid' | 'plasmolyzed';
export type OsmosisTrend = 'swelling' | 'shrinking' | 'stable';

export interface OsmosisSnapshot {
  cellType: CellTypeId;
  internalOsmolarity: number;
  externalOsmolarity: number;
  volumeRatio: number;
  turgor: number;
  flux: number;
  state: OsmosisStateLabel;
  trend: OsmosisTrend;
  timeSec: number;
  stable: boolean;
  atLimit: boolean;
}

export interface OsmosisSummary {
  headline: string;
  detail: string;
  waterDirection: string;
  externalLabel: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function internalOsmolarityForVolume(volumeRatio: number): number {
  const safeVolume = Math.max(0.01, volumeRatio);
  return INITIAL_INTERNAL_OSMOLARITY / safeVolume;
}

export function turgorForVolume(cellType: CellTypeId, volumeRatio: number): number {
  if (cellType !== 'plant') return 0;
  return clamp((volumeRatio - 1) / (PLANT_MAX_VOLUME - 1), 0, 1);
}

export function fluxFor(
  cellType: CellTypeId,
  volumeRatio: number,
  externalOsmolarity: number,
): number {
  const internal = internalOsmolarityForVolume(volumeRatio);
  const gradient = internal - externalOsmolarity;
  const flux = WATER_PERMEABILITY * gradient * OSMOSIS_RATE_SCALE;
  const atPlantWall = cellType === 'plant' && volumeRatio >= PLANT_MAX_VOLUME - 1e-6 && flux > 0;
  const atPlantFloor = cellType === 'plant' && volumeRatio <= PLANT_MIN_VOLUME + 1e-6 && flux < 0;
  const atAnimalLimit =
    (cellType === 'animal' &&
      volumeRatio >= ANIMAL_LYSIS_VOLUME - 1e-6 &&
      flux > 0) ||
    (cellType === 'animal' &&
      volumeRatio <= ANIMAL_CRENATION_VOLUME + 1e-6 &&
      flux < 0);
  if (atPlantWall || atPlantFloor || atAnimalLimit) return 0;
  return flux;
}

function limitsFor(cellType: CellTypeId): { min: number; max: number } {
  return cellType === 'plant'
    ? { min: PLANT_MIN_VOLUME, max: PLANT_MAX_VOLUME }
    : { min: ANIMAL_CRENATION_VOLUME, max: ANIMAL_LYSIS_VOLUME };
}

function stateFor(
  cellType: CellTypeId,
  volumeRatio: number,
  externalOsmolarity: number,
): OsmosisStateLabel {
  if (cellType === 'animal') {
    if (volumeRatio >= ANIMAL_LYSIS_VOLUME - 1e-4) return 'lysed';
    if (volumeRatio <= ANIMAL_CRENATION_VOLUME + 1e-4) return 'crenated';
    return 'isotonic';
  }
  if (volumeRatio <= PLANT_PLASMOLYSIS_VOLUME + 1e-4) return 'plasmolyzed';
  if (volumeRatio > 1.004 || externalOsmolarity < ISOTONIC_OSMOLARITY - 4) return 'turgid';
  return 'isotonic';
}

function trendFor(flux: number): OsmosisTrend {
  if (flux > OSMOSIS_STABLE_FLUX) return 'swelling';
  if (flux < -OSMOSIS_STABLE_FLUX) return 'shrinking';
  return 'stable';
}

function withDerived(snapshot: Omit<OsmosisSnapshot, 'internalOsmolarity' | 'turgor' | 'state' | 'trend'>): OsmosisSnapshot {
  const internalOsmolarity = round(internalOsmolarityForVolume(snapshot.volumeRatio), 2);
  const turgor = round(turgorForVolume(snapshot.cellType, snapshot.volumeRatio), 4);
  const state = stateFor(snapshot.cellType, snapshot.volumeRatio, snapshot.externalOsmolarity);
  const trend = snapshot.stable ? 'stable' : trendFor(snapshot.flux);
  return {
    ...snapshot,
    internalOsmolarity,
    turgor,
    state,
    trend,
  };
}

export function createOsmosis(
  cellType: CellTypeId,
  externalOsmolarity = ISOTONIC_OSMOLARITY,
): OsmosisSnapshot {
  const external = clamp(
    externalOsmolarity,
    MIN_EXTERNAL_OSMOLARITY,
    MAX_EXTERNAL_OSMOLARITY,
  );
  const volumeRatio = 1;
  const flux = fluxFor(cellType, volumeRatio, external);
  const atLimit =
    (cellType === 'animal' &&
      (volumeRatio >= ANIMAL_LYSIS_VOLUME - 1e-6 ||
        volumeRatio <= ANIMAL_CRENATION_VOLUME + 1e-6)) ||
    (cellType === 'plant' &&
      (volumeRatio >= PLANT_MAX_VOLUME - 1e-6 || volumeRatio <= PLANT_MIN_VOLUME + 1e-6));
  return withDerived({
    cellType,
    externalOsmolarity: external,
    volumeRatio,
    flux: round(flux, 6),
    timeSec: 0,
    stable: Math.abs(flux) <= OSMOSIS_STABLE_FLUX || atLimit,
    atLimit,
  });
}

export function setExternalOsmolarity(
  snapshot: OsmosisSnapshot,
  externalOsmolarity: number,
): OsmosisSnapshot {
  const external = clamp(
    externalOsmolarity,
    MIN_EXTERNAL_OSMOLARITY,
    MAX_EXTERNAL_OSMOLARITY,
  );
  const flux = fluxFor(snapshot.cellType, snapshot.volumeRatio, external);
  return withDerived({
    ...snapshot,
    externalOsmolarity: external,
    flux: round(flux, 6),
    stable: Math.abs(flux) <= OSMOSIS_STABLE_FLUX,
  });
}

export function stepOsmosis(snapshot: OsmosisSnapshot, dtSec: number): OsmosisSnapshot {
  const dt = clamp(dtSec, 0, 0.08);
  if (dt === 0) return snapshot;

  const { min, max } = limitsFor(snapshot.cellType);
  const currentFlux = fluxFor(snapshot.cellType, snapshot.volumeRatio, snapshot.externalOsmolarity);
  const nextVolumeRaw = snapshot.volumeRatio + currentFlux * dt;
  const nextVolume = clamp(nextVolumeRaw, min, max);
  const atLimit = nextVolume !== nextVolumeRaw;
  const nextFlux = fluxFor(snapshot.cellType, nextVolume, snapshot.externalOsmolarity);
  const stable =
    atLimit ||
    (Math.abs(nextFlux) <= OSMOSIS_STABLE_FLUX && snapshot.timeSec + dt >= 0.35);

  return withDerived({
    ...snapshot,
    volumeRatio: round(nextVolume, 6),
    flux: round(nextFlux, 6),
    timeSec: round(snapshot.timeSec + dt, 3),
    stable,
    atLimit,
  });
}

export function simulateOsmosis(
  cellType: CellTypeId,
  externalOsmolarity: number,
  seconds: number,
  dtSec = OSMOSIS_FIXED_DT,
): OsmosisSnapshot {
  let snapshot = createOsmosis(cellType, externalOsmolarity);
  const steps = Math.ceil(seconds / dtSec);
  for (let index = 0; index < steps; index += 1) {
    snapshot = stepOsmosis(snapshot, dtSec);
    if (snapshot.stable) break;
  }
  return snapshot;
}

export function resetOsmosis(snapshot: OsmosisSnapshot): OsmosisSnapshot {
  return createOsmosis(snapshot.cellType, snapshot.externalOsmolarity);
}

export const OSMOSIS_STATE_LABEL: Record<OsmosisStateLabel, string> = {
  lysed: '세포막 파열',
  crenated: '쭈그러짐',
  isotonic: '안정',
  turgid: '팽만',
  plasmolyzed: '원형질 분리',
};

export const OSMOSIS_STATE_DESCRIPTION: Record<OsmosisStateLabel, string> = {
  lysed: '동물세포가 물을 너무 많이 들여보내 세포막이 견디지 못한 모형입니다.',
  crenated: '동물세포가 물을 잃어 표면이 쭈그러든 상태입니다.',
  isotonic: '세포 안팎의 용질 농도가 비슷해 물의 출입이 균형을 이룹니다.',
  turgid: '식물세포가 물을 머금어 팽팽해졌습니다. 세포벽이 터지는 것을 막습니다.',
  plasmolyzed: '식물세포가 물을 잃어 세포막이 세포벽에서 떨어졌습니다.',
};

export function externalSolutionLabel(osmolarity: number): string {
  if (osmolarity < ISOTONIC_OSMOLARITY - 15) return '저장액';
  if (osmolarity > ISOTONIC_OSMOLARITY + 15) return '고장액';
  return '등장액';
}

export function waterDirectionLabel(snapshot: OsmosisSnapshot): string {
  if (snapshot.stable || snapshot.trend === 'stable') return '물의 출입이 균형을 이룹니다.';
  if (snapshot.trend === 'swelling') return '물이 세포 안으로 들어옵니다.';
  return '물이 세포 밖으로 나갑니다.';
}

export function osmosisSummary(snapshot: OsmosisSnapshot): OsmosisSummary {
  const externalLabel = externalSolutionLabel(snapshot.externalOsmolarity);
  const waterDirection = waterDirectionLabel(snapshot);
  const headline = `${externalLabel} · ${OSMOSIS_STATE_LABEL[snapshot.state]}`;
  const detail = `${OSMOSIS_STATE_DESCRIPTION[snapshot.state]} ${waterDirection}`;
  return { headline, detail, waterDirection, externalLabel };
}

export function relativeTurgorKpa(snapshot: OsmosisSnapshot): number {
  return Math.round(snapshot.turgor * 100);
}
