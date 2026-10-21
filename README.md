# RunmingYang.github.io

Source for Yang Runming's English homepage.

Thanks to the source code from https://wutaiqiang.github.io/ and the help from https://yataiji.github.io/

## Academic CV

The academic CV has fixed-layout Chinese and English PDFs at `/cv/runming_yang_cv_zh.pdf` and `/cv/runming_yang_cv_en.pdf`. Chinese is the default: `/cv/` redirects to it, and the older `/cv/runming_yang_cv.pdf` is an identical Chinese copy for existing links. There is no HTML CV. Edit `cv/cv-data.json` to update both languages, then regenerate:

```sh
python3 scripts/build_cv_tex.py
python3 scripts/build_cv_redirect.py
python3 scripts/sync_homepage_cv.py
```

The Chinese source remains `cv/runming_yang_cv.tex`; the English source is `cv/runming_yang_cv_en.tex`. Both are standalone and work in the Codex LaTeX editor. The original academic style is retained, with a centered header, black section rules, author-first entries, and Computer Modern Latin typography. Chinese uses Fandol fonts through `ctex`. Conference names appear inline on muted backgrounds, and each paper includes a short description; publications and preprints have separate numbering without heading counts. Available preprints use a consistent clickable `[arXiv]` label; no link is invented for manuscripts without a public arXiv record. The displayed update date uses year and month. Submitted papers are explicitly labeled, and manuscripts are ordered by the author position of Runming Yang, with LLM-NEO and PTQTP placed last at the author’s request. For a local PDF export with existing TeX Live:

```sh
cd cv
xelatex -no-shell-escape -interaction=nonstopmode -halt-on-error -jobname=runming_yang_cv_zh runming_yang_cv.tex
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error runming_yang_cv_en.tex
cp runming_yang_cv_zh.pdf runming_yang_cv.pdf
```

Commit the data, generated LaTeX, PDFs, homepage, and compatibility redirect together. GitHub Pages serves the repository root on `main`. Keep publication status, author order, and equal-contribution markers accurate; authorship follows the user-confirmed manuscript version, while submission destinations are labeled as submissions rather than acceptances. Public preprint links may refer to earlier manuscript versions. Current HKU research distinguishes measured results from proposed interpretations; the headline accuracy figures specify the model, benchmark, generation budget, and estimator. The same downstream RL setup does not imply equal total training cost. A `project_url` labels a project page separately from released code (`code_url`).

## OPD experiment slides

The eight-slide presentation is published at [research/opd/opd_deck.html#1](https://rummyyang.github.io/research/opd/opd_deck.html#1). Both CV PDFs link to it through the research title and an explicit “实验图解” / “Slides” link. The homepage links to the same presentation.

This is a dated research snapshot from 2026-10-21, based on the author-supplied standalone deck. Its layout, charts, data, and interactions are retained. The publication copy clarifies the matched 50-step self-distillation comparison, the KL-anchored baseline, and the distinction between a nonsignificant difference and equivalence. It does not claim that accuracy differences identify separate knowledge and pattern contributions. All charts and scripts are inline; Google Fonts is optional, with system-font fallbacks. No experiment server, private API, or local file is required.

When replacing the deck, check all eight slides, navigation, budget controls, light/dark themes, and the CV link. Keep experimental figures and explanatory labels consistent. Publish only the reviewed HTML; do not add raw experiment logs, checkpoints, local paths, or credentials.

## Research learning pages

`/learning/` contains the TGT and post-training preparation hub. `/learning/papers.html` is the complete 15-paper study guide. `/learning/adaptive-thinking.html` covers the adaptive thinking field, surveys, conference papers, and recent methods. The public pages use local CSS/JavaScript, native expandable sections, printable layouts, and a browser-local study checklist; no analytics or remote progress storage is used.

Edit the curated notes in `learning/data/`, the page templates, or `learning/papers.html`, then run:

```sh
python3 scripts/build_learning.py
python3 scripts/build_adaptive_guide.py
python3 scripts/build_research_updates.py
```

Keep official recruitment facts, self-reported interview experiences, and original practice questions distinct. Preserve source URLs, publication/version dates, verification dates, and publication-status evidence. Unperformed experiments must remain labeled as proposals. Do not publish credentials, local paths, private employer data, or material from the separate private collaboration workspace. The learning pages do not regenerate or alter the CV PDF.

`/learning/adaptive-products.html` adds a focused Sonata reading and official product controls. `/learning/cot-data-opd.html` connects CoT data, on-policy distillation, recent papers, evaluation, and a clearly labeled in-progress project presentation template. Their sources are in `learning/data/{sonata,industry-products,open-products,cot-opd}.json`; edit `products-template.html` and `cot-template.html` for the teaching structure. Keep product behavior separate from undisclosed implementation and research proposals separate from completed personal work.
