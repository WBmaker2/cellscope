import { CONCEPT_LABEL, MISSIONS } from '../../bio/missions';
import { createOsmosis } from '../../bio/osmosis';
import { MODEL_SCALE_NOTE } from '../../bio/scale';
import { store } from '../../app/state';
import { navigate } from '../../app/routes';
import {
  announce,
  confirmDialog,
  escapeHtml,
  icon,
  toast,
} from '../../ui/components';

export class TeacherView {
  private readonly container: HTMLElement;
  private answersVisible = false;
  private focusAfterRender: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    const completed = store.get().mission.completed;
    this.container.innerHTML = `
      <section class="view teacher-view" aria-labelledby="teacher-title">
        <header class="view-head">
          <div class="view-head-copy">
            <p class="eyebrow">교사용 · 수업 준비</p>
            <h1 id="teacher-title">수업을 준비하고 진행하세요</h1>
            <p class="view-sub">미션 정답과 해설을 확인하고, 삼투·분열 장면을 바로 열거나 학습지를 인쇄할 수 있습니다. 모든 기록은 이 브라우저에만 저장됩니다.</p>
          </div>
          <div class="view-head-meta">
            <span class="badge">${icon('check', 15)} ${completed.length} / ${MISSIONS.length} 완료</span>
            <span class="badge">${icon('teacher', 15)} 교사용</span>
          </div>
        </header>

        <div class="teacher-grid">
          <section class="teacher-card teacher-presets" aria-labelledby="presets-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">바로 열기</p>
                <h2 id="presets-title">수업 장면 프리셋</h2>
              </div>
            </div>
            <p class="card-copy">장면을 누르면 해당 실험실로 이동하며 상태가 설정됩니다.</p>
            <div class="preset-grid">
              <button type="button" class="preset-card" data-preset="animal-hypo">
                <span class="preset-icon">${icon('droplet', 20)}</span>
                <strong>동물세포 · 저장액</strong>
                <span>150 mOsm/L · 팽창과 파열</span>
              </button>
              <button type="button" class="preset-card" data-preset="plant-hyper">
                <span class="preset-icon">${icon('cell', 20)}</span>
                <strong>식물세포 · 고장액</strong>
                <span>600 mOsm/L · 원형질 분리</span>
              </button>
              <button type="button" class="preset-card" data-preset="mitosis-anaphase">
                <span class="preset-icon">${icon('mitosis', 20)}</span>
                <strong>분열 · 후기</strong>
                <span>자매 염색분체의 분리</span>
              </button>
              <button type="button" class="preset-card" data-preset="mitosis-start">
                <span class="preset-icon">${icon('reset', 20)}</span>
                <strong>분열 · 간기</strong>
                <span>DNA 복제와 준비</span>
              </button>
            </div>
          </section>

          <section class="teacher-card teacher-actions" aria-labelledby="actions-title">
            <div class="card-head">
              <div>
                <p class="eyebrow">수업 도구</p>
                <h2 id="actions-title">진행 도구</h2>
              </div>
            </div>
            <div class="tool-action-list">
              <button type="button" class="tool-action" data-action="toggle-answers" aria-pressed="${this.answersVisible}">
                <span class="tool-action-icon">${icon('eye', 20)}</span>
                <span><strong>${this.answersVisible ? '정답 숨기기' : '정답 보기'}</strong><small>${this.answersVisible ? '학생 화면에 정답을 숨깁니다.' : '미션별 정답과 해설을 표시합니다.'}</small></span>
                ${icon('chevronRight', 16)}
              </button>
              <button type="button" class="tool-action" data-action="print-worksheet">
                <span class="tool-action-icon">${icon('print', 20)}</span>
                <span><strong>학습지 인쇄</strong><small>동물세포·식물세포 빈칸 학습지를 인쇄합니다.</small></span>
                ${icon('chevronRight', 16)}
              </button>
              <button type="button" class="tool-action" data-action="reset-progress" data-testid="reset-progress">
                <span class="tool-action-icon tool-danger">${icon('reset', 20)}</span>
                <span><strong>진행 기록 초기화</strong><small>완료한 미션과 해답 기록을 모두 지웁니다.</small></span>
                ${icon('chevronRight', 16)}
              </button>
            </div>
            <p class="privacy-note">${icon('info', 15)} 이름, 계정, 위치 정보를 수집하지 않습니다. 기록은 이 기기의 localStorage에만 저장됩니다.</p>
          </section>
        </div>

        <section class="teacher-missions" aria-labelledby="mission-key-title">
          <div class="section-head">
            <div>
              <p class="eyebrow">미션 해설</p>
              <h2 id="mission-key-title">여섯 미션의 정답과 해설</h2>
              <p>난이도와 개념을 확인하고, 필요할 때 정답을 펼쳐 수업에 활용하세요.</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-answers" aria-pressed="${this.answersVisible}">
              ${icon(this.answersVisible ? 'eye' : 'info', 16)} ${this.answersVisible ? '정답 숨기기' : '정답 보기'}
            </button>
          </div>

          <div class="answer-list">
            ${MISSIONS.map(
              (mission, index) => `<article class="answer-card">
                <div class="answer-head">
                  <span class="mission-index">${String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div class="answer-title-row"><h3>${escapeHtml(mission.titleKo)}</h3><span class="concept-badge" style="--concept:var(--sage)">${CONCEPT_LABEL[mission.concept]}</span></div>
                    <p>${escapeHtml(mission.promptKo)}</p>
                  </div>
                  <span class="difficulty" aria-label="난이도 ${mission.difficulty} / 3">${'●'.repeat(mission.difficulty)}${'○'.repeat(3 - mission.difficulty)}</span>
                </div>
                ${
                  this.answersVisible
                    ? `<div class="answer-body">
                        <div class="answer-row"><strong>예측 정답</strong><span>${escapeHtml(mission.predictionAnswer)}</span></div>
                        <div class="answer-row"><strong>설명 정답</strong><span>${escapeHtml(mission.explanationAnswer)}</span></div>
                        <div class="answer-row"><strong>해설</strong><span>${escapeHtml(mission.explanationKo)}</span></div>
                        <div class="answer-row"><strong>한 문장 정리</strong><span>${escapeHtml(mission.takeawayKo)}</span></div>
                      </div>`
                    : `<div class="answer-hidden">${icon('info', 15)} 정답을 보려면 위의 '정답 보기'를 누르세요.</div>`
                }
              </article>`,
            ).join('')}
          </div>
        </section>

        <section class="teacher-note" aria-label="모형 안내">
          ${icon('info', 20)}
          <div>
            <h2>모형 사용 안내</h2>
            <p>${MODEL_SCALE_NOTE} 삼투 실험은 단순화한 두 칸 모델이며, 분열 실험은 4개의 염색체로 간단히 나타낸 모형입니다. 실제 세포의 크기·모양·분자 운동을 재현하지 않습니다.</p>
          </div>
        </section>

        <section class="worksheet" aria-labelledby="worksheet-title">
          <header class="worksheet-head">
            <div>
              <p class="worksheet-kicker">CellScope · 세포 구조 학습지</p>
              <h1 id="worksheet-title">세포의 구조와 기능</h1>
            </div>
            <div class="worksheet-name"><span>이름</span><span class="worksheet-line"></span><span>날짜</span><span class="worksheet-line"></span></div>
          </header>
          <p class="worksheet-instructions">그림의 번호에 해당하는 구조의 이름을 쓰고, 각 구조가 하는 일을 한 문장으로 설명하세요.</p>
          <div class="worksheet-grid">
            <section>
              <h2>동물세포</h2>
              ${animalDiagram()}
              <ol class="worksheet-labels">
                ${['세포막', '핵', '미토콘드리아', '골지체', '리소좀', '리보솜', '거친 소포체', '중심체']
                  .map((name, index) => `<li><span class="blank-number">${index + 1}</span><span class="blank-name"></span><span class="blank-function"></span></li>`)
                  .join('')}
              </ol>
            </section>
            <section>
              <h2>식물세포</h2>
              ${plantDiagram()}
              <ol class="worksheet-labels">
                ${['세포벽', '세포막', '엽록체', '중심 액포', '핵', '미토콘드리아']
                  .map((name, index) => `<li><span class="blank-number">${index + 1}</span><span class="blank-name"></span><span class="blank-function"></span></li>`)
                  .join('')}
              </ol>
            </section>
          </div>
          <p class="worksheet-foot">개념 모형 · 실제 세포는 마이크로미터(µm) 단위이며 이 그림은 축척에 맞지 않습니다.</p>
        </section>
      </section>
    `;

    this.bind();
    if (this.focusAfterRender) {
      const selector = this.focusAfterRender;
      this.focusAfterRender = null;
      requestAnimationFrame(() => {
        this.container.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
      });
    }
  }

  private bind(): void {
    this.container.querySelectorAll('[data-action="toggle-answers"]').forEach((button) => {
      button.addEventListener('click', () => {
        this.answersVisible = !this.answersVisible;
        this.focusAfterRender = '[data-action="toggle-answers"]';
        this.render();
        announce(this.answersVisible ? '미션 정답을 표시합니다.' : '미션 정답을 숨겼습니다.');
      });
    });

    this.container.querySelector('[data-action="print-worksheet"]')?.addEventListener('click', () => {
      announce('학습지를 인쇄합니다.');
      window.print();
    });

    this.container.querySelector('[data-action="reset-progress"]')?.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: '진행 기록을 초기화할까요?',
        message:
          '완료한 미션, 예측·설명 해답, 마지막 세포 종류와 보기 설정이 모두 지워집니다. 이 작업은 되돌릴 수 없습니다.',
        confirmLabel: '모두 지우기',
        cancelLabel: '취소',
        danger: true,
      });
      if (!confirmed) return;
      store.resetProgress();
      this.render();
      toast('진행 기록을 초기화했습니다.', 'success');
      announce('진행 기록을 모두 초기화했습니다.');
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.preset;
        if (preset === 'animal-hypo') {
          store.update(
            (state) => {
              state.cell.type = 'animal';
              state.cell.selectedOrganelleId = null;
              state.osmosis.externalOsmolarity = 150;
              state.osmosis.snapshot = createOsmosis('animal', 150);
              state.osmosis.timeSec = 0;
              state.osmosis.playing = false;
            },
            { persist: true },
          );
          navigate('osmosis');
        } else if (preset === 'plant-hyper') {
          store.update(
            (state) => {
              state.cell.type = 'plant';
              state.cell.selectedOrganelleId = null;
              state.osmosis.externalOsmolarity = 600;
              state.osmosis.snapshot = createOsmosis('plant', 600);
              state.osmosis.timeSec = 0;
              state.osmosis.playing = false;
            },
            { persist: true },
          );
          navigate('osmosis');
        } else if (preset === 'mitosis-anaphase') {
          store.update(
            (state) => {
              state.mitosis.stageIndex = 3;
              state.mitosis.progress = 0.55;
              state.mitosis.playing = false;
            },
            { persist: true },
          );
          navigate('mitosis');
        } else if (preset === 'mitosis-start') {
          store.update(
            (state) => {
              state.mitosis.stageIndex = 0;
              state.mitosis.progress = 0;
              state.mitosis.playing = false;
            },
            { persist: true },
          );
          navigate('mitosis');
        }
      });
    });
  }

  destroy(): void {
    this.container.replaceChildren();
  }
}

function animalDiagram(): string {
  return `<svg class="worksheet-svg" viewBox="0 0 420 300" role="img" aria-label="번호가 표시된 동물세포 개념 그림">
    <defs>
      <radialGradient id="animal-fill" cx="45%" cy="42%" r="65%">
        <stop offset="0" stop-color="#f6fbf4"/>
        <stop offset="1" stop-color="#e6f1e4"/>
      </radialGradient>
    </defs>
    <ellipse cx="210" cy="150" rx="140" ry="112" fill="url(#animal-fill)" stroke="#2b4a3d" stroke-width="2.4"/>
    <ellipse cx="210" cy="150" rx="130" ry="102" fill="none" stroke="#9bb7a5" stroke-width="1.2"/>
    <circle cx="242" cy="160" r="42" fill="#efe6ff" stroke="#5e4a93" stroke-width="1.8"/>
    <circle cx="256" cy="171" r="12" fill="#8d72c9"/>
    <ellipse cx="152" cy="106" rx="18" ry="9" fill="#f4c9ae" stroke="#9e5c35" stroke-width="1.4" transform="rotate(-24 152 106)"/>
    <ellipse cx="282" cy="92" rx="17" ry="8" fill="#f4c9ae" stroke="#9e5c35" stroke-width="1.4" transform="rotate(21 282 92)"/>
    <ellipse cx="126" cy="196" rx="17" ry="8" fill="#f4c9ae" stroke="#9e5c35" stroke-width="1.4" transform="rotate(18 126 196)"/>
    <path d="M160 212c18-18 36-18 54-4" fill="none" stroke="#a57923" stroke-width="5" stroke-linecap="round"/>
    <path d="M164 222c18-18 36-18 54-4" fill="none" stroke="#c49b3d" stroke-width="4" stroke-linecap="round"/>
    <circle cx="152" cy="238" r="9" fill="#f8b6a8" stroke="#a24c39" stroke-width="1.2"/>
    <circle cx="178" cy="250" r="7" fill="#f8b6a8" stroke="#a24c39" stroke-width="1.2"/>
    <circle cx="184" cy="126" r="2.6" fill="#7b8c52"/>
    <circle cx="204" cy="212" r="2.4" fill="#7b8c52"/>
    <circle cx="120" cy="148" r="2.2" fill="#7b8c52"/>
    <circle cx="286" cy="216" r="2.4" fill="#7b8c52"/>
    <circle cx="256" cy="112" r="2.2" fill="#7b8c52"/>
    ${pointer(340, 68, 1, '1')}
    ${pointer(250, 160, 2, '2')}
    ${pointer(102, 96, 3, '3')}
    ${pointer(188, 230, 4, '4')}
    ${pointer(120, 254, 5, '5')}
    ${pointer(306, 208, 6, '6')}
    ${pointer(172, 196, 7, '7')}
    ${pointer(246, 250, 8, '8')}
  </svg>`;
}

function plantDiagram(): string {
  return `<svg class="worksheet-svg" viewBox="0 0 420 300" role="img" aria-label="번호가 표시된 식물세포 개념 그림">
    <defs>
      <linearGradient id="plant-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7fbf2"/>
        <stop offset="1" stop-color="#e7f2df"/>
      </linearGradient>
    </defs>
    <rect x="62" y="34" width="296" height="232" rx="26" fill="url(#plant-fill)" stroke="#3e6a45" stroke-width="9"/>
    <rect x="76" y="48" width="268" height="204" rx="20" fill="none" stroke="#83a886" stroke-width="2"/>
    <ellipse cx="234" cy="154" rx="86" ry="68" fill="#e4f6f9" stroke="#6c9aa2" stroke-width="1.6"/>
    <circle cx="140" cy="96" r="30" fill="#efe6ff" stroke="#5e4a93" stroke-width="1.7"/>
    <circle cx="150" cy="104" r="8" fill="#8d72c9"/>
    <ellipse cx="136" cy="198" rx="20" ry="10" fill="#c9e7a6" stroke="#517b37" stroke-width="1.4" transform="rotate(-26 136 198)"/>
    <ellipse cx="168" cy="124" rx="20" ry="10" fill="#c9e7a6" stroke="#517b37" stroke-width="1.4" transform="rotate(18 168 124)"/>
    <ellipse cx="300" cy="82" rx="20" ry="10" fill="#c9e7a6" stroke="#517b37" stroke-width="1.4" transform="rotate(24 300 82)"/>
    <ellipse cx="320" cy="204" rx="20" ry="10" fill="#c9e7a6" stroke="#517b37" stroke-width="1.4" transform="rotate(-22 320 204)"/>
    <ellipse cx="112" cy="238" rx="18" ry="9" fill="#f4c9ae" stroke="#9e5c35" stroke-width="1.3" transform="rotate(14 112 238)"/>
    <ellipse cx="292" cy="242" rx="18" ry="9" fill="#f4c9ae" stroke="#9e5c35" stroke-width="1.3" transform="rotate(-16 292 242)"/>
    ${pointer(360, 40, 1, '1')}
    ${pointer(350, 150, 2, '2')}
    ${pointer(300, 74, 3, '3')}
    ${pointer(234, 220, 4, '4')}
    ${pointer(112, 72, 5, '5')}
    ${pointer(82, 242, 6, '6')}
  </svg>`;
}

function pointer(x: number, y: number, _index: number, label: string): string {
  return `<g class="worksheet-pointer">
    <line x1="${x}" y1="${y}" x2="${x + 18}" y2="${y - 14}" stroke="#4a4a4a" stroke-width="1"/>
    <circle cx="${x + 22}" cy="${y - 18}" r="10" fill="#ffffff" stroke="#333333" stroke-width="1.2"/>
    <text x="${x + 22}" y="${y - 14}" text-anchor="middle" font-size="11" font-family="system-ui, sans-serif" fill="#222222">${label}</text>
  </g>`;
}

export function mountTeacher(container: HTMLElement): TeacherView {
  return new TeacherView(container);
}
