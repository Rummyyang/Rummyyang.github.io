#!/usr/bin/env python3
"""Build the standalone LaTeX CV from the shared, factual CV dataset."""
import json
import re
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "cv/cv-data.json").read_text())


def tex(value):
    replacements = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}
    return "".join(replacements.get(c, c) for c in value)


def href(url, label):
    return r"\href{" + url.replace("%", r"\%").replace("#", r"\#") + "}{" + tex(label) + "}"


def bold(value):
    return r"\textbf{" + tex(value) + "}"


def pub_author(value):
    return re.sub(r"(?<!\w)(?:Runming Yang|R\. Yang)(?:\*)?(?!\w)", lambda m: r"\textbf{"+m.group(0)+"}", tex(value))


updated = date.fromisoformat(DATA["updated"]).strftime("%d %b %Y")
lines = [r"""\documentclass[11pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=17mm,headheight=14pt,footskip=9mm]{geometry}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{fancyhdr}
\usepackage{hyperref}
\definecolor{ink}{HTML}{172D40}
\definecolor{accent}{HTML}{246E77}
\definecolor{muted}{HTML}{526374}
\hypersetup{colorlinks=true,urlcolor=accent,linkcolor=accent,pdftitle={Runming Yang - Curriculum Vitae},pdfauthor={Runming Yang}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{3pt}
\setlist[itemize]{leftmargin=1.2em,itemsep=1pt,topsep=2pt,parsep=0pt}
\titleformat{\section}{\large\bfseries\color{ink}}{}{0pt}{}[\vspace{2pt}\color{accent}\titlerule]
\titlespacing*{\section}{0pt}{12pt}{7pt}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\footnotesize\color{muted}Runming Yang | Curriculum Vitae}
\fancyfoot[R]{\footnotesize\color{muted}UPDATED_DATE\quad |\quad \thepage}
\newcommand{\entry}[2]{\textbf{#1}\hfill{\small\color{muted}#2}\par}
\newcommand{\paperentry}[4]{\vspace{4pt}{\small\textbf{#1}\par}{\small #2\par}{\small\color{muted}#3\hspace{6pt}#4\par}\vspace{2pt}}
\begin{document}
{\fontsize{27}{31}\selectfont\bfseries\color{ink}Runming Yang}\par
\vspace{2pt}
""".replace("UPDATED_DATE", tex(updated))]
lines.append(r"{\small " + r" $\cdot$ ".join([href("mailto:"+DATA["email"], DATA["email"]),tex(DATA["phone"]),href(DATA["homepage"],"Homepage"),href(DATA["github"],"GitHub")]) + r"}\par")
lines.append(r"\vspace{5pt}{\color{muted}" + tex(DATA["tagline"]) + r"}\par")
lines.append(r"\section*{Education}")
for e in DATA["education"]:
    lines.append(r"\entry{"+tex(e["institution"])+"}{"+tex(e["dates"])+"}")
    lines.append(tex(e["degree"])+r"\par")
    lines.append(r"{\small\color{muted}"+"; ".join(tex(x) for x in e["details"])+r"}\par\vspace{3pt}")
lines.append(r"\section*{Research Highlights}")
pub_by_id = {p["id"]:p for p in DATA["publications"]}
for h in DATA["highlights"]:
    p = pub_by_id[h["paper_id"]]
    label = href(p["paper_url"], h["title"]) if p.get("paper_url") else tex(h["title"])
    lines.append(r"\textbf{"+label+r"}\hfill{\small\color{muted}"+tex(h["role"])+r"}\par")
    lines.append(tex(h["description"])+r"\par\vspace{4pt}")
lines.append(r"\section*{Industry Experience}")
for e in DATA["experience"]:
    lines.append(r"\entry{"+tex(e["organization"])+"}{"+tex(e["dates"])+"}")
    lines.append(r"\textit{"+tex(e["title"])+r"}\par\begin{itemize}")
    lines.extend(r"\item "+tex(b) for b in e["bullets"])
    lines.append(r"\end{itemize}")
lines.append(r"\newpage")
lines.append(r"{\Large\bfseries\color{ink}Publications and Manuscripts}\par")
lines.append(r"{\small\color{muted}* indicates equal contribution.}\par")
for group, heading in [("publication", "Publications"),("other", "Preprints and Manuscripts")]:
    lines.append(r"\section*{"+heading+"}")
    pubs=[p for p in DATA["publications"] if (p["type"]=="publication")== (group=="publication")]
    for i,p in enumerate(pubs,1):
        title = f"{i}. {p['title']}"
        links = r" $\cdot$ ".join(href(p[key], label) for key,label in [("paper_url","Paper"),("code_url","Code"),("project_url","Project")] if p.get(key))
        venue = p["venue"] or p["status"]
        lines.append(r"\paperentry{"+tex(title)+"}{"+pub_author(p.get("authors_short",p["authors"]))+"}{"+tex(venue)+"}{"+links+"}")
lines.append(r"\end{document}")
output = ROOT / "cv/runming_yang_cv.tex"
output.write_text("\n".join(lines)+"\n")
print(output)
