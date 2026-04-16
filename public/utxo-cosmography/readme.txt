PROJECT BRIEF: “Drawing the Cosmos” – Non-Live Bitcoin UTXO Atlas Dashboard
(Static version with dummy data – drawingbitcoin.com aesthetic)
Goal
Build a beautiful, non-interactive “live” dashboard that visualizes the entire Bitcoin UTXO set as elegant concentric ink rings in the exact black-and-white technical-pen style of https://drawingbitcoin.com (by @architect_btc).
This is the first static MVP. No real Bitcoin node connection yet — use only hardcoded dummy data.
Visual Style (MUST match drawingbitcoin.com exactly)

Background: aged parchment paper texture (#f8f1e3) with very subtle grid lines and light ink-bleed edges.
All graphics: crisp black ink only (no colors except shades of black/gray). Use varying stroke weights and light hatching for depth.
Font: Georgia or similar classic serif for all text and labels (exact same feel as drawingbitcoin.com).
Header style: clean centered title with block number in the top margin, like an old scientific map.
Overall feeling: 19th-century astronomical star atlas meets Bitcoin protocol art.

Layout (Desktop-first, 1200px+ wide)

Top header bar (parchment with thin border)
Left: “BLOCK #883247” (static for now)
Center: “DRAWING THE COSMOS” in large elegant serif
Right: small subtitle “UTXO Atlas • Static Demo”

Main canvas area (70% width)
The living atlas: clusters of concentric rings forming natural spiral arms and nebulae.
Rules for every ring (one ring per UTXO):
Radius = value in sats (log scale so dust = tiny specks, whales = huge bold rings)
Line weight = age:
• Ancient (5+ years) → thick 6–8 px stroke + light hatching/cross-hatching
• Mid-age (1–5 years) → medium 3–4 px
• Fresh (this “block”) → thin 1.5 px with dashed stroke (to simulate “being drawn”)
Clusters form naturally around the center (dense ancient HODL core) and spiral arms.


Right sidebar (“The Cartographer’s Marginalia”)
Fixed width, parchment background.
Title in italic serif.
One beautiful poetic summary box (dummy text for now — see example below).
Below it: small legend box explaining “Line weight = age | Radius = value”.

Bottom footer legend (thin ink line)
Simple explanatory text + example rings.


Dummy Data (Hardcode this in JS)
Create an array of ~250 sample UTXOs (realistic distribution):
JavaScriptconst utxos = [
  { id: 1, valueSats: 5000000000, ageYears: 12, birthBlock: 124871, script: "P2PKH" },   // ancient whale
  { id: 2, valueSats: 42000000, ageYears: 4, birthBlock: 650000, script: "P2WPKH" },
  // ... 248 more entries
];
Distribution guidelines (make it feel real):

~70% dust (< 10,000 sats)
~25% medium (1k–1 BTC)
~5% large whales (> 10 BTC)
Ages spread from 0 to 15 years
A few clusters: one dense ancient core, one fresh “nebula” near the edge.

Interactivity (keep simple but delightful)

Mouse wheel + drag = smooth pan & zoom on the canvas (use HTML Canvas or SVG with viewBox).
Click any ring → elegant tooltip styled as an old handwritten margin note (shows value, age, birth block, script).
Optional bonus: one “Simulate New Block” button in the header that randomly adds 20 fresh thin rings and redraws.

Technical Requirements

Single HTML file + Tailwind CDN (or plain CSS) + vanilla JavaScript (no framework needed for MVP).
Main visualization: HTML5 <canvas> (recommended for 250+ rings and smooth zoom).
Paper texture: either CSS background-image (base64 tiny texture) or subtle SVG noise filter.
All animations: gentle ink-drawing effect for new rings (stroke-dasharray + dashoffset).
Fully responsive (mobile-friendly zoom works too).
Zero external dependencies except Tailwind via CDN.

Example Marginalia Text (use this exact style)
“The outer arm’s 2011 red supergiants remain untouched — their ink as dark as the day they were drawn. Meanwhile the core is birthing fresh single strokes… Bitcoin’s patience, etched in permanence.”
Deliverables Claude should output

Complete single-file index.html (ready to open in browser).
Clear comments explaining how to later swap dummy data for real Bitcoin Core dumptxoutset output.
Brief “How to extend to live version” section at the bottom of the file.

Tone & Aesthetic Priority
This is not a normal dashboard. It must feel like a page torn from @architect_btc’s sketchbook that somehow became alive. Precision line work > everything else.