(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorkroomCalculators = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000;
  const isLeap = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = (year, month) => [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

  function date(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > monthDays(year, month)) return null;
    const value = new Date(0); value.setUTCFullYear(year, month - 1, day); value.setUTCHours(0, 0, 0, 0);
    return { year, month, day, serial: value.getTime() / DAY };
  }
  function parse(value) {
    let text = String(value || '').trim();
    if (/^\d{8}$/.test(text)) text = text.slice(0,4) + '-' + text.slice(4,6) + '-' + text.slice(6);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    return match ? date(Number(match[1]), Number(match[2]), Number(match[3])) : null;
  }
  function required(value, label = '날짜') {
    const result = parse(value);
    if (!result) throw new Error(label + '를 올바르게 입력하세요.');
    return result;
  }
  function fromSerial(serial) {
    const value = new Date(serial * DAY);
    return date(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  const iso = value => `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  const display = value => `${value.year}. ${String(value.month).padStart(2, '0')}. ${String(value.day).padStart(2, '0')}.`;
  function today(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  // For a missing anniversary, the period ends on month-end and the age changes the next day.
  function anniversary(year, month, day) {
    const first = date(year, month, 1);
    if (!first) throw new Error('계산할 수 있는 날짜 범위를 벗어났습니다.');
    return fromSerial(first.serial + Math.min(day - 1, monthDays(year, month)));
  }
  function halfBirthday(birth, ageYears) {
    const month = birth.month + 6;
    return anniversary(birth.year + ageYears + (month > 12 ? 1 : 0), month > 12 ? month - 12 : month, birth.day);
  }
  function age(birthValue, referenceValue) {
    const birth = required(birthValue, '생년월일'), reference = required(referenceValue, '기준일');
    if (birth.serial > reference.serial) throw new Error('생년월일은 기준일보다 늦을 수 없습니다.');
    let full = reference.year - birth.year;
    if (reference.serial < anniversary(reference.year, birth.month, birth.day).serial) full--;
    const threshold = halfBirthday(birth, full);
    const rounded = reference.serial >= threshold.serial;
    const next = rounded ? halfBirthday(birth, full + 1) : threshold;
    return { full, counting: reference.year - birth.year + 1, yearAge: reference.year - birth.year, insurance: full + Number(rounded), nextInsurance: next ? iso(next) : null, nextInDays: next ? next.serial - reference.serial : null, boundary: birth.day > 28 && (birth.month === 2 || birth.month === 8) };
  }
  function pregnancy(dueValue, referenceValue) {
    const due = required(dueValue, '출생예정일'), reference = required(referenceValue, '기준일');
    const days = 280 + reference.serial - due.serial;
    if (days < 0) throw new Error('기준일이 예정일의 280일 전보다 이릅니다. 날짜를 확인하세요.');
    const start = fromSerial(due.serial - 280);
    if (!start) throw new Error('계산할 수 있는 날짜 범위를 벗어났습니다.');
    return { days, weeks: Math.floor(days / 7), remainder: days % 7, remaining: due.serial - reference.serial, start: iso(start) };
  }
  function difference(startValue, endValue, includeStart = false) {
    const start = required(startValue, '시작일'), end = required(endValue, '종료일');
    if (end.serial < start.serial) throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
    const days = end.serial - start.serial + Number(includeStart);
    return { days, weeks: Math.floor(days / 7), remainder: days % 7 };
  }
  function offset(baseValue, days) {
    const base = required(baseValue, '기준일');
    if (!Number.isSafeInteger(days)) throw new Error('일수는 정수로 입력하세요.');
    const target = fromSerial(base.serial + days);
    if (!target) throw new Error('계산할 수 있는 날짜 범위를 벗어났습니다.');
    return iso(target);
  }
  function amount(value) {
    const text = String(value).trim().replace(/원$/, '').trim();
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) throw new Error('기준 금액은 0 이상의 정수로 입력하세요.');
    const integer = BigInt(text.replace(/,/g, ''));
    if (integer > 999999999999999n) throw new Error('기준 금액은 15자리 이하로 입력하세요.');
    return integer;
  }
  function prorate({value, start, end, usedStart, usedEnd, includeStart = false, rounding = 'floor'}) {
    const whole = difference(start, end, includeStart), used = difference(usedStart, usedEnd, includeStart);
    if (whole.days <= 0) throw new Error('전체 기간은 1일 이상이어야 합니다.');
    if (required(usedStart).serial < required(start).serial || required(usedEnd).serial > required(end).serial) throw new Error('계산 기간은 전체 기간 안에 있어야 합니다.');
    if (!['floor', 'round', 'ceil'].includes(rounding)) throw new Error('원 단위 처리 방법을 선택하세요.');
    const money = amount(value), numerator = money * BigInt(used.days), denominator = BigInt(whole.days);
    let pay = numerator / denominator; const remainder = numerator % denominator;
    if (rounding === 'ceil' && remainder > 0n || rounding === 'round' && remainder * 2n >= denominator) pay++;
    return {pay: String(pay), amount: String(money), totalDays: whole.days, usedDays: used.days, percent: (used.days / whole.days * 100).toFixed(2)};
  }
  return {parse, iso, display, today, age, pregnancy, difference, offset, amount, prorate};
});
