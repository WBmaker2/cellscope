import { mulberry32 } from '../bio/diffusion';
import type { CellTypeId } from '../bio/constants';
import { MICROSCOPE_SCALE_LABEL } from '../bio/scale';

export class MicroscopeInset {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly resizeObserver: ResizeObserver;
  private cellType: CellTypeId = 'animal';
  private focus = 0;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement, cellType: CellTypeId) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.cellType = cellType;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas);
    this.draw();
  }

  setCellType(cellType: CellTypeId): void {
    this.cellType = cellType;
    this.draw();
  }

  setFocus(focus: number): void {
    this.focus = Math.min(4, Math.max(0, focus));
    this.draw();
  }

  draw(): void {
    const context = this.context;
    if (!context) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(120, Math.round(rect.width || 280));
    const height = Math.max(100, Math.round(rect.height || 180));
    if (width === this.width && height === this.height && this.canvas.width !== 0) {
      // 크기가 같아도 포커스나 세포 종류가 바뀌면 다시 그립니다.
    }
    this.width = width;
    this.height = height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const gradient = context.createRadialGradient(
      width * 0.5,
      height * 0.48,
      8,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    gradient.addColorStop(0, '#18372d');
    gradient.addColorStop(0.72, '#0b1c16');
    gradient.addColorStop(1, '#06100d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.save();
    if (this.focus > 0.1) context.filter = `blur(${this.focus.toFixed(2)}px)`;
    if (this.cellType === 'animal') this.drawAnimalField(context, width, height);
    else this.drawPlantField(context, width, height);
    context.restore();

    this.drawFieldEdges(context, width, height);

    context.fillStyle = 'rgba(10, 18, 16, 0.82)';
    context.fillRect(0, height - 24, width, 24);
    context.strokeStyle = '#dff7e6';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(12, height - 10);
    context.lineTo(72, height - 10);
    context.moveTo(12, height - 14);
    context.lineTo(12, height - 6);
    context.moveTo(72, height - 14);
    context.lineTo(72, height - 6);
    context.stroke();
    context.fillStyle = '#dff7e6';
    context.font = '10px "SF Mono", ui-monospace, monospace';
    context.textBaseline = 'bottom';
    context.fillText(MICROSCOPE_SCALE_LABEL, 11, height - 14);
    context.fillStyle = 'rgba(223, 247, 230, 0.62)';
    context.font = '9px system-ui, sans-serif';
    context.textAlign = 'right';
    context.fillText('축척 아님', width - 12, height - 8);
  }

  private drawFieldEdges(context: CanvasRenderingContext2D, width: number, height: number): void {
    const radius = Math.min(width, height) * 0.46;
    const cx = width * 0.5;
    const cy = height * 0.48;
    context.save();
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.clip();
    const vignette = context.createRadialGradient(cx, cy, radius * 0.24, cx, cy, radius);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.76, 'rgba(0,0,0,0.06)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
    context.restore();
    context.strokeStyle = 'rgba(180, 238, 206, 0.24)';
    context.lineWidth = 1;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
  }

  private drawAnimalField(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const cx = width * 0.48;
    const cy = height * 0.46;
    const radius = Math.min(width, height) * 0.33;
    const random = mulberry32(91);

    context.fillStyle = 'rgba(158, 228, 202, 0.08)';
    context.strokeStyle = 'rgba(126, 231, 216, 0.58)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    const nucleusX = cx + radius * 0.12;
    const nucleusY = cy + radius * 0.04;
    context.fillStyle = 'rgba(183, 156, 255, 0.42)';
    context.strokeStyle = 'rgba(210, 194, 255, 0.5)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(nucleusX, nucleusY, radius * 0.27, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = 'rgba(120, 88, 196, 0.8)';
    context.beginPath();
    context.arc(nucleusX + radius * 0.07, nucleusY + radius * 0.06, radius * 0.085, 0, Math.PI * 2);
    context.fill();

    const organelles: [number, number, number, number][] = [
      [-0.58, -0.42, 0.12, 0.42],
      [0.55, -0.32, 0.1, -0.5],
      [-0.48, 0.46, 0.09, 0.2],
      [0.62, 0.34, 0.08, 0.9],
      [-0.18, -0.66, 0.06, -0.2],
    ];
    for (const [dx, dy, size, rotation] of organelles) {
      context.save();
      context.translate(cx + dx * radius, cy + dy * radius);
      context.rotate(rotation);
      context.fillStyle = 'rgba(235, 137, 84, 0.72)';
      context.beginPath();
      context.ellipse(0, 0, radius * size * 1.7, radius * size, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.fillStyle = 'rgba(199, 243, 107, 0.46)';
    for (let index = 0; index < 18; index += 1) {
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(random()) * radius * 0.84;
      const x = cx + Math.cos(angle) * radial;
      const y = cy + Math.sin(angle) * radial;
      if (Math.hypot(x - nucleusX, y - nucleusY) < radius * 0.3) continue;
      context.beginPath();
      context.arc(x, y, 1.1 + random() * 0.8, 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawPlantField(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const margin = Math.min(width, height) * 0.13;
    const left = margin;
    const top = margin;
    const w = width - margin * 2;
    const h = height - margin * 2 - 8;
    const random = mulberry32(47);

    const shape = new Path2D();
    shape.roundRect(left, top, w, h, 14);
    context.fillStyle = 'rgba(144, 209, 106, 0.08)';
    context.fill(shape);
    context.strokeStyle = 'rgba(159, 199, 164, 0.7)';
    context.lineWidth = 5;
    context.stroke(shape);
    context.strokeStyle = 'rgba(126, 231, 216, 0.55)';
    context.lineWidth = 1.4;
    const inner = new Path2D();
    inner.roundRect(left + 7, top + 7, w - 14, h - 14, 10);
    context.stroke(inner);

    context.fillStyle = 'rgba(127, 214, 232, 0.1)';
    context.strokeStyle = 'rgba(127, 214, 232, 0.25)';
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(
      left + w * 0.52,
      top + h * 0.52,
      w * 0.28,
      h * 0.28,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();

    context.fillStyle = 'rgba(183, 156, 255, 0.42)';
    context.strokeStyle = 'rgba(210, 194, 255, 0.42)';
    context.beginPath();
    context.arc(left + w * 0.23, top + h * 0.28, Math.min(w, h) * 0.11, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2 + 0.2;
      const rx = left + w * 0.5 + Math.cos(angle) * w * 0.34;
      const ry = top + h * 0.5 + Math.sin(angle) * h * 0.32;
      context.save();
      context.translate(rx, ry);
      context.rotate(angle + random() * 0.6);
      context.fillStyle = 'rgba(143, 209, 106, 0.72)';
      context.beginPath();
      context.ellipse(0, 0, Math.min(w, h) * 0.07, Math.min(w, h) * 0.033, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.fillStyle = 'rgba(226, 138, 91, 0.68)';
    for (let index = 0; index < 4; index += 1) {
      const x = left + w * (0.32 + random() * 0.36);
      const y = top + h * (0.4 + random() * 0.42);
      context.beginPath();
      context.ellipse(x, y, 4.2, 2, random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }
}
