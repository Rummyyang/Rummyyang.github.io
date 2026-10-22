#!/usr/bin/env python3
"""Build concise Chinese/English CVs in the original academic resume style."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'cv/cv-data.json').read_text())


def tex(value):
    replacements = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}'}
    rendered = ''.join(replacements.get(c, c) for c in str(value))
    return rendered.replace('杨余久 教授', r'杨余久\hspace{0.35em}教授').replace('大数据工程 硕士', r'大数据工程\hspace{0.35em}硕士').replace('工学 学士', r'工学\hspace{0.35em}学士')


def href(url, label, color=None):
    rendered = tex(label)
    if color:
        rendered = r'\textcolor{' + color + '}{' + rendered + '}'
    return r'\href{' + url.replace('%', r'\%').replace('#', r'\#') + '}{' + rendered + '}'


def authors(value):
    parts = []
    for author in value.split(', '):
        name = author.rstrip('*')
        rendered = tex(name)
        if name in ('Runming Yang', 'R. Yang'):
            rendered = r'\textbf{' + rendered + '}'
        if author.endswith('*'):
            rendered += r'\textsuperscript{*}'
        parts.append(rendered)
    return ', '.join(parts)


def research_text(value, links, zh):
    key = 'text_zh' if zh else 'text'
    matches = sorted((value.index(link[key]), link) for link in links if link[key] in value)
    parts, end = [], 0
    for start, link in matches:
        parts.extend([tex(value[end:start]), r'\textbf{' + href(link['url'], link[key], 'researchblue') + '}'])
        end = start + len(link[key])
    return ''.join(parts) + tex(value[end:])


def research_bullet(row, index, zh):
    suffix = '_zh' if zh else ''
    value = row['bullets' + suffix][index]
    leads = row.get('bullet_leads' + suffix, [])
    groups = row.get('bullet_inline_links', [])
    links = groups[index] if index < len(groups) else []
    for link in links:
        if value.count(link['text' + suffix]) != 1:
            raise ValueError('Research link text must occur exactly once in its bullet')
    if index < len(leads) and value.startswith(leads[index]):
        lead = leads[index]
        rendered = r'\textbf{' + research_text(lead, links, zh) + '} ' + research_text(value[len(lead):].lstrip(), links, zh)
    else:
        rendered = research_text(value, links, zh)
    return rendered


def render(lang):
    zh = lang == 'zh'
    choose = lambda row, key: row.get(key + '_zh', row[key]) if zh else row[key]
    title = '杨润明 - 学术简历' if zh else 'Runming Yang - Curriculum Vitae'
    header = r'''% Original resume template: Copyright (C) 2010 by Trey Hunner.
% Created by Trey Hunner and modified by www.LaTeXTemplates.com.
% Copying and distribution, with or without modification, are permitted in any
% medium without royalty provided this copyright notice and notice are preserved.
% This file is offered as-is, without any warranty.
% Standalone source; Chinese edition uses XeLaTeX and bundled Fandol fonts.
'''
    header += ('% !TeX program = xelatex\n' + r'\documentclass[UTF8,fontset=fandol,11pt,a4paper]{ctexart}' if zh else r'\documentclass[11pt,a4paper]{article}')
    header += r'''
\usepackage[left=0.4in,top=0.4in,right=0.4in,bottom=0.3in]{geometry}
\usepackage[parfill]{parskip}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{needspace}
\usepackage{enumitem}
\definecolor{venueblue}{RGB}{28,66,105}
\definecolor{researchblue}{RGB}{0,85,170}
\definecolor{researchtitle}{RGB}{24,34,45}
\definecolor{venuefill}{RGB}{235,241,245}
\definecolor{submissionfill}{RGB}{244,243,240}
\definecolor{venuetext}{RGB}{50,70,86}
\definecolor{summarytext}{RGB}{65,65,65}
\newcommand{\venuebadge}[1]{\begingroup\setlength{\fboxsep}{1.5pt}\colorbox{venuefill}{\textcolor{venuetext}{\bfseries #1}}\endgroup}
\newcommand{\submissionbadge}[1]{\begingroup\setlength{\fboxsep}{1.5pt}\colorbox{submissionfill}{\textcolor{venuetext}{\bfseries #1}}\endgroup}
\hypersetup{colorlinks=true,linkcolor=blue,urlcolor=venueblue,
'''
    header += 'pdftitle={' + title + r'},pdfauthor={Runming Yang}}' + '\n'
    header += r'''
\pagestyle{empty}
\setlist[itemize]{leftmargin=1.25em,itemsep=2pt,topsep=3pt,parsep=0pt}
\setlist[enumerate]{leftmargin=2.5em,itemsep=5pt,topsep=3pt,parsep=0pt}
\newenvironment{rSection}[1]{
  \Needspace{7\baselineskip}\medskip
  \textbf{#1}\smallskip\hrule\smallskip
}{\par}
\begin{document}
\begingroup\centering{\LARGE\bfseries '''
    header += (r'杨润明\quad Yang Runming' if zh else 'Yang Runming') + r'}\par\medskip\endgroup' + '\n'
    lines = [header]
    lines.append(r'\begingroup\centering ' + r' $\diamond$ '.join(['(+86) 17362995487', href('mailto:' + DATA['email'], DATA['email']), href(DATA['homepage'], DATA['homepage'])]) + r'\par\endgroup\smallskip')
    lines.append(('研究方向：' if zh else 'Research interests: ') + tex(' · '.join(DATA['interests_zh']) if zh else '; '.join(DATA['interests'])))
    lines.append(r'\begin{rSection}{' + ('教育背景 / Education' if zh else 'EDUCATION') + '}')
    for row in DATA['education']:
        degree = choose(row, 'degree')
        if not zh and row['institution'] == 'The University of Hong Kong':
            degree = 'Ph.D. student in Electrical and Electronic Engineering'
        lines.append(r'\textbf{' + tex(choose(row, 'institution')) + r'}\hfill ' + tex(choose(row, 'dates')) + r'\\')
        if row['institution'] == 'The University of Hong Kong':
            details = ('导师：' if zh else 'Advisor: ') + href(row['advisor_url'], 'Prof. Ngai Wong') + ('；预计 2029.09 毕业' if zh else '; expected Sep. 2029')
        elif row['institution'] == 'Tsinghua University':
            details = ('导师：' if zh else 'Advisor: ') + href(row['advisor_url'], '杨余久 教授' if zh else 'Prof. Yujiu Yang') + ('；GPA：3.73/4.00' if zh else '; GPA: 3.73/4.00')
        else:
            details = tex(choose(row, 'details')[0])
        lines.append(tex(degree) + r'\quad |\quad ' + details + '\n')
    lines.append(r'\end{rSection}')

    def papers(kind):
        rows = [r for r in DATA['publications'] if r['type'] == kind]
        label = ('已发表论文 / Publications' if kind == 'publication' else r'预印本与投稿论文 / Preprints \& Submissions') if zh else ('PUBLICATIONS' if kind == 'publication' else 'PREPRINTS AND SUBMITTED MANUSCRIPTS')
        out = [r'\begin{rSection}{' + label + (r'}\linespread{1.05}\fontsize{10}{12}\selectfont\raggedright' if zh else r'}\small\raggedright')]
        out.append(r'\textsuperscript{*} 共同第一作者。' if zh else r'\textsuperscript{*} Equal contribution.')
        out.append(r'\begin{enumerate}[label={' + (r'[\arabic*]' if kind == 'publication' else r'[P\arabic*]') + '}]')
        for row in rows:
            arxiv_url = 'https://arxiv.org/abs/' + row['arxiv_id'] if row.get('arxiv_id') else None
            venue = tex(choose(row, 'venue'))
            if kind == 'publication':
                venue = r'\venuebadge{' + venue + '}'
            elif row.get('submission_venue'):
                venue = r'\submissionbadge{' + venue + '}'
            elif arxiv_url and row['venue'].startswith('arXiv:'):
                venue = ''
            link_items = []
            if kind == 'publication':
                paper_url = row.get('paper_url')
                if not paper_url or paper_url.startswith('https://arxiv.org/'):
                    paper_url = arxiv_url or paper_url
                if paper_url:
                    link_items.append(href(paper_url, '[Paper]'))
            else:
                if row.get('paper_url') and (not arxiv_url or not row['paper_url'].startswith('https://arxiv.org/')):
                    link_items.append(href(row['paper_url'], '[Paper]'))
                if arxiv_url:
                    link_items.append(href(arxiv_url, '[arXiv]'))
            link_items.extend(href(row[key], '[' + name + ']') for key, name in [('code_url', 'Code'), ('project_url', 'Project')] if row.get(key))
            links = ' '.join(link_items)
            entry = authors(row.get('authors_short', row['authors'])) + '. ' + r'\textit{' + tex(row['title']) + '.} ' + venue + ' ' + links
            entry += r'\\[1pt]{\textcolor{summarytext}{' + tex(choose(row, 'summary')) + '}}'
            out.append(r'\item\begin{samepage} ' + entry + r'\par\end{samepage}')
        out.append(r'\end{enumerate}\end{rSection}\normalsize')
        return out

    lines.append(r'\begin{rSection}{' + ('科研实习 / Research Internship' if zh else 'RESEARCH INTERNSHIP') + '}')
    for row in DATA['experience']:
        if zh:
            lines.append(r'\textbf{' + tex(choose(row, 'organization')) + r'}\quad ' + tex(choose(row, 'title')) + r'\hfill ' + tex(choose(row, 'dates')))
        else:
            lines.append(r'\textbf{' + tex(row['organization']) + r'}\hfill ' + tex(row['dates']) + r'\\' + tex(row['title']))
        lines.append(r'\begin{itemize}')
        lines.extend(r'\item ' + tex(b) for b in choose(row, 'bullets'))
        lines.append(r'\end{itemize}')
    lines.append(r'\end{rSection}')
    lines.append(r'\begin{rSection}{' + ('在研项目 / Ongoing Research' if zh else 'ONGOING RESEARCH') + '}')
    for row in DATA['current_research']:
        if zh and row.get('inline_institution_zh'):
            # Keep the reviewed Chinese layout and symbols reproducible from data.
            def research_tex(value):
                return (tex(value).replace('"', r'\textquotedbl{}')
                        .replace('→', r'$\rightarrow$').replace('≈', r'$\approx$')
                        .replace('α', r'$\alpha$').replace('7.5±0.5', r'$7.5\pm0.5$'))
            lines.extend([r'\begingroup', r'\fontsize{11}{16}\selectfont'])
            research_title = (href(row['project_url'], choose(row, 'title'), 'researchtitle')
                              if row.get('project_url') else research_tex(choose(row, 'title')))
            institution = research_tex(choose(row, 'institution')) + ' | ' + research_tex(choose(row, 'role'))
            lines.append(r'\textbf{' + research_title + r'}\hspace{1.6em}' + institution + r'\hfill ' + research_tex(choose(row, 'dates')) + r'\\[2pt]')
            settings = research_tex(row['settings_zh'])
            lines.append(settings)
            if row.get('metric_note_zh'):
                lines.append(r'{\small\textcolor{summarytext}{' + research_tex(row['metric_note_zh']) + '}}')
            lines.append(r'\begin{itemize}[itemsep=4pt,topsep=5pt]')
            lines.extend(r'\item ' + research_bullet(row, i, zh) for i in range(len(row['bullets_zh'])))
            lines.extend([r'\end{itemize}', r'\endgroup'])
            continue
        research_title = (href(row['project_url'], choose(row, 'title'), 'researchtitle')
                          if row.get('project_url') else tex(choose(row, 'title')))
        institution = 'HKU' if row['institution'] == 'The University of Hong Kong' else choose(row, 'institution')
        lines.append(r'{\fontsize{10.5}{13.5}\selectfont\textbf{' + research_title + r'}\hspace{1.6em}' + tex(institution) + r'\hfill ' + tex(choose(row, 'dates')) + r'\par}')
        if row.get('settings'):
            lines.append(tex(choose(row, 'settings')))
        if row.get('metric_note'):
            lines.append(r'\\[1pt]{\small\textcolor{summarytext}{' + tex(choose(row, 'metric_note')) + '}}')
        lines.append(r'\begin{itemize}')
        lines.extend(r'\item ' + research_bullet(row, i, zh) for i in range(len(choose(row, 'bullets'))))
        lines.append(r'\end{itemize}')
    lines.append(r'\end{rSection}')
    lines.append(r'\newpage')
    lines.extend(papers('publication'))
    lines.extend(papers('preprint'))
    lines.append(r'\par\vspace{2pt}{\parfillskip=0pt\noindent\rule{\linewidth}{0.4pt}\par}')
    lines.append(r'\begin{center}\footnotesize ' + ('更新日期：' if zh else 'Last updated: ') + DATA['updated'][:7].replace('-', '.') + r'\end{center}')
    lines.append(r'\end{document}')
    path = ROOT / ('cv/runming_yang_cv.tex' if zh else 'cv/runming_yang_cv_en.tex')
    path.write_text('\n'.join(lines) + '\n')
    print(path)


for language in ('zh', 'en'):
    render(language)
