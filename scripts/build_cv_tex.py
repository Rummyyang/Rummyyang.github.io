#!/usr/bin/env python3
"""Build concise Chinese/English CVs in the original academic resume style."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'cv/cv-data.json').read_text())


def tex(value):
    replacements = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}'}
    return ''.join(replacements.get(c, c) for c in str(value))


def href(url, label):
    return r'\href{' + url.replace('%', r'\%').replace('#', r'\#') + '}{' + tex(label) + '}'


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
\definecolor{venuefill}{RGB}{17,65,112}
\definecolor{submissionfill}{RGB}{230,239,248}
\newcommand{\venuebadge}[1]{\begingroup\setlength{\fboxsep}{3pt}\colorbox{venuefill}{\textcolor{white}{\strut\bfseries #1}}\endgroup}
\newcommand{\submissionbadge}[1]{\begingroup\setlength{\fboxsep}{3pt}\colorbox{submissionfill}{\textcolor{venuefill}{\strut\bfseries #1}}\endgroup}
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
    header += (r'杨润明\quad YANG Runming' if zh else 'YANG Runming') + r'}\par\medskip\endgroup' + '\n'
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
        out = [r'\begin{rSection}{' + label + r'}\small\raggedright']
        out.append(r'\textsuperscript{*} 共同第一作者。' if zh else r'\textsuperscript{*} Equal contribution.')
        out.append(r'\begin{enumerate}[label={' + (r'[\arabic*]' if kind == 'publication' else r'[P\arabic*]') + '}]')
        for row in rows:
            venue = tex(choose(row, 'venue'))
            if kind == 'publication':
                venue = r'\venuebadge{' + venue + '}'
            elif row.get('submission_venue'):
                venue = r'\submissionbadge{' + venue + '}'
            links = ' '.join(href(row[key], '[' + name + ']') for key, name in [('paper_url', 'Paper'), ('code_url', 'Code'), ('project_url', 'Project')] if row.get(key))
            entry = authors(row.get('authors_short', row['authors'])) + '. ' + r'\textit{' + tex(row['title']) + r'.}\\[2pt] ' + venue + r'\quad ' + links
            out.append(r'\item\begin{samepage} ' + entry + r'\par\end{samepage}')
        out.append(r'\end{enumerate}\end{rSection}\normalsize')
        return out

    lines.extend(papers('publication'))
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
    lines.append(r'\newpage\vspace*{12pt}')
    lines.append(r'\begin{rSection}{' + ('在研项目 / Ongoing Research' if zh else 'ONGOING RESEARCH') + '}')
    for row in DATA['current_research']:
        lines.append(r'\textbf{' + tex(choose(row, 'title')) + r'}\hfill ' + tex(choose(row, 'dates')) + r'\\')
        lines.append('香港大学博士阶段与其他团队合作研究' if zh else 'Collaborative Ph.D. research at the University of Hong Kong')
        lines.append(r'\begin{itemize}')
        lines.extend(r'\item ' + tex(b) for b in choose(row, 'bullets'))
        lines.append(r'\end{itemize}')
    lines.append(r'\end{rSection}')
    lines.extend(papers('preprint'))
    lines.append(r'\par\vspace{2pt}{\parfillskip=0pt\noindent\rule{\linewidth}{0.4pt}\par}')
    lines.append(r'\begin{center}\footnotesize ' + ('更新日期：' if zh else 'Last updated: ') + DATA['updated'].replace('-', '.') + r'\end{center}')
    lines.append(r'\end{document}')
    path = ROOT / ('cv/runming_yang_cv.tex' if zh else 'cv/runming_yang_cv_en.tex')
    path.write_text('\n'.join(lines) + '\n')
    print(path)


for language in ('zh', 'en'):
    render(language)
