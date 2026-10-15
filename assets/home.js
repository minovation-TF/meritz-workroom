(() => {
  'use strict';

  const toast = document.getElementById('preview-message');
  let toastTimer;
  const modalTriggers = new WeakMap();
  let copyTimer;

  function showPreview(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  document.querySelectorAll('[data-modal-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.modalOpen);
      if (!dialog || typeof dialog.showModal !== 'function') return;
      modalTriggers.set(dialog, button);
      dialog.showModal();
      dialog.scrollTop = 0;
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
      const trigger = modalTriggers.get(dialog);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  });

  async function copyValue(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Fall back to a selection-based copy where clipboard permission is unavailable.
      }
    }
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = value;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.style.position = 'fixed';
    temporaryInput.style.opacity = '0';
    document.body.append(temporaryInput);
    temporaryInput.select();
    const copied = document.execCommand('copy');
    temporaryInput.remove();
    if (!copied) throw new Error('Clipboard copy was unavailable');
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const dialog = button.closest('dialog');
      const feedback = dialog?.querySelector('.modal-feedback');
      try {
        await copyValue(button.dataset.copy);
        if (feedback) {
          clearTimeout(copyTimer);
          feedback.textContent = '클립보드에 복사했어요.';
          feedback.hidden = false;
          copyTimer = setTimeout(() => { feedback.hidden = true; }, 2400);
        } else {
          showPreview('클립보드에 복사했어요.');
        }
      } catch {
        if (feedback) {
          feedback.textContent = '복사하지 못했어요. 내용을 길게 눌러 복사해주세요.';
          feedback.hidden = false;
        }
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      clearTimeout(toastTimer);
      toast.hidden = true;
    }
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
