import { createOsmosis, type OsmosisSnapshot } from '../bio/osmosis';
import type { CellTypeId } from '../bio/constants';
import {
  EMPTY_PROGRESS,
  clearProgress,
  loadProgress,
  saveProgress,
  type SavedProgress,
} from '../storage/progress';
import type { Route } from './routes';

export interface CellState {
  type: CellTypeId;
  selectedOrganelleId: string | null;
  clipping: number;
}

export interface OsmosisLabState {
  externalOsmolarity: number;
  timeSec: number;
  playing: boolean;
  snapshot: OsmosisSnapshot;
}

export interface MitosisLabState {
  stageIndex: number;
  progress: number;
  playing: boolean;
}

export interface ViewState {
  showLabels: boolean;
  showMicroscopeInset: boolean;
  autoRotate: boolean;
}

export interface MissionState {
  currentId: string | null;
  prediction: string | null;
  completed: string[];
  answers: Record<string, string>;
}

export interface PreferencesState {
  reducedMotion: boolean;
}

export interface AppState {
  route: Route;
  cell: CellState;
  osmosis: OsmosisLabState;
  mitosis: MitosisLabState;
  view: ViewState;
  mission: MissionState;
  preferences: PreferencesState;
}

type Listener = (state: AppState) => void;

function systemReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initialState(progress: SavedProgress): AppState {
  const reducedMotion = progress.reducedMotion ?? systemReducedMotion();
  return {
    route: { name: 'explore', missionId: null },
    cell: {
      type: progress.lastCellType,
      selectedOrganelleId: null,
      clipping: 0,
    },
    osmosis: {
      externalOsmolarity: 300,
      timeSec: 0,
      playing: false,
      snapshot: createOsmosis(progress.lastCellType, 300),
    },
    mitosis: {
      stageIndex: 0,
      progress: 0,
      playing: false,
    },
    view: { ...progress.view },
    mission: {
      currentId: null,
      prediction: null,
      completed: [...progress.completed],
      answers: { ...progress.answers },
    },
    preferences: { reducedMotion },
  };
}

function toSaved(state: AppState): SavedProgress {
  return {
    completed: [...state.mission.completed],
    answers: { ...state.mission.answers },
    lastCellType: state.cell.type,
    view: { ...state.view },
    reducedMotion: state.preferences.reducedMotion,
  };
}

class AppStore {
  private state: AppState;
  private listeners = new Set<Listener>();
  private queuedPersist: number | null = null;

  constructor(progress: SavedProgress) {
    this.state = initialState(progress);
  }

  get(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(mutator: (state: AppState) => void, options: { persist?: boolean; notify?: boolean } = {}): void {
    mutator(this.state);
    if (options.notify !== false) {
      for (const listener of this.listeners) listener(this.state);
    }
    if (options.persist !== false) this.schedulePersist();
  }

  setRoute(route: Route): void {
    this.state.route = route;
    this.notify();
  }

  persistNow(): void {
    if (this.queuedPersist !== null) {
      window.clearTimeout(this.queuedPersist);
      this.queuedPersist = null;
    }
    saveProgress(toSaved(this.state));
  }

  completeMission(id: string, answer: string): void {
    this.update((state) => {
      if (!state.mission.completed.includes(id)) state.mission.completed.push(id);
      state.mission.answers[id] = answer;
    });
    this.persistNow();
  }

  resetProgress(): void {
    clearProgress();
    this.update((state) => {
      state.mission.completed = [];
      state.mission.answers = {};
      state.mission.currentId = null;
      state.mission.prediction = null;
      state.cell.type = EMPTY_PROGRESS.lastCellType;
      state.cell.selectedOrganelleId = null;
      state.cell.clipping = 0;
      state.osmosis = {
        externalOsmolarity: 300,
        timeSec: 0,
        playing: false,
        snapshot: createOsmosis(EMPTY_PROGRESS.lastCellType, 300),
      };
      state.mitosis = { stageIndex: 0, progress: 0, playing: false };
      state.view = { ...EMPTY_PROGRESS.view };
      state.preferences.reducedMotion = systemReducedMotion();
    });
    this.persistNow();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state);
  }

  private schedulePersist(): void {
    if (this.queuedPersist !== null) return;
    this.queuedPersist = window.setTimeout(() => {
      this.queuedPersist = null;
      saveProgress(toSaved(this.state));
    }, 250);
  }
}

export const store = new AppStore(loadProgress());

export function isMissionComplete(id: string): boolean {
  return store.get().mission.completed.includes(id);
}

export function setCellType(cellType: CellTypeId): void {
  store.update(
    (state) => {
      state.cell.type = cellType;
      state.cell.selectedOrganelleId = null;
      if (state.osmosis.snapshot.cellType !== cellType) {
        state.osmosis.snapshot = createOsmosis(cellType, state.osmosis.externalOsmolarity);
        state.osmosis.timeSec = 0;
        state.osmosis.playing = false;
      }
    },
    { persist: true },
  );
}
