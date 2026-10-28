import * as THREE from 'three';
import { chromatidFrames } from '../bio/chromosomes';
import { stageAt } from '../bio/mitosis';
import { SceneKit, addStageGlow, disposeObject3D } from './SceneKit';
import { ChromosomeField } from './ChromosomeField';

export interface MitosisSceneOptions {
  stageIndex: number;
  progress: number;
  reducedMotion: boolean;
}

function membraneMaterial(color: string, opacity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export class MitosisScene {
  onUpdate?: (dt: number) => void;
  private readonly kit: SceneKit;
  private readonly chromosomes = new ChromosomeField();
  private readonly cellRoot = new THREE.Group();
  private readonly membraneMaterial: THREE.MeshStandardMaterial;
  private readonly leftMembraneMaterial: THREE.MeshStandardMaterial;
  private readonly rightMembraneMaterial: THREE.MeshStandardMaterial;
  private readonly singleMembrane: THREE.Mesh;
  private readonly leftCell: THREE.Mesh;
  private readonly rightCell: THREE.Mesh;
  private readonly mainNucleus: THREE.Mesh;
  private readonly mainNucleusMaterial: THREE.MeshStandardMaterial;
  private readonly leftNucleus: THREE.Mesh;
  private readonly rightNucleus: THREE.Mesh;
  private readonly leftNucleusMaterial: THREE.MeshStandardMaterial;
  private readonly rightNucleusMaterial: THREE.MeshStandardMaterial;
  private readonly constriction: THREE.Mesh;
  private readonly constrictionMaterial: THREE.MeshBasicMaterial;
  private readonly spindle: THREE.LineSegments;
  private readonly spindleGeometry: THREE.BufferGeometry;
  private readonly spindlePositions: Float32Array;
  private readonly spindleMaterial: THREE.LineBasicMaterial;
  private readonly poleGroups: THREE.Group[] = [];
  private readonly poleMaterial: THREE.LineBasicMaterial;
  private stageIndex: number;
  private progress: number;
  private disposed = false;

  constructor(host: HTMLElement, options: MitosisSceneOptions) {
    this.stageIndex = options.stageIndex;
    this.progress = options.progress;

    this.kit = new SceneKit(
      host,
      {
        cameraPosition: new THREE.Vector3(9.5, 6.5, 25.5),
        target: new THREE.Vector3(0, 0.1, 0),
        minDistance: 15,
        maxDistance: 52,
        autoRotate: false,
        reducedMotion: options.reducedMotion,
        fov: 39,
      },
      (dt) => this.onUpdate?.(dt),
    );
    addStageGlow(this.kit.scene, { radius: 15, y: -5.8, opacity: 0.34 });
    this.kit.scene.add(this.cellRoot);

    this.membraneMaterial = membraneMaterial('#7ee7d8', 0.18);
    this.singleMembrane = new THREE.Mesh(new THREE.SphereGeometry(4.55, 48, 32), this.membraneMaterial);
    this.singleMembrane.renderOrder = 10;
    this.cellRoot.add(this.singleMembrane);

    const cytoplasm = new THREE.Mesh(
      new THREE.SphereGeometry(4.4, 32, 22),
      new THREE.MeshStandardMaterial({
        color: '#cfe8d6',
        roughness: 0.55,
        transparent: true,
        opacity: 0.025,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.singleMembrane.add(cytoplasm);

    this.leftMembraneMaterial = membraneMaterial('#7ee7d8', 0);
    this.rightMembraneMaterial = membraneMaterial('#7ee7d8', 0);
    const cellGeometry = new THREE.SphereGeometry(3.28, 40, 28);
    this.leftCell = new THREE.Mesh(cellGeometry, this.leftMembraneMaterial);
    this.rightCell = new THREE.Mesh(cellGeometry, this.rightMembraneMaterial);
    this.leftCell.renderOrder = 10;
    this.rightCell.renderOrder = 10;
    this.cellRoot.add(this.leftCell, this.rightCell);

    this.mainNucleusMaterial = membraneMaterial('#b79cff', 0.16);
    this.mainNucleus = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 36, 24),
      this.mainNucleusMaterial,
    );
    this.mainNucleus.renderOrder = 6;
    this.cellRoot.add(this.mainNucleus);

    this.leftNucleusMaterial = membraneMaterial('#b79cff', 0);
    this.rightNucleusMaterial = membraneMaterial('#b79cff', 0);
    const nucleusGeometry = new THREE.SphereGeometry(2.0, 32, 22);
    this.leftNucleus = new THREE.Mesh(nucleusGeometry, this.leftNucleusMaterial);
    this.rightNucleus = new THREE.Mesh(nucleusGeometry, this.rightNucleusMaterial);
    this.leftNucleus.renderOrder = 6;
    this.rightNucleus.renderOrder = 6;
    this.cellRoot.add(this.leftNucleus, this.rightNucleus);

    this.constrictionMaterial = new THREE.MeshBasicMaterial({
      color: '#b7e3bf',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.constriction = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.14, 10, 80),
      this.constrictionMaterial,
    );
    this.constriction.rotation.y = Math.PI / 2;
    this.cellRoot.add(this.constriction);

    this.spindlePositions = new Float32Array(8 * 2 * 3);
    this.spindleGeometry = new THREE.BufferGeometry();
    this.spindleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.spindlePositions, 3),
    );
    this.spindleMaterial = new THREE.LineBasicMaterial({
      color: '#cfe8d6',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.spindle = new THREE.LineSegments(this.spindleGeometry, this.spindleMaterial);
    this.spindle.frustumCulled = false;
    this.cellRoot.add(this.spindle);

    this.poleMaterial = new THREE.LineBasicMaterial({
      color: '#d8b36a',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (const poleX of [-4.72, 4.72]) {
      const points: number[] = [];
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2;
        points.push(
          poleX,
          0,
          0,
          poleX + Math.cos(angle) * 0.34,
          Math.sin(angle) * 0.34,
          Math.sin(angle * 1.7) * 0.12,
        );
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const lines = new THREE.LineSegments(geometry, this.poleMaterial);
      const group = new THREE.Group();
      group.add(lines);
      this.cellRoot.add(group);
      this.poleGroups.push(group);
    }

    this.cellRoot.add(this.chromosomes.group);
    this.applyStage();
    this.kit.start();
  }

  private applyStage(): void {
    const stage = stageAt(this.stageIndex);
    const p = Math.min(1, Math.max(0, this.progress));
    const frames = chromatidFrames(this.stageIndex, p);
    this.chromosomes.update(frames);

    const twoCellOpacity = this.stageIndex === 5 ? p * 0.16 : 0;
    this.membraneMaterial.opacity = this.stageIndex === 5 ? (1 - p) * 0.18 : 0.18;
    this.leftMembraneMaterial.opacity = twoCellOpacity;
    this.rightMembraneMaterial.opacity = twoCellOpacity;

    const cellScaleX =
      this.stageIndex === 3
        ? 1 + p * 0.14
        : this.stageIndex === 4
          ? 1.14 + p * 0.1
          : 1;
    const cellScaleYZ = this.stageIndex >= 3 ? 1 - p * 0.02 : 1;
    this.singleMembrane.scale.set(cellScaleX, cellScaleYZ, cellScaleYZ);
    this.singleMembrane.visible = this.stageIndex < 5 ? true : p < 0.55;

    const separation = 2.25 + p * 1.25;
    this.leftCell.position.set(-separation, 0, 0);
    this.rightCell.position.set(separation, 0, 0);
    this.leftCell.visible = this.stageIndex === 5;
    this.rightCell.visible = this.stageIndex === 5;

    const mainNucleusOpacity =
      this.stageIndex === 0
        ? 0.22
        : this.stageIndex === 1
          ? 0.22 * (1 - p)
          : 0;
    this.mainNucleusMaterial.opacity = mainNucleusOpacity;
    this.mainNucleus.visible = mainNucleusOpacity > 0.01;
    this.mainNucleus.scale.setScalar(this.stageIndex === 0 ? 1 : 1 - p * 0.08);

    const sideNucleusOpacity =
      this.stageIndex === 4 ? p * 0.26 : this.stageIndex === 5 ? 0.26 : 0;
    this.leftNucleusMaterial.opacity = sideNucleusOpacity;
    this.rightNucleusMaterial.opacity = sideNucleusOpacity;
    const nucleusOffset =
      this.stageIndex === 4 ? 2.0 + p * 0.3 : this.stageIndex === 5 ? 2.25 + p * 1.25 : 2.2;
    this.leftNucleus.position.set(-nucleusOffset, 0, 0);
    this.rightNucleus.position.set(nucleusOffset, 0, 0);
    this.leftNucleus.visible = sideNucleusOpacity > 0.01;
    this.rightNucleus.visible = sideNucleusOpacity > 0.01;

    const constrictionOpacity =
      this.stageIndex === 4 ? Math.min(0.52, Math.max(0, (p - 0.1) * 0.7)) : 0;
    this.constrictionMaterial.opacity = constrictionOpacity;
    this.constriction.visible = constrictionOpacity > 0.01;
    this.constriction.scale.set(
      this.stageIndex === 4 ? 1 - p * 0.08 : 1,
      Math.max(0.2, 1 - p * 0.55),
      Math.max(0.2, 1 - p * 0.55),
    );

    let spindleOpacity = 0;
    if (this.stageIndex === 1) spindleOpacity = p * 0.18;
    else if (this.stageIndex === 2) spindleOpacity = 0.3;
    else if (this.stageIndex === 3) spindleOpacity = 0.42 * (1 - p * 0.25);
    else if (this.stageIndex === 4) spindleOpacity = 0.3 * (1 - p);
    this.spindleMaterial.opacity = spindleOpacity;
    this.spindle.visible = spindleOpacity > 0.01;
    this.poleMaterial.opacity = Math.min(0.6, spindleOpacity * 1.6);
    for (const group of this.poleGroups) group.visible = spindleOpacity > 0.01;

    for (let index = 0; index < 8; index += 1) {
      const frame = frames[index];
      const poleX = frame.x < 0 ? -4.72 : 4.72;
      const offset = index * 6;
      this.spindlePositions[offset] = poleX;
      this.spindlePositions[offset + 1] = 0;
      this.spindlePositions[offset + 2] = 0;
      this.spindlePositions[offset + 3] = frame.x;
      this.spindlePositions[offset + 4] = frame.y;
      this.spindlePositions[offset + 5] = frame.z;
    }
    (this.spindleGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    this.singleMembrane.userData.stage = stage.cellShape;
  }

  setStage(stageIndex: number, progress: number): void {
    this.stageIndex = Math.min(5, Math.max(0, Math.floor(stageIndex)));
    this.progress = Math.min(1, Math.max(0, progress));
    this.applyStage();
  }

  setReducedMotion(reduced: boolean): void {
    this.kit.setReducedMotion(reduced);
  }

  resetView(): void {
    this.kit.resetView();
  }

  resize(): void {
    this.kit.resize();
  }

  dispose(): void {
    this.disposed = true;
    this.chromosomes.dispose();
    disposeObject3D(this.cellRoot);
    this.kit.dispose();
  }
}
