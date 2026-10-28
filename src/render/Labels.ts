import * as THREE from 'three';

export interface LabelItem {
  id: string;
  nameKo: string;
  color: string;
  anchor: { x: number; y: number; z: number };
}

interface LabelRecord {
  item: LabelItem;
  element: HTMLSpanElement;
  anchor: THREE.Vector3;
  currentX: number | null;
  currentY: number | null;
}

export class LabelLayer {
  private readonly container: HTMLDivElement;
  private readonly host: HTMLElement;
  private records: LabelRecord[] = [];
  private showAll = true;
  private selectedId: string | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
    this.container = document.createElement('div');
    this.container.className = 'cell-labels';
    this.container.setAttribute('aria-hidden', 'true');
    host.append(this.container);
  }

  setItems(items: LabelItem[]): void {
    this.container.replaceChildren();
    this.records = items.map((item) => {
      const element = document.createElement('span');
      element.className = 'cell-label';
      element.style.setProperty('--label-color', item.color);
      element.innerHTML = `<span class="cell-label-dot"></span><span>${item.nameKo}</span>`;
      element.dataset.organelleId = item.id;
      this.container.append(element);
      return {
        item,
        element,
        anchor: new THREE.Vector3(item.anchor.x, item.anchor.y, item.anchor.z),
        currentX: null,
        currentY: null,
      };
    });
    this.applyVisibility();
  }

  setShowAll(showAll: boolean): void {
    this.showAll = showAll;
    this.applyVisibility();
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    for (const record of this.records) {
      const selected = record.item.id === this.selectedId;
      record.element.classList.toggle('is-visible', this.showAll || selected);
      record.element.classList.toggle('is-selected', selected);
    }
  }

  update(camera: THREE.Camera): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const placed: { x: number; y: number; width: number; height: number }[] = [];
    const vector = new THREE.Vector3();

    for (const record of this.records) {
      const visible = record.element.classList.contains('is-visible');
      if (!visible) {
        record.element.style.opacity = '0';
        continue;
      }
      vector.copy(record.anchor).project(camera);
      const behind = vector.z > 1;
      let x = (vector.x * 0.5 + 0.5) * width;
      let y = (-vector.y * 0.5 + 0.5) * height;
      if (behind || x < -80 || x > width + 80 || y < -40 || y > height + 40) {
        record.element.style.opacity = '0';
        continue;
      }

      const labelWidth = 118;
      const labelHeight = 30;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const collision = placed.some(
          (rect) =>
            Math.abs(rect.x - x) < (rect.width + labelWidth) / 2 - 6 &&
            Math.abs(rect.y - y) < (rect.height + labelHeight) / 2 + 2,
        );
        if (!collision) break;
        y += labelHeight + 4;
      }
      x = Math.max(labelWidth / 2 + 8, Math.min(width - labelWidth / 2 - 8, x));
      y = Math.max(labelHeight / 2 + 8, Math.min(height - labelHeight / 2 - 8, y));
      placed.push({ x, y, width: labelWidth, height: labelHeight });
      const currentX = record.currentX === null ? x : record.currentX + (x - record.currentX) * 0.32;
      const currentY = record.currentY === null ? y : record.currentY + (y - record.currentY) * 0.32;
      record.currentX = currentX;
      record.currentY = currentY;
      record.element.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      record.element.style.opacity = '1';
    }
  }

  dispose(): void {
    this.container.remove();
    this.records = [];
  }
}
