import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CellTypeId } from '../bio/constants';
import { WATER_PARTICLE_COUNT } from '../bio/constants';
import {
  advanceParticles,
  createParticleSimulation,
  resetParticleSimulation,
  type ParticleSimulation,
} from '../bio/diffusion';
import type { OsmosisSnapshot } from '../bio/osmosis';
import { SceneKit, addStageGlow, createGlowTexture, disposeObject3D } from './SceneKit';
import { ParticleField } from './ParticleField';

export interface OsmosisSceneOptions {
  cellType: CellTypeId;
  snapshot: OsmosisSnapshot;
  reducedMotion: boolean;
  playing: boolean;
}

const SOLUTION_LOW = new THREE.Color('#6fe6d4');
const SOLUTION_ISO = new THREE.Color('#74a7f2');
const SOLUTION_HIGH = new THREE.Color('#e0a35a');

function standardMaterial(
  color: string,
  opacity = 1,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity,
    ...options,
  });
}

function solutionColor(osmolarity: number): THREE.Color {
  if (osmolarity <= 300) {
    return SOLUTION_LOW.clone().lerp(SOLUTION_ISO, osmolarity / 300);
  }
  return SOLUTION_ISO.clone().lerp(SOLUTION_HIGH, (osmolarity - 300) / 300);
}

function visualScale(volumeRatio: number): number {
  const linear = Math.cbrt(Math.max(0.2, volumeRatio));
  return 1 + (linear - 1) * 1.7;
}

export class OsmosisScene {
  onUpdate?: (dt: number) => void;
  private readonly kit: SceneKit;
  private readonly particleField: ParticleField;
  private particles: ParticleSimulation = createParticleSimulation(WATER_PARTICLE_COUNT);
  private readonly cellRoot = new THREE.Group();
  private cellType: CellTypeId;
  private snapshot: OsmosisSnapshot;
  private reducedMotion: boolean;
  private playing: boolean;
  private beakerRoot: THREE.Group | null = null;
  private solutionMaterial: THREE.MeshBasicMaterial | null = null;
  private soluteMaterial: THREE.PointsMaterial | null = null;
  private membraneMaterial: THREE.MeshStandardMaterial | null = null;
  private innerCell: THREE.Group | null = null;
  private wallRoot: THREE.Group | null = null;
  private arrows: THREE.ArrowHelper[] = [];
  private arrowGroup = new THREE.Group();
  private burst: THREE.Mesh | null = null;
  private readonly solutionTexture = createGlowTexture('rgba(127, 214, 232, 0.22)');
  private elapsed = 0;
  private disposed = false;

  constructor(host: HTMLElement, options: OsmosisSceneOptions) {
    this.cellType = options.cellType;
    this.snapshot = options.snapshot;
    this.reducedMotion = options.reducedMotion;
    this.playing = options.playing;

    this.kit = new SceneKit(
      host,
      {
        cameraPosition: new THREE.Vector3(0, 4.4, 24.5),
        target: new THREE.Vector3(0, 0, 0),
        minDistance: 12,
        maxDistance: 42,
        autoRotate: false,
        reducedMotion: options.reducedMotion,
        fov: 39,
      },
      (dt) => this.tick(dt),
    );

    addStageGlow(this.kit.scene, { radius: 16, y: -4.6, opacity: 0.34 });
    this.kit.scene.add(this.cellRoot);
    this.kit.scene.add(this.arrowGroup);
    this.particleField = new ParticleField(WATER_PARTICLE_COUNT, 2.2);
    this.particleField.points.scale.set(1, 0.86, 1);
    this.kit.scene.add(this.particleField.points);
    this.particleField.update(this.particles);

    this.buildBeaker();
    this.buildCell();
    this.applySnapshot();
    this.particleField.setVisible(!this.reducedMotion);
    this.kit.start();
  }

  private buildBeaker(): void {
    if (this.beakerRoot) {
      this.kit.scene.remove(this.beakerRoot);
      disposeObject3D(this.beakerRoot);
    }
    const group = new THREE.Group();
    group.name = 'beaker';

    const glass = new THREE.MeshStandardMaterial({
      color: '#c9f4e8',
      roughness: 0.18,
      metalness: 0.22,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.05, 8.7, 64, 1, true),
      glass,
    );
    wall.position.y = 0.15;
    group.add(wall);

    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(6.05, 64),
      new THREE.MeshStandardMaterial({
        color: '#173129',
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: 0.72,
      }),
    );
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -4.2;
    group.add(bottom);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.07, 8, 80),
      new THREE.MeshStandardMaterial({
        color: '#bde6d8',
        roughness: 0.3,
        metalness: 0.45,
        transparent: true,
        opacity: 0.38,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 4.5;
    group.add(rim);

    this.solutionMaterial = new THREE.MeshBasicMaterial({
      color: solutionColor(this.snapshot.externalOsmolarity),
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const solution = new THREE.Mesh(
      new THREE.CylinderGeometry(5.98, 5.75, 8.05, 64),
      this.solutionMaterial,
    );
    solution.position.y = -0.15;
    solution.renderOrder = 3;
    group.add(solution);

    const soluteGeometry = new THREE.BufferGeometry();
    const count = 260;
    const positions = new Float32Array(count * 3);
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 5.7;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (random() - 0.5) * 7.8;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    soluteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.soluteMaterial = new THREE.PointsMaterial({
      color: '#ffd27a',
      size: 0.12,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: this.solutionTexture,
      alphaTest: 0.01,
    });
    const solute = new THREE.Points(soluteGeometry, this.soluteMaterial);
    solute.position.y = -0.1;
    group.add(solute);

    this.beakerRoot = group;
    this.kit.scene.add(group);
  }

  private buildCell(): void {
    for (const child of [...this.cellRoot.children]) disposeObject3D(child);
    this.cellRoot.clear();
    for (const child of [...this.arrowGroup.children]) disposeObject3D(child);
    this.arrowGroup.clear();
    this.innerCell = null;
    this.wallRoot = null;
    this.membraneMaterial = null;
    this.burst = null;
    this.arrows = [];

    if (this.cellType === 'animal') {
      this.buildAnimalCell();
    } else {
      this.buildPlantCell();
    }
    this.buildFlowArrows();
    this.applySnapshot();
  }

  private buildAnimalCell(): void {
    const group = new THREE.Group();
    this.membraneMaterial = standardMaterial('#7ee7d8', 0.18, {
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.28,
    });
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), this.membraneMaterial);
    membrane.scale.set(2.8, 2.6, 2.7);
    membrane.renderOrder = 10;
    group.add(membrane);

    const cytoplasm = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 22),
      standardMaterial('#cfe8d6', 0.07, { depthWrite: false, side: THREE.DoubleSide }),
    );
    cytoplasm.scale.set(2.7, 2.5, 2.6);
    group.add(cytoplasm);

    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 28, 20),
      standardMaterial('#b79cff', 0.86),
    );
    nucleus.position.set(0.72, 0.62, 0.18);
    group.add(nucleus);
    const nucleolus = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 12),
      standardMaterial('#7c5cd6'),
    );
    nucleolus.position.set(0.9, 0.8, 0.5);
    group.add(nucleolus);

    const mitoMaterial = standardMaterial('#e28a5b');
    const mitoPositions: [number, number, number, number][] = [
      [-1.45, -0.7, 0.55, 0.45],
      [0.2, -1.35, -0.35, -0.2],
      [1.55, 0.5, -0.75, 1.1],
      [-1.1, 1.2, -0.5, -0.8],
    ];
    for (const [x, y, z, rotation] of mitoPositions) {
      const mito = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.58, 6, 12), mitoMaterial);
      mito.position.set(x, y, z);
      mito.rotation.z = rotation;
      mito.rotation.x = rotation * 0.6;
      group.add(mito);
    }

    const lysoMaterial = standardMaterial('#ff8f7a');
    const lysoPositions: [number, number, number][] = [
      [-1.6, 0.5, -0.6],
      [0.3, 1.35, 0.8],
      [1.5, -1.0, 0.7],
      [-0.2, -0.4, -1.2],
    ];
    for (const [x, y, z] of lysoPositions) {
      const lyso = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lysoMaterial);
      lyso.position.set(x, y, z);
      group.add(lyso);
    }

    this.burst = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.1, 64),
      new THREE.MeshBasicMaterial({
        color: '#ff7b72',
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.burst.visible = false;
    this.burst.scale.setScalar(3.3);
    group.add(this.burst);

    this.innerCell = group;
    this.cellRoot.add(group);
  }

  private buildPlantCell(): void {
    const wallGroup = new THREE.Group();
    const wallMaterial = standardMaterial('#9fc7a4', 0.16, {
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.4,
    });
    const wall = new THREE.Mesh(new RoundedBoxGeometry(6.5, 5.9, 6.3, 6, 0.5), wallMaterial);
    wall.renderOrder = 11;
    wallGroup.add(wall);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(wall.geometry, 24),
      new THREE.LineBasicMaterial({
        color: '#b7e3bf',
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    wallGroup.add(edges);
    this.wallRoot = wallGroup;
    this.cellRoot.add(wallGroup);

    const inner = new THREE.Group();
    this.membraneMaterial = standardMaterial('#7ee7d8', 0.15, {
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.25,
    });
    const membrane = new THREE.Mesh(
      new RoundedBoxGeometry(5.85, 5.3, 5.7, 5, 0.44),
      this.membraneMaterial,
    );
    membrane.renderOrder = 10;
    const membraneEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(membrane.geometry, 30),
      new THREE.LineBasicMaterial({
        color: '#a6d4ff',
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    membrane.add(membraneEdges);
    inner.add(membrane);

    const cytoplasm = new THREE.Mesh(
      new RoundedBoxGeometry(5.66, 5.12, 5.52, 4, 0.4),
      standardMaterial('#cfe8d6', 0.06, { depthWrite: false, side: THREE.DoubleSide }),
    );
    inner.add(cytoplasm);

    const vacuole = new THREE.Mesh(
      new THREE.SphereGeometry(1, 36, 24),
      standardMaterial('#7fd6e8', 0.24, {
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    vacuole.scale.set(2.0, 1.92, 1.98);
    vacuole.position.set(0.15, -0.05, 0);
    inner.add(vacuole);

    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 26, 18),
      standardMaterial('#b79cff', 0.9),
    );
    nucleus.position.set(-1.85, 1.35, 0.78);
    inner.add(nucleus);
    const nucleolus = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 10),
      standardMaterial('#7c5cd6'),
    );
    nucleolus.position.set(-1.65, 1.6, 1.05);
    inner.add(nucleolus);

    const chloroplastMaterial = standardMaterial('#8fd16a', 0.95, { roughness: 0.4 });
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      const chloroplast = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 12),
        chloroplastMaterial,
      );
      chloroplast.scale.set(0.55, 0.24, 0.36);
      chloroplast.position.set(Math.cos(angle) * 2.3, Math.sin(angle * 1.8) * 1.85, Math.sin(angle) * 2.25);
      chloroplast.rotation.set(angle * 0.4, angle, angle * 0.7);
      inner.add(chloroplast);
    }

    const mitoMaterial = standardMaterial('#e28a5b');
    for (let index = 0; index < 3; index += 1) {
      const angle = index * 2.2 + 0.8;
      const mito = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.45, 5, 10), mitoMaterial);
      mito.position.set(Math.cos(angle) * 2.1, 1.9 - index * 1.5, Math.sin(angle) * 1.9);
      mito.rotation.z = angle;
      inner.add(mito);
    }

    this.innerCell = inner;
    this.cellRoot.add(inner);

    const burstMaterial = new THREE.MeshBasicMaterial({
      color: '#ff7b72',
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.burst = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.12, 64), burstMaterial);
    this.burst.visible = false;
    this.cellRoot.add(this.burst);
  }

  private buildFlowArrows(): void {
    const radius = this.cellType === 'plant' ? 4.15 : 3.6;
    const color = new THREE.Color('#9ff5e6');
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const origin = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle * 2) * 0.5,
        Math.sin(angle) * radius,
      );
      const direction = origin.clone().multiplyScalar(-1).normalize();
      const arrow = new THREE.ArrowHelper(direction, origin, 1.05, color, 0.34, 0.2);
      arrow.visible = false;
      arrow.userData.origin = origin;
      arrow.userData.angle = angle;
      arrow.userData.radius = radius;
      this.arrowGroup.add(arrow);
      this.arrows.push(arrow);
    }
  }

  setCellType(cellType: CellTypeId): void {
    if (this.cellType === cellType) return;
    this.cellType = cellType;
    this.buildCell();
    this.particles = resetParticleSimulation(this.particles);
    this.particleField.update(this.particles);
  }

  setSnapshot(snapshot: OsmosisSnapshot): void {
    this.snapshot = snapshot;
    this.applySnapshot();
  }

  private applySnapshot(): void {
    const scale = visualScale(this.snapshot.volumeRatio);
    if (this.cellType === 'animal') {
      if (this.innerCell) this.innerCell.scale.setScalar(scale);
      if (this.membraneMaterial) {
        const lysed = this.snapshot.state === 'lysed';
        const crenated = this.snapshot.state === 'crenated';
        this.membraneMaterial.color.set(lysed ? '#ff7b72' : crenated ? '#e8b65a' : '#7ee7d8');
        this.membraneMaterial.opacity = lysed ? 0.12 : 0.18;
      }
    } else if (this.innerCell) {
      const constrained = Math.min(scale, 1.07);
      this.innerCell.scale.setScalar(constrained);
      if (this.membraneMaterial) {
        this.membraneMaterial.color.set(
          this.snapshot.state === 'plasmolyzed' ? '#79a8ff' : '#7ee7d8',
        );
      }
    }

    if (this.burst) {
      this.burst.visible = this.snapshot.state === 'lysed';
      const size = this.cellType === 'animal' ? 3.35 : 2.7;
      this.burst.scale.setScalar(this.snapshot.state === 'lysed' ? size : 1);
      this.burst.lookAt(this.kit.camera.position);
    }

    if (this.solutionMaterial) {
      this.solutionMaterial.color.copy(solutionColor(this.snapshot.externalOsmolarity));
    }
    if (this.soluteMaterial) {
      const concentration = Math.min(1, this.snapshot.externalOsmolarity / 600);
      this.soluteMaterial.opacity = 0.06 + concentration * 0.55;
      this.soluteMaterial.size = 0.07 + concentration * 0.1;
    }

    const flow = this.snapshot.flux;
    const showArrows = Math.abs(flow) > 0.0015 && !this.snapshot.stable;
    const inward = flow > 0;
    const ringRadius = this.cellType === 'plant' ? 4.15 : 3.6;
    for (const arrow of this.arrows) {
      arrow.visible = showArrows;
      if (!showArrows) continue;
      const angle = arrow.userData.angle as number;
      const direction = inward
        ? new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle)).normalize()
        : new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
      arrow.setDirection(direction);
      const radial = inward ? ringRadius - 0.1 : ringRadius + 0.85;
      arrow.position.set(
        Math.cos(angle) * radial,
        Math.sin(angle * 2) * 0.5,
        Math.sin(angle) * radial,
      );
      arrow.setColor(new THREE.Color(inward ? '#9ff5e6' : '#ffcf5c'));
    }
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  resetParticles(): void {
    this.particles = resetParticleSimulation(this.particles);
    this.particleField.update(this.particles);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.particleField.setVisible(!reduced);
    this.kit.setReducedMotion(reduced);
    this.applySnapshot();
  }

  resize(): void {
    this.kit.resize();
  }

  private tick(dt: number): void {
    if (this.disposed) return;
    this.onUpdate?.(dt);
    this.elapsed += dt;
    if (this.playing && !this.reducedMotion) {
      advanceParticles(this.particles, dt, this.snapshot.flux, this.snapshot.volumeRatio);
      this.particleField.update(this.particles);
    }
    if (this.burst?.visible) {
      const base = this.cellType === 'animal' ? 3.35 : 2.7;
      const scale = base + Math.sin(this.elapsed * 3) * 0.07;
      this.burst.scale.setScalar(scale);
      this.burst.lookAt(this.kit.camera.position);
      (this.burst.material as THREE.MeshBasicMaterial).opacity =
        0.18 + Math.abs(Math.sin(this.elapsed * 2.2)) * 0.1;
    }
    if (this.arrowGroup.visible) {
      this.arrowGroup.children.forEach((child, index) => {
        const arrow = child as THREE.ArrowHelper;
        if (arrow.visible) {
          const material = arrow.line.material as THREE.LineBasicMaterial;
          material.opacity = 0.42 + Math.sin(this.elapsed * 2.4 + index) * 0.12;
          material.transparent = true;
        }
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.particleField.dispose();
    this.solutionTexture.dispose();
    this.kit.dispose();
  }
}
