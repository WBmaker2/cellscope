import * as THREE from 'three';
import type { ParticleSimulation } from '../bio/diffusion';

function particleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.78)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const INSIDE_COLOR = new THREE.Color('#b8fff0');
const OUTSIDE_COLOR = new THREE.Color('#6fb8ff');

export class ParticleField {
  readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly texture: THREE.CanvasTexture;
  private readonly material: THREE.PointsMaterial;
  private worldScale: number;

  constructor(count: number, worldScale = 2.3) {
    this.worldScale = worldScale;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.texture = particleTexture();
    this.material = new THREE.PointsMaterial({
      size: 0.22,
      map: this.texture,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      alphaTest: 0.01,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.renderOrder = 8;
    this.points.frustumCulled = false;
  }

  setWorldScale(scale: number): void {
    this.worldScale = scale;
  }

  update(simulation: ParticleSimulation): void {
    const count = Math.min(simulation.particles.length, this.positions.length / 3);
    for (let index = 0; index < count; index += 1) {
      const particle = simulation.particles[index];
      const offset = index * 3;
      this.positions[offset] = particle.x * this.worldScale;
      this.positions[offset + 1] = particle.y * this.worldScale;
      this.positions[offset + 2] = particle.z * this.worldScale;
      const color = particle.region === 'inside' ? INSIDE_COLOR : OUTSIDE_COLOR;
      this.colors[offset] = color.r;
      this.colors[offset + 1] = color.g;
      this.colors[offset + 2] = color.b;
    }
    this.geometry.setDrawRange(0, count);
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
