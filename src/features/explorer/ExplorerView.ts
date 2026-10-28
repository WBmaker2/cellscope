import { CELL_TYPES, getOrganelle, getOrganelles, type Organelle } from '../../bio/cellData';
import type { CellTypeId } from '../../bio/constants';
import { MICROSCOPE_WARNING, MODEL_SCALE_NOTE } from '../../bio/scale';
import { MISSIONS, getMission } from '../../bio/missions';
import { store } from '../../app/state';
import { CellScene } from '../../render/CellScene';
import { MicroscopeInset } from '../../render/MicroscopeInset';
import { announce, escapeHtml, icon } from '../../ui/components';

export class ExplorerView {
  private readonly container: HTMLElement;
  private scene: CellScene | null = null;
  private inset: MicroscopeInset | null = null;
  private clippingInput!: HTMLInputElement;
  private clippingOutput!: HTMLOutputElement;
  private organelleList!: HTMLDivElement;
  private infoCard!: HTMLDivElement;
  private specimenTag!: HTMLSpanElement;
  private viewportSummary!: HTMLParagraphElement;
  private microscopeCard!: HTMLDivElement;
  private microscopeButton!: HTMLButtonElement;
  private labelsButton!: HTMLButtonElement;
  private autoRotateButton!: HTMLButtonElement;
  private cellButtons: HTMLButtonElement[] = [];
  private currentCellType: CellTypeId;
  private selectedId: string | null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentCellType = store.get().cell.type;
    this.selectedId = store.get().cell.selectedOrganelleId;
    this.render();
    this.bind();
    this.mountScene();
    this.updateMicroscopeVisibility(store.get().view.showMicroscopeInset);
  }

  private render(): void {
    const state = store.get();
    const cell = CELL_TYPES[this.currentCellType];
    const organelles = getOrganelles(this.currentCellType);
    const completed = state.mission.completed;
    const featured = ['organelle-hunt', 'osmosis-predict', 'plant-wall']
      .map((id) => getMission(id))
      .filter((mission): mission is NonNullable<typeof mission> => Boolean(mission));

    this.container.innerHTML = `
      <section class="view explore-view" aria-labelledby="explore-title">
        <header class="view-head">
          <div class="view-head-copy">
            <p class="eyebrow">표본 탐구 · 3D 세포</p>
            <h1 id="explore-title">세포를 열어 보세요</h1>
            <p class="view-sub">세포를 돌리고, 절단면을 움직여 안쪽 소기관을 관찰하세요. 소기관을 선택하면 하는 일을 알려 줍니다.</p>
          </div>
          <div class="view-head-meta">
            <span class="badge badge-warn">${icon('info', 15)} 개념 모형 · 축척 아님</span>
            <span class="badge">${organelles.length}개 구조</span>
          </div>
        </header>

        <div class="explorer-layout">
          <details class="panel panel-left" open>
            <summary>세포 선택과 소기관</summary>
            <div class="panel-body">
              <div class="field-label" id="cell-type-label">세포 종류</div>
              <div class="segmented" role="group" aria-labelledby="cell-type-label">
                <button type="button" class="segmented-btn ${this.currentCellType === 'animal' ? 'is-active' : ''}" data-cell="animal" aria-pressed="${this.currentCellType === 'animal'}" data-testid="cell-toggle-animal">
                  ${icon('cell', 18)} 동물세포
                </button>
                <button type="button" class="segmented-btn ${this.currentCellType === 'plant' ? 'is-active' : ''}" data-cell="plant" aria-pressed="${this.currentCellType === 'plant'}" data-testid="cell-toggle-plant">
                  ${icon('cell', 18)} 식물세포
                </button>
              </div>

              <div class="cutaway-control">
                <div class="cutaway-head">
                  <label for="clipping-range">절단면</label>
                  <output id="clipping-output" for="clipping-range">${Math.round(state.cell.clipping * 100)}%</output>
                </div>
                <input class="range" id="clipping-range" type="range" min="0" max="100" step="1" value="${Math.round(state.cell.clipping * 100)}" aria-describedby="clipping-help" data-testid="clipping-slider" />
                <p class="field-help" id="clipping-help">슬라이더를 움직이면 세포 앞면이 잘려 안쪽이 보입니다. <kbd>C</kbd> 키로도 전환할 수 있어요.</p>
                <button type="button" class="btn btn-ghost btn-sm" data-action="reset-cut">${icon('scissors', 16)} 절단 초기화</button>
              </div>

              <div class="list-head">
                <h2>소기관</h2>
                <span class="list-count">${organelles.length}개</span>
              </div>
              <div class="organelle-list" aria-label="${cell.nameKo} 소기관 목록" data-testid="organelle-list"></div>
            </div>
          </details>

          <div class="viewport-panel">
            <div class="viewport" id="explorer-viewport" data-testid="cell-scene" role="group" aria-label="${cell.nameKo} 3D 모형">
              <div class="viewport-topbar">
                <span class="specimen-tag" id="specimen-tag"><span class="pulse-dot" aria-hidden="true"></span>표본 · ${cell.nameKo}</span>
                <div class="viewport-tools" role="group" aria-label="보기 설정">
                  <button type="button" class="tool-btn ${state.view.showLabels ? 'is-active' : ''}" aria-pressed="${state.view.showLabels}" data-action="toggle-labels" data-testid="labels-toggle">${icon('eye', 17)}<span>이름표</span></button>
                  <button type="button" class="tool-btn ${state.view.autoRotate && !state.preferences.reducedMotion ? 'is-active' : ''}" aria-pressed="${state.view.autoRotate && !state.preferences.reducedMotion}" data-action="toggle-rotate">${icon('rotate', 17)}<span>자동 회전</span></button>
                  <button type="button" class="tool-btn" data-action="reset-view" aria-label="시점 초기화" title="시점 초기화">${icon('reset', 17)}</button>
                  <button type="button" class="tool-btn ${state.view.showMicroscopeInset ? 'is-active' : ''}" aria-pressed="${state.view.showMicroscopeInset}" data-action="toggle-microscope" data-testid="microscope-toggle">${icon('explore', 17)}<span>현미경</span></button>
                </div>
              </div>
              <div class="viewport-corner-badge" aria-hidden="true">CELL / 3D</div>
              <div class="scene-fallback" hidden>
                <h2>3D 화면을 열 수 없습니다</h2>
                <p>브라우저가 WebGL을 지원하지 않거나 그래픽 설정이 꺼져 있습니다. 오른쪽 소기관 목록과 글 설명은 그대로 사용할 수 있습니다.</p>
              </div>
              <div class="microscope-card" hidden data-testid="microscope-inset">
                <div class="microscope-head">
                  <span>${icon('explore', 15)} 모형 현미경 시야</span>
                  <button type="button" class="icon-btn icon-btn-sm" data-action="close-microscope" aria-label="현미경 시야 닫기">${icon('close', 16)}</button>
                </div>
                <canvas id="microscope-canvas" width="280" height="180" role="img" aria-label="모형 현미경 시야. 실제 현미경 사진이 아닙니다."></canvas>
                <label class="microscope-focus" for="focus-range">
                  <span>초점</span>
                  <input id="focus-range" type="range" min="0" max="4" step="0.2" value="0" />
                </label>
                <p class="microscope-warning">${MICROSCOPE_WARNING}</p>
              </div>
              <p class="scene-hint" aria-hidden="true">드래그로 회전 · 스크롤로 확대 · 소기관을 눌러 선택</p>
            </div>
            <div class="viewport-footer">
              <p class="viewport-summary" id="viewport-summary" aria-live="polite">${this.summaryText(null)}</p>
              <p class="scale-note">${icon('info', 14)}<span>${MODEL_SCALE_NOTE}</span></p>
            </div>
          </div>

          <details class="panel panel-right" open>
            <summary>소기관 정보</summary>
            <div class="panel-body">
              <div class="info-card" id="info-card" data-testid="info-card"></div>
              <details class="read-cell">
                <summary>${icon('list', 17)} 세포를 글로 읽기</summary>
                <div class="read-cell-body">
                  ${organelles
                    .map(
                      (organelle) =>
                        `<div class="read-row"><strong>${escapeHtml(organelle.nameKo)}</strong><span>${escapeHtml(organelle.functionKo)}</span></div>`,
                    )
                    .join('')}
                </div>
              </details>
            </div>
          </details>
        </div>

        <section class="mission-strip" aria-labelledby="strip-title">
          <div class="strip-head">
            <div>
              <p class="eyebrow">이어서 하기</p>
              <h2 id="strip-title">탐구 미션</h2>
            </div>
            <a class="text-link" href="#/missions">전체 미션 ${icon('chevronRight', 15)}</a>
          </div>
          <div class="strip-grid">
            ${featured
              .map((mission) => {
                const done = completed.includes(mission.id);
                return `<a class="strip-card ${done ? 'is-done' : ''}" href="#/missions/${mission.id}">
                  <span class="strip-icon">${icon(mission.concept === 'osmosis' ? 'droplet' : mission.concept === 'plant' ? 'cell' : 'target', 20)}</span>
                  <span class="strip-copy"><strong>${escapeHtml(mission.titleKo)}</strong><span>${escapeHtml(mission.promptKo.slice(0, 56))}…</span></span>
                  <span class="strip-state">${done ? `${icon('check', 15)} 완료` : `난이도 ${mission.difficulty}`}</span>
                </a>`;
              })
              .join('')}
          </div>
          <p class="strip-progress">${completed.length} / ${MISSIONS.length} 미션 완료</p>
        </section>
      </section>
    `;

    this.clippingInput = this.container.querySelector('#clipping-range') as HTMLInputElement;
    this.clippingOutput = this.container.querySelector('#clipping-output') as HTMLOutputElement;
    this.organelleList = this.container.querySelector('.organelle-list') as HTMLDivElement;
    this.infoCard = this.container.querySelector('#info-card') as HTMLDivElement;
    this.specimenTag = this.container.querySelector('#specimen-tag') as HTMLSpanElement;
    this.viewportSummary = this.container.querySelector('#viewport-summary') as HTMLParagraphElement;
    this.microscopeCard = this.container.querySelector('.microscope-card') as HTMLDivElement;
    this.microscopeButton = this.container.querySelector('[data-action="toggle-microscope"]') as HTMLButtonElement;
    this.labelsButton = this.container.querySelector('[data-action="toggle-labels"]') as HTMLButtonElement;
    this.autoRotateButton = this.container.querySelector('[data-action="toggle-rotate"]') as HTMLButtonElement;
    this.cellButtons = Array.from(this.container.querySelectorAll('[data-cell]'));

    this.renderOrganelleList();
    this.renderInfo();
    if (window.matchMedia('(max-width: 1100px)').matches) {
      this.container.querySelectorAll<HTMLDetailsElement>('.panel').forEach((panel) => {
        panel.open = false;
      });
    }
  }

  private bind(): void {
    this.cellButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const cellType = button.dataset.cell as CellTypeId;
        this.changeCellType(cellType);
      });
    });

    this.clippingInput.addEventListener('input', () => {
      const value = Number(this.clippingInput.value) / 100;
      this.applyClipping(value);
    });

    this.container.querySelector('[data-action="reset-cut"]')?.addEventListener('click', () => {
      this.applyClipping(0);
      announce('절단면을 초기화했습니다.');
    });

    this.container.querySelectorAll('[data-action="toggle-labels"]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = !store.get().view.showLabels;
        store.update(
          (state) => {
            state.view.showLabels = value;
          },
          { persist: true },
        );
        this.scene?.setShowLabels(value);
        this.labelsButton.classList.toggle('is-active', value);
        this.labelsButton.setAttribute('aria-pressed', String(value));
        announce(value ? '소기관 이름표를 켰습니다.' : '소기관 이름표를 껐습니다.');
      });
    });

    this.container.querySelectorAll('[data-action="toggle-rotate"]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = !store.get().view.autoRotate;
        store.update(
          (state) => {
            state.view.autoRotate = value;
          },
          { persist: true },
        );
        const active = value && !store.get().preferences.reducedMotion;
        this.scene?.setAutoRotate(value);
        this.autoRotateButton.classList.toggle('is-active', active);
        this.autoRotateButton.setAttribute('aria-pressed', String(active));
        announce(value ? '자동 회전을 켰습니다.' : '자동 회전을 껐습니다.');
      });
    });

    this.container.querySelector('[data-action="reset-view"]')?.addEventListener('click', () => {
      this.scene?.resetView();
      announce('카메라 시점을 초기화했습니다.');
    });

    this.container.querySelectorAll('[data-action="toggle-microscope"]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = !store.get().view.showMicroscopeInset;
        store.update(
          (state) => {
            state.view.showMicroscopeInset = value;
          },
          { persist: true },
        );
        this.updateMicroscopeVisibility(value);
        announce(value ? '모형 현미경 시야를 켰습니다.' : '모형 현미경 시야를 껐습니다.');
      });
    });

    this.container.querySelector('[data-action="close-microscope"]')?.addEventListener('click', () => {
      store.update(
        (state) => {
          state.view.showMicroscopeInset = false;
        },
        { persist: true },
      );
      this.updateMicroscopeVisibility(false);
    });

    this.container.querySelector('#focus-range')?.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement;
      this.inset?.setFocus(Number(input.value));
    });
  }

  private mountScene(): void {
    const host = this.container.querySelector('#explorer-viewport') as HTMLElement;
    const fallback = this.container.querySelector('.scene-fallback') as HTMLElement;
    try {
      this.scene = new CellScene(host, {
        cellType: this.currentCellType,
        selectedOrganelleId: this.selectedId,
        clipping: store.get().cell.clipping,
        showLabels: store.get().view.showLabels,
        autoRotate: store.get().view.autoRotate,
        reducedMotion: store.get().preferences.reducedMotion,
        onSelect: (id) => this.selectOrganelle(id, 'scene'),
      });
      this.container.querySelector('.scene-hint')?.classList.add('is-visible');
    } catch (error) {
      console.error('CellScene init failed', error);
      fallback.hidden = false;
      this.scene = null;
    }

    const canvas = this.container.querySelector('#microscope-canvas') as HTMLCanvasElement;
    this.inset = new MicroscopeInset(canvas, this.currentCellType);
  }

  private changeCellType(cellType: CellTypeId): void {
    if (cellType === this.currentCellType) return;
    this.currentCellType = cellType;
    this.selectedId = null;
    store.update(
      (state) => {
        state.cell.type = cellType;
        state.cell.selectedOrganelleId = null;
      },
      { persist: true },
    );
    this.cellButtons.forEach((button) => {
      const active = button.dataset.cell === cellType;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const meta = CELL_TYPES[cellType];
    this.specimenTag.innerHTML = `<span class="pulse-dot" aria-hidden="true"></span>표본 · ${meta.nameKo}`;
    this.scene?.setCellType(cellType);
    this.inset?.setCellType(cellType);
    this.renderOrganelleList();
    this.renderInfo();
    this.updateSummary();
    announce(`${meta.nameKo}로 전환했습니다.`);
  }

  private renderOrganelleList(): void {
    const organelles = getOrganelles(this.currentCellType);
    this.organelleList.innerHTML = organelles
      .filter((organelle) => organelle.id !== 'cytoplasm')
      .map(
        (organelle) => `<button type="button" class="organelle-item ${this.selectedId === organelle.id ? 'is-active' : ''}" data-organelle="${organelle.id}" aria-pressed="${this.selectedId === organelle.id}" data-testid="organelle-item-${organelle.id}">
          <span class="organelle-dot" style="--dot:${organelle.color}"></span>
          <span class="organelle-name">${escapeHtml(organelle.nameKo)}</span>
          <span class="organelle-function">${escapeHtml(organelle.functionKo)}</span>
          ${icon('chevronRight', 15, 'organelle-chevron')}
        </button>`,
      )
      .join('');

    this.organelleList.querySelectorAll<HTMLButtonElement>('[data-organelle]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.organelle ?? null;
        this.selectOrganelle(id, 'list');
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.selectOrganelle(null, 'list');
        }
      });
    });
  }

  private selectOrganelle(id: string | null, source: 'scene' | 'list' | 'clear'): void {
    if (id && !getOrganelle(id, this.currentCellType)) id = null;
    this.selectedId = id;
    store.update(
      (state) => {
        state.cell.selectedOrganelleId = id;
      },
      { persist: true },
    );
    if (source !== 'scene') this.scene?.setSelected(id, { silent: true });
    this.organelleList.querySelectorAll<HTMLButtonElement>('[data-organelle]').forEach((button) => {
      const active = button.dataset.organelle === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.renderInfo();
    this.updateSummary();
    if (window.matchMedia('(max-width: 1100px)').matches) {
      const rightPanel = this.container.querySelector<HTMLDetailsElement>('.panel-right');
      if (rightPanel) rightPanel.open = true;
    }
    const organelle = id ? getOrganelle(id, this.currentCellType) : undefined;
    if (organelle) announce(`${organelle.nameKo} 선택. ${organelle.functionKo}`);
    else announce('소기관 선택을 해제했습니다.');
  }

  private renderInfo(): void {
    const organelle = this.selectedId
      ? getOrganelle(this.selectedId, this.currentCellType)
      : undefined;
    if (!organelle) {
      const meta = CELL_TYPES[this.currentCellType];
      this.infoCard.innerHTML = `
        <div class="info-empty">
          <span class="info-orbit" aria-hidden="true"></span>
          <p class="eyebrow">${meta.nameEn}</p>
          <h2>소기관을 선택하세요</h2>
          <p>${escapeHtml(meta.taglineKo)}. 3D 세포를 클릭하거나 왼쪽 목록에서 소기관을 골라 보세요.</p>
          <div class="info-tip">${icon('spark', 16)} 절단면을 60% 이상 열면 안쪽 소기관이 더 잘 보입니다.</div>
        </div>
      `;
      return;
    }
    const cellNames = organelle.cellTypes
      .map((type) => `<span class="chip">${CELL_TYPES[type].nameKo}</span>`)
      .join('');
    this.infoCard.innerHTML = `
      <div class="info-selected">
        <div class="info-color" style="--swatch:${organelle.color}">${icon(this.iconForOrganelle(organelle), 22)}</div>
        <p class="eyebrow">소기관 · ${organelle.nameEn}</p>
        <h2 data-testid="info-card-name">${escapeHtml(organelle.nameKo)}</h2>
        <p class="info-function">${escapeHtml(organelle.functionKo)}</p>
        <p class="info-note">${escapeHtml(organelle.noteKo)}</p>
        <div class="chip-row">${cellNames}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="clear-selection">${icon('close', 15)} 선택 해제</button>
      </div>
    `;
    this.infoCard.querySelector('[data-action="clear-selection"]')?.addEventListener('click', () => {
      this.selectOrganelle(null, 'clear');
      this.scene?.setSelected(null);
    });
  }

  private iconForOrganelle(organelle: Organelle): 'cell' | 'droplet' | 'mitosis' | 'target' | 'spark' {
    if (organelle.id === 'mitochondria') return 'spark';
    if (organelle.id === 'central-vacuole' || organelle.id === 'cell-membrane') return 'droplet';
    if (organelle.id === 'centrosome') return 'mitosis';
    if (organelle.id === 'nucleus' || organelle.id === 'nucleolus') return 'cell';
    return 'target';
  }

  private applyClipping(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    store.update((state) => {
      state.cell.clipping = clamped;
    });
    this.clippingInput.value = String(Math.round(clamped * 100));
    this.clippingOutput.textContent = `${Math.round(clamped * 100)}%`;
    this.scene?.setClipping(clamped);
    this.updateSummary();
  }

  private updateSummary(): void {
    const organelle = this.selectedId
      ? getOrganelle(this.selectedId, this.currentCellType)
      : undefined;
    this.viewportSummary.textContent = this.summaryText(organelle ?? null);
  }

  private summaryText(organelle: Organelle | null): string {
    const clipping = Math.round(store.get().cell.clipping * 100);
    const cell = CELL_TYPES[this.currentCellType];
    return `${cell.nameKo} · ${organelle ? `${organelle.nameKo} 선택됨 · ${organelle.functionKo}` : '선택된 소기관 없음'} · 절단 ${clipping}%`;
  }

  private updateMicroscopeVisibility(visible: boolean): void {
    this.microscopeCard.hidden = !visible;
    this.microscopeButton.classList.toggle('is-active', visible);
    this.microscopeButton.setAttribute('aria-pressed', String(visible));
    if (visible) {
      requestAnimationFrame(() => {
        this.inset?.draw();
      });
    }
  }

  toggleClipping(): void {
    const next = store.get().cell.clipping > 0.5 ? 0 : 1;
    this.applyClipping(next);
    announce(next > 0.5 ? '절단면을 열었습니다.' : '절단면을 닫았습니다.');
  }

  destroy(): void {
    this.scene?.dispose();
    this.inset?.dispose();
    this.container.replaceChildren();
  }
}

export function mountExplorer(container: HTMLElement): ExplorerView {
  return new ExplorerView(container);
}
