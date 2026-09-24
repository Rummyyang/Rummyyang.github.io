# PDF.js 5.6.205

Mozilla PDF.js, pinned to 5.6.205 from the installed pdfjs-dist distribution, licensed under Apache-2.0 (see LICENSE). Only the minified display/worker builds and their CMap/font/WASM assets are included. Each asset folder retains its upstream license files.

The client passes authenticated PDF bytes directly into the worker. No manuscript URL, key or document contents are sent to a third-party viewer. Scripting/XFA/eval support is disabled in the page integration.

Official API example: https://mozilla.github.io/pdf.js/examples/
