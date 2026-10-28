import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Organelle } from '../bio/cellData';
import { mulberry32 } from '../bio/diffusion';
import type { CellTypeId } from '../bio/constants';

export interface OrganelleBuild {
  organelle: Organelle;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
}

interface BuildOptions {
  cellType: CellTypeId;
  boundaryShape?: 'ellipsoid' | 'rounded-box';
}

const BOUNDS: Record<CellTypeId, { x: number; y: number; z: number }> = {
  animal: { x: 8.1, y: 6.8, z: 7.4 },
  plant: { x: 7.9, y: 6.6, z: 7.0 },
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function materialFor(organelle: Organelle): THREE.MeshStandardMaterial {
  const transparent = typeof organelle.opacity === 'number' && organelle.opacity < 1;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(organelle.color),
    roughness: 0.48,
    metalness: 0.04,
    emissive: new THREE.Color(organelle.color),
    emissiveIntensity: 0,
    transparent,
    opacity: organelle.opacity ?? 1,
    depthWrite: !transparent || (organelle.opacity ?? 1) > 0.55,
    side: organelle.boundary ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (organelle.id === 'cell-membrane' || organelle.id === 'cell-wall') {
    material.roughness = 0.35;
    material.metalness = 0.08;
    material.side = THREE.DoubleSide;
  }
  if (organelle.id === 'cytoplasm') {
    material.side = THREE.DoubleSide;
    material.depthWrite = false;
  }
  return material;
}

function buildSphere(
  organelle: Organelle,
  material: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(1, 32, 22);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(
    Math.max(0.02, organelle.scale.x / 2),
    Math.max(0.02, organelle.scale.y / 2),
    Math.max(0.02, organelle.scale.z / 2),
  );
  return mesh;
}

function buildRod(organelle: Organelle, material: THREE.Material): THREE.Mesh {
  const radius = Math.max(0.08, organelle.scale.x / 2);
  const length = Math.max(0.02, organelle.scale.y - organelle.scale.x);
  const geometry = new THREE.CapsuleGeometry(radius, length, 8, 16);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(1, 1, Math.max(0.5, organelle.scale.z / organelle.scale.x));
  return mesh;
}

function buildStack(organelle: Organelle, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const layers = 5;
  for (let index = 0; index < layers; index += 1) {
    const t = index / (layers - 1);
    const width = organelle.scale.x * (0.68 + Math.sin(t * Math.PI) * 0.32);
    const depth = organelle.scale.z * (0.68 + Math.sin(t * Math.PI) * 0.32);
    const geometry = new THREE.SphereGeometry(1, 24, 12);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(width / 2, organelle.scale.y / (layers * 2.8), depth / 2);
    mesh.position.y = (t - 0.5) * organelle.scale.y;
    mesh.rotation.y = t * 0.2;
    group.add(mesh);
  }
  return group;
}

function buildNetwork(
  organelle: Organelle,
  material: THREE.MeshStandardMaterial,
  random: () => number,
): THREE.Group {
  const group = new THREE.Group();
  const count = 4;
  for (let index = 0; index < count; index += 1) {
    const points: THREE.Vector3[] = [];
    const segments = 5;
    const radius = 0.18 + random() * 0.09;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / (segments - 1) - 0.5) * Math.PI * 1.45 + index * 0.4;
      const x = Math.cos(angle) * (organelle.scale.x / 2) * (0.4 + random() * 0.4);
      const y = (random() - 0.5) * organelle.scale.y * 0.72;
      const z = Math.sin(angle) * (organelle.scale.z / 2) * (0.4 + random() * 0.5);
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 40, radius, 8, false);
    group.add(new THREE.Mesh(geometry, material));
  }
  if (organelle.id === 'rough-er') {
    const dotMaterial = material.clone();
    dotMaterial.color.set('#ffe3bd');
    dotMaterial.emissive.set('#ffb866');
    for (let index = 0; index < 22; index += 1) {
      const dotGeometry = new THREE.SphereGeometry(0.1, 8, 6);
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      const angle = random() * Math.PI * 2;
      const radius = 0.65 + random() * 0.85;
      dot.position.set(
        Math.cos(angle) * organelle.scale.x * 0.28 * radius,
        (random() - 0.5) * organelle.scale.y * 0.7,
        Math.sin(angle) * organelle.scale.z * 0.28 * radius,
      );
      group.add(dot);
    }
  }
  return group;
}

function buildRoundedBox(
  organelle: Organelle,
  material: THREE.Material,
): THREE.Mesh {
  const radius = Math.min(organelle.scale.x, organelle.scale.y, organelle.scale.z) * 0.16;
  const geometry = new RoundedBoxGeometry(
    organelle.scale.x,
    organelle.scale.y,
    organelle.scale.z,
    6,
    radius,
  );
  return new THREE.Mesh(geometry, material);
}

function buildCutawayVacuole(organelle: Organelle, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const sphere = buildSphere(organelle, material);
  group.add(sphere);
  const innerMaterial = material.clone();
  innerMaterial.color.offsetHSL(0, -0.05, -0.08);
  innerMaterial.opacity = 0.18;
  const inner = buildSphere(
    { ...organelle, scale: { x: organelle.scale.x * 0.82, y: organelle.scale.y * 0.82, z: organelle.scale.z * 0.82 } },
    innerMaterial,
  );
  group.add(inner);
  return group;
}

function scatterPosition(
  organelle: Organelle,
  index: number,
  cellType: CellTypeId,
  random: () => number,
): THREE.Vector3 {
  const copies = Math.max(1, organelle.copies ?? 1);
  const spread = organelle.spread ?? 4;
  const angle = index * 2.399963 + random() * 0.5;
  const radial = spread * Math.sqrt((index + 0.45) / copies);
  let x = organelle.position.x * 0.24 + Math.cos(angle) * radial;
  let y = organelle.position.y * 0.24 + Math.sin(angle * 1.63) * radial * 0.62;
  let z = organelle.position.z * 0.24 + Math.sin(angle) * radial;

  if (organelle.id === 'chloroplast') {
    const ringAngle = (index / copies) * Math.PI * 2 + random() * 0.35;
    x = Math.cos(ringAngle) * (5.8 + random() * 1.1);
    z = Math.sin(ringAngle) * (5.3 + random() * 1.0);
    y = (random() - 0.5) * 9.2;
  }

  const bounds = BOUNDS[cellType];
  x = THREE.MathUtils.clamp(x, -bounds.x, bounds.x);
  y = THREE.MathUtils.clamp(y, -bounds.y, bounds.y);
  z = THREE.MathUtils.clamp(z, -bounds.z, bounds.z);

  if (cellType === 'plant' && organelle.id !== 'central-vacuole' && organelle.id !== 'cell-wall') {
    const vacuoleRadius = 5.4;
    const distance = Math.hypot(x - 0.7, y + 0.2, z);
    if (distance < vacuoleRadius && !['cell-membrane', 'cytoplasm'].includes(organelle.id)) {
      const factor = (vacuoleRadius + 0.4) / Math.max(0.001, distance);
      x = 0.7 + (x - 0.7) * factor;
      y = -0.2 + (y + 0.2) * factor;
      z *= factor;
    }
  }
  return new THREE.Vector3(x, y, z);
}

export function buildOrganelle(
  organelle: Organelle,
  options: BuildOptions,
): OrganelleBuild {
  const group = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];
  const meshes: THREE.Mesh[] = [];
  const copies = Math.max(1, organelle.copies ?? 1);
  const random = mulberry32(hashString(organelle.id));

  const boundaryShape =
    options.cellType === 'plant' &&
    (organelle.id === 'cell-membrane' || organelle.id === 'cell-wall' || organelle.id === 'cytoplasm')
      ? 'rounded-box'
      : options.boundaryShape;

  for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
    const material = materialFor(organelle);
    materials.push(material);
    let object: THREE.Object3D;
    switch (organelle.shape) {
      case 'rod':
        object = buildRod(organelle, material);
        break;
      case 'stack':
        object = buildStack(organelle, material);
        break;
      case 'network':
        object = buildNetwork(organelle, material, random);
        break;
      case 'vacuole':
        object = buildCutawayVacuole(organelle, material);
        break;
      case 'rounded-box':
        object = buildRoundedBox(organelle, material);
        break;
      case 'sphere':
      case 'ellipsoid':
      default:
        if (boundaryShape === 'rounded-box') {
          object = buildRoundedBox(organelle, material);
        } else {
          object = buildSphere(organelle, material);
        }
        break;
    }

    const wrapper = new THREE.Group();
    wrapper.add(object);
    wrapper.userData.organelleId = organelle.id;
    wrapper.name = `organelle-${organelle.id}-${copyIndex}`;

    const position =
      copies > 1
        ? scatterPosition(organelle, copyIndex, options.cellType, random)
        : new THREE.Vector3(organelle.position.x, organelle.position.y, organelle.position.z);
    wrapper.position.copy(position);

    if (organelle.rotation) {
      wrapper.rotation.set(
        organelle.rotation.x + (copyIndex > 0 ? (random() - 0.5) * 0.8 : 0),
        organelle.rotation.y + (copyIndex > 0 ? (random() - 0.5) * 1.2 : 0),
        organelle.rotation.z + (copyIndex > 0 ? (random() - 0.5) * 0.7 : 0),
      );
    } else if (copyIndex > 0) {
      wrapper.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    }

    wrapper.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.userData.organelleId = organelle.id;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        meshes.push(mesh);
        if (organelle.id === 'cytoplasm') mesh.renderOrder = 1;
        else if (organelle.id === 'cell-membrane') mesh.renderOrder = 12;
        else if (organelle.id === 'cell-wall') mesh.renderOrder = 13;
        else if (organelle.id === 'central-vacuole') mesh.renderOrder = 2;
      }
    });

    group.add(wrapper);
  }

  return { organelle, group, meshes, materials };
}
