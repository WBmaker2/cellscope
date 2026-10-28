import type { CellTypeId } from '../bio/constants';

export const PROGRESS_KEY = 'cellscope.progress.v1';

export interface SavedProgress {
  completed: string[];
  answers: Record<string, string>;
  lastCellType: CellTypeId;
  view: {
    showLabels: boolean;
    showMicroscopeInset: boolean;
    autoRotate: boolean;
  };
  reducedMotion: boolean | null;
}

export const EMPTY_PROGRESS: SavedProgress = {
  completed: [],
  answers: {},
  lastCellType: 'animal',
  view: {
    showLabels: true,
    showMicroscopeInset: false,
    autoRotate: true,
  },
  reducedMotion: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitize(raw: unknown): SavedProgress {
  if (!isRecord(raw)) return { ...EMPTY_PROGRESS, view: { ...EMPTY_PROGRESS.view } };
  const completed = Array.isArray(raw.completed)
    ? raw.completed.filter((item): item is string => typeof item === 'string')
    : [];
  const answers: Record<string, string> = {};
  if (isRecord(raw.answers)) {
    for (const [key, value] of Object.entries(raw.answers)) {
      if (typeof value === 'string') answers[key] = value;
    }
  }
  const lastCellType: CellTypeId = raw.lastCellType === 'plant' ? 'plant' : 'animal';
  const viewRaw = isRecord(raw.view) ? raw.view : {};
  return {
    completed: Array.from(new Set(completed)),
    answers,
    lastCellType,
    view: {
      showLabels: typeof viewRaw.showLabels === 'boolean' ? viewRaw.showLabels : true,
      showMicroscopeInset:
        typeof viewRaw.showMicroscopeInset === 'boolean' ? viewRaw.showMicroscopeInset : false,
      autoRotate: typeof viewRaw.autoRotate === 'boolean' ? viewRaw.autoRotate : true,
    },
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : null,
  };
}

export function loadProgress(): SavedProgress {
  if (typeof window === 'undefined') return { ...EMPTY_PROGRESS, view: { ...EMPTY_PROGRESS.view } };
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...EMPTY_PROGRESS, view: { ...EMPTY_PROGRESS.view } };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROGRESS, view: { ...EMPTY_PROGRESS.view } };
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // 저장 공간이 막혀 있어도 실험은 계속 진행할 수 있습니다.
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // 무시
  }
}
