(function () {
  'use strict';
  const checkboxKey = 'runming-learning-tgt-plan-v1';
  const checkboxes = Array.from(document.querySelectorAll('[data-plan-check]'));
  let saved = {};
  let canSave = true;
  try { const value = JSON.parse(localStorage.getItem(checkboxKey) || '{}'); saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (_) { canSave = false; }
  const progress = document.getElementById('plan-progress');
  const progressText = document.getElementById('plan-progress-text');
  const storageText = document.getElementById('storage-note');
  function updateProgress() {
    const count = checkboxes.filter(x => x.checked).length;
    checkboxes.forEach(x => x.closest('.plan-day').classList.toggle('done', x.checked));
    if (progress) { progress.max = checkboxes.length; progress.value = count; }
    if (progressText) progressText.textContent = count + ' / ' + checkboxes.length + ' 项完成';
    if (storageText) storageText.textContent = canSave ? '进度仅保存在当前浏览器，不会上传。' : '当前浏览器无法保存进度；本次页面内仍可勾选。';
  }
  checkboxes.forEach(x => {
    x.checked = saved[x.id] === true;
    x.addEventListener('change', () => {
      saved[x.id] = x.checked;
      try { localStorage.setItem(checkboxKey, JSON.stringify(saved)); } catch (_) { canSave = false; }
      updateProgress();
    });
  });
  updateProgress();
  const search = document.getElementById('source-search');
  const type = document.getElementById('source-type');
  const sources = Array.from(document.querySelectorAll('[data-source-card]'));
  const countText = document.getElementById('source-count');
  const empty = document.getElementById('source-empty');
  function filterSources() {
    const term = (search ? search.value : '').trim().toLocaleLowerCase();
    const category = type ? type.value : 'all';
    let count = 0;
    sources.forEach(card => {
      const match = (category === 'all' || card.dataset.kind === category) && (!term || card.textContent.toLocaleLowerCase().includes(term));
      card.hidden = !match;
      if (match) count += 1;
    });
    if (countText) countText.textContent = '显示 ' + count + ' / ' + sources.length + ' 条来源';
    if (empty) empty.hidden = count !== 0;
  }
  if (search) search.addEventListener('input', filterSources);
  if (type) type.addEventListener('change', filterSources);
  filterSources();
  function showTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    const details = target.closest('details');
    if (details) details.open = true;
    if (target.matches('[data-source-card]') && target.hidden) {
      if (search) search.value = '';
      if (type) type.value = 'all';
      filterSources();
    }
  }
  window.addEventListener('hashchange', showTarget);
  showTarget();
  const printButton = document.getElementById('print-study');
  if (printButton) printButton.addEventListener('click', () => window.print());
  let printState = null;
  window.addEventListener('beforeprint', () => {
    const details = Array.from(document.querySelectorAll('details'));
    if (!printState) printState = { details: details.map(x => x.open), sources: sources.map(x => x.hidden) };
    details.forEach(x => x.open = true);
    sources.forEach(x => x.hidden = false);
  });
  window.addEventListener('afterprint', () => {
    if (!printState) return;
    Array.from(document.querySelectorAll('details')).forEach((x, i) => x.open = printState.details[i]);
    sources.forEach((x, i) => x.hidden = printState.sources[i]);
    printState = null;
  });
})();
