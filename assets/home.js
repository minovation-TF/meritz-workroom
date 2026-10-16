(() => {
  'use strict';

  const toast = document.getElementById('preview-message');
  let toastTimer;
  const modalTriggers = new WeakMap();

  function hideToasts() {
    clearTimeout(toastTimer);
    toast.hidden = true;
    document.querySelectorAll('.modal-feedback').forEach((region) => { region.hidden = true; });
  }

  function showToast(message, context, duration = 2400) {
    hideToasts();
    const region = context?.open ? context.querySelector('.modal-feedback') || toast : toast;
    region.textContent = message;
    region.hidden = false;
    toastTimer = setTimeout(() => { region.hidden = true; }, duration);
  }

  document.querySelectorAll('[data-modal-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.modalOpen);
      if (!dialog || typeof dialog.showModal !== 'function') return;
      hideToasts();
      modalTriggers.set(dialog, button);
      dialog.showModal();
      dialog.scrollTop = 0;
      const body = dialog.querySelector('.modal-body');
      if (body) body.scrollTop = 0;
    });
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.querySelectorAll('[data-modal-close]').forEach((button) => {
      button.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      hideToasts();
      const trigger = modalTriggers.get(dialog);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  });

  async function copyValue(value, context) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Keep a fallback inside the active dialog, whose outside page is inert.
      }
    }
    const focused = document.activeElement;
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = value;
    temporaryInput.setAttribute('readonly', '');
    Object.assign(temporaryInput.style, { position: 'fixed', opacity: '0', width: '1px', height: '1px', top: '0', left: '0' });
    (context?.open ? context : document.body).append(temporaryInput);
    let copied = false;
    try {
      temporaryInput.focus({ preventScroll: true });
      temporaryInput.select();
      copied = document.execCommand('copy');
    } finally {
      temporaryInput.remove();
      focused?.focus({ preventScroll: true });
    }
    if (!copied) throw new Error('Clipboard copy was unavailable');
  }

  function formatArsGuide(steps) {
    const route = steps.map((step) => `${step.key}번(${step.label})`).join(' → ');
    return `메리츠화재 고객센터 1566-7711로 전화한 뒤 음성 ARS를 선택해 주세요.\n${route} 순서로 눌러주세요.`;
  }

  function arsSteps(item) {
    const root = item.closest('[data-ars-key]');
    const title = root.querySelector(':scope > summary > .ars-menu-title, :scope > .ars-menu-title').textContent.trim();
    const nested = [];
    for (let current = item; current && current !== root; current = current.parentElement) {
      if (current.tagName !== 'LI') continue;
      const key = current.querySelector(':scope > .ars-subkey');
      const label = current.querySelector(':scope > div');
      if (!key || !label) continue;
      const text = Array.from(label.childNodes).filter((node) => node.nodeType === 3).map((node) => node.textContent).join('').trim();
      nested.unshift({ key: key.textContent.trim(), label: text });
    }
    return [{ key: root.dataset.arsKey, label: title }, ...nested];
  }

  const voiceArs = document.getElementById('voice-ars-modal');
  if (voiceArs) {
    voiceArs.querySelectorAll('.ars-menu-row').forEach((row) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = row.className;
      button.dataset.arsKey = row.dataset.arsKey;
      button.dataset.arsSteps = JSON.stringify(arsSteps(row));
      button.setAttribute('aria-pressed', 'false');
      button.append(...row.childNodes);
      row.replaceWith(button);
    });
    voiceArs.querySelectorAll('.ars-submenu > li').forEach((item) => {
      if (item.querySelector(':scope > div > .ars-submenu')) return;
      const steps = arsSteps(item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ars-leaf';
      button.dataset.arsSteps = JSON.stringify(steps);
      button.setAttribute('aria-pressed', 'false');
      const title = document.createElement('span');
      title.className = 'ars-leaf-title';
      title.textContent = steps.at(-1).label;
      button.append(item.querySelector(':scope > .ars-subkey'), title);
      item.classList.add('ars-leaf-row');
      item.replaceChildren(button);
    });
    voiceArs.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-ars-steps]');
      if (!button) return;
      voiceArs.querySelectorAll('[data-ars-steps]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      const guide = formatArsGuide(JSON.parse(button.dataset.arsSteps));
      document.getElementById('ars-selected-guide').textContent = guide;
      const copy = document.getElementById('copy-ars-guide');
      copy.dataset.copy = guide;
      copy.hidden = false;
    });
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const dialog = button.closest('dialog');
      if (!button.dataset.copy) return;
      try {
        await copyValue(button.dataset.copy, dialog);
        showToast('클립보드에 복사했어요.', dialog);
      } catch {
        showToast('복사하지 못했어요. 내용을 길게 눌러 복사해주세요.', dialog, 4200);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideToasts();
  });

  async function initVisitStats() {
    const cfg = window.WORKROOM_CONFIG || {};
    if (cfg.cloudflareBeaconToken) {
      const beacon = document.createElement('script');
      beacon.defer = true;
      beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      beacon.dataset.cfBeacon = JSON.stringify({ token: cfg.cloudflareBeaconToken });
      document.head.appendChild(beacon);
    }
    if (!cfg.counterEndpoint) return;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const key = 'workroom_visit_' + day;
    const countVisit = async () => {
      let counted = false;
      try { counted = localStorage.getItem(key) === '1'; } catch {}
      try {
        const response = await fetch(cfg.counterEndpoint.replace(/\/$/, '') + (counted ? '/api/stats' : '/api/visit'), {
          method: counted ? 'GET' : 'POST', mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!Number.isFinite(data.today) || !Number.isFinite(data.total) || data.today < 0 || data.total < 0) return;
        if (!counted) { try { localStorage.setItem(key, '1'); } catch {} }
        const stats = document.getElementById('visitstat');
        stats.replaceChildren();
        const label = document.createElement('span'); label.textContent = '방문 현황';
        const numbers = document.createElement('strong'); numbers.textContent = '오늘 ' + data.today.toLocaleString('ko-KR') + ' · 누적 ' + data.total.toLocaleString('ko-KR');
        stats.append(label, numbers); stats.hidden = false;
      } catch { /* The workspace remains usable when the counter is offline. */ }
    };
    try {
      if (navigator.locks) await navigator.locks.request('workroom-visit-' + day, countVisit);
      else await countVisit();
    } catch { /* A blocked optional counter must not affect the home tools. */ }
  }
  initVisitStats();
})();
