(() => {
  'use strict';
  const C = window.WorkroomCalculators, dialog = document.getElementById('calculator-modal');
  if (!C || !dialog) return;
  const $ = id => document.getElementById(id);
  const tabs = Array.from(dialog.querySelectorAll('[data-calc-tab]'));
  let active = 'age', initialized = false;
  const write = (id, value) => { $(id).textContent = value; };
  const dateLabel = value => C.display(C.parse(value));
  const number = value => Number(value).toLocaleString('ko-KR');
  const won = value => BigInt(value).toLocaleString('ko-KR') + '원';
  function error(id, message = '') { write(id, message); $(id).hidden = !message; }
  function copy(text = '', summary = '') { $('calculator-copy').dataset.copy = text; $('calculator-copy').disabled = !text; write('calculator-footer-result', text ? summary || '계산 완료' : '결과 대기'); }
  function readDate(id, label) {
    const field = $(id);
    if (!C.parse(field.value)) { field.setAttribute('aria-invalid', 'true'); throw new Error(label + '를 올바르게 입력하세요.'); }
    return field.value;
  }
  function age() {
    ['calc-insurance-age', 'calc-counting-age', 'calc-full-age'].forEach(id => write(id, '—'));
    write('calc-age-detail', '생년월일을 입력하면 자동으로 계산됩니다.');
    error('calc-age-error');
    if (!$('calc-birth').value.trim()) return;
    try {
      const birth = readDate('calc-birth', '생년월일'), reference = readDate('calc-age-date', '기준일'), result = C.age(birth, reference);
      write('calc-insurance-age', result.insurance + '세'); write('calc-counting-age', result.counting + '세'); write('calc-full-age', result.full + '세');
      const next = result.nextInsurance ? `다음 상령일 ${dateLabel(result.nextInsurance)} · ${number(result.nextInDays)}일 후` : '';
      write('calc-age-detail', `기준일 ${dateLabel(reference)} · 연나이 ${result.yearAge}세\n${next}${result.boundary ? '\n윤일·월말 생일의 보험나이는 청약 화면에서도 확인하세요.' : ''}`);
      copy(`나이 계산 · 기준일 ${dateLabel(reference)}\n생년월일 ${dateLabel(birth)}\n보험나이(신규 가입 기준) ${result.insurance}세\n현재나이(세는나이) ${result.counting}세\n만나이 ${result.full}세\n${next}`, `보험나이 ${result.insurance}세`);
    } catch (reason) { error('calc-age-error', reason.message); }
  }
  function pregnancy() {
    write('calc-pregnancy-weeks', '—'); write('calc-pregnancy-days', '예정일을 입력해주세요'); write('calc-due-countdown', '—'); write('calc-pregnancy-reference', '기준일 기준');
    write('calc-pregnancy-detail', '출생예정일을 40주 0일로 놓고 역산합니다.'); error('calc-pregnancy-error');
    if (!$('calc-due').value) return;
    try {
      const due = readDate('calc-due', '출생예정일'), reference = readDate('calc-pregnancy-date', '기준일'), result = C.pregnancy(due, reference);
      const weeks = `${result.weeks}주 ${result.remainder}일`;
      const remaining = result.remaining > 0 ? `${number(result.remaining)}일 남음` : result.remaining === 0 ? '예정일 당일' : `${number(-result.remaining)}일 경과`;
      write('calc-pregnancy-weeks', weeks); write('calc-pregnancy-days', `계산상 임신 ${number(result.days)}일`); write('calc-due-countdown', remaining); write('calc-pregnancy-reference', dateLabel(due));
      write('calc-pregnancy-detail', `기준일 ${dateLabel(reference)} · 0주 0일에 해당하는 날짜 ${dateLabel(result.start)}${result.remaining < 0 ? '\n예정일을 지난 참고 계산입니다. 출산 후에는 임신주수로 사용하지 않습니다.' : ''}`);
      copy(`임신주수 계산 · 기준일 ${dateLabel(reference)}\n출생예정일 ${dateLabel(due)}\n${weeks} (계산상 ${result.days}일)\n${remaining}\n예정일을 40주 0일로 역산한 참고값입니다.`, weeks);
    } catch (reason) { error('calc-pregnancy-error', reason.message); }
  }
  function dates() {
    const results = []; let valid = true;
    write('calc-range-result', '—'); write('calc-range-detail', ''); error('calc-range-error');
    try {
      const start = readDate('calc-range-start', '시작일'), end = readDate('calc-range-end', '종료일'), include = $('calc-range-inclusive').checked;
      const result = C.difference(start, end, include), detail = `${result.weeks}주 ${result.remainder}일 · ${include ? '시작일 포함' : '시작일 제외'}`;
      write('calc-range-result', number(result.days) + '일'); write('calc-range-detail', detail);
      results.push(`기간 계산\n${dateLabel(start)} ~ ${dateLabel(end)}\n${result.days}일 (${detail}, 종료일 포함)`);
    } catch (reason) { valid = false; error('calc-range-error', reason.message); }
    write('calc-offset-result', '—'); write('calc-offset-detail', ''); error('calc-offset-error');
    try {
      const base = readDate('calc-offset-date', '기준일'), raw = $('calc-offset-days').value;
      if (!/^\d+$/.test(raw)) throw new Error('일수는 0 이상의 정수로 입력하세요.');
      const days = Number(raw), include = $('calc-offset-inclusive').checked, before = $('calc-offset-direction').value === 'before';
      if (!Number.isSafeInteger(days) || days > 3000000) throw new Error('일수는 300만일 이하로 입력하세요.');
      if (include && days === 0) throw new Error('기준일을 1일째로 셀 때에는 1일 이상 입력하세요.');
      const result = C.offset(base, (days - Number(include)) * (before ? -1 : 1));
      const detail = include ? `기준일을 1일째로 · ${number(days)}일째 (${before ? '과거' : '미래'} 방향)` : `${dateLabel(base)}에서 ${number(days)}일 ${before ? '전' : '후'}`;
      write('calc-offset-result', dateLabel(result)); write('calc-offset-detail', detail);
      results.push(`날짜 계산\n기준일 ${dateLabel(base)}\n${detail}\n결과 ${dateLabel(result)}`);
    } catch (reason) { valid = false; error('calc-offset-error', reason.message); }
    if (valid) copy(results.join('\n\n'), '날짜 계산 완료');
  }
  function prorate() {
    write('calc-prorate-result', '—'); write('calc-prorate-formula', '금액을 입력하면 자동으로 계산됩니다.'); write('calc-prorate-detail', ''); error('calc-prorate-error');
    if (!$('calc-prorate-amount').value.trim()) return;
    try {
      const includeStart = $('calc-prorate-inclusive').value === 'include', rounding = $('calc-prorate-rounding').value;
      const values = {value:$('calc-prorate-amount').value, start:readDate('calc-whole-start', '전체 기간 시작일'), end:readDate('calc-whole-end', '전체 기간 종료일'), usedStart:readDate('calc-used-start', '일할 기간 시작일'), usedEnd:readDate('calc-used-end', '일할 기간 종료일'), includeStart, rounding};
      const result = C.prorate(values), roundingLabel = {floor:'원 미만 버림', round:'원 미만 반올림', ceil:'원 미만 올림'}[rounding];
      const formula = `${won(result.amount)} × ${number(result.usedDays)}일 ÷ ${number(result.totalDays)}일`;
      write('calc-prorate-result', won(result.pay)); write('calc-prorate-formula', formula);
      write('calc-prorate-detail', `전체 ${number(result.totalDays)}일 중 ${number(result.usedDays)}일 (${result.percent}%)\n${includeStart ? '시작일·종료일 모두 포함' : '시작일 제외 · 종료일 포함'} · ${roundingLabel}`);
      copy(`일할계산\n전체 기간 ${dateLabel(values.start)} ~ ${dateLabel(values.end)}\n일할 기간 ${dateLabel(values.usedStart)} ~ ${dateLabel(values.usedEnd)}\n${formula} = ${won(result.pay)}\n${includeStart ? '양끝 날짜 포함' : '시작일 제외 · 종료일 포함'} · ${roundingLabel}\n단순 일수 비례 참고값입니다.`, won(result.pay));
    } catch (reason) { error('calc-prorate-error', reason.message); }
  }
  function render() {
    copy();
    $('calc-panel-' + active).querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    ({age, pregnancy, dates, prorate})[active]();
  }
  function select(name, focus = false) {
    active = name;
    tabs.forEach(tab => { const selected = tab.dataset.calcTab === name; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; $('calc-panel-' + tab.dataset.calcTab).hidden = !selected; });
    dialog.querySelector('.calculator-panels').scrollTop = 0;
    if (focus) tabs.find(tab => tab.dataset.calcTab === name).focus({preventScroll:true});
    dialog.querySelector('.modal-feedback').hidden = true; render();
  }
  function defaults() {
    const today = C.today();
    dialog.querySelectorAll('[data-calc-today]').forEach(field => { if (field.dataset.autoToday !== 'no') field.value = today; });
    if (initialized) return;
    initialized = true;
    const year = C.parse(today).year;
    $('calc-range-start').value = today; $('calc-range-end').value = C.offset(today, 30);
    $('calc-whole-start').value = year + '-01-01'; $('calc-whole-end').value = (year + 1) + '-01-01';
    $('calc-used-start').value = today; $('calc-used-end').value = C.offset(today, Math.min(30, C.difference(today, (year + 1) + '-01-01').days));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.calcTab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(tabs[next].dataset.calcTab, true); }
    });
  });
  dialog.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', event => { event.preventDefault(); render(); });
    const changed = event => { if (event.target.matches('[data-calc-today]')) event.target.dataset.autoToday = 'no'; render(); };
    form.addEventListener('input', changed); form.addEventListener('change', changed);
  });
  dialog.querySelectorAll('[data-today-for]').forEach(button => button.addEventListener('click', () => { const field = $(button.dataset.todayFor); field.value = C.today(); field.dataset.autoToday = 'yes'; render(); }));
  dialog.querySelectorAll('[data-calc-days]').forEach(button => button.addEventListener('click', () => { $('calc-offset-days').value = button.dataset.calcDays; render(); }));
  $('calc-birth').addEventListener('blur', () => { const value = C.parse($('calc-birth').value); if (value) $('calc-birth').value = C.iso(value); });
  $('calc-prorate-amount').addEventListener('blur', () => { try { if ($('calc-prorate-amount').value.trim()) $('calc-prorate-amount').value = C.amount($('calc-prorate-amount').value).toLocaleString('ko-KR'); } catch {} });
  $('open-calculators').addEventListener('click', () => { defaults(); select(active, true); });
  defaults(); render();
})();
