import * as THREE from 'three';
import { CHROMATID_SPECS, type ChromatidFrame } from '../bio/chromosomes';

interface ChromatidObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  centromere: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  centromereMaterial: THREE.MeshStandardMaterial;
}

export class ChromosomeField {
  readonly group = new THREE.Group();
  private readonly objects: ChromatidObject[] = [];

  constructor() {
    for (const spec of CHROMATID_SPECS) {
      const material = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.48,
        metalness: 0.08,
        emissive: new THREE.Color(spec.color),
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: 1,
      });
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 8, 16), material);
      group.add(mesh);

      const centromereMaterial = new THREE.MeshStandardMaterial({
        color: '#f7f2df',
        roughness: 0.4,
        emissive: new THREE.Color('#f7f2df'),
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 1,
      });
      const centromere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), centromereMaterial);
      group.add(centromere);

      this.group.add(group);
      this.objects.push({ group, mesh, centromere, material, centromereMaterial });
    }
    this.group.name = 'chromosome-field';
  }

  update(frames: ChromatidFrame[]): void {
    for (let index = 0; index < this.objects.length; index += 1) {
      const frame = frames[index];
      const object = this.objects[index];
      if (!frame || !object) continue;
      object.group.position.set(frame.x, frame.y, frame.z);
      object.group.rotation.set(frame.rotX, frame.rotY, frame.rotZ);
      object.mesh.scale.set(frame.thickness * 1.16, frame.length * 1.16, frame.thickness * 1.16);
      object.centromere.scale.setScalar(frame.thickness * 0.9);
      object.material.opacity = frame.opacity;
      object.centromereMaterial.opacity = frame.opacity;
      object.group.visible = frame.opacity > 0.03;
    }
  }

  dispose(): void {
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
  }
}
