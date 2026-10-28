import { store } from './state';
import {
  ROUTE_TITLES,
  navigate,
  parseRoute,
  routeToHash,
  type Route,
  type RouteName,
} from './routes';
import { MISSIONS, getMission } from '../bio/missions';
import { MODEL_SCALE_NOTE } from '../bio/scale';
import { mountExplorer } from '../features/explorer/ExplorerView';
import { mountMitosis } from '../features/mitosis/MitosisView';
import { mountMissions } from '../features/missions/MissionsView';
import { mountOsmosis } from '../features/osmosis/OsmosisView';
import { mountTeacher } from '../features/teacher/TeacherView';
import {
  announce,
  escapeHtml,
  icon,
  openDialog,
  type IconName,
} from '../ui/components';

interface ViewHandle {
  destroy(): void;
  toggleClipping?: () => void;
}

interface NavItem {
  route: RouteName;
  label: string;
  shortLabel: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { route: 'explore', label: '세포 탐구', shortLabel: '탐구', icon: 'explore' },
  { route: 'osmosis', label: '삼투 실험', shortLabel: '삼투', icon: 'droplet' },
  { route: 'mitosis', label: '분열 실험', shortLabel: '분열', icon: 'mitosis' },
  { route: 'missions', label: '미션', shortLabel: '미션', icon: 'target' },
  { route: 'teacher', label: '교사용', shortLabel: '교사용', icon: 'teacher' },
];

export class App {
  private readonly root: HTMLElement;
  private main: HTMLElement;
  private currentView: ViewHandle | null = null;
  private route: Route;
  private unsubscribe: (() => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.route = parseRoute(window.location.hash);
    this.buildShell();
    this.main = this.root.querySelector('#main') as HTMLElement;
  }

  start(): void {
    if (!window.location.hash) {
      window.history.replaceState(null, '', routeToHash(this.route));
    }
    this.unsubscribe = store.subscribe(() => this.updateProgressPill());
    window.addEventListener('hashchange', () => this.renderRoute(true));
    document.addEventListener('keydown', this.handleKeydown);
    this.updateReducedMotionClass();
    this.renderRoute(false);
  }

  dispose(): void {
    this.currentView?.destroy();
    this.currentView = null;
    this.unsubscribe?.();
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private buildShell(): void {
    const completed = store.get().mission.completed.length;
    this.root.innerHTML = `
      <a class="skip-link" href="#main">본문으로 건너뛰기</a>
      <header class="app-header">
        <a class="brand" href="#/explore">
          <span class="brand-mark">${icon('cell', 24)}</span>
          <span class="brand-copy"><strong>CellScope</strong><span>세포 탐구 실험실</span></span>
        </a>
        <nav class="desktop-nav" aria-label="주요 메뉴">
          ${NAV_ITEMS.map(
            (item) =>
              `<a class="nav-link" href="${routeToHash({ name: item.route, missionId: null })}" data-route="${item.route}">${icon(item.icon, 18)}<span>${item.label}</span></a>`,
          ).join('')}
        </nav>
        <div class="header-actions">
          <a class="progress-pill" href="#/missions" data-testid="header-progress">
            <span class="progress-pill-dot" aria-hidden="true"></span><span>미션 ${completed} / ${MISSIONS.length}</span>
          </a>
          <button type="button" class="help-button" data-action="help" aria-keyshortcuts="?" title="도움말 (?)">
            ${icon('help', 19)}<span>도움말</span>
          </button>
        </div>
      </header>

      <main id="main" class="app-main" tabindex="-1"></main>

      <footer class="app-footer">
        <div class="footer-brand">
          <span class="brand-mark brand-mark-sm">${icon('cell', 19)}</span>
          <span><strong>CellScope</strong><span>브라우저에서 계산하는 세포 실험실</span></span>
        </div>
        <p class="footer-note">${escapeHtml(MODEL_SCALE_NOTE)}</p>
        <p class="footer-meta">${icon('info', 14)} 서버·런타임 AI 없음 · 오프라인 사용 가능</p>
      </footer>

      <nav class="bottom-nav" aria-label="모바일 주요 메뉴">
        ${NAV_ITEMS.map(
          (item) =>
            `<a class="bottom-nav-link" href="${routeToHash({ name: item.route, missionId: null })}" data-route="${item.route}">${icon(item.icon, 21)}<span>${item.shortLabel}</span></a>`,
        ).join('')}
      </nav>

      <div id="live-region" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    `;

    this.root.querySelector('[data-action="help"]')?.addEventListener('click', () => this.openHelp());

    this.root.querySelector('.skip-link')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.main.focus();
      this.main.scrollIntoView({ block: 'start' });
    });
  }

  private renderRoute(scrollToTop: boolean): void {
    const nextRoute = parseRoute(window.location.hash || '#/explore');
    const routeChanged =
      nextRoute.name !== this.route.name || nextRoute.missionId !== this.route.missionId;
    this.route = nextRoute;
    store.setRoute(nextRoute);
    this.currentView?.destroy();
    this.currentView = null;
    this.main.replaceChildren();

    try {
      switch (nextRoute.name) {
        case 'explore':
          this.currentView = mountExplorer(this.main);
          break;
        case 'osmosis':
          this.currentView = mountOsmosis(this.main);
          break;
        case 'mitosis':
          this.currentView = mountMitosis(this.main);
          break;
        case 'missions':
          this.currentView = mountMissions(this.main, nextRoute.missionId);
          break;
        case 'teacher':
          this.currentView = mountTeacher(this.main);
          break;
        default:
          this.currentView = mountExplorer(this.main);
      }
    } catch (error) {
      console.error('Route render failed', error);
      this.main.innerHTML = `
        <section class="view error-view">
          <p class="eyebrow">문제가 발생했습니다</p>
          <h1>화면을 불러오지 못했습니다</h1>
          <p>페이지를 새로 고치거나 다른 메뉴로 이동해 보세요. 학습 기록은 브라우저에 남아 있습니다.</p>
          <a class="btn btn-primary" href="#/explore">세포 탐구로 돌아가기</a>
        </section>
      `;
    }

    this.updateNav(nextRoute);
    this.updateTitle(nextRoute);
    this.updateProgressPill();
    this.updateReducedMotionClass();

    if (scrollToTop && routeChanged) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (routeChanged) {
      announce(`${ROUTE_TITLES[nextRoute.name]} 화면으로 이동했습니다.`);
    }
    if (routeChanged && !document.querySelector('dialog[open]')) {
      requestAnimationFrame(() => {
        const heading = this.main.querySelector('h1');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      });
    }
  }

  private updateNav(route: Route): void {
    this.root.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach((link) => {
      const active = link.dataset.route === route.name;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  private updateTitle(route: Route): void {
    const mission = route.name === 'missions' ? getMission(route.missionId) : undefined;
    const suffix = mission ? `${mission.titleKo} 미션` : ROUTE_TITLES[route.name];
    document.title = `${suffix} · CellScope`;
  }

  private updateProgressPill(): void {
    const pill = this.root.querySelector('[data-testid="header-progress"]');
    if (!pill) return;
    const completed = store.get().mission.completed.length;
    const next = `<span class="progress-pill-dot" aria-hidden="true"></span><span>미션 ${completed} / ${MISSIONS.length}</span>`;
    if (pill.innerHTML !== next) pill.innerHTML = next;
  }

  private updateReducedMotionClass(): void {
    document.documentElement.classList.toggle(
      'reduced-motion',
      store.get().preferences.reducedMotion,
    );
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('input, select, textarea, [contenteditable="true"]') ||
      document.querySelector('dialog[open]')
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    if (event.key === '?') {
      event.preventDefault();
      this.openHelp();
      return;
    }
    if (key === 'c' && this.route.name === 'explore') {
      event.preventDefault();
      this.currentView?.toggleClipping?.();
      return;
    }
    if (key === 'o') {
      event.preventDefault();
      navigate('osmosis');
      return;
    }
    if (key === 'm') {
      event.preventDefault();
      navigate('mitosis');
    }
  };

  private openHelp(): void {
    const reduced = store.get().preferences.reducedMotion;
    const dialog = openDialog({
      title: 'CellScope 사용 안내',
      bodyHtml: `
        <p class="dialog-lead">세포를 돌리고, 절단면을 열고, 용액 농도를 바꾸며 구조와 기능을 연결해 보세요. 모든 계산은 이 브라우저 안에서 이루어집니다.</p>
        <div class="help-grid">
          <section>
            <h3>${icon('explore', 17)} 3D 세포</h3>
            <ul>
              <li>드래그로 회전하고 스크롤·핀치로 확대합니다.</li>
              <li>소기관을 누르면 이름과 기능이 나타납니다.</li>
              <li>클릭이 어렵다면 소기관 목록 버튼을 사용하세요.</li>
              <li>절단면 슬라이더로 세포 앞면을 잘라 안을 봅니다.</li>
            </ul>
          </section>
          <section>
            <h3>${icon('list', 17)} 키보드</h3>
            <ul>
              <li><kbd>Tab</kbd>으로 모든 버튼을 이동합니다.</li>
              <li><kbd>Enter</kbd> 또는 <kbd>Space</kbd>로 선택합니다.</li>
              <li><kbd>C</kbd>는 세포 탐구에서 절단면을 전환합니다.</li>
              <li><kbd>O</kbd> 삼투 실험 · <kbd>M</kbd> 분열 실험 · <kbd>?</kbd> 도움말</li>
              <li><kbd>Esc</kbd>는 대화상자를 닫습니다.</li>
            </ul>
          </section>
          <section>
            <h3>${icon('info', 17)} 모형 안내</h3>
            <p>${escapeHtml(MODEL_SCALE_NOTE)} 삼투와 분열은 교육용으로 단순화한 모형이며, 의학적 판단에 사용할 수 없습니다.</p>
          </section>
        </div>
        <label class="switch-row help-switch" for="help-reduced-motion">
          <span><strong>동작 줄이기</strong><small>자동 회전과 입자 애니메이션을 멈추고 수치·화살표로 보여 줍니다.</small></span>
          <span class="switch"><input type="checkbox" id="help-reduced-motion" ${reduced ? 'checked' : ''} /><span class="switch-track" aria-hidden="true"></span></span>
        </label>
        <p class="help-note">${icon('check', 15)} 완료한 미션은 이 기기의 localStorage에만 저장됩니다. 계정이나 서버는 사용하지 않습니다.</p>
      `,
      onReady: (element) => {
        const toggle = element.querySelector<HTMLInputElement>('#help-reduced-motion');
        toggle?.addEventListener('change', () => {
          const value = Boolean(toggle.checked);
          store.update(
            (state) => {
              state.preferences.reducedMotion = value;
            },
            { persist: true },
          );
          this.updateReducedMotionClass();
          announce(value ? '동작 줄이기를 켰습니다.' : '동작 줄이기를 껐습니다.');
          this.renderRoute(false);
        });
      },
    });
    dialog.classList.add('help-dialog');
  }
}
