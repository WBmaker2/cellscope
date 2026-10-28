import * as THREE from 'three';
import type { CellTypeId } from '../bio/constants';

interface CellExtents {
  x: number;
  y: number;
  z: number;
}

const EXTENTS: Record<CellTypeId, CellExtents> = {
  animal: { x: 10, y: 8.5, z: 9 },
  plant: { x: 10.5, y: 9, z: 9.5 },
};

const COLORS: Record<CellTypeId, string> = {
  animal: '#7ee7d8',
  plant: '#9fc7a4',
};

export class CellClipper {
  readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100);
  readonly capGroup = new THREE.Group();
  private cellType: CellTypeId = 'animal';
  private progress = 0;
  private readonly materials: THREE.Material[] = [];

  constructor() {
    this.capGroup.name = 'cross-section-cap';
    this.capGroup.visible = false;
    this.capGroup.renderOrder = 20;
  }

  registerMaterials(root: THREE.Object3D): void {
    this.materials.length = 0;
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material) continue;
        material.clippingPlanes = [this.plane];
        material.clipShadows = true;
        this.materials.push(material);
      }
    });
  }

  setCellType(cellType: CellTypeId): void {
    this.cellType = cellType;
    this.updateCap();
  }

  setProgress(progress: number): void {
    this.progress = Math.min(1, Math.max(0, progress));
    this.updateCap();
  }

  getConstant(): number {
    return this.plane.constant;
  }

  private updateCap(): void {
    const extents = EXTENTS[this.cellType];
    const constant = extents.z * (1 - this.progress);
    this.plane.constant = constant;
    const visible = this.progress > 0.015;
    this.capGroup.visible = visible;
    if (!visible) return;

    const factor = Math.sqrt(Math.max(0.001, 1 - (constant / extents.z) ** 2));
    const xRadius = extents.x * factor;
    const yRadius = extents.y * factor;
    const z = constant + 0.06;
    this.capGroup.position.set(0, 0, z);
    for (const child of [...this.capGroup.children]) {
      const renderable = child as THREE.Mesh;
      renderable.geometry?.dispose();
      const childMaterial = renderable.material;
      if (Array.isArray(childMaterial)) childMaterial.forEach((item) => item.dispose());
      else childMaterial?.dispose();
    }
    this.capGroup.clear();

    const color = COLORS[this.cellType];
    const capMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      clippingPlanes: [],
    });

    if (this.cellType === 'animal') {
      const geometry = new THREE.CircleGeometry(1, 72);
      const mesh = new THREE.Mesh(geometry, capMaterial);
      mesh.scale.set(xRadius, yRadius, 1);
      this.capGroup.add(mesh);

      const borderMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const points: THREE.Vector3[] = [];
      for (let index = 0; index <= 96; index += 1) {
        const angle = (index / 96) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * xRadius, Math.sin(angle) * yRadius, 0.01));
      }
      const border = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), borderMaterial);
      this.capGroup.add(border);

      for (let ring = 1; ring <= 2; ring += 1) {
        const ringPoints: THREE.Vector3[] = [];
        const scale = ring / 3;
        for (let index = 0; index <= 64; index += 1) {
          const angle = (index / 64) * Math.PI * 2;
          ringPoints.push(
            new THREE.Vector3(
              Math.cos(angle) * xRadius * scale,
              Math.sin(angle) * yRadius * scale,
              0.01,
            ),
          );
        }
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(ringPoints),
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.16,
            depthWrite: false,
          }),
        );
        this.capGroup.add(line);
      }
    } else {
      const shape = roundedRectShape(xRadius, yRadius, Math.min(xRadius, yRadius) * 0.18);
      const geometry = new THREE.ShapeGeometry(shape, 24);
      const mesh = new THREE.Mesh(geometry, capMaterial);
      this.capGroup.add(mesh);

      const borderPoints = shape.getPoints(18).map((point) => new THREE.Vector3(point.x, point.y, 0.01));
      borderPoints.push(borderPoints[0].clone());
      const border = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(borderPoints),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      );
      this.capGroup.add(border);
    }

    this.capGroup.position.set(0, 0, z);
  }
}

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width;
  const y = -height;
  const right = width;
  const top = height;
  const r = Math.min(radius, width, height);
  shape.moveTo(x + r, y);
  shape.lineTo(right - r, y);
  shape.quadraticCurveTo(right, y, right, y + r);
  shape.lineTo(right, top - r);
  shape.quadraticCurveTo(right, top, right - r, top);
  shape.lineTo(x + r, top);
  shape.quadraticCurveTo(x, top, x, top - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}
