/* Progressive enhancement: the complete CV remains readable without JavaScript. */
(() => {
  'use strict';
  const filters = [...document.querySelectorAll('[data-filter]')];
  const groups = [...document.querySelectorAll('[data-paper-group]')];
  const papers = [...document.querySelectorAll('[data-paper-type]')];
  const status = document.querySelector('.filter-status');
  const tools = document.querySelector('.publication-tools');
  const toast = document.querySelector('.copy-status');
  let toastTimeout;

  function applyFilter(filter) {
    for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    for (const section of groups) section.hidden = filter !== 'all' && section.dataset.paperGroup !== filter;
    const visible = papers.filter(paper => filter === 'all' || (filter === 'publication' ? paper.dataset.paperType === 'publication' : paper.dataset.paperType !== 'publication')).length;
    status.textContent = filter === 'all' ? `Showing all ${visible} papers` : `Showing ${visible} ${filter === 'publication' ? 'published / accepted papers' : 'preprints / manuscripts'}`;
  }
  for (const button of filters) button.addEventListener('click', () => applyFilter(button.dataset.filter));
  if (tools) tools.hidden = false;

  // Deep links and contents navigation should reveal a paper even after filtering.
  function revealTarget(hash = window.location.hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const section = target && target.closest('[data-paper-group]');
    if (section && section.hidden) applyFilter('all');
  }
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) revealTarget(anchor.getAttribute('href'));
  });
  window.addEventListener('hashchange', () => revealTarget());
  revealTarget();

  function announce(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toastTimeout = setTimeout(() => { toast.textContent = ''; }, 4000);
  }
  async function copyPublication(id) {
    const url = new URL(window.location.href);
    url.hash = id;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url.href);
      announce('Link copied · 链接已复制');
    } catch {
      const dialog = document.querySelector('.copy-dialog');
      const input = document.getElementById('share-url');
      input.value = url.href;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        input.focus();
        input.select();
      } else {
        window.prompt('Copy this publication link · 复制论文链接', url.href);
      }
    }
  }
  for (const button of document.querySelectorAll('[data-copy-id]')) {
    button.addEventListener('click', () => copyPublication(button.dataset.copyId));
  }
  const dialog = document.querySelector('.copy-dialog');
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });

  // A quiet position indicator, with native anchor navigation preserved.
  const navigation = [...document.querySelectorAll('.sidebar nav a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      for (const anchor of navigation) {
        if (anchor.hash === `#${visible[0].target.id}`) anchor.setAttribute('aria-current', 'location');
        else anchor.removeAttribute('aria-current');
      }
    }, { rootMargin: '-8% 0px -65% 0px', threshold: 0 });
    for (const section of document.querySelectorAll('main > .cv-section, .paper-section')) observer.observe(section);
  }
})();
