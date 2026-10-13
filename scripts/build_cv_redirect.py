#!/usr/bin/env python3
"""Keep the old /cv/ URL pointing to the fixed-layout, official PDF."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
target = ROOT / "cv/index.html"
target.write_text('''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=runming_yang_cv.pdf">
  <link rel="canonical" href="https://rummyyang.github.io/cv/runming_yang_cv.pdf">
  <title>Runming Yang — Curriculum Vitae (PDF)</title>
  <script>window.location.replace("runming_yang_cv.pdf");</script>
</head>
<body>
  <p><a href="runming_yang_cv.pdf">Open Runming Yang’s curriculum vitae (PDF)</a></p>
</body>
</html>
''', encoding="utf-8")
print(target)
