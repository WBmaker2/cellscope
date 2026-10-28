import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface SceneKitOptions {
  cameraPosition?: THREE.Vector3;
  target?: THREE.Vector3;
  minDistance?: number;
  maxDistance?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  reducedMotion?: boolean;
  fov?: number;
}

export class SceneKit {
  readonly host: HTMLElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private readonly initialPosition: THREE.Vector3;
  private readonly initialTarget: THREE.Vector3;
  private readonly resizeObserver: ResizeObserver;
  private readonly onFrame?: (dt: number, elapsed: number) => void;
  private autoRotate: boolean;
  private reducedMotion: boolean;
  private running = false;
  private lastTime = 0;
  private elapsed = 0;
  private readonly visibilityHandler: () => void;

  constructor(
    host: HTMLElement,
    options: SceneKitOptions = {},
    onFrame?: (dt: number, elapsed: number) => void,
  ) {
    this.host = host;
    this.onFrame = onFrame;
    this.autoRotate = options.autoRotate ?? true;
    this.reducedMotion = options.reducedMotion ?? false;

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.className = 'scene-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x081310, 0.0075);

    this.camera = new THREE.PerspectiveCamera(options.fov ?? 38, width / height, 0.1, 160);
    this.initialPosition = options.cameraPosition ?? new THREE.Vector3(0, 5.5, 29);
    this.camera.position.copy(this.initialPosition);
    this.camera.lookAt(options.target ?? new THREE.Vector3(0, 0, 0));

    this.initialTarget = options.target ?? new THREE.Vector3(0, 0, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.initialTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.rotateSpeed = 0.62;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = options.minDistance ?? 13;
    this.controls.maxDistance = options.maxDistance ?? 48;
    this.controls.enablePan = false;
    this.controls.autoRotate = this.autoRotate && !this.reducedMotion;
    this.controls.autoRotateSpeed = options.autoRotateSpeed ?? 0.55;
    this.controls.update();

    const hemi = new THREE.HemisphereLight(0xd9f7d4, 0x12251f, 1.5);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff4dc, 2.4);
    key.position.set(9, 15, 13);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x6fe6d4, 1.35);
    rim.position.set(-14, 4, -11);
    this.scene.add(rim);

    const fill = new THREE.PointLight(0xd8b36a, 38, 80, 2);
    fill.position.set(0, -9, 14);
    this.scene.add(fill);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.stop();
      } else if (!this.running) {
        this.start();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.renderer.setAnimationLoop((time) => {
      const seconds = time / 1000;
      const dt = this.lastTime === 0 ? 1 / 60 : Math.min(0.05, seconds - this.lastTime);
      this.lastTime = seconds;
      this.elapsed += dt;
      this.controls.update();
      this.onFrame?.(dt, this.elapsed);
      this.renderer.render(this.scene, this.camera);
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
    this.controls.autoRotate = enabled && !this.reducedMotion;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.controls.autoRotate = this.autoRotate && !reduced;
  }

  resetView(animate = true): void {
    if (!animate || this.reducedMotion) {
      this.camera.position.copy(this.initialPosition);
      this.controls.target.copy(this.initialTarget);
      this.controls.update();
      return;
    }
    const start = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 480;
    const step = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = 1 - (1 - t) ** 3;
      this.camera.position.lerpVectors(start, this.initialPosition, eased);
      this.controls.target.lerpVectors(startTarget, this.initialTarget, eased);
      this.controls.update();
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    disposeObject3D(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh).material;
    if (Array.isArray(material)) {
      for (const item of material) disposeMaterial(item);
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

export function createGlowTexture(
  colorCenter = 'rgba(127, 214, 232, 0.35)',
  colorEdge = 'rgba(127, 214, 232, 0)',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 126);
    gradient.addColorStop(0, colorCenter);
    gradient.addColorStop(0.55, colorCenter.replace(/[\d.]+\)$/, '0.12)'));
    gradient.addColorStop(1, colorEdge);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function addStageGlow(
  scene: THREE.Scene,
  options: { radius?: number; y?: number; opacity?: number } = {},
): THREE.Mesh {
  const radius = options.radius ?? 18;
  const texture = createGlowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: options.opacity ?? 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = options.y ?? -9.2;
  scene.add(mesh);
  return mesh;
}
