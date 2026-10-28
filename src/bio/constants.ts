export type CellTypeId = 'animal' | 'plant';

export const INITIAL_INTERNAL_OSMOLARITY = 300;
export const ISOTONIC_OSMOLARITY = 300;
export const MIN_EXTERNAL_OSMOLARITY = 0;
export const MAX_EXTERNAL_OSMOLARITY = 600;

export const WATER_PERMEABILITY = 0.004;
export const OSMOSIS_RATE_SCALE = 0.075;

export const ANIMAL_LYSIS_VOLUME = 1.45;
export const ANIMAL_CRENATION_VOLUME = 0.65;
export const PLANT_MAX_VOLUME = 1.12;
export const PLANT_PLASMOLYSIS_VOLUME = 0.82;
export const PLANT_MIN_VOLUME = 0.72;

export const OSMOSIS_FIXED_DT = 1 / 60;
export const OSMOSIS_STABLE_FLUX = 0.0015;

export const MAX_PARTICLES = 600;
export const WATER_PARTICLE_COUNT = 360;
export const PARTICLE_SEED = 20261028;

export const CHROMOSOME_PAIRS = 2;
export const CHROMOSOME_COUNT = CHROMOSOME_PAIRS * 2;
export const CHROMATID_COUNT = CHROMOSOME_COUNT * 2;
export const HUMAN_CHROMOSOME_COUNT = 46;
