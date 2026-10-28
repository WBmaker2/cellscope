import {
  chromosomeCountAt,
  isValidStageOrder,
  MITOSIS_STAGES,
  stageAt,
  stageOrderSummary,
  type MitosisStageId,
  type NuclearEnvelopeState,
  type SpindleState,
} from '../../bio/mitosis';
import { SIMPLIFIED_MODEL_NOTE } from '../../bio/scale';
import { store } from '../../app/state';
import { MitosisScene } from '../../render/MitosisScene';
import { announce, escapeHtml, icon } from '../../ui/components';

const ENVELOPE_LABEL: Record<NuclearEnvelopeState, string> = {
  intact: '유지',
  breaking: '분해 중',
  gone: '없음',
  reforming: '재형성 중',
};

const SPINDLE_LABEL: Record<SpindleState, string> = {
  none: '없음',
  forming: '형성 중',
  full: '완성',
  pulling: '당기는 중',
  disassembling: '사라지는 중',
};

const QUIZ_ORDER: MitosisStageId[] = [
  'metaphase',
  'interphase',
  'cytokinesis',
  'anaphase',
  'prophase',
  'telophase',
];

const REPRESENTATIVE_PROGRESS = [0.3, 0.55, 0.92, 0.55, 0.5, 0.5];

function representativeProgress(index: number): number {
  return REPRESENTATIVE_PROGRESS[index] ?? 0.5;
}

export class MitosisView {
  private readonly container: HTMLElement;
  private scene: MitosisScene | null = null;
  private stageIndex: number;
  private progress: number;
  private playing: boolean;
  private uiClock = 0;
  private lastStage = -1;
  private playButton!: HTMLButtonElement;
  private scrubber!: HTMLInputElement;
  private stageChip!: HTMLElement;
  private stageName!: HTMLElement;
  private stageDescription!: HTMLElement;
  private stageTip!: HTMLElement;
  private stageCount!: HTMLElement;
  private envelopeValue!: HTMLElement;
  private spindleValue!: HTMLElement;
  private chromosomeValue!: HTMLElement;
  private cellValue!: HTMLElement;
  private summaryEl!: HTMLElement;
  private stageButtons: HTMLButtonElement[] = [];
  private quizOrder: MitosisStageId[] = [];
  private quizMessage!: HTMLElement;
  private quizSlots!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const state = store.get().mitosis;
    this.stageIndex = state.stageIndex;
    this.progress = state.progress;
    this.playing = false;
    this.render();
    this.bind();
    this.mountScene();
    this.updateUi(true);
  }

  private render(): void {
    const stage = stageAt(this.stageIndex);
    const count = chromosomeCountAt(this.stageIndex);
    this.container.innerHTML = `
      <section class="view lab-view mitosis-view" aria-labelledby="mitosis-title">
        <header class="view-head">
          <div class="view-head-copy">
            <p class="eyebrow">분열 실험 · 염색체의 이동</p>
            <h1 id="mitosis-title">세포는 어떻게 복제될까?</h1>
            <p class="view-sub">단계를 넘기며 염색체가 응축되고, 적도면에 정렬되고, 양극으로 분리되는 과정을 관찰하세요.</p>
          </div>
          <div class="view-head-meta">
            <span class="badge badge-ochre">${icon('mitosis', 15)} 간단화 모형 · 4염색체</span>
            <span class="badge">사람은 46개</span>
          </div>
        </header>

        <div class="lab-layout mitosis-layout">
          <details class="panel panel-left" open>
            <summary>단계 조절</summary>
            <div class="panel-body">
              <div class="stage-list" aria-label="분열 단계">
                ${MITOSIS_STAGES.map(
                  (item) => `<button type="button" class="stage-list-item ${item.index === this.stageIndex ? 'is-active' : ''}" data-stage="${item.index}" aria-pressed="${item.index === this.stageIndex}" data-testid="stage-list-${item.index}">
                    <span class="stage-number">${item.index + 1}</span>
                    <span class="stage-list-copy"><strong>${item.nameKo}</strong><span>${item.nameEn}</span></span>
                    ${icon('chevronRight', 15)}
                  </button>`,
                ).join('')}
              </div>

              <div class="stage-play-controls">
                <button type="button" class="btn btn-primary btn-pulse" data-action="play" data-testid="stage-play">${icon('play', 18)} <span>재생</span></button>
                <button type="button" class="btn btn-ghost" data-action="reset">${icon('reset', 17)} <span>처음으로</span></button>
              </div>

              <div class="cutaway-control">
                <div class="cutaway-head">
                  <label for="stage-scrubber">단계 미세 조절</label>
                  <output id="stage-scrubber-value" for="stage-scrubber">${this.stageIndex + 1}. ${stage.nameKo}</output>
                </div>
                <input class="range" id="stage-scrubber" type="range" min="0" max="5.999" step="0.001" value="${(this.stageIndex + this.progress).toFixed(3)}" aria-describedby="scrubber-help" data-testid="stage-scrubber" />
                <p class="field-help" id="scrubber-help">슬라이더로 단계 사이의 장면을 세밀하게 볼 수 있습니다.</p>
              </div>

              <div class="model-note">
                ${icon('info', 16)}
                <p>${SIMPLIFIED_MODEL_NOTE}</p>
              </div>
            </div>
          </details>

          <div class="viewport-panel">
            <div class="viewport lab-viewport" id="mitosis-viewport" role="group" aria-label="세포 분열 3D 장면" data-testid="mitosis-scene">
              <div class="viewport-topbar">
                <span class="state-chip state-ochre" id="mitosis-stage-chip" data-testid="stage-chip">${this.stageIndex + 1}. ${stage.nameKo}</span>
                <span class="specimen-tag">모형 · <span data-element="stage-fraction">${Math.round(this.progress * 100)}%</span></span>
              </div>
              <div class="stage-overlay" aria-hidden="true">
                <span class="stage-overlay-index">${String(this.stageIndex + 1).padStart(2, '0')}</span>
                <span class="stage-overlay-name">${stage.nameEn.toUpperCase()}</span>
              </div>
              <div class="scene-fallback" hidden>
                <h2>3D 화면을 열 수 없습니다</h2>
                <p>브라우저가 WebGL을 지원하지 않습니다. 오른쪽 단계 설명과 염색체 수치로 과정을 확인할 수 있습니다.</p>
              </div>
              <p class="scene-hint" aria-hidden="true">드래그로 회전 · 단계 버튼으로 이동</p>
            </div>

            <div class="stage-timeline" role="group" aria-label="분열 단계 타임라인">
              ${MITOSIS_STAGES.map(
                (item) => `<button type="button" class="timeline-stop ${item.index === this.stageIndex ? 'is-active' : ''}" data-stage="${item.index}" data-testid="stage-btn-${item.index}" aria-pressed="${item.index === this.stageIndex}" aria-label="${item.index + 1}단계 ${item.nameKo}">
                  <span class="timeline-dot"></span>
                  <span class="timeline-index">${item.index + 1}</span>
                  <span class="timeline-name">${item.nameKo}</span>
                </button>`,
              ).join('')}
              <span class="timeline-line" aria-hidden="true"></span>
            </div>

            <div class="lab-controls">
              <div class="lab-controls-left">
                <button type="button" class="btn btn-ghost btn-sm" data-action="prev" aria-label="이전 단계">${icon('chevronLeft', 17)} 이전</button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="next" aria-label="다음 단계">다음 ${icon('chevronRight', 17)}</button>
              </div>
              <div class="time-readout"><span>현재 단계</span><strong data-element="stage-time">${stage.nameKo} · ${Math.round(this.progress * 100)}%</strong></div>
            </div>

            <div class="viewport-footer">
              <p class="viewport-summary" id="mitosis-summary">${this.summaryText()}</p>
              <p class="scale-note">${icon('info', 14)}<span>${SIMPLIFIED_MODEL_NOTE}</span></p>
            </div>
          </div>

          <details class="panel panel-right" open>
            <summary>단계 설명</summary>
            <div class="panel-body">
              <div class="stage-info-card">
                <p class="eyebrow" data-element="stage-eyebrow">${this.stageIndex + 1} / 6 · ${stage.nameEn}</p>
                <h2 data-testid="stage-title" data-element="stage-title">${stage.nameKo}</h2>
                <p data-element="stage-description">${escapeHtml(stage.descriptionKo)}</p>
                <p class="stage-tip">${icon('spark', 16)} <span data-element="stage-tip">${escapeHtml(stage.tipKo)}</span></p>
              </div>

              <div class="measure-grid">
                <div class="measure-cell">
                  <span class="measure-label">세포 수</span>
                  <strong data-element="cell-count">${count.cells}개</strong>
                </div>
                <div class="measure-cell">
                  <span class="measure-label">염색체</span>
                  <strong data-element="chromosome-count">${count.labelKo}</strong>
                </div>
                <div class="measure-cell">
                  <span class="measure-label">핵막</span>
                  <strong data-element="envelope-state">${ENVELOPE_LABEL[stage.nuclearEnvelope]}</strong>
                </div>
                <div class="measure-cell">
                  <span class="measure-label">방추사</span>
                  <strong data-element="spindle-state">${SPINDLE_LABEL[stage.spindle]}</strong>
                </div>
              </div>

              <div class="teaching-note">
                ${icon('mitosis', 18)}
                <p><strong>관찰 포인트</strong> 중기에는 염색체가 한 줄로 정렬되고, 후기에는 자매 염색분체가 갈라져 양극으로 이동합니다.</p>
              </div>
            </div>
          </details>
        </div>

        <section class="quiz-section" aria-labelledby="quiz-title">
          <div class="quiz-head">
            <div>
              <p class="eyebrow">연습</p>
              <h2 id="quiz-title">분열 순서 맞추기</h2>
              <p>카드를 누르면 다음 자리에 들어갑니다. 놓인 카드를 다시 누르면 빠집니다.</p>
            </div>
            <div class="quiz-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-action="quiz-reset">${icon('reset', 16)} 비우기</button>
              <button type="button" class="btn btn-primary btn-sm" data-action="quiz-check">${icon('check', 16)} 확인</button>
            </div>
          </div>
          <div class="quiz-slots" data-element="quiz-slots" aria-live="polite"></div>
          <div class="quiz-pool" data-element="quiz-pool"></div>
          <p class="quiz-message" data-element="quiz-message" role="status"></p>
        </section>
      </section>
    `;

    this.playButton = this.container.querySelector('[data-action="play"]') as HTMLButtonElement;
    this.scrubber = this.container.querySelector('#stage-scrubber') as HTMLInputElement;
    this.stageChip = this.container.querySelector('#mitosis-stage-chip') as HTMLElement;
    this.stageName = this.container.querySelector('[data-element="stage-title"]') as HTMLElement;
    this.stageDescription = this.container.querySelector('[data-element="stage-description"]') as HTMLElement;
    this.stageTip = this.container.querySelector('[data-element="stage-tip"]') as HTMLElement;
    this.stageCount = this.container.querySelector('[data-element="chromosome-count"]') as HTMLElement;
    this.envelopeValue = this.container.querySelector('[data-element="envelope-state"]') as HTMLElement;
    this.spindleValue = this.container.querySelector('[data-element="spindle-state"]') as HTMLElement;
    this.chromosomeValue = this.container.querySelector('[data-element="chromosome-count"]') as HTMLElement;
    this.cellValue = this.container.querySelector('[data-element="cell-count"]') as HTMLElement;
    this.summaryEl = this.container.querySelector('#mitosis-summary') as HTMLElement;
    this.quizMessage = this.container.querySelector('[data-element="quiz-message"]') as HTMLElement;
    this.quizSlots = this.container.querySelector('[data-element="quiz-slots"]') as HTMLElement;
    this.stageButtons = Array.from(this.container.querySelectorAll('[data-stage]'));
    this.renderQuiz();

    if (window.matchMedia('(max-width: 1100px)').matches) {
      this.container.querySelectorAll<HTMLDetailsElement>('.panel').forEach((panel) => {
        panel.open = false;
      });
    }
  }

  private bind(): void {
    this.stageButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.stage);
        this.setPlaying(false);
        this.goToStage(index, representativeProgress(index), true);
      });
    });

    this.scrubber.addEventListener('input', () => {
      const value = Number(this.scrubber.value);
      const index = Math.min(5, Math.floor(value));
      const progress = Math.min(0.999, value - index);
      this.setPlaying(false);
      this.goToStage(index, progress, false);
    });

    this.container.querySelectorAll('[data-action="play"]').forEach((button) => {
      button.addEventListener('click', () => this.togglePlay());
    });
    this.container.querySelectorAll('[data-action="reset"]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setPlaying(false);
        this.goToStage(0, 0, true);
        announce('분열 실험을 간기 처음으로 되돌렸습니다.');
      });
    });

    this.container.querySelectorAll('[data-action="prev"]').forEach((button) => {
      button.addEventListener('click', () => this.stepStage(-1));
    });
    this.container.querySelectorAll('[data-action="next"]').forEach((button) => {
      button.addEventListener('click', () => this.stepStage(1));
    });

    this.container.querySelectorAll('[data-action="quiz-reset"]').forEach((button) => {
      button.addEventListener('click', () => {
        this.quizOrder = [];
        this.renderQuiz();
        this.quizMessage.textContent = '';
      });
    });
    this.container.querySelectorAll('[data-action="quiz-check"]').forEach((button) => {
      button.addEventListener('click', () => this.checkQuiz());
    });
  }

  private mountScene(): void {
    const host = this.container.querySelector('#mitosis-viewport') as HTMLElement;
    const fallback = this.container.querySelector('.scene-fallback') as HTMLElement;
    try {
      this.scene = new MitosisScene(host, {
        stageIndex: this.stageIndex,
        progress: this.progress,
        reducedMotion: store.get().preferences.reducedMotion,
      });
      this.scene.onUpdate = (dt) => this.tick(dt);
    } catch (error) {
      console.error('MitosisScene init failed', error);
      fallback.hidden = false;
      this.scene = null;
    }
  }

  private tick(dt: number): void {
    if (!this.playing) return;
    const stage = stageAt(this.stageIndex);
    this.progress += dt / stage.durationSec;
    if (this.progress >= 1) {
      if (this.stageIndex < MITOSIS_STAGES.length - 1) {
        this.stageIndex += 1;
        this.progress = 0;
        announce(`${this.stageIndex + 1}단계 ${stageAt(this.stageIndex).nameKo}. ${stageAt(this.stageIndex).descriptionKo}`);
        this.lastStage = this.stageIndex;
      } else {
        this.progress = 1;
        this.playing = false;
      }
    }
    this.scene?.setStage(this.stageIndex, this.progress);
    this.uiClock += dt;
    if (this.uiClock > 0.1) {
      this.uiClock = 0;
      this.updateUi(false);
    }
    if (!this.playing && this.stageIndex === MITOSIS_STAGES.length - 1 && this.progress >= 1) {
      announce('세포질 분열이 끝났습니다. 염색체 수가 같은 두 개의 딸세포가 만들어졌습니다.');
      this.setPlaying(false);
      this.updateUi(true);
    }
  }

  private goToStage(index: number, progress: number, announceStage: boolean): void {
    this.stageIndex = Math.max(0, Math.min(5, index));
    this.progress = Math.max(0, Math.min(1, progress));
    this.scene?.setStage(this.stageIndex, this.progress);
    this.updateUi(true);
    if (announceStage) {
      const stage = stageAt(this.stageIndex);
      announce(`${this.stageIndex + 1}단계 ${stage.nameKo}. ${stage.descriptionKo}`);
    }
    this.syncStore();
  }

  private stepStage(direction: number): void {
    const next = Math.max(0, Math.min(5, this.stageIndex + direction));
    this.setPlaying(false);
    this.goToStage(next, representativeProgress(next), true);
  }

  private togglePlay(): void {
    if (this.playing) {
      this.setPlaying(false);
      announce('분열 애니메이션을 일시 정지했습니다.');
      return;
    }
    if (this.stageIndex === 5 && this.progress >= 0.999) {
      this.stageIndex = 0;
      this.progress = 0;
      this.scene?.setStage(0, 0);
    }
    this.setPlaying(true);
    const stage = stageAt(this.stageIndex);
    announce(`${stage.nameKo} 단계부터 분열 애니메이션을 재생합니다.`);
  }

  private setPlaying(playing: boolean): void {
    this.playing = playing;
    this.playButton.innerHTML = playing
      ? `${icon('pause', 18)} <span>일시 정지</span>`
      : `${icon('play', 18)} <span>재생</span>`;
    this.playButton.classList.toggle('btn-pulse', !playing);
    store.update((state) => {
      state.mitosis.playing = playing;
      state.mitosis.stageIndex = this.stageIndex;
      state.mitosis.progress = this.progress;
    });
  }

  private updateUi(force: boolean): void {
    const stage = stageAt(this.stageIndex);
    const count = chromosomeCountAt(this.stageIndex);
    this.stageChip.textContent = `${this.stageIndex + 1}. ${stage.nameKo}`;
    this.stageName.textContent = stage.nameKo;
    this.stageDescription.textContent = stage.descriptionKo;
    this.stageTip.textContent = stage.tipKo;
    this.stageCount.textContent = count.labelKo;
    this.chromosomeValue.textContent = count.labelKo;
    this.cellValue.textContent = `${count.cells}개`;
    this.envelopeValue.textContent = ENVELOPE_LABEL[stage.nuclearEnvelope];
    this.spindleValue.textContent = SPINDLE_LABEL[stage.spindle];
    const eyebrow = this.container.querySelector('[data-element="stage-eyebrow"]');
    if (eyebrow) eyebrow.textContent = `${this.stageIndex + 1} / 6 · ${stage.nameEn}`;
    const fraction = this.container.querySelector('[data-element="stage-fraction"]');
    if (fraction) fraction.textContent = `${Math.round(this.progress * 100)}%`;
    const stageTime = this.container.querySelector('[data-element="stage-time"]');
    if (stageTime) stageTime.textContent = `${stage.nameKo} · ${Math.round(this.progress * 100)}%`;
    const scrubberValue = this.container.querySelector('#stage-scrubber-value');
    if (scrubberValue) scrubberValue.textContent = `${this.stageIndex + 1}. ${stage.nameKo}`;
    this.scrubber.value = (this.stageIndex + this.progress).toFixed(3);
    this.scrubber.setAttribute(
      'aria-valuetext',
      `${stage.nameKo} ${Math.round(this.progress * 100)}퍼센트`,
    );
    this.stageButtons.forEach((button) => {
      const active = Number(button.dataset.stage) === this.stageIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      if (button.classList.contains('timeline-stop')) {
        button.setAttribute('aria-current', active ? 'step' : 'false');
      }
    });
    const overlayIndex = this.container.querySelector('.stage-overlay-index');
    if (overlayIndex) overlayIndex.textContent = String(this.stageIndex + 1).padStart(2, '0');
    const overlayName = this.container.querySelector('.stage-overlay-name');
    if (overlayName) overlayName.textContent = stage.nameEn.toUpperCase();
    this.summaryEl.textContent = this.summaryText();
    if (force) this.updateUiControls();
  }

  private updateUiControls(): void {
    this.playButton.innerHTML = this.playing
      ? `${icon('pause', 18)} <span>일시 정지</span>`
      : `${icon('play', 18)} <span>재생</span>`;
    this.playButton.classList.toggle('btn-pulse', !this.playing);
  }

  private summaryText(): string {
    const stage = stageAt(this.stageIndex);
    const count = chromosomeCountAt(this.stageIndex);
    return `${this.stageIndex + 1}단계 ${stage.nameKo} · ${count.labelKo} · 핵막 ${ENVELOPE_LABEL[stage.nuclearEnvelope]} · 방추사 ${SPINDLE_LABEL[stage.spindle]}`;
  }

  private renderQuiz(): void {
    const slots = Array.from({ length: 6 }, (_, index) => {
      const id = this.quizOrder[index];
      const stage = id ? MITOSIS_STAGES.find((item) => item.id === id) : undefined;
      return `<div class="quiz-slot ${stage ? 'is-filled' : ''}">
        <span class="quiz-slot-index">${index + 1}</span>
        ${
          stage
            ? `<button type="button" class="quiz-slot-card" data-remove="${stage.id}" aria-label="${stage.nameKo} 빼기">${stage.nameKo}</button>`
            : '<span class="quiz-slot-empty">빈 자리</span>'
        }
      </div>`;
    }).join('');
    this.quizSlots.innerHTML = slots;
    const remaining = QUIZ_ORDER.filter((id) => !this.quizOrder.includes(id));
    const pool = this.container.querySelector('[data-element="quiz-pool"]') as HTMLElement;
    pool.innerHTML = remaining
      .map(
        (id) => {
          const stage = MITOSIS_STAGES.find((item) => item.id === id);
          return stage
            ? `<button type="button" class="quiz-card" data-order="${stage.id}" aria-label="${stage.nameKo}을 다음 자리에 놓기">${stage.nameKo}</button>`
            : '';
        },
      )
      .join('');
    if (!remaining.length) {
      pool.innerHTML = '<p class="quiz-complete">모든 카드를 놓았습니다. 순서를 확인해 보세요.</p>';
    }

    this.quizSlots.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        this.quizOrder = this.quizOrder.filter((id) => id !== button.dataset.remove);
        this.quizMessage.textContent = '';
        this.renderQuiz();
      });
    });
    pool.querySelectorAll<HTMLButtonElement>('[data-order]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.order as MitosisStageId;
        if (this.quizOrder.includes(id) || this.quizOrder.length >= 6) return;
        this.quizOrder.push(id);
        this.quizMessage.textContent = '';
        this.renderQuiz();
      });
    });
  }

  private checkQuiz(): void {
    if (this.quizOrder.length < 6) {
      this.quizMessage.textContent = '카드 6개를 모두 놓은 뒤 확인해 주세요.';
      this.quizMessage.dataset.tone = 'warn';
      return;
    }
    if (isValidStageOrder(this.quizOrder)) {
      this.quizMessage.textContent = `정답입니다. ${stageOrderSummary(this.quizOrder)} 순서가 맞습니다.`;
      this.quizMessage.dataset.tone = 'success';
      announce('분열 순서를 맞혔습니다. 간기부터 세포질 분열까지 순서가 맞습니다.');
    } else {
      this.quizMessage.textContent = `다시 확인해 보세요. 간기는 DNA를 준비하는 첫 단계입니다.`;
      this.quizMessage.dataset.tone = 'warn';
      announce('분열 순서가 아직 맞지 않습니다. 간기에서 시작해 보세요.');
    }
  }

  private syncStore(): void {
    store.update((state) => {
      state.mitosis.stageIndex = this.stageIndex;
      state.mitosis.progress = this.progress;
      state.mitosis.playing = this.playing;
    });
  }

  destroy(): void {
    this.syncStore();
    this.scene?.dispose();
    this.container.replaceChildren();
  }
}

export function mountMitosis(container: HTMLElement): MitosisView {
  return new MitosisView(container);
}
