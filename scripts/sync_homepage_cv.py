#!/usr/bin/env python3
"""Synchronize the homepage's academic summary with the shared CV data."""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "cv/cv-data.json").read_text())
path = ROOT / "index.html"
page = path.read_text()
start_marker = "<!-- CV SUMMARY START -->"
end_marker = "<!-- CV SUMMARY END -->"

def a(url, label, research_title=False):
    standalone = url.startswith(('/cv/', '/research/', 'https://rummyyang.github.io/research/'))
    mode = ' data-pjax="false"' if standalone else ''
    if url.startswith(('/research/', 'https://rummyyang.github.io/research/')):
        color = '#18222d' if research_title else '#0055aa'
        mode += f' target="_blank" rel="noopener noreferrer" style="color:{color};font-weight:700"'
    return f'<a{mode} href="{escape(url, quote=True)}">{escape(label)}</a>'

def h(label, id):
    return f'<h1 id="{id}"><span style="color: #336699">{label}</span></h1>'

def research_text(value, links):
    matches = sorted((value.index(link['text']), link) for link in links if link['text'] in value)
    parts, end = [], 0
    for start, link in matches:
        parts.extend([escape(value[end:start]), a(link['url'], link['text'])])
        end = start + len(link['text'])
    return ''.join(parts) + escape(value[end:])

parts = [start_marker, h("Biography", "Biography"), '<p>I am a Ph.D. student in Electrical and Electronic Engineering at the University of Hong Kong, supervised by '+a('https://scholar.google.com/citations?user=PM_uMYIAAAAJ&hl=en', 'Prof. Ngai Wong')+'. I received my M.Eng. in Big Data Engineering from Tsinghua University in 2025, advised by '+a('https://scholar.google.com/citations?user=4gH3sxsAAAAJ&hl=en','Prof. Yujiu Yang')+', and my B.Eng. from Huazhong University of Science and Technology in 2021.</p>', '<p><strong>'+a('/cv/runming_yang_cv_zh.pdf', '中文学术简历（PDF）')+'</strong> &nbsp; · &nbsp; '+a('/cv/runming_yang_cv_en.pdf', 'English CV (PDF)')+'</p>', h('Research Interests','Research-Interests'), '<p>'+escape('; '.join(data['interests']))+'. My work explores model compression and efficient reasoning in large language models.</p>', h('Publications','Publications'), '<p>Selected published and accepted papers. '+a('/cv/runming_yang_cv_zh.pdf', 'Full publications and preprints (Chinese PDF)')+'.</p>', '<p><small>* indicates equal contribution.</small></p>', '<ul>']
for p in [x for x in data['publications'] if x['type']=='publication']:
    paper_url = p.get('paper_url')
    if not paper_url or paper_url.startswith('https://arxiv.org/'):
        paper_url = ('https://arxiv.org/abs/'+p['arxiv_id']) if p.get('arxiv_id') else paper_url
    title = a(paper_url,p['title']) if paper_url else escape(p['title'])
    authors = escape(p['authors']).replace('Runming Yang', '<strong>Runming Yang</strong>').replace('R. Yang', '<strong>R. Yang</strong>')
    parts.append('<li><p>'+title+'<br><small>'+authors+'. <strong style="display: inline; color: #324656; background: #ebf1f5; padding: 1px 4px">'+escape(p['venue'])+'</strong> '+(a(paper_url, '[Paper]') if paper_url else '')+'</small></p></li>')
parts += ['</ul>', h('Industry Experience','Internship')]
for e in data['experience']:
    parts.append('<p><strong>'+escape(e['organization'])+'</strong> — '+escape(e['title'])+'<br>'+escape(e['dates'])+'</p>')
    parts.append('<ul>'+''.join('<li>'+escape(b)+'</li>' for b in e['bullets'])+'</ul>')
if data.get('current_research'):
    parts.append(h('Current Research', 'Current-Research'))
    for project in data['current_research']:
        title = a(project['project_url'], project['title'], research_title=True) if project.get('project_url') else escape(project['title'])
        institution = 'HKU' if project['institution'] == 'The University of Hong Kong' else project['institution']
        parts.append('<p><strong>'+title+'</strong><span style="margin-left:1.6em">'+escape(institution)+'</span> — '+escape(project['dates'])+'</p>')
        if project.get('settings'):
            note = '<br><small>'+escape(project['metric_note'])+'</small>' if project.get('metric_note') else ''
            parts.append('<p>'+escape(project['settings'])+note+'</p>')
        items = []
        for i, bullet in enumerate(project['bullets']):
            lead = project.get('bullet_leads', [])[i] if i < len(project.get('bullet_leads', [])) else ''
            groups = project.get('bullet_inline_links', [])
            links = groups[i] if i < len(groups) else []
            for link in links:
                if bullet.count(link['text']) != 1:
                    raise ValueError('Research link text must occur exactly once in its bullet')
            content = '<strong>'+research_text(lead, links)+'</strong> '+research_text(bullet[len(lead):].lstrip(), links) if lead and bullet.startswith(lead) else research_text(bullet, links)
            items.append('<li>'+content+'</li>')
        parts.append('<ul>'+''.join(items)+'</ul>')
parts.append(end_marker)
new='\n'.join(parts)
if start_marker in page:
    page = page[:page.index(start_marker)] + new + page[page.index(end_marker)+len(end_marker):]
else:
    start = page.index('<h1 id="Biography">')
    end = page.index('</article>',start)
    page = page[:start] + new + '\n' + page[end:]
page = re.sub(r'<p class="author-bio">.*?</p>', '<p class="author-bio">Ph.D. student at the University of Hong Kong<br>'+a('mailto:'+data['email'], data['email'])+'</p>', page, flags=re.S)
page = re.sub(r'href="mailto:[^"]*"', lambda _: 'href="mailto:'+escape(data['email'], quote=True)+'"', page)
cv_nav = '<li class="menus_item"><a class="site-page" data-pjax="false" href="/cv/runming_yang_cv_zh.pdf"> 中文 CV</a></li>'
nav_pattern = r'<li class="menus_item">\s*<a[^>]*href="/cv/(?:runming_yang_cv(?:_zh|_en)?\.pdf)?"[^>]*>\s*(?:CV(?: \(PDF\))?|中文 CV)</a>\s*</li>'
if re.search(nav_pattern, page):
    page = re.sub(nav_pattern, lambda _: cv_nav, page)
else:
    page = page.replace('<ul class="menus_items">', '<ul class="menus_items">\n                '+cv_nav, 1)
page = page.replace('<title>Homepage</title>', '<title>Runming Yang | LLM Efficiency &amp; Post-Training</title>')
page = page.replace("<h2>LLM-Neo <em> (submitted to ICASSP 25') </em> </h2>", '<h2>LLM-Neo</h2>')
page = re.sub(r'\(Last updated(?: on |: )[^)]+\)', '(Last updated: '+escape(data['updated'][:7])+')', page)
page = re.sub(r'(?:©|&copy;)\d{4} by Runming Yang\.', '©'+data['updated'][:4]+' by Runming Yang.', page)
path.write_text(page)
print(path)
