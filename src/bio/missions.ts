import missionsJson from '../data/missions.json';
import type { CellTypeId } from './constants';

export type MissionConcept = 'organelle' | 'osmosis' | 'plant' | 'mitosis' | 'scale';
export type MissionKind = 'hunt' | 'compare' | 'osmosis-cases' | 'plant-wall' | 'order' | 'anaphase';

export interface MissionSetup {
  cellType: CellTypeId;
  externalOsmolarity?: number;
  stageIndex?: number;
  selectedOrganelleId?: string;
}

export interface MissionCase {
  labelKo: string;
  osmolarity: number;
  options: string[];
  answer: string;
}

export interface MissionScenario {
  labelKo: string;
  osmolarity: number;
}

export interface Mission {
  id: string;
  titleKo: string;
  concept: MissionConcept;
  kind: MissionKind;
  promptKo: string;
  setup: MissionSetup;
  predictionPromptKo: string;
  predictionOptions: string[];
  predictionAnswer: string;
  predictionHintKo: string;
  explanationPromptKo: string;
  explanationOptions: string[];
  explanationAnswer: string;
  explanationHintKo: string;
  options: string[];
  answer: string;
  explanationKo: string;
  takeawayKo: string;
  targets?: string[];
  cases?: MissionCase[];
  scenarios?: MissionScenario[];
  difficulty: 1 | 2 | 3;
}

export const MISSIONS = missionsJson as Mission[];

export const CONCEPT_LABEL: Record<MissionConcept, string> = {
  organelle: '소기관',
  osmosis: '삼투',
  plant: '식물세포',
  mitosis: '세포 분열',
  scale: '축척',
};

export const CONCEPT_COLOR: Record<MissionConcept, string> = {
  organelle: 'var(--violet)',
  osmosis: 'var(--cyan)',
  plant: 'var(--sage)',
  mitosis: 'var(--ochre)',
  scale: 'var(--clay)',
};

export function getMission(id: string | null | undefined): Mission | undefined {
  if (!id) return undefined;
  return MISSIONS.find((mission) => mission.id === id);
}

export function missionIndex(id: string): number {
  return MISSIONS.findIndex((mission) => mission.id === id);
}

export function nextMission(id: string): Mission | undefined {
  const index = missionIndex(id);
  if (index < 0) return undefined;
  return MISSIONS[index + 1];
}

export function missionTargetCount(mission: Mission): number {
  return mission.targets?.length ?? mission.cases?.length ?? 0;
}

export function difficultyLabel(difficulty: 1 | 2 | 3): string {
  return ['입문', '탐구', '도전'][difficulty - 1] ?? '탐구';
}
