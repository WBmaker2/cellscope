export type IconName =
  | 'cell'
  | 'explore'
  | 'droplet'
  | 'mitosis'
  | 'target'
  | 'teacher'
  | 'help'
  | 'close'
  | 'play'
  | 'pause'
  | 'reset'
  | 'chevronRight'
  | 'chevronLeft'
  | 'check'
  | 'print'
  | 'info'
  | 'eye'
  | 'rotate'
  | 'scissors'
  | 'arrowRight'
  | 'arrowLeft'
  | 'spark'
  | 'list';

const ICONS: Record<IconName, string> = {
  cell: '<circle cx="12" cy="12" r="8.2"/><circle cx="14.1" cy="14" r="2.5"/><path d="M7.4 8.2c1.1-1.1 2.1-1.8 3.4-2.2M6.2 14.7c.7 1.3 1.7 2.3 2.9 3"/>',
  explore:
    '<path d="M4 6.5h5.2l1.4 2H20"/><path d="M4 6.5v11h16v-9"/><path d="M8.2 13.4a3.8 3.8 0 1 0 7.6 0 3.8 3.8 0 0 0-7.6 0Z"/><path d="M14.8 10.8 17 8.6"/>',
  droplet:
    '<path d="M12 3.2c3.1 3.8 5.2 6.4 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-2.8 2.1-5.4 5.2-9.2Z"/><path d="M9.6 13.5a2.5 2.5 0 0 0 2.4 2.2"/>',
  mitosis:
    '<path d="M12 3v5M12 16v5"/><path d="M6.5 7.2c-1.8 1.5-2.4 3.2-1.8 5M17.5 7.2c1.8 1.5 2.4 3.2 1.8 5"/><path d="M4.8 17.4c1.2 1.4 2.8 1.9 4.5 1.4M19.2 17.4c-1.2 1.4-2.8 1.9-4.5 1.4"/><path d="M9.6 12h4.8"/>',
  target:
    '<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="3.7"/><path d="M12 2.8V5M12 19v2.2M2.8 12H5M19 12h2.2"/>',
  teacher:
    '<path d="M3.6 5.2h16.8v10.3H3.6z"/><path d="M9 19h6M12 15.5V19"/><path d="M7.4 8.2h5.2M7.4 11h3.2"/>',
  help: '<circle cx="12" cy="12" r="8.4"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 16.6h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  play: '<path d="m9 6 9 6-9 6V6Z"/>',
  pause: '<path d="M8.5 6v12M15.5 6v12"/>',
  reset: '<path d="M4.6 9.6A7.8 7.8 0 1 1 5.8 16"/><path d="M4.4 5.2v4.6h4.6"/>',
  chevronRight: '<path d="m9.4 6.2 5.4 5.8-5.4 5.8"/>',
  chevronLeft: '<path d="m14.6 6.2-5.4 5.8 5.4 5.8"/>',
  check: '<path d="m5 12.4 4.2 4.2L19 6.8"/>',
  print:
    '<path d="M7.5 8V4.5h9V8"/><path d="M7.5 16.4H5.2a1.6 1.6 0 0 1-1.6-1.6v-4.3a1.6 1.6 0 0 1 1.6-1.6h13.6a1.6 1.6 0 0 1 1.6 1.6v4.3a1.6 1.6 0 0 1-1.6 1.6h-2.3"/><path d="M7.5 13.2h9v6.3h-9z"/>',
  info: '<circle cx="12" cy="12" r="8.4"/><path d="M12 10.8v5.1M12 8h.01"/>',
  eye: '<path d="M2.8 12s3.1-5.2 9.2-5.2S21.2 12 21.2 12s-3.1 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/>',
  rotate: '<path d="M19.4 8.5A8 8 0 0 0 5 7.2"/><path d="M19.8 4.4v4.4h-4.4"/><path d="M4.6 15.5A8 8 0 0 0 19 16.8"/><path d="M4.2 19.6v-4.4h4.4"/>',
  scissors:
    '<circle cx="6.5" cy="7.2" r="2.4"/><circle cx="6.5" cy="16.8" r="2.4"/><path d="m8.5 8.6 10.7 7.1M8.5 15.4 19.2 8.3"/>',
  arrowRight: '<path d="M4.5 12h15M14 6.5l5.5 5.5L14 17.5"/>',
  arrowLeft: '<path d="M19.5 12h-15M10 6.5 4.5 12 10 17.5"/>',
  spark: '<path d="M12 3.2 13.8 9l5.8 1.8-5.8 1.8L12 18.4l-1.8-5.8L4.4 10.8 10.2 9 12 3.2Z"/>',
  list: '<path d="M9 6.5h10M9 12h10M9 17.5h10"/><path d="M5 6.5h.01M5 12h.01M5 17.5h.01"/>',
};

export function icon(name: IconName, size = 20, extraClass = ''): string {
  return `<svg class="icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function announce(message: string): void {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 30);
}

export function switchMarkup(options: {
  id: string;
  label: string;
  checked: boolean;
  className?: string;
}): string {
  return `<label class="switch-row ${options.className ?? ''}" for="${escapeAttr(options.id)}">
    <span>${escapeHtml(options.label)}</span>
    <span class="switch">
      <input type="checkbox" id="${escapeAttr(options.id)}" ${options.checked ? 'checked' : ''} />
      <span class="switch-track" aria-hidden="true"></span>
    </span>
  </label>`;
}

export function toast(message: string, tone: 'info' | 'success' | 'warn' = 'info'): void {
  const node = document.createElement('div');
  node.className = `toast toast-${tone}`;
  node.setAttribute('role', 'status');
  node.textContent = message;
  document.body.append(node);
  window.setTimeout(() => node.classList.add('is-visible'), 20);
  window.setTimeout(() => {
    node.classList.remove('is-visible');
    window.setTimeout(() => node.remove(), 260);
  }, 2800);
}

export interface DialogAction {
  label: string;
  value: string;
  tone?: 'primary' | 'ghost' | 'danger';
  autofocus?: boolean;
}

export interface DialogOptions {
  title: string;
  bodyHtml: string;
  actions?: DialogAction[];
  className?: string;
  onReady?: (dialog: HTMLDialogElement) => void;
}

let dialogCounter = 0;

export function openDialog(options: DialogOptions): HTMLDialogElement {
  dialogCounter += 1;
  const titleId = `dialog-title-${dialogCounter}`;
  const actions = options.actions ?? [];
  const dialog = document.createElement('dialog');
  dialog.className = `app-dialog ${options.className ?? ''}`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `
    <div class="dialog-head">
      <h2 id="${escapeAttr(titleId)}">${escapeHtml(options.title)}</h2>
      <form method="dialog">
        <button class="icon-btn" value="close" aria-label="닫기">${icon('close', 20)}</button>
      </form>
    </div>
    <div class="dialog-body">${options.bodyHtml}</div>
    ${
      actions.length
        ? `<form method="dialog" class="dialog-actions">${actions
            .map(
              (action) =>
                `<button class="btn ${action.tone === 'primary' ? 'btn-primary' : action.tone === 'danger' ? 'btn-danger' : 'btn-ghost'}" value="${escapeAttr(action.value)}" ${action.autofocus ? 'autofocus' : ''}>${escapeHtml(action.label)}</button>`,
            )
            .join('')}</form>`
        : ''
    }
  `;
  document.body.append(dialog);
  dialog.addEventListener('close', () => {
    dialog.remove();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close('backdrop');
  });
  options.onReady?.(dialog);
  dialog.showModal();
  return dialog;
}

export function confirmDialog(options: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = openDialog({
      title: options.title,
      bodyHtml: `<p class="dialog-copy">${escapeHtml(options.message)}</p>`,
      actions: [
        { label: options.cancelLabel ?? '취소', value: 'cancel', tone: 'ghost' },
        {
          label: options.confirmLabel,
          value: 'confirm',
          tone: options.danger ? 'danger' : 'primary',
          autofocus: true,
        },
      ],
    });
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'confirm');
    });
  });
}

export function emptyStateMarkup(title: string, body: string, actionHtml = ''): string {
  return `<div class="empty-state">
    <span class="empty-orbit" aria-hidden="true"></span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(body)}</p>
    ${actionHtml}
  </div>`;
}
