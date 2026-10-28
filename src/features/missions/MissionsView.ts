import { CELL_TYPES, getOrganelles } from '../../bio/cellData';
import {
  CONCEPT_COLOR,
  CONCEPT_LABEL,
  MISSIONS,
  difficultyLabel,
  getMission,
  nextMission,
  type Mission,
} from '../../bio/missions';
import {
  createOsmosis,
  OSMOSIS_STATE_LABEL,
  stepOsmosis,
  type OsmosisSnapshot,
} from '../../bio/osmosis';
import {
  isValidStageOrder,
  MITOSIS_STAGES,
  stageAt,
  stageIndexById,
  type MitosisStageId,
} from '../../bio/mitosis';
import { MODEL_SCALE_NOTE, OSMOSIS_MODEL_NOTE, SIMPLIFIED_MODEL_NOTE } from '../../bio/scale';
import { store } from '../../app/state';
import { CellScene } from '../../render/CellScene';
import { MitosisScene } from '../../render/MitosisScene';
import { OsmosisScene } from '../../render/OsmosisScene';
import { announce, escapeHtml, icon, type IconName } from '../../ui/components';

const CONCEPT_ICON: Record<Mission['concept'], IconName> = {
  organelle: 'target',
  osmosis: 'droplet',
  plant: 'cell',
  mitosis: 'mitosis',
  scale: 'info',
};

const ORDER_POOL: MitosisStageId[] = [
  'metaphase',
  'interphase',
  'cytokinesis',
  'anaphase',
  'prophase',
  'telophase',
];

function stepStatus(done: boolean, active: boolean): string {
  if (done) return 'is-done';
  if (active) return 'is-active';
  return 'is-locked';
}

function progressBar(percent: number): string {
  return `<div class="progress-track" role="progressbar" aria-label="미션 완료 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}"><span style="width:${percent}%"></span></div>`;
}

export class MissionsListView {
  private readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    const state = store.get();
    const completed = state.mission.completed;
    const percent = (completed.length / MISSIONS.length) * 100;
    const next = MISSIONS.find((mission) => !completed.includes(mission.id));

    this.container.innerHTML = `
      <section class="view missions-view" aria-labelledby="missions-title">
        <header class="view-head">
          <div class="view-head-copy">
            <p class="eyebrow">미션 · 예측에서 설명까지</p>
            <h1 id="missions-title">여섯 가지 탐구 미션</h1>
            <p class="view-sub">예측하고, 직접 실험하고, 증거로 설명해 보세요. 완료한 미션은 이 브라우저에 저장됩니다.</p>
          </div>
          <div class="view-head-meta">
            <span class="badge">${icon('check', 15)} ${completed.length} / ${MISSIONS.length} 완료</span>
            <span class="badge">${icon('info', 15)} 서버 저장 없음</span>
          </div>
        </header>

        <section class="mission-progress-band" aria-label="전체 진행률">
          <div class="mission-progress-copy">
            <span>탐구 진행률</span>
            <strong>${Math.round(percent)}%</strong>
          </div>
          ${progressBar(percent)}
          <p>${next ? `다음 미션: ${escapeHtml(next.titleKo)}` : '모든 미션을 완료했습니다. 언제든 다시 도전할 수 있어요.'}</p>
        </section>

        <div class="mission-card-grid">
          ${MISSIONS.map((mission, index) => {
            const done = completed.includes(mission.id);
            const isNext = next?.id === mission.id;
            return `<article class="mission-card ${done ? 'is-done' : ''}" data-testid="mission-card-${mission.id}">
              <div class="mission-card-top">
                <span class="mission-index">${String(index + 1).padStart(2, '0')}</span>
                <span class="concept-badge" style="--concept:${CONCEPT_COLOR[mission.concept]}">${icon(CONCEPT_ICON[mission.concept], 14)} ${CONCEPT_LABEL[mission.concept]}</span>
                <span class="difficulty" aria-label="난이도 ${mission.difficulty} / 3">${'●'.repeat(mission.difficulty)}${'○'.repeat(3 - mission.difficulty)}</span>
              </div>
              <h2>${escapeHtml(mission.titleKo)}</h2>
              <p>${escapeHtml(mission.promptKo)}</p>
              <div class="mission-card-foot">
                <span class="mission-difficulty-label">${difficultyLabel(mission.difficulty)}</span>
                <a class="btn ${done ? 'btn-ghost' : 'btn-primary'} btn-sm ${isNext ? 'btn-pulse' : ''}" href="#/missions/${mission.id}" data-testid="mission-link-${mission.id}">
                  ${done ? `${icon('reset', 15)} 다시 도전` : `${icon('play', 15)} 시작`}
                </a>
              </div>
              ${done ? `<span class="mission-done-stamp">${icon('check', 14)} 완료</span>` : ''}
            </article>`;
          }).join('')}
        </div>

        <section class="teacher-invite">
          <div>
            <p class="eyebrow">교사용</p>
            <h2>수업 준비와 진행을 도와드려요</h2>
            <p>미션 정답과 해설을 확인하고, 동물·식물 삼투 장면을 바로 열거나 학습지를 인쇄할 수 있습니다.</p>
          </div>
          <a class="btn btn-ghost" href="#/teacher">${icon('teacher', 18)} 교사용 열기</a>
        </section>
      </section>
    `;
  }

  destroy(): void {
    this.container.replaceChildren();
  }
}

type SceneKind = 'cell' | 'osmosis' | 'mitosis';

export class MissionDetailView {
  private readonly container: HTMLElement;
  private readonly mission: Mission;
  private panel!: HTMLElement;
  private hud!: HTMLElement;
  private cellScene: CellScene | null = null;
  private osmosisScene: OsmosisScene | null = null;
  private mitosisScene: MitosisScene | null = null;
  private sceneKind: SceneKind;
  private predictionDone = false;
  private predictionChoice: string | null = null;
  private predictionError = false;
  private explanationDone = false;
  private explanationChoice: string | null = null;
  private explanationError = false;
  private found = new Set<string>();
  private selectedOrganelleId: string | null = null;
  private caseSolved = new Set<number>();
  private caseError: Record<number, boolean> = {};
  private observedScenarios = new Set<number>();
  private scenarioError = false;
  private order: MitosisStageId[] = [];
  private orderError = false;
  private orderCorrect = false;
  private anaphaseObserved = false;
  private nursingFocus: string | null = null;

  private osmosisSnapshot: OsmosisSnapshot;
  private osmosisPlaying = false;
  private osmosisStageIndex = 0;
  private osmosisCaseLabel = '';

  constructor(container: HTMLElement, mission: Mission) {
    this.container = container;
    this.mission = mission;
    this.sceneKind =
      mission.kind === 'osmosis-cases' || mission.kind === 'plant-wall'
        ? 'osmosis'
        : mission.kind === 'order' || mission.kind === 'anaphase'
          ? 'mitosis'
          : 'cell';
    this.osmosisSnapshot = createOsmosis(mission.setup.cellType, mission.setup.externalOsmolarity ?? 300);
    this.osmosisStageIndex = mission.setup.stageIndex ?? 0;
    this.renderShell();
    this.mountScene();
    this.renderPanel();
  }

  private renderShell(): void {
    const mission = this.mission;
    const completed = store.get().mission.completed.includes(mission.id);
    const note =
      this.sceneKind === 'osmosis'
        ? OSMOSIS_MODEL_NOTE
        : this.sceneKind === 'mitosis'
          ? SIMPLIFIED_MODEL_NOTE
          : MODEL_SCALE_NOTE;
    const hudLabel =
      this.sceneKind === 'osmosis'
        ? '삼투 실험 장면'
        : this.sceneKind === 'mitosis'
          ? '분열 장면'
          : `${CELL_TYPES[mission.setup.cellType].nameKo} 관찰`;

    this.container.innerHTML = `
      <section class="view mission-detail" aria-labelledby="mission-title">
        <header class="mission-head">
          <a class="back-link" href="#/missions">${icon('arrowLeft', 16)} 미션 목록</a>
          <div class="mission-head-main">
            <div>
              <p class="eyebrow">미션 ${String(MISSIONS.findIndex((item) => item.id === mission.id) + 1).padStart(2, '0')} · ${CONCEPT_LABEL[mission.concept]}</p>
              <h1 id="mission-title">${escapeHtml(mission.titleKo)}</h1>
              <p>${escapeHtml(mission.promptKo)}</p>
            </div>
            <div class="mission-head-badges">
              <span class="concept-badge" style="--concept:${CONCEPT_COLOR[mission.concept]}">${icon(CONCEPT_ICON[mission.concept], 14)} ${CONCEPT_LABEL[mission.concept]}</span>
              <span class="badge">난이도 ${difficultyLabel(mission.difficulty)}</span>
              ${completed ? `<span class="badge badge-success">${icon('check', 14)} 이전에 완료</span>` : ''}
            </div>
          </div>
        </header>

        <div class="mission-layout">
          <div class="mission-viewport-panel">
            <div class="viewport mission-viewport" id="mission-viewport" role="group" aria-label="미션 3D 장면" data-testid="mission-scene">
              <div class="viewport-topbar">
                <span class="specimen-tag">${icon('target', 14)} ${hudLabel}</span>
                <span class="specimen-tag">개념 모형</span>
              </div>
              <div class="mission-scene-hud" data-element="mission-hud">${this.hudInitial()}</div>
              <div class="scene-fallback" hidden>
                <h2>3D 화면을 열 수 없습니다</h2>
                <p>브라우저가 WebGL을 지원하지 않습니다. 오른쪽 미션 카드의 관찰 목록과 설명으로 진행할 수 있습니다.</p>
              </div>
              <p class="scene-hint" aria-hidden="true">드래그로 회전 · 스크롤로 확대</p>
            </div>
            <p class="scale-note">${icon('info', 14)}<span>${note}</span></p>
          </div>

          <div class="mission-panel" id="mission-panel" data-testid="mission-panel"></div>
        </div>
      </section>
    `;
    this.panel = this.container.querySelector('#mission-panel') as HTMLElement;
    this.hud = this.container.querySelector('[data-element="mission-hud"]') as HTMLElement;
    if (window.matchMedia('(max-width: 1100px)').matches) {
      // 모바일에서는 장면과 패널을 세로로 쌓습니다.
    }
  }

  private hudInitial(): string {
    if (this.sceneKind === 'osmosis') {
      return `${externalSolutionLabel(this.osmosisSnapshot)} · ${Math.round(this.osmosisSnapshot.externalOsmolarity)} mOsm/L`;
    }
    if (this.sceneKind === 'mitosis') {
      return `${this.mission.setup.stageIndex !== undefined ? this.mission.setup.stageIndex + 1 : 1}. ${stageAt(this.mission.setup.stageIndex ?? 0).nameKo}`;
    }
    return '소기관을 선택하면 여기에 표시됩니다.';
  }

  private mountScene(): void {
    const host = this.container.querySelector('#mission-viewport') as HTMLElement;
    const fallback = this.container.querySelector('.scene-fallback') as HTMLElement;
    const reducedMotion = store.get().preferences.reducedMotion;
    try {
      if (this.sceneKind === 'cell') {
        this.cellScene = new CellScene(host, {
          cellType: this.mission.setup.cellType,
          selectedOrganelleId: null,
          clipping: this.mission.kind === 'compare' ? 0.36 : 0.5,
          showLabels: false,
          autoRotate: false,
          reducedMotion,
          onSelect: (id) => this.handleCellSelection(id),
        });
      } else if (this.sceneKind === 'osmosis') {
        this.osmosisScene = new OsmosisScene(host, {
          cellType: this.mission.setup.cellType,
          snapshot: this.osmosisSnapshot,
          reducedMotion,
          playing: false,
        });
        this.osmosisScene.onUpdate = (dt) => this.tickOsmosis(dt);
      } else {
        this.mitosisScene = new MitosisScene(host, {
          stageIndex: this.mission.setup.stageIndex ?? 0,
          progress: this.mission.kind === 'anaphase' ? 0.55 : 0,
          reducedMotion,
        });
        this.mitosisScene.onUpdate = () => {};
      }
    } catch (error) {
      console.error('Mission scene init failed', error);
      fallback.hidden = false;
    }
  }

  private handleCellSelection(id: string | null): void {
    this.selectedOrganelleId = id;
    this.updateHud();
    const targets = this.mission.targets ?? [];
    if (id && targets.includes(id) && !this.found.has(id)) {
      this.found.add(id);
      const target = getOrganelles(this.mission.setup.cellType).find((item) => item.id === id);
      if (target) announce(`${target.nameKo}을 찾았습니다. ${target.functionKo}`);
      if (this.explorationDone()) {
        this.nursingFocus = '#explain-heading';
        this.renderPanel();
        announce('관찰을 완료했습니다. 이제 설명 단계로 넘어갑니다.');
      } else {
        this.updateTargetUi();
      }
    } else {
      this.updateTargetUi();
    }
  }

  private updateTargetUi(): void {
    const targets = this.mission.targets ?? [];
    targets.forEach((id) => {
      const button = this.panel.querySelector<HTMLButtonElement>(`[data-target="${id}"]`);
      if (!button) return;
      const found = this.found.has(id);
      button.classList.toggle('is-found', found);
      button.setAttribute('aria-pressed', String(found));
      const check = button.querySelector('.target-check');
      if (check) check.innerHTML = found ? icon('check', 14) : '+';
    });
    const count = this.panel.querySelector('[data-element="found-count"]');
    if (count) count.textContent = `${this.found.size} / ${targets.length}`;
    const selectedInfo = this.panel.querySelector('[data-element="selected-info"]');
    if (selectedInfo) {
      const organelle = this.selectedOrganelleId
        ? getOrganelles(this.mission.setup.cellType).find((item) => item.id === this.selectedOrganelleId)
        : undefined;
      selectedInfo.innerHTML = organelle
        ? `<strong>${escapeHtml(organelle.nameKo)}</strong><span>${escapeHtml(organelle.functionKo)}</span>`
        : '<span>소기관을 선택하면 이름과 기능이 여기에 표시됩니다.</span>';
    }
    const status = this.panel.querySelector('[data-element="task-status"]');
    if (status) {
      status.textContent = this.explorationDone()
        ? '모든 관찰을 마쳤습니다.'
        : `${targets.length - this.found.size}개를 더 찾아보세요.`;
    }
  }

  private updateHud(): void {
    if (this.sceneKind === 'osmosis') {
      this.hud.textContent = `${OSMOSIS_STATE_LABEL[this.osmosisSnapshot.state]} · 부피 ${this.osmosisSnapshot.volumeRatio.toFixed(2)}× · ${Math.round(this.osmosisSnapshot.externalOsmolarity)} mOsm/L`;
      return;
    }
    if (this.sceneKind === 'mitosis') {
      this.hud.textContent = `${this.osmosisStageIndex + 1}. ${stageAt(this.osmosisStageIndex).nameKo}`;
      return;
    }
    const organelle = this.selectedOrganelleId
      ? getOrganelles(this.mission.setup.cellType).find((item) => item.id === this.selectedOrganelleId)
      : undefined;
    this.hud.textContent = organelle
      ? `${organelle.nameKo} · ${organelle.functionKo}`
      : '소기관을 선택하면 여기에 표시됩니다.';
  }

  private tickOsmosis(dt: number): void {
    if (!this.osmosisPlaying) return;
    let remaining = Math.min(0.08, dt);
    while (remaining > 0) {
      const step = Math.min(1 / 60, remaining);
      this.osmosisSnapshot = stepOsmosis(this.osmosisSnapshot, step);
      remaining -= step;
      if (this.osmosisSnapshot.stable) break;
    }
    this.osmosisScene?.setSnapshot(this.osmosisSnapshot);
    this.updateHud();
    this.updateOsmosisReadout();
    if (this.osmosisSnapshot.stable && this.osmosisSnapshot.timeSec > 0.35) {
      this.osmosisPlaying = false;
      this.osmosisScene?.setPlaying(false);
      announce(
        `실험 결과: 부피 ${this.osmosisSnapshot.volumeRatio.toFixed(2)}배, ${OSMOSIS_STATE_LABEL[this.osmosisSnapshot.state]}.`,
      );
    }
  }

  private updateOsmosisReadout(): void {
    const readout = this.panel.querySelector('[data-element="osmosis-readout"]');
    if (!readout) return;
    readout.innerHTML = `<span>${escapeHtml(this.osmosisCaseLabel || '용액')}</span><strong>${this.osmosisSnapshot.volumeRatio.toFixed(2)}× · ${OSMOSIS_STATE_LABEL[this.osmosisSnapshot.state]}</strong><span>세포 안 ${Math.round(this.osmosisSnapshot.internalOsmolarity)} mOsm/L${this.mission.setup.cellType === 'plant' ? ` · 팽압 ${Math.round(this.osmosisSnapshot.turgor * 100)}%` : ''}</span>`;
  }

  private runOsmosisCase(osmolarity: number, label: string): void {
    this.osmosisCaseLabel = label;
    this.osmosisSnapshot = createOsmosis(this.mission.setup.cellType, osmolarity);
    this.osmosisScene?.resetParticles();
    this.osmosisScene?.setSnapshot(this.osmosisSnapshot);
    this.osmosisPlaying = true;
    this.osmosisScene?.setPlaying(true);
    this.updateHud();
    this.updateOsmosisReadout();
  }

  private explorationDone(): boolean {
    switch (this.mission.kind) {
      case 'hunt':
      case 'compare':
        return (this.mission.targets ?? []).every((id) => this.found.has(id));
      case 'osmosis-cases':
        return (this.mission.cases ?? []).every((_, index) => this.caseSolved.has(index));
      case 'plant-wall':
        return this.observedScenarios.size >= (this.mission.scenarios?.length ?? 0);
      case 'order':
        return this.orderCorrect;
      case 'anaphase':
        return this.anaphaseObserved;
      default:
        return false;
    }
  }

  private renderPanel(): void {
    const completed = this.explanationDone;
    const predictionStatus = this.predictionDone ? 'is-done' : 'is-active';
    const observeStatus = stepStatus(this.explorationDone(), this.predictionDone && !this.explorationDone());
    const explainStatus = stepStatus(
      this.explanationDone,
      this.predictionDone && this.explorationDone() && !this.explanationDone,
    );

    this.panel.innerHTML = `
      <div class="mission-progress" aria-label="미션 진행 단계">
        <div class="mission-step-pill ${predictionStatus}"><span>1</span><strong>예측</strong></div>
        <div class="mission-step-line"></div>
        <div class="mission-step-pill ${observeStatus}"><span>2</span><strong>관찰</strong></div>
        <div class="mission-step-line"></div>
        <div class="mission-step-pill ${explainStatus}"><span>3</span><strong>설명</strong></div>
      </div>

      <section class="mission-step ${predictionStatus}" aria-labelledby="prediction-heading">
        <div class="mission-step-head">
          <span class="step-kicker">01 · 예측</span>
          <h2 id="prediction-heading" tabindex="-1">${escapeHtml(this.mission.predictionPromptKo)}</h2>
        </div>
        ${
          this.predictionDone
            ? `<div class="feedback is-success">${icon('check', 17)} <span>예측 완료: ${escapeHtml(this.predictionChoice ?? '')}</span></div>`
            : `<fieldset class="choice-group">
                <legend class="sr-only">예측 선택</legend>
                ${this.mission.predictionOptions
                  .map(
                    (option) => `<label class="choice ${this.predictionChoice === option ? 'is-checked' : ''}">
                      <input type="radio" name="prediction-choice" value="${escapeHtml(option)}" ${this.predictionChoice === option ? 'checked' : ''} />
                      <span class="choice-marker" aria-hidden="true"></span>
                      <span>${escapeHtml(option)}</span>
                    </label>`,
                  )
                  .join('')}
              </fieldset>
              ${this.predictionError ? `<div class="feedback is-warn">${icon('info', 16)} <span>${escapeHtml(this.mission.predictionHintKo)}</span></div>` : ''}
              <button type="button" class="btn btn-primary btn-pulse" data-action="submit-prediction" data-testid="prediction-submit">${icon('check', 17)} 예측 확인</button>`
        }
      </section>

      ${
        this.predictionDone
          ? `<section class="mission-step ${observeStatus}" aria-labelledby="observe-heading">
              <div class="mission-step-head">
                <span class="step-kicker">02 · 관찰</span>
                <h2 id="observe-heading" tabindex="-1" data-element="task-heading">${escapeHtml(this.observePrompt())}</h2>
              </div>
              ${this.renderTask()}
            </section>`
          : ''
      }

      ${
        this.predictionDone && this.explorationDone()
          ? `<section class="mission-step ${explainStatus}" aria-labelledby="explain-heading">
              <div class="mission-step-head">
                <span class="step-kicker">03 · 설명</span>
                <h2 id="explain-heading" tabindex="-1">${escapeHtml(this.mission.explanationPromptKo)}</h2>
              </div>
              ${
                this.explanationDone
                  ? `<div class="feedback is-success">${icon('check', 17)} <span>설명 완료: ${escapeHtml(this.explanationChoice ?? '')}</span></div>`
                  : `<fieldset class="choice-group">
                      <legend class="sr-only">설명 선택</legend>
                      ${this.mission.explanationOptions
                        .map(
                          (option) => `<label class="choice ${this.explanationChoice === option ? 'is-checked' : ''}">
                            <input type="radio" name="explanation-choice" value="${escapeHtml(option)}" ${this.explanationChoice === option ? 'checked' : ''} />
                            <span class="choice-marker" aria-hidden="true"></span>
                            <span>${escapeHtml(option)}</span>
                          </label>`,
                        )
                        .join('')}
                    </fieldset>
                    ${this.explanationError ? `<div class="feedback is-warn">${icon('info', 16)} <span>${escapeHtml(this.mission.explanationHintKo)}</span></div>` : ''}
                    <button type="button" class="btn btn-primary btn-pulse" data-action="submit-explanation" data-testid="explain-submit">${icon('check', 17)} 설명 제출</button>`
              }
            </section>`
          : ''
      }

      ${
        completed
          ? `<section class="mission-complete" data-testid="mission-complete" tabindex="-1">
              <span class="complete-mark">${icon('check', 26)}</span>
              <p class="eyebrow">미션 완료</p>
              <h2>${escapeHtml(this.mission.titleKo)}</h2>
              <p class="complete-explanation">${escapeHtml(this.mission.explanationKo)}</p>
              <div class="takeaway-box"><strong>한 문장 정리</strong><p>${escapeHtml(this.mission.takeawayKo)}</p></div>
              <div class="complete-actions">
                <a class="btn btn-ghost" href="#/missions">미션 목록</a>
                ${
                  nextMission(this.mission.id)
                    ? `<a class="btn btn-primary btn-pulse" href="#/missions/${nextMission(this.mission.id)?.id}" data-testid="mission-next">다음 미션 ${icon('arrowRight', 17)}</a>`
                    : `<a class="btn btn-primary btn-pulse" href="#/missions">모든 미션 보기 ${icon('arrowRight', 17)}</a>`
                }
              </div>
            </section>`
          : ''
      }
    `;

    this.bindPanel();
    if (this.nursingFocus) {
      const selector = this.nursingFocus;
      this.nursingFocus = null;
      requestAnimationFrame(() => {
        this.panel.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
      });
    }
  }

  private observePrompt(): string {
    switch (this.mission.kind) {
      case 'hunt':
        return '다섯 소기관을 찾아 선택하세요.';
      case 'compare':
        return '식물세포에서만 볼 수 있는 구조 세 가지를 찾아 선택하세요.';
      case 'osmosis-cases':
        return '세 가지 용액에서 부피 변화를 확인하세요.';
      case 'plant-wall':
        return '저장액과 고장액을 차례로 실행해 보세요.';
      case 'order':
        return '여섯 단계 카드를 순서대로 놓으세요.';
      case 'anaphase':
        return '후기 장면에서 염색체의 움직임을 확인하세요.';
      default:
        return '관찰을 진행하세요.';
    }
  }

  private renderTask(): string {
    if (this.mission.kind === 'hunt' || this.mission.kind === 'compare') {
      const targets = this.mission.targets ?? [];
      const organelles = getOrganelles(this.mission.setup.cellType);
      return `
        <div class="task-status-row"><span class="task-count" data-element="found-count">${this.found.size} / ${targets.length}</span><span data-element="task-status">${this.explorationDone() ? '모든 관찰을 마쳤습니다.' : `${targets.length - this.found.size}개를 더 찾아보세요.`}</span></div>
        <div class="target-grid">
          ${targets
            .map((id) => {
              const organelle = organelles.find((item) => item.id === id);
              if (!organelle) return '';
              const found = this.found.has(id);
              return `<button type="button" class="target-chip ${found ? 'is-found' : ''}" data-target="${id}" aria-pressed="${found}">
                <span class="organelle-dot" style="--dot:${organelle.color}"></span>
                <span>${escapeHtml(organelle.nameKo)}</span>
                <span class="target-check">${found ? icon('check', 14) : '+'}</span>
              </button>`;
            })
            .join('')}
        </div>
        <div class="selected-info" data-element="selected-info">
          <span>소기관을 선택하면 이름과 기능이 여기에 표시됩니다.</span>
        </div>
        <div class="organelle-access">
          <p>${icon('list', 15)} 키보드·목록으로 찾기</p>
          <div class="mini-organelle-list">
            ${organelles
              .filter((organelle) => organelle.id !== 'cytoplasm')
              .map(
                (organelle) => `<button type="button" class="mini-organelle ${targets.includes(organelle.id) ? 'is-target' : ''}" data-pick="${organelle.id}">
                  <span class="organelle-dot" style="--dot:${organelle.color}"></span>${escapeHtml(organelle.nameKo)}
                </button>`,
              )
              .join('')}
          </div>
        </div>
        ${this.explorationDone() ? `<div class="feedback is-success">${icon('check', 17)} <span>모든 소기관을 찾았습니다. 이제 설명 단계로 이동하세요.</span></div>` : ''}
      `;
    }

    if (this.mission.kind === 'osmosis-cases') {
      return `
        <div class="osmosis-readout" data-element="osmosis-readout">${this.osmosisReadoutMarkup()}</div>
        <div class="case-list">
          ${(this.mission.cases ?? [])
            .map((item, index) => {
              const solved = this.caseSolved.has(index);
              return `<div class="case-row ${solved ? 'is-solved' : ''}">
                <div class="case-head">
                  <strong>${escapeHtml(item.labelKo)}</strong>
                  ${solved ? `<span class="case-solved">${icon('check', 14)} 관찰 완료</span>` : ''}
                </div>
                <div class="case-options">
                  ${item.options
                    .map(
                      (option) => `<button type="button" class="chip-btn ${solved && option === item.answer ? 'is-correct' : ''}" data-case="${index}" data-option="${escapeHtml(option)}" aria-label="${escapeHtml(item.labelKo)}: ${escapeHtml(option)}">${escapeHtml(option)}</button>`,
                    )
                    .join('')}
                </div>
                ${this.caseError[index] ? `<p class="case-hint">${icon('info', 14)} ${escapeHtml(this.mission.predictionHintKo)}</p>` : ''}
              </div>`;
            })
            .join('')}
        </div>
        <p class="task-footnote">정답을 고르면 실험이 자동으로 실행됩니다. 결과는 3D 장면과 위 수치에서 확인하세요.</p>
        ${this.explorationDone() ? `<div class="feedback is-success">${icon('check', 17)} <span>세 가지 용액을 모두 확인했습니다.</span></div>` : ''}
      `;
    }

    if (this.mission.kind === 'plant-wall') {
      return `
        <div class="osmosis-readout" data-element="osmosis-readout">${this.osmosisReadoutMarkup()}</div>
        <div class="scenario-grid">
          ${(this.mission.scenarios ?? [])
            .map(
              (scenario, index) => `<button type="button" class="scenario-card ${this.observedScenarios.has(index) ? 'is-observed' : ''}" data-scenario="${index}" data-osmolarity="${scenario.osmolarity}">
                <span class="scenario-icon">${icon('droplet', 20)}</span>
                <strong>${escapeHtml(scenario.labelKo)}</strong>
                <span>${this.observedScenarios.has(index) ? '관찰 완료' : '눌러서 실행'}</span>
              </button>`,
            )
            .join('')}
        </div>
        ${this.scenarioError ? `<div class="feedback is-warn">${icon('info', 16)} <span>두 용액을 모두 실행해 보세요.</span></div>` : ''}
        <p class="task-footnote">저장액에서는 세포가 팽팽해지고, 고장액에서는 세포막이 세포벽에서 떨어집니다.</p>
        ${this.explorationDone() ? `<div class="feedback is-success">${icon('check', 17)} <span>두 용액을 모두 관찰했습니다. 이제 설명 단계로 이동하세요.</span></div>` : ''}
      `;
    }

    if (this.mission.kind === 'order') {
      const slots = Array.from({ length: 6 }, (_, index) => {
        const id = this.order[index];
        const stage = id ? MITOSIS_STAGES.find((item) => item.id === id) : undefined;
        return `<div class="quiz-slot ${stage ? 'is-filled' : ''}">
          <span class="quiz-slot-index">${index + 1}</span>
          ${stage ? `<button type="button" class="quiz-slot-card" data-remove="${stage.id}" aria-label="${stage.nameKo} 빼기">${stage.nameKo}</button>` : '<span class="quiz-slot-empty">빈 자리</span>'}
        </div>`;
      }).join('');
      const remaining = ORDER_POOL.filter((id) => !this.order.includes(id));
      return `
        <div class="quiz-slots">${slots}</div>
        <div class="quiz-pool">
          ${remaining
            .map((id) => {
              const stage = MITOSIS_STAGES.find((item) => item.id === id);
              return stage
                ? `<button type="button" class="quiz-card" data-order="${stage.id}" aria-label="${stage.nameKo}을 다음 자리에 놓기">${stage.nameKo}</button>`
                : '';
            })
            .join('')}
        </div>
        ${this.orderError ? `<div class="feedback is-warn">${icon('info', 16)} <span>순서가 아직 맞지 않습니다. 간기는 DNA를 준비하는 첫 단계예요.</span></div>` : ''}
        ${this.orderCorrect ? `<div class="feedback is-success">${icon('check', 17)} <span>순서가 맞습니다. 간기 → 전기 → 중기 → 후기 → 말기 → 세포질 분열</span></div>` : ''}
        <div class="task-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="order-reset">${icon('reset', 16)} 비우기</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="order-check">${icon('check', 16)} 순서 확인</button>
        </div>
      `;
    }

    if (this.mission.kind === 'anaphase') {
      return `
        <div class="stage-jump-grid">
          ${MITOSIS_STAGES.map(
            (stage) => `<button type="button" class="chip-btn ${this.osmosisStageIndex === stage.index ? 'is-active' : ''}" data-stage="${stage.index}" aria-pressed="${this.osmosisStageIndex === stage.index}">${stage.index + 1}. ${stage.nameKo}</button>`,
          ).join('')}
        </div>
        <div class="anaphase-focus">
          <span class="anaphase-index">${this.osmosisStageIndex === 3 ? '후기' : `${this.osmosisStageIndex + 1}. ${stageAt(this.osmosisStageIndex).nameKo}`}</span>
          <p>${escapeHtml(stageAt(this.osmosisStageIndex).descriptionKo)}</p>
        </div>
        <button type="button" class="btn btn-primary btn-pulse" data-action="observe-anaphase" ${this.anaphaseObserved ? 'hidden' : ''}>${icon('check', 17)} 후기 장면을 관찰했어요</button>
        ${this.anaphaseObserved ? `<div class="feedback is-success">${icon('check', 17)} <span>관찰 완료. 이제 설명 단계로 이동하세요.</span></div>` : ''}
      `;
    }

    return '';
  }

  private osmosisReadoutMarkup(): string {
    return `<span>${escapeHtml(this.osmosisCaseLabel || '대기 중')}</span><strong>${this.osmosisSnapshot.volumeRatio.toFixed(2)}× · ${OSMOSIS_STATE_LABEL[this.osmosisSnapshot.state]}</strong><span>세포 안 ${Math.round(this.osmosisSnapshot.internalOsmolarity)} mOsm/L${this.mission.setup.cellType === 'plant' ? ` · 팽압 ${Math.round(this.osmosisSnapshot.turgor * 100)}%` : ''}</span>`;
  }

  private bindPanel(): void {
    this.panel.querySelector('[data-action="submit-prediction"]')?.addEventListener('click', () => {
      const selected = this.panel.querySelector<HTMLInputElement>('input[name="prediction-choice"]:checked');
      if (!selected) {
        this.predictionError = true;
        this.renderPanel();
        announce('예측을 하나 선택해 주세요.');
        return;
      }
      this.predictionChoice = selected.value;
      if (selected.value === this.mission.predictionAnswer) {
        this.predictionDone = true;
        this.predictionError = false;
        this.nursingFocus = '[data-element="task-heading"]';
        announce(`예측이 맞았습니다. ${this.observePrompt()}`);
        this.renderPanel();
      } else {
        this.predictionError = true;
        announce(`예측이 아직 맞지 않습니다. ${this.mission.predictionHintKo}`);
        this.renderPanel();
        requestAnimationFrame(() => {
          this.panel.querySelector<HTMLElement>('#prediction-heading')?.focus({ preventScroll: true });
        });
      }
    });

    this.panel.querySelector('[data-action="submit-explanation"]')?.addEventListener('click', () => {
      const selected = this.panel.querySelector<HTMLInputElement>('input[name="explanation-choice"]:checked');
      if (!selected) {
        this.explanationError = true;
        this.renderPanel();
        announce('설명을 하나 선택해 주세요.');
        return;
      }
      this.explanationChoice = selected.value;
      if (selected.value === this.mission.explanationAnswer) {
        this.explanationDone = true;
        this.explanationError = false;
        store.completeMission(this.mission.id, selected.value);
        announce(`미션을 완료했습니다. ${this.mission.takeawayKo}`);
        this.nursingFocus = '[data-testid="mission-complete"]';
        this.renderPanel();
      } else {
        this.explanationError = true;
        announce(`설명이 아직 맞지 않습니다. ${this.mission.explanationHintKo}`);
        this.renderPanel();
        requestAnimationFrame(() => {
          this.panel.querySelector<HTMLElement>('#explain-heading')?.focus({ preventScroll: true });
        });
      }
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.target ?? null;
        if (!id) return;
        this.cellScene?.setSelected(id);
        this.handleCellSelection(id);
      });
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.pick ?? null;
        if (!id) return;
        this.cellScene?.setSelected(id);
        this.handleCellSelection(id);
      });
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-case]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.case);
        const option = button.dataset.option ?? '';
        const item = this.mission.cases?.[index];
        if (!item) return;
        if (option === item.answer) {
          this.caseSolved.add(index);
          this.caseError[index] = false;
          this.runOsmosisCase(item.osmolarity, item.labelKo);
          announce(`${item.labelKo}: ${option}. 실험을 실행했습니다.`);
          this.nursingFocus = this.explorationDone()
            ? '#explain-heading'
            : `[data-case="${this.nextUnsolvedCase()}"]`;
          this.renderPanel();
          if (this.explorationDone()) announce('세 가지 용액을 모두 확인했습니다. 이제 설명 단계로 이동하세요.');
        } else {
          this.caseError[index] = true;
          announce(`다시 생각해 보세요. ${this.mission.predictionHintKo}`);
          this.renderPanel();
          requestAnimationFrame(() => {
            this.panel.querySelector<HTMLElement>(`[data-case="${index}"]`)?.focus({ preventScroll: true });
          });
        }
      });
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.scenario);
        const osmolarity = Number(button.dataset.osmolarity);
        const scenario = this.mission.scenarios?.[index];
        if (!scenario) return;
        this.observedScenarios.add(index);
        this.scenarioError = false;
        this.runOsmosisCase(osmolarity, scenario.labelKo);
        announce(`${scenario.labelKo} 용액에서 실험을 실행했습니다.`);
        this.nursingFocus = this.explorationDone() ? '#explain-heading' : '[data-element="task-heading"]';
        this.renderPanel();
        if (this.explorationDone()) announce('두 용액을 모두 관찰했습니다. 이제 설명 단계로 이동하세요.');
      });
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-order]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.order as MitosisStageId;
        if (this.order.includes(id) || this.order.length >= 6) return;
        this.order.push(id);
        this.orderError = false;
        const stageIndex = stageIndexById(id);
        this.osmosisStageIndex = stageIndex;
        this.mitosisScene?.setStage(stageIndex, 0.55);
        this.updateHud();
        this.nursingFocus = '[data-order]';
        this.renderPanel();
      });
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        this.order = this.order.filter((id) => id !== button.dataset.remove);
        this.orderCorrect = false;
        this.renderPanel();
      });
    });

    this.panel.querySelector('[data-action="order-reset"]')?.addEventListener('click', () => {
      this.order = [];
      this.orderError = false;
      this.orderCorrect = false;
      this.renderPanel();
    });

    this.panel.querySelector('[data-action="order-check"]')?.addEventListener('click', () => {
      if (this.order.length < 6) {
        this.orderError = true;
        announce('카드 6개를 모두 놓은 뒤 확인해 주세요.');
        this.renderPanel();
        return;
      }
      if (isValidStageOrder(this.order)) {
        this.orderCorrect = true;
        this.orderError = false;
        this.osmosisStageIndex = 5;
        this.mitosisScene?.setStage(5, 1);
        this.updateHud();
        announce('분열 순서가 맞습니다. 이제 설명 단계로 이동하세요.');
        this.nursingFocus = '#explain-heading';
        this.renderPanel();
      } else {
        this.orderError = true;
        announce('순서가 아직 맞지 않습니다. 간기에서 시작해 보세요.');
        this.renderPanel();
        requestAnimationFrame(() => {
          this.panel.querySelector<HTMLElement>('[data-action="order-check"]')?.focus({ preventScroll: true });
        });
      }
    });

    this.panel.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.stage);
        this.osmosisStageIndex = index;
        this.mitosisScene?.setStage(index, index === 3 ? 0.55 : 0.25);
        this.updateHud();
        announce(`${index + 1}단계 ${stageAt(index).nameKo}.`);
        this.nursingFocus = `[data-stage="${index}"]`;
        this.renderPanel();
      });
    });

    this.panel.querySelector('[data-action="observe-anaphase"]')?.addEventListener('click', () => {
      this.anaphaseObserved = true;
      this.updateHud();
      announce('후기 장면을 관찰했습니다. 이제 설명 단계로 이동하세요.');
      this.nursingFocus = '#explain-heading';
      this.renderPanel();
    });
  }

  private nextUnsolvedCase(): number {
    const cases = this.mission.cases ?? [];
    for (let index = 0; index < cases.length; index += 1) {
      if (!this.caseSolved.has(index)) return index;
    }
    return 0;
  }

  destroy(): void {
    this.cellScene?.dispose();
    this.osmosisScene?.dispose();
    this.mitosisScene?.dispose();
    this.container.replaceChildren();
  }
}

export function mountMissions(container: HTMLElement, missionId: string | null): MissionsListView | MissionDetailView {
  const mission = getMission(missionId);
  if (mission) return new MissionDetailView(container, mission);
  return new MissionsListView(container);
}

function externalSolutionLabel(snapshot: OsmosisSnapshot): string {
  if (snapshot.externalOsmolarity < 285) return '저장액';
  if (snapshot.externalOsmolarity > 315) return '고장액';
  return '등장액';
}
