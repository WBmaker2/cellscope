import * as THREE from 'three';
import { getOrganelles, isBoundaryOrganelle, type Organelle } from '../bio/cellData';
import type { CellTypeId } from '../bio/constants';
import { SceneKit, addStageGlow, createGlowTexture, disposeObject3D } from './SceneKit';
import { buildOrganelle, type OrganelleBuild } from './OrganelleMesh';
import { LabelLayer } from './Labels';
import { CellClipper } from './Clipping';

export interface CellSceneOptions {
  cellType: CellTypeId;
  selectedOrganelleId: string | null;
  clipping: number;
  showLabels: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  onSelect?: (id: string | null) => void;
}

export class CellScene {
  private readonly host: HTMLElement;
  private readonly kit: SceneKit;
  private readonly clipper = new CellClipper();
  private readonly labels: LabelLayer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly selectionHalo: THREE.Sprite;
  private readonly selectionTexture: THREE.CanvasTexture;
  private readonly onSelect?: (id: string | null) => void;
  private root: THREE.Group | null = null;
  private builds = new Map<string, OrganelleBuild>();
  private selectableMeshes: THREE.Mesh[] = [];
  private cellType: CellTypeId;
  private selectedId: string | null;
  private clipping: number;
  private showLabels: boolean;
  private pointerDown = { x: 0, y: 0, id: -1 };
  private lastHover = 0;
  private disposed = false;
  private elapsed = 0;

  constructor(host: HTMLElement, options: CellSceneOptions) {
    this.host = host;
    this.cellType = options.cellType;
    this.selectedId = options.selectedOrganelleId;
    this.clipping = options.clipping;
    this.showLabels = options.showLabels;
    this.onSelect = options.onSelect;

    this.kit = new SceneKit(
      host,
      {
        cameraPosition: new THREE.Vector3(0, 5.4, 32.5),
        target: new THREE.Vector3(0, 0, 0),
        minDistance: 15,
        maxDistance: 52,
        autoRotate: options.autoRotate,
        reducedMotion: options.reducedMotion,
        autoRotateSpeed: 0.42,
      },
      (dt) => this.tick(dt),
    );

    addStageGlow(this.kit.scene, { radius: 17, y: -8.7, opacity: 0.38 });
    this.kit.scene.add(this.clipper.capGroup);

    this.selectionTexture = createGlowTexture('rgba(199, 243, 107, 0.55)');
    this.selectionHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.selectionTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.72,
      }),
    );
    this.selectionHalo.visible = false;
    this.selectionHalo.renderOrder = 30;
    this.kit.scene.add(this.selectionHalo);

    this.labels = new LabelLayer(host);
    this.labels.setShowAll(options.showLabels);

    this.build();

    const canvas = this.kit.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('contextmenu', this.preventContextMenu);

    this.kit.start();
  }

  private preventContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
    if (moved > 7) return;
    const picked = this.pick(event);
    this.setSelected(picked);
    this.onSelect?.(picked);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const now = performance.now();
    if (now - this.lastHover < 70) return;
    this.lastHover = now;
    const picked = this.pick(event);
    this.kit.renderer.domElement.style.cursor = picked ? 'pointer' : 'grab';
  };

  private handlePointerLeave = (): void => {
    this.kit.renderer.domElement.style.cursor = 'grab';
  };

  private pick(event: PointerEvent): string | null {
    const rect = this.kit.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.kit.camera);
    const hits = this.raycaster.intersectObjects(this.selectableMeshes, false);
    if (!hits.length) return null;
    const interior = hits.find((hit) => {
      const id = hit.object.userData.organelleId as string | undefined;
      return id ? !isBoundaryOrganelle(id) : false;
    });
    if (interior) return (interior.object.userData.organelleId as string) ?? null;
    const wall = hits.find((hit) => hit.object.userData.organelleId === 'cell-wall');
    if (wall) return 'cell-wall';
    const membrane = hits.find((hit) => hit.object.userData.organelleId === 'cell-membrane');
    if (membrane) return 'cell-membrane';
    return null;
  }

  private tick(dt: number): void {
    if (this.disposed) return;
    this.elapsed += dt;
    this.labels.update(this.kit.camera);
    if (this.selectedId && this.selectionHalo.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 3.2) * 0.045;
      const base = this.selectionHalo.userData.baseScale as number | undefined;
      if (base) this.selectionHalo.scale.setScalar(base * pulse);
      const material = this.selectionHalo.material as THREE.SpriteMaterial;
      material.opacity = 0.62 + Math.sin(this.elapsed * 2.6) * 0.1;
      const build = this.builds.get(this.selectedId);
      if (build) {
        for (const materialItem of build.materials) {
          materialItem.emissiveIntensity = 0.32 + Math.sin(this.elapsed * 3.2) * 0.12;
        }
      }
    }
  }

  private build(): void {
    if (this.root) {
      this.kit.scene.remove(this.root);
      disposeObject3D(this.root);
    }
    this.builds.clear();
    this.selectableMeshes = [];
    const root = new THREE.Group();
    root.name = `cell-${this.cellType}`;

    for (const organelle of getOrganelles(this.cellType)) {
      const build = buildOrganelle(organelle, { cellType: this.cellType });
      this.builds.set(organelle.id, build);
      this.selectableMeshes.push(...build.meshes);
      root.add(build.group);
    }

    this.root = root;
    this.kit.scene.add(root);
    this.clipper.setCellType(this.cellType);
    this.clipper.setProgress(this.clipping);
    this.clipper.registerMaterials(root);
    this.applyCutawayMaterials();
    this.labels.setItems(
      getOrganelles(this.cellType)
        .filter((organelle) => organelle.id !== 'cytoplasm')
        .map((organelle) => ({
          id: organelle.id,
          nameKo: organelle.nameKo,
          color: organelle.color,
          anchor: organelle.labelAnchor,
        })),
    );
    if (this.selectedId && !this.builds.has(this.selectedId)) this.selectedId = null;
    this.setSelected(this.selectedId);
  }

  private applyCutawayMaterials(): void {
    const active = this.clipping > 0.03;
    for (const [id, build] of this.builds) {
      if (!['cell-membrane', 'cell-wall', 'cytoplasm'].includes(id)) continue;
      const base = build.organelle.opacity ?? 0.2;
      for (const material of build.materials) {
        if (id === 'cytoplasm') {
          material.opacity = active ? 0.035 : base;
        } else {
          material.opacity = active ? Math.min(base, 0.055) : base;
        }
        material.depthWrite = false;
      }
    }
  }

  setSelected(id: string | null, options: { silent?: boolean } = {}): void {
    if (id && !this.builds.has(id)) id = null;
    this.selectedId = id;
    this.labels.setSelected(id);
    for (const [organelleId, build] of this.builds) {
      for (const material of build.materials) {
        material.emissiveIntensity = organelleId === id ? 0.4 : 0;
      }
    }
    const build = id ? this.builds.get(id) : null;
    if (build) {
      const anchor = build.organelle.labelAnchor;
      this.selectionHalo.position.set(anchor.x, anchor.y, anchor.z);
      const scale = Math.max(build.organelle.scale.x, build.organelle.scale.y, build.organelle.scale.z);
      const base = Math.min(7, Math.max(2.2, scale * 1.3));
      this.selectionHalo.userData.baseScale = base;
      this.selectionHalo.scale.setScalar(base);
      this.selectionHalo.visible = true;
    } else {
      this.selectionHalo.visible = false;
    }
    if (!options.silent) {
      this.kit.renderer.domElement.setAttribute(
        'aria-label',
        id ? `세포 모형, ${this.selectedName(id)} 선택됨` : '세포 모형, 선택된 소기관 없음',
      );
    }
  }

  private selectedName(id: string): string {
    return this.builds.get(id)?.organelle.nameKo ?? id;
  }

  setCellType(cellType: CellTypeId): void {
    if (this.cellType === cellType) return;
    this.cellType = cellType;
    this.selectedId = null;
    this.build();
  }

  setClipping(value: number): void {
    this.clipping = Math.min(1, Math.max(0, value));
    this.clipper.setProgress(this.clipping);
    this.applyCutawayMaterials();
  }

  setShowLabels(show: boolean): void {
    this.showLabels = show;
    this.labels.setShowAll(show);
  }

  setAutoRotate(enabled: boolean): void {
    this.kit.setAutoRotate(enabled);
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

  getOrganelle(id: string): Organelle | undefined {
    return this.builds.get(id)?.organelle;
  }

  dispose(): void {
    this.disposed = true;
    const canvas = this.kit.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.labels.dispose();
    this.kit.scene.remove(this.selectionHalo);
    (this.selectionHalo.material as THREE.SpriteMaterial).dispose();
    this.selectionTexture.dispose();
    this.kit.dispose();
  }
}
