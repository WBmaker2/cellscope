import { CELL_TYPES } from '../../bio/cellData';
import {
  MAX_EXTERNAL_OSMOLARITY,
  MIN_EXTERNAL_OSMOLARITY,
  type CellTypeId,
} from '../../bio/constants';
import {
  createOsmosis,
  externalSolutionLabel,
  OSMOSIS_STATE_DESCRIPTION,
  OSMOSIS_STATE_LABEL,
  osmosisSummary,
  resetOsmosis,
  setExternalOsmolarity,
  stepOsmosis,
  waterDirectionLabel,
  type OsmosisSnapshot,
} from '../../bio/osmosis';
import { OSMOSIS_MODEL_NOTE } from '../../bio/scale';
import { store } from '../../app/state';
import { OsmosisScene } from '../../render/OsmosisScene';
import { announce, escapeHtml, icon } from '../../ui/components';

export class OsmosisView {
  private readonly container: HTMLElement;
  private scene: OsmosisScene | null = null;
  private snapshot: OsmosisSnapshot;
  private playing = false;
  private cellType: CellTypeId;
  private external: number;
  private lastState: string;
  private uiClock = 0;
  private concentrationInput!: HTMLInputElement;
  private concentrationOutput!: HTMLOutputElement;
  private playButton!: HTMLButtonElement;
  private stateChip!: HTMLSpanElement;
  private timeOutput!: HTMLElement;
  private volumeValue!: HTMLElement;
  private volumeBar!: HTMLElement;
  private internalValue!: HTMLElement;
  private turgorValue!: HTMLElement;
  private turgorBar!: HTMLElement;
  private turgorCard!: HTMLElement;
  private fluxValue!: HTMLElement;
  private stateTitle!: HTMLElement;
  private stateDetail!: HTMLElement;
  private summaryEl!: HTMLElement;
  private externalTag!: HTMLElement;
  private cellButtons: HTMLButtonElement[] = [];
  private presetButtons: HTMLButtonElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    const state = store.get();
    this.cellType = state.cell.type;
    this.external = state.osmosis.externalOsmolarity;
    this.snapshot =
      state.osmosis.snapshot.cellType === this.cellType
        ? state.osmosis.snapshot
        : createOsmosis(this.cellType, this.external);
    this.lastState = this.snapshot.state;
    this.render();
    this.bind();
    this.mountScene();
    this.updateUi(true);
  }

  private render(): void {
    const meta = CELL_TYPES[this.cellType];
    this.container.innerHTML = `
      <section class="view lab-view" aria-labelledby="osmosis-title">
        <header class="view-head">
          <div class="view-head-copy">
            <p class="eyebrow">삼투 실험 · 물의 이동</p>
            <h1 id="osmosis-title">물은 어디로 갈까?</h1>
            <p class="view-sub">세포 밖 용액의 농도를 바꾸어 보세요. 물 입자가 어느 쪽으로 움직이고 세포의 부피가 어떻게 변하는지 관찰할 수 있습니다.</p>
          </div>
          <div class="view-head-meta">
            <span class="badge badge-cyan">${icon('droplet', 15)} 개념 모형</span>
            <span class="badge">${meta.nameKo}</span>
          </div>
        </header>

        <div class="lab-layout">
          <details class="panel panel-left" open>
            <summary>실험 설정</summary>
            <div class="panel-body">
              <div class="field-label" id="osmosis-cell-label">세포 종류</div>
              <div class="segmented" role="group" aria-labelledby="osmosis-cell-label">
                <button type="button" class="segmented-btn ${this.cellType === 'animal' ? 'is-active' : ''}" data-cell="animal" aria-pressed="${this.cellType === 'animal'}" data-testid="osmosis-cell-animal">${icon('cell', 17)} 동물세포</button>
                <button type="button" class="segmented-btn ${this.cellType === 'plant' ? 'is-active' : ''}" data-cell="plant" aria-pressed="${this.cellType === 'plant'}" data-testid="osmosis-cell-plant">${icon('cell', 17)} 식물세포</button>
              </div>

              <div class="concentration-control">
                <div class="cutaway-head">
                  <label for="osmosis-concentration">세포 밖 용액 농도</label>
                  <output id="osmosis-concentration-value" for="osmosis-concentration">${this.external} mOsm/L</output>
                </div>
                <input class="range" id="osmosis-concentration" type="range" min="${MIN_EXTERNAL_OSMOLARITY}" max="${MAX_EXTERNAL_OSMOLARITY}" step="10" value="${this.external}" aria-describedby="osmosis-scale-help" data-testid="osmosis-concentration" />
                <div class="range-ticks" id="osmosis-scale-help" aria-hidden="true">
                  <span>저장액</span><span>등장액 300</span><span>고장액</span>
                </div>
                <div class="preset-row">
                  <button type="button" class="btn btn-ghost btn-sm" data-preset="150" data-testid="preset-150">저장액 150</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-preset="300" data-testid="preset-300">등장액 300</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-preset="600" data-testid="preset-600">고장액 600</button>
                </div>
                <button type="button" class="btn btn-ghost btn-sm wide" data-action="reset">${icon('reset', 16)} 실험 초기화</button>
              </div>

              <details class="model-note">
                <summary>${icon('info', 16)} 이 모형의 가정</summary>
                <ul>
                  <li>세포 안의 용질 양은 변하지 않는다고 가정합니다.</li>
                  <li>물은 용질 농도가 높은 쪽으로 이동합니다.</li>
                  <li>입자는 실제 물 분자 수가 아니라 흐름을 보여 주는 대표 입자입니다.</li>
                </ul>
              </details>
            </div>
          </details>

          <div class="viewport-panel">
            <div class="viewport lab-viewport" id="osmosis-viewport" role="group" aria-label="삼투 실험 3D 장면" data-testid="osmosis-scene">
              <div class="viewport-topbar">
                <span class="state-chip" id="osmosis-state" data-testid="osmosis-state">${OSMOSIS_STATE_LABEL[this.snapshot.state]}</span>
                <span class="specimen-tag" id="osmosis-external-tag">${externalSolutionLabel(this.external)} · ${this.external} mOsm/L</span>
              </div>
              <div class="solution-legend" aria-hidden="true">
                <span><i class="legend-dot legend-water"></i>물 대표 입자</span>
                <span><i class="legend-dot legend-solute"></i>용질 입자</span>
              </div>
              <div class="scene-fallback" hidden>
                <h2>3D 화면을 열 수 없습니다</h2>
                <p>브라우저가 WebGL을 지원하지 않습니다. 오른쪽 수치와 설명으로 실험 결과를 확인할 수 있습니다.</p>
              </div>
              <p class="scene-hint" aria-hidden="true">드래그로 회전 · 스크롤로 확대</p>
            </div>
            <div class="lab-controls">
              <div class="lab-controls-left">
                <button type="button" class="btn btn-primary btn-pulse" data-action="play" data-testid="osmosis-play">${icon('play', 18)} <span>실험 시작</span></button>
                <button type="button" class="btn btn-ghost" data-action="reset-bottom">${icon('reset', 17)} <span>초기화</span></button>
              </div>
              <div class="time-readout"><span>실험 시간</span><strong id="osmosis-time" data-testid="osmosis-time">${this.snapshot.timeSec.toFixed(1)}초</strong></div>
            </div>
            <div class="viewport-footer">
              <p class="viewport-summary" id="osmosis-summary">${this.initialSummary()}</p>
              <p class="scale-note">${icon('info', 14)}<span>${OSMOSIS_MODEL_NOTE}</span></p>
            </div>
          </div>

          <details class="panel panel-right" open>
            <summary>실험 측정</summary>
            <div class="panel-body">
              <div class="gauge-block">
                <div class="gauge-head"><span>부피 비율</span><strong data-testid="osmosis-volume">${this.snapshot.volumeRatio.toFixed(2)}×</strong></div>
                <div class="gauge-track gauge-volume" role="meter" aria-label="세포 부피 비율" aria-valuemin="0.5" aria-valuemax="1.6" aria-valuenow="${this.snapshot.volumeRatio}">
                  <span class="gauge-fill" data-element="volume-bar"></span>
                  <span class="gauge-marker" style="left:calc((0.65 - 0.5) / 1.1 * 100%)" title="동물세포 쭈그러짐 기준"></span>
                  <span class="gauge-marker" style="left:calc((1 - 0.5) / 1.1 * 100%)" title="초기 부피"></span>
                  <span class="gauge-marker" style="left:calc((1.12 - 0.5) / 1.1 * 100%)" title="식물세포 세포벽 한계"></span>
                  <span class="gauge-marker" style="left:calc((1.45 - 0.5) / 1.1 * 100%)" title="동물세포 파열 기준"></span>
                </div>
                <p class="gauge-caption">처음 부피 = 1.00× · <span data-element="volume-state">${this.volumeStateLabel()}</span></p>
              </div>

              <div class="measure-grid">
                <div class="measure-cell">
                  <span class="measure-label">세포 안 삼투 농도</span>
                  <strong data-testid="osmosis-internal">${Math.round(this.snapshot.internalOsmolarity)} <small>mOsm/L</small></strong>
                </div>
                <div class="measure-cell">
                  <span class="measure-label">물의 흐름</span>
                  <strong data-element="flux-direction">${waterDirectionLabel(this.snapshot)}</strong>
                </div>
                <div class="measure-cell turgor-cell" ${this.cellType === 'animal' ? 'hidden' : ''}>
                  <span class="measure-label">상대 팽압</span>
                  <strong data-element="turgor-value">${Math.round(this.snapshot.turgor * 100)}%</strong>
                  <div class="mini-track"><span data-element="turgor-bar" style="width:${Math.round(this.snapshot.turgor * 100)}%"></span></div>
                </div>
                <div class="measure-cell">
                  <span class="measure-label">모형 상태</span>
                  <strong data-element="state-label">${OSMOSIS_STATE_LABEL[this.snapshot.state]}</strong>
                </div>
              </div>

              <div class="state-card">
                <p class="eyebrow" data-element="state-eyebrow">${externalSolutionLabel(this.external)} 반응</p>
                <h2 data-element="state-title">${OSMOSIS_STATE_LABEL[this.snapshot.state]}</h2>
                <p data-element="state-detail">${escapeHtml(OSMOSIS_STATE_DESCRIPTION[this.snapshot.state])}</p>
              </div>

              <div class="teaching-note">
                ${icon('spark', 18)}
                <p><strong>기억할 점</strong> 물은 용질 농도가 <em>높은</em> 쪽으로 이동합니다. 세포 밖이 저장액이면 물이 세포 안으로 들어옵니다.</p>
              </div>
            </div>
          </details>
        </div>

        <section class="concept-band" aria-label="삼투 개념">
          <span class="concept-icon">${icon('droplet', 24)}</span>
          <div>
            <p class="eyebrow">개념 연결</p>
            <h2>물은 용질 농도가 높은 쪽으로 이동한다</h2>
            <p>저장액에서는 세포 안으로, 고장액에서는 세포 밖으로 물이 이동합니다. 동물세포는 일정 부피를 넘으면 터지고, 식물세포는 세포벽이 팽창을 막습니다.</p>
          </div>
          <span class="concept-equation" aria-hidden="true">C<sub>in</sub> ↔ C<sub>out</sub></span>
        </section>
      </section>
    `;

    this.concentrationInput = this.container.querySelector('#osmosis-concentration') as HTMLInputElement;
    this.concentrationOutput = this.container.querySelector('#osmosis-concentration-value') as HTMLOutputElement;
    this.playButton = this.container.querySelector('[data-action="play"]') as HTMLButtonElement;
    this.stateChip = this.container.querySelector('#osmosis-state') as HTMLSpanElement;
    this.timeOutput = this.container.querySelector('#osmosis-time') as HTMLElement;
    this.volumeValue = this.container.querySelector('[data-testid="osmosis-volume"]') as HTMLElement;
    this.volumeBar = this.container.querySelector('[data-element="volume-bar"]') as HTMLElement;
    this.internalValue = this.container.querySelector('[data-testid="osmosis-internal"]') as HTMLElement;
    this.turgorValue = this.container.querySelector('[data-element="turgor-value"]') as HTMLElement;
    this.turgorBar = this.container.querySelector('[data-element="turgor-bar"]') as HTMLElement;
    this.turgorCard = this.container.querySelector('.turgor-cell') as HTMLElement;
    this.fluxValue = this.container.querySelector('[data-element="flux-direction"]') as HTMLElement;
    this.stateTitle = this.container.querySelector('[data-element="state-title"]') as HTMLElement;
    this.stateDetail = this.container.querySelector('[data-element="state-detail"]') as HTMLElement;
    this.summaryEl = this.container.querySelector('#osmosis-summary') as HTMLElement;
    this.externalTag = this.container.querySelector('#osmosis-external-tag') as HTMLElement;
    this.cellButtons = Array.from(this.container.querySelectorAll('[data-cell]'));
    this.presetButtons = Array.from(this.container.querySelectorAll('[data-preset]'));

    if (window.matchMedia('(max-width: 1100px)').matches) {
      this.container.querySelectorAll<HTMLDetailsElement>('.panel').forEach((panel) => {
        panel.open = false;
      });
    }
  }

  private bind(): void {
    this.concentrationInput.addEventListener('input', () => {
      const value = Number(this.concentrationInput.value);
      this.setExternal(value, { keepTime: true });
    });

    this.presetButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = Number(button.dataset.preset);
        this.setExternal(value, { keepTime: false });
        this.resetExperiment();
        announce(`${externalSolutionLabel(value)} ${value} mOsm/L로 설정했습니다. 실험 시작을 눌러 주세요.`);
      });
    });

    this.container.querySelectorAll('[data-action="reset"]').forEach((button) => {
      button.addEventListener('click', () => this.resetExperiment());
    });
    this.container.querySelectorAll('[data-action="reset-bottom"]').forEach((button) => {
      button.addEventListener('click', () => this.resetExperiment());
    });

    this.container.querySelectorAll('[data-action="play"]').forEach((button) => {
      button.addEventListener('click', () => this.togglePlay());
    });

    this.cellButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const cellType = button.dataset.cell as CellTypeId;
        if (cellType === this.cellType) return;
        this.cellType = cellType;
        this.snapshot = createOsmosis(cellType, this.external);
        this.playing = false;
        this.lastState = this.snapshot.state;
        store.update(
          (state) => {
            state.cell.type = cellType;
            state.osmosis.snapshot = this.snapshot;
            state.osmosis.timeSec = 0;
            state.osmosis.playing = false;
          },
          { persist: true },
        );
        this.cellButtons.forEach((item) => {
          const active = item.dataset.cell === cellType;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        this.scene?.setCellType(cellType);
        this.scene?.setSnapshot(this.snapshot);
        this.scene?.setPlaying(false);
        this.scene?.resetParticles();
        this.updateUi(true);
        announce(`${CELL_TYPES[cellType].nameKo}로 바꾸고 실험을 초기화했습니다.`);
      });
    });
  }

  private mountScene(): void {
    const host = this.container.querySelector('#osmosis-viewport') as HTMLElement;
    const fallback = this.container.querySelector('.scene-fallback') as HTMLElement;
    try {
      this.scene = new OsmosisScene(host, {
        cellType: this.cellType,
        snapshot: this.snapshot,
        reducedMotion: store.get().preferences.reducedMotion,
        playing: this.playing,
      });
      this.scene.onUpdate = (dt) => this.tickSimulation(dt);
    } catch (error) {
      console.error('OsmosisScene init failed', error);
      fallback.hidden = false;
      this.scene = null;
    }
    this.syncStore();
  }

  private tickSimulation(dt: number): void {
    if (!this.playing) return;
    let remaining = Math.min(0.08, dt);
    while (remaining > 0) {
      const step = Math.min(1 / 60, remaining);
      this.snapshot = stepOsmosis(this.snapshot, step);
      remaining -= step;
      if (this.snapshot.stable) break;
    }
    this.scene?.setSnapshot(this.snapshot);
    this.uiClock += dt;
    if (this.snapshot.state !== this.lastState) {
      this.lastState = this.snapshot.state;
      announce(`${OSMOSIS_STATE_LABEL[this.snapshot.state]}. ${OSMOSIS_STATE_DESCRIPTION[this.snapshot.state]}`);
    }
    if (this.snapshot.stable && this.snapshot.timeSec > 0.35) {
      this.setPlaying(false);
      this.syncStore();
      this.updateUi(true);
      announce(
        `실험이 멈췄습니다. 부피 ${this.snapshot.volumeRatio.toFixed(2)}배, ${OSMOSIS_STATE_LABEL[this.snapshot.state]}.`,
      );
    }
    if (this.uiClock > 0.14) {
      this.uiClock = 0;
      this.updateUi(false);
    }
  }

  private setExternal(value: number, options: { keepTime: boolean }): void {
    this.external = Math.max(MIN_EXTERNAL_OSMOLARITY, Math.min(MAX_EXTERNAL_OSMOLARITY, value));
    this.snapshot = setExternalOsmolarity(this.snapshot, this.external);
    this.scene?.setSnapshot(this.snapshot);
    store.update((state) => {
      state.osmosis.externalOsmolarity = this.external;
      state.osmosis.snapshot = this.snapshot;
    });
    this.updateUi(true);
    if (!options.keepTime) this.syncStore();
    announce(`${externalSolutionLabel(this.external)} ${this.external} mOsm/L. ${waterDirectionLabel(this.snapshot)}`);
  }

  private isFinished(): boolean {
    return (
      this.snapshot.atLimit ||
      this.snapshot.state === 'lysed' ||
      this.snapshot.state === 'crenated' ||
      this.snapshot.state === 'plasmolyzed' ||
      (this.snapshot.stable && this.snapshot.timeSec > 0.5)
    );
  }

  private playLabel(): string {
    if (this.playing) return '일시 정지';
    if (this.isFinished()) return '다시 실행';
    return this.snapshot.timeSec > 0.05 ? '계속하기' : '실험 시작';
  }

  private togglePlay(): void {
    if (!this.playing && this.isFinished()) {
      this.snapshot = resetOsmosis(this.snapshot);
      this.lastState = this.snapshot.state;
      this.scene?.resetParticles();
      this.scene?.setSnapshot(this.snapshot);
      this.updateUi(true);
      this.setPlaying(true);
      announce('실험을 처음부터 다시 시작합니다.');
      return;
    }
    this.setPlaying(!this.playing);
    if (this.playing) {
      announce('실험을 시작합니다.');
    } else {
      announce('실험을 일시 정지했습니다.');
    }
  }

  private setPlaying(playing: boolean): void {
    this.playing = playing;
    this.scene?.setPlaying(playing);
    this.playButton.classList.toggle('btn-pulse', !playing);
    this.playButton.innerHTML = playing
      ? `${icon('pause', 18)} <span>일시 정지</span>`
      : `${icon('play', 18)} <span>${this.playLabel()}</span>`;
    store.update((state) => {
      state.osmosis.playing = playing;
    });
    if (!playing) this.syncStore();
  }

  private resetExperiment(): void {
    this.playing = false;
    this.snapshot = resetOsmosis(this.snapshot);
    this.lastState = this.snapshot.state;
    this.scene?.setPlaying(false);
    this.scene?.resetParticles();
    this.scene?.setSnapshot(this.snapshot);
    this.setPlaying(false);
    this.updateUi(true);
    this.syncStore();
    announce('실험을 초기 부피로 되돌렸습니다.');
  }

  private volumeStateLabel(): string {
    if (this.cellType === 'animal') {
      if (this.snapshot.state === 'lysed') return '세포막 파열 한계를 넘었습니다.';
      if (this.snapshot.state === 'crenated') return '쭈그러짐 한계에 도달했습니다.';
      return this.snapshot.volumeRatio > 1.01 ? '물이 들어와 부풀었습니다.' : this.snapshot.volumeRatio < 0.99 ? '물이 빠져 줄었습니다.' : '초기 부피를 유지합니다.';
    }
    if (this.snapshot.state === 'plasmolyzed') return '세포막이 세포벽에서 떨어졌습니다.';
    if (this.snapshot.state === 'turgid') return '세포벽이 팽창을 막고 있습니다.';
    return '초기 부피를 유지합니다.';
  }

  private updateUi(force: boolean): void {
    const summary = osmosisSummary(this.snapshot);
    const percent = Math.max(0, Math.min(100, ((this.snapshot.volumeRatio - 0.5) / 1.1) * 100));
    this.volumeValue.textContent = `${this.snapshot.volumeRatio.toFixed(2)}×`;
    this.volumeBar.style.width = `${percent.toFixed(1)}%`;
    const meter = this.volumeBar.parentElement;
    meter?.setAttribute('aria-valuenow', this.snapshot.volumeRatio.toFixed(2));
    this.internalValue.innerHTML = `${Math.round(this.snapshot.internalOsmolarity)} <small>mOsm/L</small>`;
    this.turgorValue.textContent = `${Math.round(this.snapshot.turgor * 100)}%`;
    this.turgorBar.style.width = `${Math.round(this.snapshot.turgor * 100)}%`;
    this.turgorCard.hidden = this.cellType === 'animal';
    this.fluxValue.textContent = waterDirectionLabel(this.snapshot);
    this.stateTitle.textContent = OSMOSIS_STATE_LABEL[this.snapshot.state];
    this.stateDetail.textContent = OSMOSIS_STATE_DESCRIPTION[this.snapshot.state];
    this.stateChip.textContent = OSMOSIS_STATE_LABEL[this.snapshot.state];
    this.stateChip.dataset.state = this.snapshot.state;
    this.timeOutput.textContent = `${this.snapshot.timeSec.toFixed(1)}초`;
    this.summaryEl.textContent = this.summaryTextValue();
    this.externalTag.textContent = `${summary.externalLabel} · ${this.external} mOsm/L`;
    const volumeState = this.container.querySelector('[data-element="volume-state"]');
    if (volumeState) volumeState.textContent = this.volumeStateLabel();
    const stateLabel = this.container.querySelector('[data-element="state-label"]');
    if (stateLabel) stateLabel.textContent = OSMOSIS_STATE_LABEL[this.snapshot.state];
    const stateEyebrow = this.container.querySelector('[data-element="state-eyebrow"]');
    if (stateEyebrow) stateEyebrow.textContent = `${summary.externalLabel} 반응`;

    this.concentrationInput.value = String(this.external);
    this.concentrationOutput.textContent = `${this.external} mOsm/L`;
    this.concentrationInput.setAttribute('aria-valuetext', `${this.external} mOsm/L, ${summary.externalLabel}`);
    this.presetButtons.forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.preset) === this.external);
    });
    if (force) {
      this.playButton.innerHTML = this.playing
        ? `${icon('pause', 18)} <span>일시 정지</span>`
        : `${icon('play', 18)} <span>${this.playLabel()}</span>`;
      this.playButton.classList.toggle('btn-pulse', !this.playing);
    }
  }

  private summaryTextValue(): string {
    const turgorText =
      this.cellType === 'plant' ? ` · 상대 팽압 ${Math.round(this.snapshot.turgor * 100)}%` : '';
    return `${CELL_TYPES[this.cellType].nameKo} · 부피 ${this.snapshot.volumeRatio.toFixed(2)}배 · ${OSMOSIS_STATE_LABEL[this.snapshot.state]}${turgorText} · ${waterDirectionLabel(this.snapshot)}`;
  }

  private initialSummary(): string {
    return `세포 밖 ${this.external} mOsm/L · 물의 흐름과 부피 변화를 관찰하세요.`;
  }

  private syncStore(): void {
    store.update((state) => {
      state.cell.type = this.cellType;
      state.osmosis.externalOsmolarity = this.external;
      state.osmosis.timeSec = this.snapshot.timeSec;
      state.osmosis.playing = this.playing;
      state.osmosis.snapshot = this.snapshot;
    });
  }

  destroy(): void {
    this.syncStore();
    this.scene?.dispose();
    this.container.replaceChildren();
  }
}

export function mountOsmosis(container: HTMLElement): OsmosisView {
  return new OsmosisView(container);
}
