# RunmingYang.github.io

Source for Yang Runming's English homepage.

Thanks to the source code from https://wutaiqiang.github.io/ and the help from https://yataiji.github.io/

## Academic CV

The official CV is the fixed-layout PDF at `/cv/runming_yang_cv.pdf`. The homepage opens that PDF directly, and the older `/cv/` URL redirects to it. There is no separate HTML version of the CV. Edit `cv/cv-data.json` to update the shared content, then regenerate:

```sh
python3 scripts/build_cv_tex.py
python3 scripts/build_cv_redirect.py
python3 scripts/sync_homepage_cv.py
```

Compile `cv/runming_yang_cv.tex` to update the downloadable PDF. The source preserves the original 2604 resume typography (Computer Modern, centered header, black section rules, author-first publication bullets) and flows naturally across pages. It works in the Codex LaTeX editor; for a local PDF export with TeX Live:

```sh
cd cv
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error runming_yang_cv.tex
```

Commit the data, generated LaTeX, PDF, homepage, and compatibility redirect together. GitHub Pages serves the repository root on `main`. Keep publication status, author order, and equal-contribution markers consistent with the linked primary sources. A `project_url` labels a project page separately from released code (`code_url`).

## Research learning pages

`/learning/` contains the TGT and post-training preparation hub. `/learning/papers.html` is the complete 15-paper study guide. `/learning/adaptive-thinking.html` covers the adaptive thinking field, surveys, conference papers, and recent methods. The public pages use local CSS/JavaScript, native expandable sections, printable layouts, and a browser-local study checklist; no analytics or remote progress storage is used.

Edit the curated notes in `learning/data/`, the page templates, or `learning/papers.html`, then run:

```sh
python3 scripts/build_learning.py
python3 scripts/build_adaptive_guide.py
```

Keep official recruitment facts, self-reported interview experiences, and original practice questions distinct. Preserve source URLs, publication/version dates, verification dates, and publication-status evidence. Unperformed experiments must remain labeled as proposals. Do not publish credentials, local paths, private employer data, or material from the separate private collaboration workspace. The learning pages do not regenerate or alter the CV PDF.
