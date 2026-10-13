#!/usr/bin/env python3
"""Build a standalone CV using the user's original 2604 resume typography."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "cv/cv-data.json").read_text())


def tex(value):
    replacements = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}
    return "".join(replacements.get(c, c) for c in value)


def href(url, label):
    return r"\href{" + url.replace("%", r"\%").replace("#", r"\#") + "}{" + tex(label) + "}"


def pub_author(value):
    return re.sub(r"(?<!\w)(?:Runming Yang|R\. Yang)(?:\*)?(?!\w)", lambda m: r"\textbf{" + m.group(0) + "}", tex(value))


lines = [r"""% Original resume template: Copyright (C) 2010 by Trey Hunner.
% Created by Trey Hunner and modified by www.LaTeXTemplates.com.
% Copying and distribution, with or without modification, are permitted in any
% medium without royalty provided this copyright notice and notice are preserved.
% This file is offered as-is, without any warranty.
% The original class typography is inlined for standalone editor compilation.
\documentclass[11pt,a4paper]{article}
\usepackage[left=0.4in,top=0.4in,right=0.4in,bottom=0.3in]{geometry}
\usepackage[parfill]{parskip}
\usepackage{array}
\usepackage{hyperref}
\usepackage{needspace}
\hypersetup{colorlinks=true,linkcolor=blue,filecolor=magenta,urlcolor=cyan,
 pdftitle={Yang Runming - Curriculum Vitae},pdfauthor={Runming Yang}}
\pagestyle{empty}
\newenvironment{rSection}[1]{
  \Needspace{9\baselineskip}\medskip
  \MakeUppercase{\textbf{#1}}\medskip\hrule
  \begin{list}{}{\setlength{\leftmargin}{0em}}\item[]
}{\end{list}}
\begin{document}
\begingroup
  \centering{\LARGE\bfseries Yang Runming}\par\medskip
\endgroup
"""]
lines.append(r"\begingroup\centering " + r" $\diamond$ ".join([
    "Tel: (+86) 17362995487", href("mailto:" + DATA["email"], DATA["email"]),
    href(DATA["homepage"], DATA["homepage"])
]) + r"\par\endgroup\smallskip")
lines.append(r"\begin{rSection}{Education}")
for e in DATA["education"]:
    details = e["details"]
    degree = e["degree"]
    if e["institution"] == "The University of Hong Kong":
        degree = "Ph.D. student in Electrical and Electronic Engineering"
    gpa = next((d.removeprefix("GPA: ") for d in details if d.startswith("GPA: ")), None)
    if gpa:
        degree += " (GPA: " + gpa + ")"
    lines.append(r"\textbf{" + tex(e["institution"]) + "}, " + tex(degree) + r"\hfill " + tex(e["dates"]) + r"\\")
    if e["institution"] == "The University of Hong Kong":
        detail_line = "Advisor: " + href("https://scholar.google.com/citations?user=PM_uMYIAAAAJ&hl=en", "Prof. Ngai Wong") + r"\quad |\quad Research: LLM Efficiency and Post-Training"
    elif e["institution"] == "Tsinghua University":
        detail_line = "Advisor: " + href("https://scholar.google.com/citations?user=4gH3sxsAAAAJ&hl=zh-CN", "Prof. Yujiu Yang") + r"\quad |\quad Research: Model Compression and Knowledge Distillation"
    else:
        detail_line = "; ".join(tex(d) for d in details)
    lines.append(detail_line + "\n")
lines.append(r"\end{rSection}")
lines.append(r"\begin{rSection}{Internship}")
for e in DATA["experience"]:
    role, _, team = e["title"].partition(", ")
    organization = e["organization"] + (" " + team if team else "")
    lines.append(r"\textbf{" + tex(organization) + "}, " + tex(role) + r"\hfill " + tex(e["dates"]) + r"\\")
    lines.append(tex("Built domain-specific multimodal datasets; conducted model post-training and evaluation; investigated cross-modal feature fusion."))
lines.append(r"\end{rSection}")
for kind, heading in [("publication", "Publications"), ("preprint", "Preprints")]:
    lines.append(r"\begin{rSection}{" + heading + r"}\small")
    lines.append(r"* indicates equal contribution.\begin{itemize}")
    for p in [x for x in DATA["publications"] if x["type"] == kind]:
        links = " ".join(href(p[key], "[" + label + "]") for key, label in [("paper_url", "Paper"), ("code_url", "Code"), ("project_url", "Project")] if p.get(key))
        lines.append(r"\item\begin{samepage} " + pub_author(p.get("authors_short", p["authors"])) + ". " + r"\textit{" + tex(p["title"]) + ".} " + tex(p["venue"]) + " " + links + r"\\")
        lines.append(tex(p["summary"]) + r"\par\end{samepage}")
    lines.append(r"\end{itemize}\end{rSection}")
lines.append(r"\par\vspace{2pt}{\parfillskip=0pt\noindent\rule{\linewidth}{0.4pt}\par}")
lines.append(r"\begin{center}\footnotesize Last updated: " + DATA["updated"].replace("-", ".") + r"\end{center}")
lines.append(r"\end{document}")
output = ROOT / "cv/runming_yang_cv.tex"
output.write_text("\n".join(lines) + "\n")
print(output)
