import type { CellTypeId } from './constants';

export type OrganelleShape =
  | 'sphere'
  | 'ellipsoid'
  | 'rod'
  | 'stack'
  | 'network'
  | 'vacuole'
  | 'rounded-box';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Organelle {
  id: string;
  nameKo: string;
  nameEn: string;
  functionKo: string;
  noteKo: string;
  cellTypes: CellTypeId[];
  color: string;
  shape: OrganelleShape;
  position: Vec3;
  scale: Vec3;
  labelAnchor: Vec3;
  rotation?: Vec3;
  copies?: number;
  spread?: number;
  opacity?: number;
  boundary?: boolean;
}

export interface CellTypeMeta {
  id: CellTypeId;
  nameKo: string;
  nameEn: string;
  taglineKo: string;
  boundary: 'membrane' | 'wall';
  shape: 'ellipsoid' | 'rounded-box';
  accent: string;
}

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const CELL_TYPES: Record<CellTypeId, CellTypeMeta> = {
  animal: {
    id: 'animal',
    nameKo: '동물세포',
    nameEn: 'Animal cell',
    taglineKo: '유연한 세포막 하나로 둘러싸인 세포',
    boundary: 'membrane',
    shape: 'ellipsoid',
    accent: '#e28a5b',
  },
  plant: {
    id: 'plant',
    nameKo: '식물세포',
    nameEn: 'Plant cell',
    taglineKo: '단단한 세포벽과 큰 중심 액포를 가진 세포',
    boundary: 'wall',
    shape: 'rounded-box',
    accent: '#8fd16a',
  },
};

const commonAnimalPlant = (
  base: Omit<Organelle, 'cellTypes' | 'noteKo'>,
  noteKo: string,
): Organelle => ({
  ...base,
  noteKo,
  cellTypes: ['animal', 'plant'],
});

export const ORGANELLES: Organelle[] = [
  {
    id: 'cell-membrane',
    nameKo: '세포막',
    nameEn: 'Cell membrane',
    functionKo: '세포 안팎으로 드나드는 물질을 조절합니다.',
    noteKo: '세포막은 물, 산소, 영양분은 통과시키지만 모든 물질을 마음대로 들여보내지는 않아요.',
    cellTypes: ['animal', 'plant'],
    color: '#7ee7d8',
    shape: 'ellipsoid',
    position: v(0, 0, 0),
    scale: v(20, 17, 18),
    labelAnchor: v(-6.6, 6.1, 3.5),
    opacity: 0.18,
    boundary: true,
  },
  {
    id: 'cell-wall',
    nameKo: '세포벽',
    nameEn: 'Cell wall',
    functionKo: '세포를 지지하고 팽창을 제한합니다.',
    noteKo: '식물세포가 물을 많이 흡수해도 터지지 않는 까닭은 단단한 세포벽이 모양을 잡아 주기 때문이에요.',
    cellTypes: ['plant'],
    color: '#9fc7a4',
    shape: 'rounded-box',
    position: v(0, 0, 0),
    scale: v(21, 18, 19),
    labelAnchor: v(-7.4, 7.2, 4.2),
    opacity: 0.2,
    boundary: true,
  },
  commonAnimalPlant(
    {
      id: 'cytoplasm',
      nameKo: '세포질',
      nameEn: 'Cytoplasm',
      functionKo: '소기관이 놓이는 공간이며 여러 화학 반응이 일어납니다.',
      color: '#cfe8d6',
      shape: 'ellipsoid',
      position: v(0, 0, 0),
      scale: v(18.7, 15.7, 16.7),
      labelAnchor: v(-5.8, -4.6, 4.2),
      opacity: 0.08,
      boundary: true,
    },
    '세포질은 젤리처럼 걸쭉한 액체로, 소기관을 떠 있게 하고 물질이 이동하는 통로가 됩니다.',
  ),
  commonAnimalPlant(
    {
      id: 'nucleus',
      nameKo: '핵',
      nameEn: 'Nucleus',
      functionKo: 'DNA를 보관하고 세포 활동을 조절합니다.',
      color: '#b79cff',
      shape: 'sphere',
      position: v(1.2, 1.4, 0.4),
      scale: v(5.2, 5.2, 5.2),
      labelAnchor: v(1.2, 5.1, 0.4),
      rotation: v(0.2, 0.3, 0.1),
    },
    '핵 안의 DNA에는 세포가 무엇을 만들고 언제 나눌지 정하는 정보가 들어 있어요.',
  ),
  commonAnimalPlant(
    {
      id: 'nucleolus',
      nameKo: '인',
      nameEn: 'Nucleolus',
      functionKo: '리보솜을 만듭니다.',
      color: '#7c5cd6',
      shape: 'sphere',
      position: v(2.05, 2.15, 1.25),
      scale: v(1.55, 1.55, 1.55),
      labelAnchor: v(3.6, 3.6, 2.3),
    },
    '인은 핵 속에서 리보솜의 부품을 조립하는 작은 공장이에요.',
  ),
  commonAnimalPlant(
    {
      id: 'mitochondria',
      nameKo: '미토콘드리아',
      nameEn: 'Mitochondria',
      functionKo: '음식물의 에너지를 방출합니다.',
      color: '#e28a5b',
      shape: 'rod',
      position: v(-4.6, -1.4, 2.2),
      scale: v(1.15, 2.9, 1.15),
      labelAnchor: v(-4.6, 1.0, 2.2),
      copies: 5,
      spread: 6.2,
      rotation: v(0.4, 0.2, 0.5),
    },
    '미토콘드리아는 세포 호흡으로 에너지를 만들어 내는 발전소예요. 근육세포에는 특히 많아요.',
  ),
  commonAnimalPlant(
    {
      id: 'ribosomes',
      nameKo: '리보솜',
      nameEn: 'Ribosomes',
      functionKo: '단백질을 만듭니다.',
      color: '#ffd0a8',
      shape: 'sphere',
      position: v(3.4, -4.3, 2.0),
      scale: v(0.3, 0.3, 0.3),
      labelAnchor: v(4.2, -4.3, 2.4),
      copies: 36,
      spread: 7.4,
    },
    '리보솜은 아주 작은 단백질 공장이에요. 세포질에 떠 있거나 거친 소포체에 붙어 있어요.',
  ),
  commonAnimalPlant(
    {
      id: 'rough-er',
      nameKo: '거친 소포체',
      nameEn: 'Rough ER',
      functionKo: '단백질을 접고 운반합니다.',
      color: '#e8b65a',
      shape: 'network',
      position: v(-2.4, 3.1, 0.2),
      scale: v(5.4, 4.0, 4.0),
      labelAnchor: v(-5.6, 4.5, 1.6),
      rotation: v(0.2, 0.6, 0.1),
    },
    '거친 소포체에는 리보솜이 붙어 있어 표면이 울퉁불퉁해요. 단백질을 접고 포장하는 통로예요.',
  ),
  commonAnimalPlant(
    {
      id: 'smooth-er',
      nameKo: '매끈한 소포체',
      nameEn: 'Smooth ER',
      functionKo: '지질을 만들고 해독합니다.',
      color: '#f0c674',
      shape: 'network',
      position: v(4.1, -2.4, -1.4),
      scale: v(4.6, 3.8, 3.8),
      labelAnchor: v(6.2, -1.4, -1.0),
      rotation: v(0.5, 0.1, 0.7),
    },
    '매끈한 소포체에는 리보솜이 없어 표면이 매끈해요. 지질을 만들고 독성 물질을 분해해요.',
  ),
  commonAnimalPlant(
    {
      id: 'golgi',
      nameKo: '골지체',
      nameEn: 'Golgi apparatus',
      functionKo: '단백질을 분류하고 포장합니다.',
      color: '#ffcf5c',
      shape: 'stack',
      position: v(3.8, 3.7, -1.2),
      scale: v(3.6, 2.2, 3.0),
      labelAnchor: v(6.1, 4.9, -1.2),
      rotation: v(0.2, 0.4, -0.3),
    },
    '골지체는 택배 분류 센터처럼 단백질을 종류별로 나누고 필요한 곳으로 보내요.',
  ),
  {
    id: 'lysosome',
    nameKo: '리소좀',
    nameEn: 'Lysosome',
    functionKo: '노폐물과 세포 소화를 담당합니다.',
    noteKo: '리소좀은 세포 안의 소화기관이에요. 낡은 소기관을 분해해 재활용하기도 해요.',
    cellTypes: ['animal'],
    color: '#ff8f7a',
    shape: 'sphere',
    position: v(-2.6, -4.4, 2.8),
    scale: v(0.82, 0.82, 0.82),
    labelAnchor: v(-4.8, -5.4, 3.4),
    copies: 6,
    spread: 5.6,
  },
  {
    id: 'centrosome',
    nameKo: '중심체',
    nameEn: 'Centrosome',
    functionKo: '세포 분열 때 방추사를 조직합니다.',
    noteKo: '중심체는 세포가 나뉠 때 염색체를 끌어당기는 방추사의 출발점이 돼요.',
    cellTypes: ['animal'],
    color: '#8fb6ff',
    shape: 'rod',
    position: v(-0.8, -1.0, -3.4),
    scale: v(0.4, 1.9, 0.4),
    labelAnchor: v(-1.5, 1.1, -4.2),
    copies: 2,
    spread: 0.9,
    rotation: v(0.4, 0, Math.PI / 2),
  },
  {
    id: 'chloroplast',
    nameKo: '엽록체',
    nameEn: 'Chloroplast',
    functionKo: '광합성으로 빛 에너지를 저장합니다.',
    noteKo: '엽록체 안의 초록색 색소인 엽록소가 빛을 흡수해 포도당을 만들어요.',
    cellTypes: ['plant'],
    color: '#8fd16a',
    shape: 'ellipsoid',
    position: v(4.9, 5.0, 2.6),
    scale: v(1.9, 1.0, 1.3),
    labelAnchor: v(6.8, 6.4, 3.4),
    copies: 10,
    spread: 6.8,
    rotation: v(0.2, 0.3, -0.4),
  },
  {
    id: 'central-vacuole',
    nameKo: '중심 액포',
    nameEn: 'Central vacuole',
    functionKo: '물을 저장하고 팽압을 유지합니다.',
    noteKo: '중심 액포가 물을 머금어 부풀면 세포가 팽팽해져요. 식물이 물을 잃으면 액포가 줄고 잎이 축 처져요.',
    cellTypes: ['plant'],
    color: '#7fd6e8',
    shape: 'vacuole',
    position: v(0.7, -0.2, 0),
    scale: v(10.8, 10.2, 10.4),
    labelAnchor: v(2.4, 4.4, 3.6),
    opacity: 0.24,
  },
];

const plantOverrides: Record<string, Partial<Pick<Organelle, 'position' | 'scale' | 'labelAnchor' | 'copies' | 'spread' | 'rotation'>>> = {
  nucleus: {
    position: v(-5.1, 3.0, 1.8),
    scale: v(4.5, 4.5, 4.5),
    labelAnchor: v(-6.5, 5.6, 2.6),
  },
  nucleolus: {
    position: v(-4.5, 3.5, 2.6),
    scale: v(1.4, 1.4, 1.4),
    labelAnchor: v(-3.0, 4.8, 3.6),
  },
  mitochondria: {
    position: v(-4.2, -4.4, 3.0),
    scale: v(1.0, 2.5, 1.0),
    labelAnchor: v(-5.5, -2.4, 4.2),
    copies: 4,
    spread: 5.2,
  },
  ribosomes: {
    position: v(3.5, 4.1, 4.2),
    scale: v(0.28, 0.28, 0.28),
    labelAnchor: v(4.6, 4.4, 4.6),
    copies: 30,
    spread: 6.6,
  },
  'rough-er': {
    position: v(-4.6, 0.8, 3.4),
    scale: v(4.4, 3.4, 3.2),
    labelAnchor: v(-6.8, 1.8, 4.4),
  },
  'smooth-er': {
    position: v(4.9, -3.4, 3.0),
    scale: v(3.9, 3.2, 3.2),
    labelAnchor: v(6.8, -2.2, 3.8),
  },
  golgi: {
    position: v(-2.2, -5.8, 2.2),
    scale: v(3.2, 2.0, 2.7),
    labelAnchor: v(-3.8, -7.2, 3.4),
  },
  'cell-membrane': {
    position: v(0, 0, 0),
    scale: v(19.3, 16.3, 17.3),
    labelAnchor: v(-6.2, 6.5, 4.6),
  },
  cytoplasm: {
    scale: v(18.4, 15.4, 16.4),
    labelAnchor: v(-6.6, -3.4, 4.8),
  },
};

function withPlantOverrides(organelle: Organelle): Organelle {
  const override = plantOverrides[organelle.id];
  if (!override) return organelle;
  return { ...organelle, ...override };
}

function cellTypeList(cellType: CellTypeId): Organelle[] {
  return ORGANELLES.filter((organelle) => organelle.cellTypes.includes(cellType)).map((organelle) =>
    cellType === 'plant' ? withPlantOverrides(organelle) : organelle,
  );
}

export const CELL_ORGANELLES: Record<CellTypeId, Organelle[]> = {
  animal: cellTypeList('animal'),
  plant: cellTypeList('plant'),
};

export function getOrganelles(cellType: CellTypeId): Organelle[] {
  return CELL_ORGANELLES[cellType];
}

export function getOrganelle(id: string, cellType?: CellTypeId): Organelle | undefined {
  if (cellType) return CELL_ORGANELLES[cellType].find((organelle) => organelle.id === id);
  return ORGANELLES.find((organelle) => organelle.id === id);
}

export function isBoundaryOrganelle(id: string): boolean {
  return id === 'cell-membrane' || id === 'cell-wall' || id === 'cytoplasm';
}

export function organellesForFunction(cellType: CellTypeId, ids: string[]): Organelle[] {
  const set = new Set(ids);
  return getOrganelles(cellType).filter((organelle) => set.has(organelle.id));
}
