(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const variantNames = { zh: '中文稿', en: '英文稿', journal: '投稿润色' };
  const state = { config: null, paper: 'paper-1', variant: 'zh', anchor: null, filter: 'open', issues: [], loaded: false, local: null, pdfUrl: null, next: null, syncing: false };
  let toastTimer;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  function icon(name) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `#i-${name}`); svg.setAttribute('aria-hidden', 'true'); svg.append(use); return svg; }
  function link(text, href, cls = '') { const a = el('a', cls, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  const paper = () => state.config.papers.find(p => p.id === state.paper);
  const version = () => paper().versions[state.variant];
  const repoUrl = () => `https://github.com/${state.config.repository}`;
  const apiBase = () => `https://api.github.com/repos/${state.config.repository}`;
  const storage = { read(k) { try { return localStorage.getItem(k); } catch { return null; } }, write(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } } };
  function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
  function setStatus(text, error = false) { $('#sync-status').textContent = text; $('#sync-status').classList.toggle('error', error); }
  function key() { return `paper-studio:draft:${state.paper}:${state.variant}:${version().id}`; }
  function saveDraft() { if (!state.config || state.local) return; const ok = storage.write(key(), JSON.stringify({ body: $('#comment-body').value, category: $('#comment-category').value, anchor: state.anchor })); $('#draft-status').textContent = ok ? '草稿仅保存在此浏览器' : '无法保存草稿，请勿关闭页面'; }
  function restoreDraft() { let d; try { d = JSON.parse(storage.read(key())); } catch {} $('#comment-body').value = typeof d?.body === 'string' ? d.body.slice(0, 600) : ''; $('#comment-category').value = ['内容与结构', '数据与方法', '翻译与表达', '期刊与格式', '其他建议'].includes(d?.category) ? d.category : '内容与结构'; state.anchor = d?.anchor && typeof d.anchor.id === 'string' && typeof d.anchor.quote === 'string' && findParagraph(d.anchor.id) ? d.anchor : null; $('#char-count').textContent = $('#comment-body').value.length; updateAnchor(); }
  function readHash() { const q = new URLSearchParams(location.hash.slice(1)); const p = q.get('paper'); const v = q.get('version'); if (state.config.papers.some(x => x.id === p)) state.paper = p; if (Object.hasOwn(variantNames, v)) state.variant = v; return q.get('paragraph'); }
  function pageUrl(anchor) { const u = new URL(location.href); u.search = ''; u.hash = new URLSearchParams({ paper: state.paper, version: state.variant, ...(anchor ? { paragraph: anchor } : {}) }).toString(); return u.href; }
  function updateUrl() { history.replaceState(null, '', pageUrl(state.anchor?.id)); }
  function findParagraph(id) { return (version().sections || []).flatMap(s => s.paragraphs).find(p => p.id === id); }
  function switchView(p, v) { saveDraft(); exitLocal(false); state.paper = p; state.variant = v; state.anchor = null; render(); restoreDraft(); updateUrl(); }
  function render() {
    const p = paper(), v = version();
    $('#paper-nav').replaceChildren(...state.config.papers.map((item, i) => {
      const b = el('button', `paper-link${item.id === state.paper ? ' active' : ''}`); b.setAttribute('aria-current', item.id === state.paper ? 'page' : 'false');
      b.append(el('span', 'paper-number', `0${i + 1}`)); const label = el('span'); label.append(el('strong', '', item.name), el('small', '', item.versions.zh.status === 'published' ? '稿件已发布' : '等待拆分与定稿')); b.append(label); if (item.id === state.paper) b.append(el('span', 'nav-indicator', '›')); b.onclick = () => switchView(item.id, state.variant); return b;
    }));
    $('#workspace-title').textContent = p.name; $('#breadcrumb-paper').textContent = p.name; $('#workspace-subtitle').textContent = p.subtitle; $('#target-journal').textContent = p.journal || '待确定';
    document.title = `${p.name} · ${variantNames[state.variant]} | 小小黑的论文工作台`;
    $$('.stage').forEach((n, i) => n.classList.toggle('current', i === (p.stage || 0)));
    $$('#language-tabs button').forEach(n => { const active = n.dataset.variant === state.variant; n.setAttribute('aria-selected', String(active)); n.tabIndex = active ? 0 : -1; });
    $('#version-label').textContent = v.label; $('#all-discussions').href = `${repoUrl()}/issues?q=${encodeURIComponent('is:issue "[论文批注]"')}`;
    $('#preview-notice').hidden = v.status === 'published';
    $('#preview-notice span').textContent = v.status === 'demo' ? '示例' : '待准备';
    $('#preview-notice p').textContent = v.status === 'demo' ? '尚未上传论文正文。可以先体验段落批注，或就拆分方向发起讨论。' : '此版本尚未发布，欢迎先留下你希望关注的问题。';
    renderDocument(v); renderComments(); updateAnchor();
  }
  function renderDocument(v) {
    const doc = $('#document'); doc.replaceChildren();
    if (v.pdf) {
      const url = new URL(v.pdf, location.href);
      if (url.origin !== location.origin && url.protocol !== 'blob:') throw new Error('PDF 必须使用本站文件');
      doc.append(el('div', 'doc-eyebrow', 'MANUSCRIPT / PDF'), el('h2', 'doc-title', v.title));
      const frame = el('iframe', 'pdf-frame'); frame.src = url.href; frame.title = v.title; doc.append(link('单独打开 PDF ↗', url.href, 'pdf-download'), frame);
      $('#reading-tip-text').textContent = 'PDF 批注请在评论中注明页码；段落定位适用于文字稿。';
    } else {
      $('#reading-tip-text').textContent = state.local ? '这是本地文件预览，其他人无法访问。' : '选中文字，或点击段落旁的批注按钮。';
      doc.append(el('div', 'doc-eyebrow', `${state.paper.toUpperCase().replace('-', ' / ')} · ${state.variant === 'zh' ? 'CHINESE' : state.variant === 'en' ? 'ENGLISH' : 'JOURNAL'}`));
      if (!v.sections?.length) { const empty = el('div', 'document-empty'); const box = el('div', 'empty-icon'); box.append(icon('file')); empty.append(box, el('h3', '', v.title), el('p', '', v.subtitle)); doc.append(empty); }
      else {
        doc.append(el('h2', 'doc-title', v.title), el('div', 'doc-subtitle', v.subtitle || ''));
        v.sections.forEach((section, i) => { const s = el('section', 'doc-section'); const h = el('h3'); h.append(el('span', '', String(i + 1).padStart(2, '0')), document.createTextNode(section.title)); s.append(h);
          section.paragraphs.forEach(p => { const row = el('div', 'paragraph'); row.dataset.paragraph = p.id; row.id = `paragraph-${p.id}`; row.append(el('p', '', p.text));
            if (!state.local) { const b = el('button', 'annotate'); b.type = 'button'; b.title = '批注这一段'; b.setAttribute('aria-label', `批注：${p.text.slice(0, 24)}`); b.append(icon('comment')); b.onclick = () => selectAnchor(p.id, p.text); row.append(b); } s.append(row);
          }); doc.append(s);
        });
      }
    }
    const count = (v.sections || []).reduce((n, s) => n + s.paragraphs.length, 0);
    $('#document-meta').textContent = state.local ? '仅本地预览 · 未上传' : `${v.label} · ${count ? `${count} 个段落` : '尚无正文'}`;
  }
  function selectAnchor(id, quote) { if (state.local || !findParagraph(id)) return; state.anchor = { id, quote: quote.slice(0, 180) }; updateAnchor(); saveDraft(); updateUrl(); $('#selection-button').hidden = true; $('#comment-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); $('#comment-body').focus({ preventScroll: true }); }
  function updateAnchor() { const n = $('#anchor-context'); n.textContent = state.anchor ? `“${state.anchor.quote}”` : '针对当前版本的整体建议'; n.classList.toggle('is-selected', Boolean(state.anchor)); $('#clear-anchor').hidden = !state.anchor; $$('.paragraph').forEach(p => p.classList.toggle('selected', p.dataset.paragraph === state.anchor?.id)); }
  function inspectSelection() {
    const s = window.getSelection(); const b = $('#selection-button'); b.hidden = true;
    if (state.local || !s || s.isCollapsed || !s.rangeCount) return;
    const start = s.anchorNode?.parentElement?.closest('.paragraph'), end = s.focusNode?.parentElement?.closest('.paragraph');
    if (!start || start !== end || !$('#document').contains(start)) return;
    const quote = s.toString().trim(); if (!quote) return;
    const rect = s.getRangeAt(0).getBoundingClientRect(); b.style.left = `${Math.max(10, Math.min(rect.left, innerWidth - 180))}px`; b.style.top = `${Math.max(10, Math.min(rect.bottom + 8, innerHeight - 50))}px`; b.hidden = false;
    b.onpointerdown = e => e.preventDefault(); b.onclick = () => selectAnchor(start.dataset.paragraph, quote);
  }
  function parseIssue(issue) {
    if (issue.pull_request || typeof issue.body !== 'string' || !Number.isSafeInteger(issue.number)) return null;
    const match = issue.body.match(/<!-- paper-studio:v1 (\{[^\n]{1,1200}\}) -->/); if (!match) return null;
    let meta; try { meta = JSON.parse(match[1]); } catch { return null; }
    if (!state.config.papers.some(p => p.id === meta.paper) || typeof meta.variant !== 'string' || !Object.hasOwn(variantNames, meta.variant) || typeof meta.revision !== 'string' || !/^[\w.-]{1,80}$/.test(meta.revision) || !(meta.paragraph === null || (typeof meta.paragraph === 'string' && /^[\w.-]{1,100}$/.test(meta.paragraph)))) return null;
    const delimiter = '\n### 评论\n'; const start = issue.body.indexOf(delimiter); const body = start >= 0 ? issue.body.slice(start + delimiter.length) : null;
    const quoted = issue.body.match(/\n### 引用\n([\s\S]*?)\n### 评论\n/)?.[1]?.trim().replace(/^> ?/gm, '') || '';
    return { ...issue, meta, quote: quoted, reviewText: body ? body.trim() : issue.body.replace(match[0], '').trim(), url: `${repoUrl()}/issues/${issue.number}` };
  }
  function visibleIssues() { return state.issues.filter(i => i.meta.paper === state.paper && i.meta.variant === state.variant); }
  function renderComments() {
    const all = visibleIssues(), shown = all.filter(i => state.filter === 'all' || i.state === state.filter); $('#comment-count').textContent = all.length;
    const list = $('#comments-list'); list.replaceChildren();
    if (!shown.length) { const empty = el('div', 'empty-comments'); empty.append(icon('comment'), el('h3', '', !state.loaded ? '正在连接讨论区' : state.filter === 'closed' ? '还没有已解决的批注' : '这里留给你的第一条建议'), el('p', '', !state.loaded ? '共享批注会显示在这里。' : '可以讨论一个段落，也可以聊聊整篇论文。')); list.append(empty); }
    shown.forEach(i => {
      const card = el('article', `comment-card ${i.state}`); const top = el('div', 'comment-author'); const date = new Date(i.created_at); const time = el('time', '', Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
      top.append(link(i.user?.login || 'GitHub 用户', i.url), time); card.append(top);
      const location = el('button', 'comment-location'); const old = i.meta.revision !== version().id; const existing = i.meta.paragraph && findParagraph(i.meta.paragraph);
      location.textContent = `${i.state === 'closed' ? '已解决 · ' : ''}${old ? `历史版本 ${i.meta.revision} · ` : ''}${i.meta.paragraph ? existing ? '查看对应段落' : '原段落已移除' : '全文评论'}`;
      location.disabled = !existing || Boolean(state.local); location.onclick = () => { const row = document.getElementById(`paragraph-${i.meta.paragraph}`); row?.scrollIntoView({ behavior: 'smooth', block: 'center' }); state.anchor = { id: i.meta.paragraph, quote: existing.text.slice(0, 180) }; updateAnchor(); saveDraft(); updateUrl(); };
      card.append(location); if (i.quote) card.append(el('blockquote', 'comment-quote', i.quote)); card.append(el('p', 'comment-text', i.reviewText)); const actions = el('div', 'comment-actions'); actions.append(link('回复 / 处理 ↗', i.url));
      if (i.comments > 0) { const b = el('button', '', `${i.comments} 条回复`); b.onclick = () => loadReplies(i, card, b); actions.append(b); } actions.append(el('span', '', `#${i.number}`)); card.append(actions); list.append(card);
    });
    if (state.next) { const b = el('button', 'load-more', '加载更早的讨论'); b.onclick = () => syncIssues(false, true); list.append(b); }
    $$('.annotate .annotation-badge').forEach(b => b.remove());
    $$('.paragraph').forEach(p => { const count = all.filter(i => i.meta.paragraph === p.dataset.paragraph && i.state === 'open' && i.meta.revision === version().id).length; if (count && $('.annotate', p)) $('.annotate', p).append(el('span', 'annotation-badge', String(count))); });
  }
  async function githubGet(url) {
    const parsed = new URL(url); if (parsed.origin !== 'https://api.github.com' || !parsed.pathname.startsWith(`/repos/${state.config.repository}/issues`)) throw new Error('无效的讨论地址');
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(18000) });
    if (!response.ok) { if (response.status === 403 || response.status === 429) throw new Error('GitHub 暂时限制访问频率，请稍后刷新或直接打开 GitHub 讨论。'); throw new Error('暂时无法读取共享批注，请稍后重试或直接打开 GitHub 讨论。'); }
    const data = await response.json(); if (!Array.isArray(data)) throw new Error('讨论数据格式异常');
    const next = response.headers.get('link')?.match(/<([^>]+)>; rel="next"/)?.[1] || null; return { data, next };
  }
  async function syncIssues(force = false, more = false) {
    if (state.syncing) return; state.syncing = true; $('#refresh-button').disabled = true;
    const cacheKey = `paper-studio:issues:${state.config.repository}`;
    try {
      if (!more) {
        let cached; try { cached = JSON.parse(storage.read(cacheKey)); } catch {}
        if (cached && Array.isArray(cached.data)) { state.issues = cached.data.map(parseIssue).filter(Boolean); state.loaded = true; state.next = cached.next || null; renderComments(); if (!force && Date.now() - cached.time < 180000) { setStatus('已读取共享批注 · 3 分钟内的缓存'); return; } }
      }
      setStatus('正在同步 GitHub 讨论…');
      let next = more ? state.next : `${apiBase()}/issues?state=all&per_page=100&sort=updated&direction=desc`;
      let collected = more ? [...state.issues] : []; let pages = 0;
      while (next && pages < 3) { const result = await githubGet(next); collected.push(...result.data.map(parseIssue).filter(Boolean)); next = result.next; pages++; }
      const unique = new Map(collected.map(i => [i.number, i])); state.issues = [...unique.values()]; state.next = next; state.loaded = true;
      storage.write(cacheKey, JSON.stringify({ data: state.issues, next, time: Date.now() })); renderComments(); setStatus(next ? '已同步最近讨论，可继续加载更早的记录。' : `已同步 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e) { setStatus(`${state.loaded ? '显示上次读取的记录。' : '批注读取失败。'}${e.message}`, true); if (!state.loaded) { const empty = el('div', 'empty-comments'); empty.append(el('h3', '', '暂时无法读取讨论'), link('到 GitHub 查看批注 ↗', `${repoUrl()}/issues`)); $('#comments-list').replaceChildren(empty); } }
    finally { state.syncing = false; $('#refresh-button').disabled = false; }
  }
  async function loadReplies(issue, card, b) {
    if ($('.comment-replies', card)) { const replies = $('.comment-replies', card); replies.hidden = !replies.hidden; return; }
    b.disabled = true; b.textContent = '读取中…';
    try { const { data, next } = await githubGet(`${apiBase()}/issues/${issue.number}/comments?per_page=100`); const replies = el('div', 'comment-replies'); data.forEach(r => { const row = el('div', 'reply'); row.append(el('strong', '', r.user?.login || 'GitHub 用户'), el('div', '', r.body || '')); replies.append(row); }); if (next) replies.append(link('到 GitHub 查看全部回复 ↗', issue.url)); card.append(replies); b.textContent = `${issue.comments} 条回复`; }
    catch (e) { toast(e.message); b.textContent = '重试读取回复'; } finally { b.disabled = false; }
  }
  function prepareIssue() {
    if (state.local) throw new Error('本地预览尚未共享，请先发布稿件。');
    const text = $('#comment-body').value.trim(); if (!text) throw new Error('请先填写评论内容。');
    const meta = { paper: state.paper, variant: state.variant, revision: version().id, paragraph: state.anchor?.id || null };
    const body = `<!-- paper-studio:v1 ${JSON.stringify(meta)} -->\n\n### 位置\n${paper().name} · ${variantNames[state.variant]} · ${version().label} (${version().id})\n类型：${$('#comment-category').value}\n段落：${state.anchor?.id || '全文'}\n页面：${pageUrl(state.anchor?.id)}\n${state.anchor ? `\n### 引用\n> ${state.anchor.quote.replace(/\n/g, '\n> ')}\n` : ''}\n### 评论\n${text}`;
    const url = new URL(`${repoUrl()}/issues/new`); url.searchParams.set('title', `[论文批注] ${paper().name} · ${variantNames[state.variant]} · ${state.anchor?.id || '全文建议'}`); url.searchParams.set('body', body);
    if (url.href.length > 7800) throw new Error('评论与引用合计过长，请缩短后再发布。'); return { url: url.href, body };
  }
  async function importFile(file) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { toast('请使用小于 30 MB 的文件。'); return; }
    const ext = file.name.split('.').pop().toLowerCase(); if (!['pdf', 'txt', 'md'].includes(ext)) { toast('支持 PDF、Markdown 和 TXT 文件。'); return; }
    if (ext !== 'pdf' && file.size > 1024 * 1024) { toast('文字稿请使用小于 1 MB 的文件。'); return; }
    saveDraft(); exitLocal(false);
    const local = { title: file.name, subtitle: '仅在当前浏览器预览，未上传到共享页面。', sections: [] };
    if (ext === 'pdf') { state.pdfUrl = URL.createObjectURL(file); local.pdf = state.pdfUrl; }
    else { const text = await file.text(); let s = { title: '文件内容', paragraphs: [] }; local.sections.push(s); text.split(/\n\s*\n/).forEach((part, i) => { const trimmed = part.trim(); if (!trimmed) return; if (/^#{1,6}\s+/.test(trimmed) && !trimmed.includes('\n')) { s = { title: trimmed.replace(/^#{1,6}\s+/, ''), paragraphs: [] }; local.sections.push(s); } else s.paragraphs.push({ id: `local-${i}`, text: trimmed }); }); local.sections = local.sections.filter(s => s.paragraphs.length); }
    state.local = local; state.anchor = null; $('#preview-notice').hidden = false; $('#preview-notice span').textContent = '本地'; $('#preview-notice p').textContent = '文件未上传，其他人无法访问。退出预览可继续为共享稿件批注。'; $('#restore-button').hidden = false; $('#version-label').textContent = '本地预览'; $('#publish-comment').disabled = true; $('#comment-body').disabled = true; $('#comment-category').disabled = true; $('#publish-hint').textContent = '当前文件只在此浏览器中预览。发布稿件后才能进行共享批注。'; $('#selection-button').hidden = true; renderDocument(local); updateAnchor(); renderComments(); toast('文件已在本地打开，没有上传。');
  }
  function exitLocal(redraw = true) { if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl); state.pdfUrl = null; state.local = null; $('#restore-button').hidden = true; $('#publish-comment').disabled = false; $('#comment-body').disabled = false; $('#comment-category').disabled = false; $('#publish-hint').textContent = '将打开 GitHub，登录后确认提交。发布后回到这里刷新即可看到。'; if (redraw && state.config) { render(); restoreDraft(); } }
  function registerTools() {
    if (!document.modelContext?.registerTool) return;
    const tools = [
      { name: 'read_paper_workspace', title: '读取论文工作台', description: '读取当前论文、版本、段落和共享批注状态。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ paper: state.paper, variant: state.variant, revision: version().id, localPreview: Boolean(state.local), paragraphs: (version().sections || []).flatMap(s => s.paragraphs), commentsLoaded: state.loaded, comments: visibleIssues().map(i => ({ number: i.number, state: i.state, text: i.reviewText, url: i.url })) }) },
      { name: 'navigate_paper_version', title: '切换论文版本', description: '切换当前论文与语言版本，不发布评论。', inputSchema: { type: 'object', properties: { paper: { type: 'string', enum: state.config.papers.map(p => p.id) }, variant: { type: 'string', enum: Object.keys(variantNames) } }, required: ['paper', 'variant'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => { if (!input || typeof input.variant !== 'string' || !state.config.papers.some(p => p.id === input.paper) || !Object.hasOwn(variantNames, input.variant)) throw new Error('无效的论文或版本'); switchView(input.paper, input.variant); return { paper: state.paper, variant: state.variant }; } }
    ];
    tools.forEach(t => { try { Promise.resolve(document.modelContext.registerTool(t)).catch(() => {}); } catch {} });
  }
  async function init() {
    try { const response = await fetch('./papers.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('数据文件读取失败'); state.config = await response.json(); if (!/^[\w.-]+\/[\w.-]+$/.test(state.config.repository) || !state.config.papers?.length) throw new Error('论文配置无效'); const anchor = readHash(); render(); restoreDraft(); if (anchor && findParagraph(anchor)) { if (state.anchor?.id !== anchor) state.anchor = { id: anchor, quote: findParagraph(anchor).text.slice(0, 180) }; updateAnchor(); document.getElementById(`paragraph-${anchor}`)?.scrollIntoView({ block: 'center' }); } syncIssues(); registerTools(); }
    catch (e) { $('#document').replaceChildren(el('h2', 'doc-title', '暂时无法读取论文'), el('p', '', '请刷新页面重试。')); setStatus(e.message, true); $('#publish-comment').disabled = true; }
  }
  $$('#language-tabs button').forEach(b => { b.onclick = () => switchView(state.paper, b.dataset.variant); b.onkeydown = e => { const tabs = $$('#language-tabs button'); let i = tabs.indexOf(b); if (e.key === 'ArrowRight') i = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') i = (i + tabs.length - 1) % tabs.length; else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = tabs.length - 1; else return; e.preventDefault(); tabs[i].click(); tabs[i].focus(); }; });
  $$('.review-filters button').forEach(b => b.onclick = () => { state.filter = b.dataset.filter; $$('.review-filters button').forEach(n => n.setAttribute('aria-pressed', String(n === b))); renderComments(); });
  $('#clear-anchor').onclick = () => { state.anchor = null; updateAnchor(); saveDraft(); updateUrl(); };
  $('#comment-body').oninput = () => { $('#char-count').textContent = $('#comment-body').value.length; saveDraft(); }; $('#comment-category').onchange = saveDraft;
  $('#comment-form').onsubmit = e => { e.preventDefault(); try { const draft = prepareIssue(); saveDraft(); const a = link('', draft.url); document.body.append(a); a.click(); a.remove(); toast('请在 GitHub 确认提交；返回后点击刷新。'); } catch (error) { toast(error.message); } };
  $('#refresh-button').onclick = () => syncIssues(true);
  $('#share-button').onclick = async () => { try { await navigator.clipboard.writeText(pageUrl(state.anchor?.id)); toast(state.local ? '已复制共享稿件链接（不包含本地文件）。' : '链接已复制，可发给小小黑。'); } catch { toast('无法访问剪贴板，请复制浏览器地址。'); } };
  $('#help-button').onclick = () => $('#help-dialog').showModal(); $('#close-help').onclick = () => $('#help-dialog').close(); $('#help-dialog').onclick = e => { if (e.target === $('#help-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } };
  $('#import-button').onclick = () => $('#file-input').click(); $('#file-input').onchange = async e => { try { await importFile(e.target.files[0]); } catch { exitLocal(); toast('文件预览失败，请换一个文件重试。'); } e.target.value = ''; }; $('#restore-button').onclick = () => exitLocal();
  document.addEventListener('selectionchange', inspectSelection); window.addEventListener('scroll', () => { $('#selection-button').hidden = true; }, { passive: true });
  window.addEventListener('hashchange', () => { if (!state.config) return; saveDraft(); exitLocal(false); const anchor = readHash(); render(); restoreDraft(); if (anchor && findParagraph(anchor)) { if (state.anchor?.id !== anchor) state.anchor = { id: anchor, quote: findParagraph(anchor).text.slice(0, 180) }; updateAnchor(); document.getElementById(`paragraph-${anchor}`)?.scrollIntoView({ block: 'center' }); } });
  init();
})();
