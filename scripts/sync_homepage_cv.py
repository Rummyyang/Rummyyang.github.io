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

def a(url, label):
    mode = ' data-pjax="false"' if url.startswith('/cv/') else ''
    return f'<a{mode} href="{escape(url, quote=True)}">{escape(label)}</a>'

def h(label, id):
    return f'<h1 id="{id}"><span style="color: #336699">{label}</span></h1>'

parts = [start_marker, h("Biography", "Biography"), '<p>I am a Ph.D. student in Electrical and Electronic Engineering at the University of Hong Kong, supervised by '+a('https://scholar.google.com/citations?user=PM_uMYIAAAAJ&hl=en', 'Prof. Ngai Wong')+'. I received my M.Eng. in Big Data Engineering from Tsinghua University in 2025, advised by '+a('https://scholar.google.com/citations?user=4gH3sxsAAAAJ&hl=en','Prof. Yujiu Yang')+', and my B.Eng. from Huazhong University of Science and Technology in 2021.</p>', '<p><strong>'+a('/cv/runming_yang_cv_zh.pdf', '中文学术简历（PDF）')+'</strong> &nbsp; · &nbsp; '+a('/cv/runming_yang_cv_en.pdf', 'English CV (PDF)')+'</p>', h('Research Interests','Research-Interests'), '<p>'+escape('; '.join(data['interests']))+'. My work explores model compression and efficient reasoning in large language models.</p>', h('Publications ('+str(sum(x['type']=='publication' for x in data['publications']))+')','Publications'), '<p>Selected published and accepted papers. '+a('/cv/runming_yang_cv_zh.pdf', 'Full publications and preprints (Chinese PDF)')+'.</p>', '<p><small>* indicates equal contribution.</small></p>', '<ul>']
for p in [x for x in data['publications'] if x['type']=='publication']:
    title = a(p['paper_url'],p['title']) if p.get('paper_url') else escape(p['title'])
    authors = escape(p['authors']).replace('Runming Yang', '<strong>Runming Yang</strong>').replace('R. Yang', '<strong>R. Yang</strong>')
    parts.append('<li><p>'+title+'<br><small>'+authors+'.<br><strong style="color: #1c4269">'+escape(p['venue'])+'</strong></small></p></li>')
parts += ['</ul>', h('Industry Experience','Internship')]
for e in data['experience']:
    parts.append('<p><strong>'+escape(e['organization'])+'</strong> — '+escape(e['title'])+'<br>'+escape(e['dates'])+'</p>')
    parts.append('<ul>'+''.join('<li>'+escape(b)+'</li>' for b in e['bullets'])+'</ul>')
if data.get('current_research'):
    parts.append(h('Current Research', 'Current-Research'))
    for project in data['current_research']:
        parts.append('<p><strong>'+escape(project['title'])+'</strong> — '+escape(project['dates'])+'<br>'+escape(project['summary'])+'</p>')
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
page = re.sub(r'\(Last updated(?: on |: )[^)]+\)', '(Last updated: '+escape(data['updated'])+')', page)
page = re.sub(r'(?:©|&copy;)\d{4} by Runming Yang\.', '©'+data['updated'][:4]+' by Runming Yang.', page)
path.write_text(page)
print(path)
