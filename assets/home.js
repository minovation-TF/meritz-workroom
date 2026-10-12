(() => {
  'use strict';

  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file');
  const fileStatus = document.getElementById('file-status');
  const toast = document.getElementById('preview-message');
  let toastTimer;
  let dragDepth = 0;
  let lastModalTrigger;
  let copyTimer;

  function showPreview(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function previewFile(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      fileStatus.textContent = 'PDF 파일을 선택해주세요.';
      return;
    }
    // This shell only displays a filename; it never reads, sends, or opens the file.
    fileStatus.textContent = `${file.name} · 편집기 연결 준비 중`;
    showPreview('파일 선택 미리보기입니다. PDF 편집기는 다음 단계에서 연결됩니다.');
  }

  document.getElementById('choose-pdf').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    previewFile(fileInput.files[0]);
    fileInput.value = '';
  });

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth += 1;
    dropzone.classList.add('is-dragging');
  });
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  dropzone.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropzone.classList.remove('is-dragging');
  });
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    dropzone.classList.remove('is-dragging');
    previewFile(event.dataTransfer?.files[0]);
  });

  // Prevent a file dropped outside the placeholder from replacing the homepage.
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => event.preventDefault());

  document.querySelectorAll('[data-preview]').forEach((button) => {
    button.addEventListener('click', () => {
      showPreview(`${button.dataset.preview} 기능은 준비 중입니다.`);
    });
  });

  document.querySelectorAll('[data-modal-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.modalOpen);
      if (!dialog || typeof dialog.showModal !== 'function') return;
      lastModalTrigger = button;
      dialog.showModal();
    });
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.querySelector('[data-modal-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (lastModalTrigger?.isConnected) lastModalTrigger.focus();
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
})();
