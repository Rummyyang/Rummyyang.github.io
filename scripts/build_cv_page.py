#!/usr/bin/env python3
"""Build the public CV from cv/cv-data.json with only the Python standard library."""

import argparse
from datetime import date
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]


def text(value):
    return escape(str(value or ""), quote=True)


def safe_url(value):
    value = str(value or "").strip()
    parsed = urlparse(value)
    return value if parsed.scheme in ("http", "https") and parsed.netloc else ""


def link(label, url, css="", external=False):
    url = safe_url(url)
    if not url:
        return ""
    attrs = ' target="_blank" rel="noopener noreferrer"' if external else ""
    return f'<a class="{text(css)}" href="{text(url)}"{attrs}>{text(label)}</a>'


def authors(value):
    # Escape first, then add markup only around the author's exact short name.
    return re.sub(r"(?<![A-Za-z])(R\. Yang|Runming Yang)(?![A-Za-z])", r"<strong>\1</strong>", text(value))


def section_heading(number, title, extra=""):
    return f'<div class="section-heading"><span class="section-number" aria-hidden="true">{number:02}</span><h2>{text(title)}</h2>{extra}</div>'


def build(data):
    papers = data["publications"]
    paper_ids = {p["id"] for p in papers}
    ids = [p["id"] for p in papers] + [h["id"] for h in data.get("highlights", [])]
    if len(ids) != len(set(ids)) or any(not re.fullmatch(r"[a-z][a-z0-9-]*", i) for i in ids):
        raise ValueError("Paper and highlight IDs must be unique lower-case HTML fragment identifiers.")
    for paper in papers:
        if paper["type"] not in ("publication", "preprint", "manuscript"):
            raise ValueError(f'Unknown publication type: {paper["type"]}')
    published = [p for p in papers if p["type"] == "publication"]
    preprints = [p for p in papers if p["type"] != "publication"]
    updated = date.fromisoformat(data["updated"]).strftime("%d %B %Y").lstrip("0")
    navigation = [("education", "Education"), ("research", "Research Highlights"), ("industry", "Industry Experience"), ("publications", "Publications"), ("preprints", "Preprints & Manuscripts")]
    nav = "".join(f'<a href="#{key}"><span aria-hidden="true">{index:02}</span>{label}</a>' for index, (key, label) in enumerate(navigation, 1))
    contacts = []
    if data.get("email"):
        contacts.append(f'<a href="mailto:{text(data["email"])}">{text(data["email"])}</a>')
    if data.get("phone"):
        contacts.append(f'<span>{text(data["phone"])}</span>')
    if data.get("github"):
        contacts.append(link("GitHub ↗", data["github"], external=True))
    interests = "".join(f'<li>{text(interest)}</li>' for interest in data.get("interests", []))
    education = "".join(
        f'<article class="timeline-entry"><div class="entry-heading"><h3>{text(item["institution"])}</h3><p class="dates">{text(item["dates"])}</p></div><p class="entry-role">{text(item["degree"])}</p>'
        + (f'<ul class="entry-details">{"".join(f"<li>{text(detail)}</li>" for detail in item.get("details", []))}</ul>' if item.get("details") else "")
        + '</article>' for item in data.get("education", [])
    )
    research = []
    for item in data.get("highlights", []):
        paper_link = f'<a class="text-link" href="#{text(item["paper_id"])}">View publication <span aria-hidden="true">↗</span></a>' if item.get("paper_id") in paper_ids else ""
        role = f'<p class="highlight-role">{text(item["role"])}</p>' if item.get("role") else ""
        research.append(f'<article id="{text(item["id"])}" class="highlight-entry"><h3>{text(item["title"])}</h3>{role}<p>{text(item["description"])}</p>{paper_link}</article>')
    experience = "".join(
        f'<article class="timeline-entry"><div class="entry-heading"><h3>{text(item["organization"])}</h3><p class="dates">{text(item["dates"])}</p></div><p class="entry-role">{text(item["title"])}</p>'
        + (f'<ul class="entry-details">{"".join(f"<li>{text(bullet)}</li>" for bullet in item.get("bullets", []))}</ul>' if item.get("bullets") else "")
        + '</article>' for item in data.get("experience", [])
    )

    def paper_list(items):
        rendered = []
        for paper in items:
            paper_links = link("Paper ↗", paper.get("paper_url"), "paper-link", True) + link("Code ↗", paper.get("code_url"), "paper-link", True) + link("Project ↗", paper.get("project_url"), "paper-link", True)
            detail = f'<p class="paper-summary">{text(paper["summary"])}</p>' if paper.get("summary") else ""
            status = f'<span class="paper-status">{text(paper["status"])}</span>' if paper.get("status") else ""
            rendered.append(f'''<li class="paper" id="{text(paper['id'])}" data-paper-type="{text(paper['type'])}">
              <div class="paper-heading"><h3>{text(paper['title'])}</h3><span class="paper-year">{text(paper['year'])}</span></div>
              <p class="paper-authors">{authors(paper['authors'])}</p>
              <p class="paper-venue">{text(paper['venue'])}{status}</p>
              {detail}
              <div class="paper-actions">{paper_links}<button class="copy-link" type="button" data-copy-id="{text(paper['id'])}" aria-label="Copy link to {text(paper['title'])}"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m7.5 12.5 5-5M6 10l-1 1a3 3 0 0 0 4 4l2-2M9 7l2-2a3 3 0 0 1 4 4l-1 1"/></svg>Copy link</button></div>
            </li>''')
        return '<ol class="paper-list">' + "".join(rendered) + '</ol>'

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="author" content="{text(data['name'])}">
  <meta name="description" content="{text(data['name'])} — academic curriculum vitae. {text(data['tagline'])}">
  <title>{text(data['name'])} · Curriculum Vitae</title>
  <link rel="icon" href="../img/favicon.jpg">
  <link rel="stylesheet" href="styles.css">
  <script src="cv.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to curriculum vitae</a>
  <div class="page-shell">
    <header class="topbar"><a class="home-link" href="../"><span aria-hidden="true">↖</span> Home</a><span class="topbar-label">Curriculum Vitae</span><a class="topbar-download" href="runming_yang_cv.pdf" download>Download PDF <span aria-hidden="true">↓</span></a></header>
    <div class="document-layout">
      <aside class="sidebar"><div class="sidebar-content"><p class="eyebrow">Contents</p><nav aria-label="Curriculum vitae sections">{nav}</nav><div class="sidebar-note"><span class="small-label">Last updated</span><time datetime="{text(data['updated'])}">{updated}</time><a href="runming_yang_cv.tex" download>LaTeX source <span aria-hidden="true">↗</span></a></div></div></aside>
      <main id="main" tabindex="-1">
        <section class="hero" aria-labelledby="name"><p class="eyebrow">Academic curriculum vitae</p><h1 id="name">{text(data['name'])}<span lang="zh-Hans">{text(data['chinese_name'])}</span></h1><p class="tagline">{text(data['tagline'])}</p><ul class="interests" aria-label="Research interests">{interests}</ul><div class="contact-links">{"".join(contacts)}</div><div class="hero-actions"><a class="primary-button" href="runming_yang_cv.pdf" download>Download PDF <span aria-hidden="true">↓</span></a><a class="text-link" href="runming_yang_cv.tex" download>LaTeX source <span aria-hidden="true">↗</span></a></div></section>
        <section class="cv-section" id="education">{section_heading(1, "Education")}{education}</section>
        <section class="cv-section" id="research">{section_heading(2, "Research Highlights")}<div class="research-highlights">{"".join(research)}</div></section>
        <section class="cv-section" id="industry">{section_heading(3, "Industry Experience")}{experience}</section>
        <div class="publication-area" id="papers">
          <div class="publication-tools" hidden><div class="filter-buttons" role="group" aria-label="Filter papers"><button type="button" data-filter="all" aria-pressed="true">All <span>{len(papers)}</span></button><button type="button" data-filter="publication" aria-pressed="false">Published &amp; accepted <span>{len(published)}</span></button><button type="button" data-filter="preprint" aria-pressed="false">Preprints &amp; manuscripts <span>{len(preprints)}</span></button></div><p class="filter-status" aria-live="polite" aria-atomic="true">Showing all {len(papers)} papers</p></div>
          <section class="cv-section paper-section" id="publications" data-paper-group="publication">{section_heading(4, "Publications", f'<span class="section-count">{len(published)}</span>')}{paper_list(published)}</section>
          <section class="cv-section paper-section" id="preprints" data-paper-group="preprint">{section_heading(5, "Preprints & Manuscripts", f'<span class="section-count">{len(preprints)}</span>')}{paper_list(preprints)}</section>
          <p class="author-note">* indicates equal contribution.</p>
        </div>
        <footer class="footer"><p>Last updated <time datetime="{text(data['updated'])}">{updated}</time></p><a href="../">{text(data['name'])} · Homepage <span aria-hidden="true">↗</span></a></footer>
      </main>
    </div>
  </div>
  <div class="copy-status" role="status" aria-live="polite" aria-atomic="true"></div>
  <dialog class="copy-dialog" aria-labelledby="copy-title"><form method="dialog"><h2 id="copy-title">Copy publication link</h2><p>Select and copy this URL to share or discuss this paper.</p><label for="share-url">Publication URL</label><input id="share-url" type="text" readonly><button class="primary-button" type="submit">Done</button></form></dialog>
</body>
</html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "cv" / "cv-data.json")
    parser.add_argument("--output", type=Path, default=ROOT / "cv" / "index.html")
    args = parser.parse_args()
    data = json.loads(args.data.read_text(encoding="utf-8"))
    rendered = build(data)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(f"Built {args.output} ({len(data['publications'])} papers)")


if __name__ == "__main__":
    main()
