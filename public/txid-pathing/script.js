// ─── Config ────────────────────────────────────────────────────────────────
// Proxy path (served by src/app/api/mempool/[...path]/route.ts) — adds
// server-side caching + 2-concurrent gating + 429 retry, so recursive
// parent-tx walks don't trip mempool.space's per-IP rate limit.
const API        = '/api/mempool';
const MAX_DEPTH  = 10;
const MAX_GHOSTS  = 29;  // secondary inputs shown per node (+ vin[0] = 30 total)
const MAX_OUTPUTS = 30;  // output UTXO nodes shown per tx before "+N more" summary

// ─── Cache ─────────────────────────────────────────────────────────────────
const txCache = {};

// ─── Expansion state ────────────────────────────────────────────────────────
// Track which tx nodes the user has expanded beyond their default limits.
let currentRootTxid       = null;
const expandedInputTxids  = new Set();
const expandedOutputTxids = new Set();

// ─── Helpers ───────────────────────────────────────────────────────────────
const shortTxid = id => `${id.slice(0, 8)}…${id.slice(-8)}`;
const satsToBtc = s  => `${(s / 1e8).toFixed(8)} BTC`;
const fmtDate   = ts => ts ? new Date(ts * 1000).toLocaleString() : 'Unconfirmed';
const shortAddr = a  => a  ? `${a.slice(0, 8)}\u2026${a.slice(-6)}` : 'SCRIPT';

// ─── Data fetching ──────────────────────────────────────────────────────────
// Retries up to 3 times with exponential backoff on 429 / 5xx responses.
async function fetchTx(txid) {
  if (txCache[txid]) return txCache[txid];
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 800 * 2 ** attempt));
    let res;
    try {
      res = await fetch(`${API}/tx/${txid}`);
    } catch (netErr) {
      lastErr = new Error(`Network error: ${netErr.message}`);
      continue;
    }
    if (res.status === 429) {
      lastErr = new Error('HTTP 429 – rate limited');
      continue;  // retry after back-off
    }
    if (res.status === 404) throw new Error('HTTP 404 – TX not found');
    if (!res.ok)            throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    txCache[txid] = data;
    return data;
  }
  throw lastErr;
}

// ─── Recursive tree builder ────────────────────────────────────────────────
// Returns a nested object compatible with d3.hierarchy().
// Primary input (vin[0])  → recursed child
// Secondary inputs (vin[1+]) → ghost children (no further recursion)
async function buildTree(txid, depth = 0) {
  // Hard stop
  if (depth > MAX_DEPTH) {
    return {
      id: `${txid}_limit`,
      txid,
      label: '⚠ Depth limit',
      isDepthLimit: true,
      children: []
    };
  }

  let tx;
  try {
    tx = await fetchTx(txid);
  } catch (e) {
    return {
      id: `${txid}_err`,
      txid,
      label: `⚠ ${e.message ?? 'Fetch error'}`,
      isError: true,
      children: []
    };
  }

  const isCoinbase = !!(tx.vin[0]?.is_coinbase);
  const totalOut   = tx.vout.reduce((sum, o) => sum + o.value, 0);

  const node = {
    id:         txid,
    txid,
    label:      isCoinbase
                  ? `⛏ Block #${tx.status?.block_height ?? '?'}`
                  : shortTxid(txid),
    amount:     totalOut,
    height:     tx.status?.block_height ?? null,
    fee:        tx.fee,
    size:       tx.size,
    weight:     tx.weight,
    isCoinbase,
    txData:     tx,
    children:   [],
    outputs:    []
  };

  // ── Outputs: one satellite node per vout (all tx types) ─────────
  const maxOuts = expandedOutputTxids.has(txid) ? tx.vout.length : MAX_OUTPUTS;
  tx.vout.slice(0, maxOuts).forEach((o, i) => {
    node.outputs.push({
      id:        `${txid}_out_${i}`,
      label:     shortAddr(o.scriptpubkey_address),
      address:   o.scriptpubkey_address ?? null,   // full address for clipboard
      value:     o.value,
      voutIndex: i,
      isOutput:  true,
      children:  [],
      outputs:   []
    });
  });
  if (tx.vout.length > maxOuts) {
    node.outputs.push({
      id:              `${txid}_out_more`,
      label:           `⊕ +${tx.vout.length - maxOuts} more`,
      parentTxid:      txid,
      isOutput:        true,
      isSummaryOutput: true,
      children:        [],
      outputs:         []
    });
  }

  // Coinbase = leaf, no further input traversal
  if (isCoinbase) return node;

  // ── Primary input: recurse ──────────────────────────────────────
  const primary = tx.vin[0];
  if (primary?.txid) {
    const child = await buildTree(primary.txid, depth + 1);
    node.children.push(child);
  }

  // ── Secondary inputs: ghost nodes (no recursion) ────────────────
  const others   = tx.vin.slice(1);
  const maxShown = expandedInputTxids.has(txid) ? others.length : MAX_GHOSTS;
  const shown    = others.slice(0, maxShown);

  for (const vin of shown) {
    if (vin?.txid) {
      node.children.push({
        id:      `${vin.txid}_ghost_${depth}`,
        txid:    vin.txid,
        label:   shortTxid(vin.txid),
        isGhost: true,
        children: []
      });
    }
  }

  // Summary ghost when there are more secondary inputs than maxShown
  if (others.length > maxShown) {
    node.children.push({
      id:             `${txid}_more_${depth}`,
      txid:           null,
      label:          `⊕ +${others.length - maxShown} inputs`,
      parentTxid:     txid,
      isGhost:        true,
      isSummaryGhost: true,
      children:       []
    });
  }

  return node;
}

// ─── Node dimensions ───────────────────────────────────────────────────────
const NODE_W  = 138, NODE_H  = 52;   // primary / regular
const COIN_W  = 152, COIN_H  = 64;   // coinbase
const GHOST_W = 110, GHOST_H = 30;   // ghost / secondary inputs
const ERR_W   = 120, ERR_H   = 36;   // depth-limit / error
// Half-width used to position path endpoints at node edge (+3px buffer)
const PATH_HALF  = 72;
const OUTPUT_W   = 126, OUTPUT_H = 44;  // output UTXO satellite nodes

// ─── D3 rendering ──────────────────────────────────────────────────────────
let tooltipEl = null;
let activeSimulation = null;

// Flatten nested tree into { nodes, links } for force simulation.
// Each flat node: { id, data, depth }   (x/y/fx/fy added below)
// Each link:      { source: parentId, target: childId, isGhost }
function flattenTree(nodeData, nodes = [], links = [], depth = 0, parentId = null) {
  const n = { id: nodeData.id, data: nodeData, depth };
  nodes.push(n);
  if (parentId !== null) {
    links.push({ source: parentId, target: nodeData.id, isGhost: !!nodeData.isGhost });
  }
  for (const child of (nodeData.children || [])) {
    flattenTree(child, nodes, links, depth + 1, nodeData.id);
  }
  // Output nodes — same depth as parent tx, no further recursion
  for (const output of (nodeData.outputs || [])) {
    nodes.push({ id: output.id, data: output, depth });
    links.push({ source: nodeData.id, target: output.id, isOutput: true });
  }
  return { nodes, links };
}

// Cubic bezier from older node's right edge → newer node's left edge.
// In our links: source = newer (parent/right), target = older (child/left).
function curvePath(older, newer) {
  const x1 = older.x + PATH_HALF;
  const y1 = older.y;
  const x2 = newer.x - PATH_HALF;
  const y2 = newer.y;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

// Straight line from tx node edge → output node centre.
// src = link.source (tx), tgt = link.target (output satellite).
function outputPath(src, tgt) {
  const dx = tgt.x - src.x, dy = tgt.y - src.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  return `M${src.x + ux * 52},${src.y + uy * 52} L${tgt.x - ux * 28},${tgt.y - uy * 28}`;
}

function renderTree(treeData, savedTransform = null) {
  const container = document.getElementById('viz');
  container.innerHTML = '';

  if (activeSimulation) { activeSimulation.stop(); activeSimulation = null; }
  if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  tooltipEl = d3.select('body').append('div').attr('class', 'tooltip');

  const W = container.clientWidth;
  const H = container.clientHeight;

  const svg = d3.select('#viz').append('svg')
    .attr('width', W)
    .attr('height', H);

  const g = svg.append('g');

  // Zoom / pan — restore saved transform when re-rendering after expansion
  const zoom = d3.zoom()
    .scaleExtent([0.05, 4])
    .on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);
  if (savedTransform) svg.call(zoom.transform, savedTransform);

  // ── SVG defs: filters + arrowheads ──────────────────────────────
  const defs = svg.append('defs');
  addFilters(defs);
  // Arrow fills use `currentColor` so theme swaps flow through the SVG's
  // inherited `color` — no re-render needed on parchment/dark toggle.
  // The opacity arg now carries the ghost/output alpha that used to live
  // in the rgba() fill.
  addArrow(defs, 'arrow-primary', 'currentColor', 1.00, 22, 16); // thick ribbon
  addArrow(defs, 'arrow-ghost',   'currentColor', 0.30, 13, 10); // medium ribbon
  addArrow(defs, 'arrow-output',  'currentColor', 0.45,  9,  7); // slim ribbon

  // ── Flatten tree to nodes / links ────────────────────────────────
  const { nodes, links } = flattenTree(treeData);

  // Root pinned to right-centre; all others warm-started by depth
  const rootFx = W * 0.78;
  const rootFy = H / 2;

  nodes.forEach(n => {
    n.x = rootFx - n.depth * 950 + (Math.random() - 0.5) * 120;
    n.y = rootFy + (Math.random() - 0.5) * 900;
    if (n.id === treeData.id) { n.fx = rootFx; n.fy = rootFy; }
  });

  // ── Links (paths updated on each tick) ──────────────────────────
  const linkSel = g.selectAll('.link')
    .data(links)
    .join('path')
    .attr('class', d => d.isOutput ? 'link output' : d.isGhost ? 'link ghost' : 'link')
    .attr('marker-end', d => d.isOutput ? 'url(#arrow-output)' : d.isGhost ? 'url(#arrow-ghost)' : 'url(#arrow-primary)');

  // ── Nodes ───────────────────────────────────────────────────────
  const nodeG = g.selectAll('.node')
    .data(nodes)
    .join('g')
    .attr('class', d => nodeClass(d.data));

  const innerG = nodeG.append('g').attr('class', 'node-inner');

  innerG.each(function(d) {
    const ig   = d3.select(this);
    const data = d.data;

    let w, h;
    if (data.isCoinbase)                           { w = COIN_W;   h = COIN_H;  }
    else if (data.isOutput)                        { w = OUTPUT_W; h = OUTPUT_H; }
    else if (data.isGhost)                         { w = GHOST_W;  h = GHOST_H; }
    else if (data.isDepthLimit || data.isError)    { w = ERR_W;    h = ERR_H;   }
    else                                           { w = NODE_W;   h = NODE_H;  }

    const rx2 = -w / 2, ry2 = -h / 2;

    // strokeW must match the CSS stroke-width for this node type so that
    // both rects are expanded by exactly strokeW/2 — placing the border
    // frame's inner edge flush with the content boundary (rx2, ry2).
    const strokeW = data.isCoinbase                        ? 5.5
                  : data.isGhost                           ? 1.2
                  : (data.isDepthLimit || data.isError)    ? 2
                  : data.isOutput                          ? 1.5
                  : 4.5;
    const half = strokeW / 2;

    // Rect 1 — background fill (no stroke, zero intrusion)
    ig.append('rect')
      .attr('class', 'node-bg')
      .attr('x', rx2 - half).attr('y', ry2 - half)
      .attr('width', w + strokeW).attr('height', h + strokeW)
      .attr('rx', 0);

    // Rect 2 — border frame (same size; stroke centered on boundary so
    //           inner stroke edge = rx2/ry2 = start of content area)
    ig.append('rect')
      .attr('class', 'node-border')
      .attr('x', rx2 - half).attr('y', ry2 - half)
      .attr('width', w + strokeW).attr('height', h + strokeW)
      .attr('rx', 0);

    if (!data.isGhost && !data.isDepthLimit && !data.isError && !data.isOutput) {
      ig.append('rect')
        .attr('class', 'node-inner-border')
        .attr('x', rx2 + 4).attr('y', ry2 + 4)
        .attr('width', w - 8).attr('height', h - 8)
        .attr('rx', 0);
    }

    if (data.isCoinbase) {
      ig.append('text')
        .attr('class', 'node-txid')
        .attr('dy', ry2 + 22)
        .attr('text-anchor', 'middle')
        .text('COINBASE');
      ig.append('line')
        .attr('class', 'node-divider')
        .attr('x1', rx2 + 6).attr('x2', w / 2 - 6)
        .attr('y1', ry2 + 28).attr('y2', ry2 + 28);
      ig.append('text')
        .attr('class', 'node-amount')
        .attr('dy', ry2 + 46)
        .attr('text-anchor', 'middle')
        .text(`BLOCK #${data.height?.toLocaleString() ?? '?'}`);

    } else if (data.isOutput) {
      if (data.isSummaryOutput) {
        ig.append('text').attr('dy', 4).attr('text-anchor', 'middle').text(data.label);
      } else {
        ig.append('text')
          .attr('class', 'node-txid')
          .attr('dy', ry2 + 14)
          .attr('text-anchor', 'middle')
          .text(data.label);
        ig.append('line')
          .attr('class', 'node-divider')
          .attr('x1', rx2 + 5).attr('x2', w / 2 - 5)
          .attr('y1', ry2 + 20).attr('y2', ry2 + 20);
        ig.append('text')
          .attr('class', 'node-amount')
          .attr('dy', ry2 + 34)
          .attr('text-anchor', 'middle')
          .text(satsToBtc(data.value));
      }

    } else if (data.isGhost || data.isDepthLimit || data.isError) {
      ig.append('text')
        .attr('dy', data.isDepthLimit ? -4 : 4)
        .attr('text-anchor', 'middle')
        .text(data.label);
      if (data.isDepthLimit) {
        ig.append('text')
          .attr('class', 'node-depth-hint')
          .attr('dy', 10)
          .attr('text-anchor', 'middle')
          .text('click to continue →');
      }

    } else {
      ig.append('text')
        .attr('class', 'node-txid')
        .attr('dy', ry2 + 17)
        .attr('text-anchor', 'middle')
        .text(data.label);

      ig.append('line')
        .attr('class', 'node-divider')
        .attr('x1', rx2 + 5).attr('x2', w / 2 - 5)
        .attr('y1', ry2 + 24).attr('y2', ry2 + 24);

      if (data.amount != null) {
        ig.append('text')
          .attr('class', 'node-amount')
          .attr('dy', ry2 + 40)
          .attr('text-anchor', 'middle')
          .text(satsToBtc(data.amount));
      }

      if (data.height) {
        ig.append('text')
          .attr('class', 'node-height')
          .attr('x', w / 2 - 5)
          .attr('dy', h / 2 - 5)
          .attr('text-anchor', 'end')
          .text(`#${data.height.toLocaleString()}`);
      }
    }
  });

  // ── Interactivity: hover (glow + scale) + click ──────────────────
  nodeG
    .on('mouseover', function(event, d) {
      d3.select(this).classed('hovered', true);
      if (!d.data.txData) return;
      tooltipEl.style('display', 'block').html(buildTooltipHtml(d.data));
    })
    .on('mousemove', event => {
      tooltipEl
        .style('left', `${event.clientX + 18}px`)
        .style('top',  `${event.clientY - 18}px`);
    })
    .on('mouseout', function() {
      d3.select(this).classed('hovered', false);
      tooltipEl.style('display', 'none');
    })
    .on('click', (event, d) => {
      if (d.data.isSummaryGhost && d.data.parentTxid) {
        expandedInputTxids.add(d.data.parentTxid);
        expandAndRender();
      } else if (d.data.isSummaryOutput && d.data.parentTxid) {
        expandedOutputTxids.add(d.data.parentTxid);
        expandAndRender();
      } else if (d.data.isDepthLimit && d.data.txid) {
        // Pivot: use this frontier TXID as the new chain root
        rerootAndRender(d.data.txid);
      } else if (d.data.isOutput && d.data.address) {
        // Copy full Bitcoin address to clipboard, flash feedback above node
        navigator.clipboard.writeText(d.data.address).then(() => {
          // Append to the root <g> so it sits above all nodes in z-order.
          // Use d.x / d.y (world coords) so it's positioned correctly under zoom/pan.
          // D3 transition animates the SVG opacity attribute directly — no CSS needed.
          const hint = d3.select('#viz svg g').append('text')
            .attr('x', d.x)
            .attr('y', d.y - OUTPUT_H / 2 - 12)
            .attr('text-anchor', 'middle')
            .attr('fill', 'currentColor')
            .attr('font-size', 12)
            .attr('font-weight', 'bold')
            .attr('letter-spacing', '0.08em')
            .attr('pointer-events', 'none')
            .attr('opacity', 1)
            .text('✓ Copied!');
          hint.transition()
            .delay(500)
            .duration(900)
            .attr('opacity', 0)
            .on('end', () => hint.remove());
        }).catch(() => {/* clipboard blocked — silent fail */});
      } else if (d.data.txData) {
        updateSidebarTx(d.data);
      }
    });

  // ── Force simulation ─────────────────────────────────────────────
  // forceX locks each depth to a column; forceY provides a gentle vertical
  // centre-pull to stop large graphs drifting off-screen.
  activeSimulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .strength(d => d.isOutput ? 0.35 : d.isGhost ? 0.05 : 0.14)
      .distance(d => d.isOutput ? 180 : d.isGhost ? 560 : 760))
    .force('charge', d3.forceManyBody()
      // No distanceMax — ghost repulsion must reach across the full canvas
      // so nodes from adjacent clusters push each other apart globally.
      .strength(d => d.data.isOutput ? -400 : d.data.isGhost ? -9000 : -3500))
    .force('collide', d3.forceCollide(d => d.data.isOutput ? 100 : 220))
    .force('x', d3.forceX(d => rootFx - d.depth * 950)
      // Ghost nodes anchored firmly to their own column so they can't drift
      // into adjacent clusters; outputs loosely tethered to their parent.
      .strength(d => d.data.isOutput ? 0.03 : d.data.isGhost ? 0.22 : 0.44))
    .on('tick', () => {
      linkSel.attr('d', d => d.isOutput
        ? outputPath(d.source, d.target)
        : curvePath(d.target, d.source));
      nodeG.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// ─── SVG filter defs: foreground-colour glow ───────────────────────────────
// Renamed glow-white → glow-fg now that the palette isn't fixed to white.
// The filter is colour-agnostic (Gaussian blur of SourceGraphic), so the
// same filter works across parchment and dark themes.
function addFilters(defs) {
  const f = defs.append('filter').attr('id', 'glow-fg')
    .attr('x', '-40%').attr('y', '-40%')
    .attr('width', '180%').attr('height', '180%');
  f.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', 4)
    .attr('result', 'blur');
  const m = f.append('feMerge');
  m.append('feMergeNode').attr('in', 'blur');
  m.append('feMergeNode').attr('in', 'SourceGraphic');
}

// ─── Engineering arrowhead marker ───────────────────────────────────────────
// Filled chevron: M0,0 L12,6 L0,12 L3,6 Z
// markerUnits="userSpaceOnUse" makes mw/mh absolute pixels so the arrowhead
// stays proportional regardless of the ribbon's stroke-width.
function addArrow(defs, id, color, opacity, mw = 22, mh = 16) {
  defs.append('marker')
    .attr('id', id)
    .attr('viewBox', '0 0 12 12')
    .attr('refX', 11)        // tip at path endpoint
    .attr('refY', 6)
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('markerWidth', mw)
    .attr('markerHeight', mh)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,0 L12,6 L0,12 L3,6 Z')
    .attr('fill', color)
    .attr('opacity', opacity);
}

// ─── Node CSS class helper ──────────────────────────────────────────────────
function nodeClass(data) {
  if (data.isCoinbase)                   return 'node coinbase';
  if (data.isDepthLimit || data.isError) return 'node depth-limit';
  if (data.isOutput)                     return 'node output';
  if (data.isGhost)                      return 'node ghost';
  return 'node';
}

// ─── Tooltip HTML ───────────────────────────────────────────────────────────
function buildTooltipHtml(data) {
  const tx = data.txData;
  const confirmed = tx.status?.confirmed;
  return `
    <div class="tip-txid">${tx.txid}</div>
    <table>
      <tr><td>Status</td><td>${confirmed ? `&#10003; Block ${tx.status.block_height}` : '&#8987; Unconfirmed'}</td></tr>
      ${tx.status?.block_time ? `<tr><td>Time</td><td>${fmtDate(tx.status.block_time)}</td></tr>` : ''}
      <tr><td>Fee</td><td>${tx.fee?.toLocaleString()} sats</td></tr>
      <tr><td>Size</td><td>${tx.size} B &bull; ${tx.weight} WU</td></tr>
      <tr><td>Inputs</td><td>${tx.vin.length}</td></tr>
      <tr><td>Outputs</td><td>${tx.vout.length}</td></tr>
    </table>`;
}

// ─── Sidebar: transaction details ───────────────────────────────────────────
function updateSidebarTx(data) {
  const tx       = data.txData;
  const totalOut = tx.vout.reduce((s, o) => s + o.value, 0);
  const confirmed = tx.status?.confirmed;

  document.getElementById('tx-info').innerHTML = `
    <h3>Transaction Info</h3>
    <ul>
      <li class="full-row">
        <span class="label">TXID</span>
        <span class="mono">${tx.txid}</span>
      </li>
      <li>
        <span class="label">Status</span>
        <span>${confirmed ? `&#10003; Confirmed` : '&#8987; Unconfirmed'}</span>
      </li>
      ${confirmed ? `
      <li><span class="label">Block</span><span>${tx.status.block_height?.toLocaleString()}</span></li>
      <li><span class="label">Time</span><span>${fmtDate(tx.status.block_time)}</span></li>
      ` : ''}
      <li><span class="label">Fee</span><span>${tx.fee?.toLocaleString()} sats</span></li>
      <li><span class="label">Size</span><span>${tx.size} B / ${tx.weight} WU</span></li>
      <li><span class="label">Inputs</span><span>${tx.vin.length}</span></li>
      <li><span class="label">Outputs</span><span>${tx.vout.length}</span></li>
      <li><span class="label">Total Out</span><span>${satsToBtc(totalOut)}</span></li>
    </ul>`;
}

// ─── Sidebar: network stats ─────────────────────────────────────────────────
async function fetchNetworkStats() {
  const el = document.getElementById('network-data');
  el.innerHTML = '<p class="placeholder">Loading&hellip;</p>';
  // Helper: throws with HTTP status if response is not OK
  const safeFetch = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  try {
    const [fees, height, mempool, hashrate, diff] = await Promise.all([
      safeFetch(`${API}/v1/fees/recommended`),
      safeFetch(`${API}/blocks/tip/height`),
      safeFetch(`${API}/mempool`),
      safeFetch(`${API}/v1/mining/hashrate/1d`),
      safeFetch(`${API}/v1/difficulty-adjustment`),
    ]);

    // hashrate shape can vary; try both API response forms
    const hr    = hashrate?.currentHashrate ?? hashrate?.hashrates?.[0]?.avgHashrate;
    const hrStr = hr ? `${(hr / 1e18).toFixed(2)} EH/s` : 'N/A';
    const diffChg = typeof diff.difficultyChange === 'number'
                    ? `${diff.difficultyChange >= 0 ? '+' : ''}${diff.difficultyChange.toFixed(2)}%`
                    : 'N/A';

    el.innerHTML = `
      <ul>
        <li><span class="label">Block Height</span><span>${Number(height).toLocaleString()}</span></li>
        <li><span class="label">Fastest Fee</span><span>${fees.fastestFee} sat/vB</span></li>
        <li><span class="label">Half-Hour</span><span>${fees.halfHourFee} sat/vB</span></li>
        <li><span class="label">Economy</span><span>${fees.economyFee} sat/vB</span></li>
        <li><span class="label">Mempool TXs</span><span>${mempool.count?.toLocaleString()}</span></li>
        <li><span class="label">Mempool Size</span><span>${(mempool.vsize / 1e6).toFixed(1)} MB</span></li>
        <li><span class="label">Hash Rate</span><span>${hrStr}</span></li>
        <li><span class="label">Diff. Change</span><span>${diffChg}</span></li>
        <li><span class="label">Next Adj.</span><span>~${Math.round(diff.remainingBlocks ?? 0)} blocks</span></li>
      </ul>`;
  } catch (e) {
    const reason = e?.message ? ` — ${e.message}` : '';
    el.innerHTML = `<p class="placeholder">⚠ Stats unavailable${reason}</p>`;
  }
}

// ─── Re-root: pivot the entire chain to a new origin TXID ───────────────────
// Called when the user clicks a ⚠ Depth limit node. Treats that node's TXID
// as the new root, resets all expansion state, and starts a fresh render
// (no saved viewport — the graph layout will be completely different).
async function rerootAndRender(txid) {
  currentRootTxid = txid;
  expandedInputTxids.clear();
  expandedOutputTxids.clear();
  document.getElementById('txid-input').value = txid;
  document.getElementById('drawing-no').textContent = txid.slice(0, 16) + '…';
  try {
    const tree = await buildTree(txid);
    renderTree(tree);
    updateSidebarTx(tree);
    updateOracleNotes(txid);
  } catch (e) {
    console.error('rerootAndRender failed:', e);
  }
}

// ─── Expand-and-re-render ────────────────────────────────────────────────────
// Saves the current D3 zoom transform before wiping the container, rebuilds
// the tree from currentRootTxid (using the updated expansion Sets), then
// re-renders while restoring the saved viewport so the user stays oriented.
async function expandAndRender() {
  const svgEl = document.querySelector('#viz svg');
  const savedTransform = svgEl ? d3.zoomTransform(svgEl) : null;
  try {
    const tree = await buildTree(currentRootTxid);
    renderTree(tree, savedTransform);
    updateSidebarTx(tree);
  } catch (e) {
    console.error('expandAndRender failed:', e);
  }
}

// ─── Oracle: procedural field notes ─────────────────────────────────────────
// tv() extracts a deterministic integer from a TXID slice.
// All "statistics" are flavour — seeded by the TXID, not real chain data.
function tv(txid, offset, range) {
  const o = offset % (txid.length - 3);
  return parseInt(txid.slice(o, o + 4), 16) % range;
}

const ORACLE_TEMPLATES = [
  t => `At broadcast time, an estimated <em>${(tv(t,0,8000)+1200).toLocaleString()}</em> competing UTXOs occupied the mempool queue ahead of this chain.`,

  t => `Merkle branch traversal from genesis to this leaf requires <em>${tv(t,4,88)+12}</em> sequential SHA-256 operations.`,

  t => `If each satoshi in this lineage were a heartbeat, the chain would represent <em>${((tv(t,8,720)+80)/60).toFixed(1)}</em> years of continuous human life.`,

  t => `Fee market modelling places the broadcast-time mempool percentile for this fee rate at <em>${tv(t,12,35)+60}th</em>. Confirmation was statistically likely within two blocks.`,

  t => `An ASIC at 120 TH/s would exhaust this TXID's leading-byte prefix space in approximately <em>${tv(t,16,800)+120} microseconds</em> of uninterrupted hashing.`,

  t => `Input clustering heuristics suggest this transaction passes through <em>${tv(t,20,6)+2}</em> distinct wallet entities — none of which share an address root.`,

  t => `Byte-pair entropy analysis: the <em>${tv(t,24,7)+1}${['st','nd','rd','th','th','th','th'][tv(t,24,7)]} nibble cluster</em> of this TXID deviates from Poisson expectation by σ = <em>${((tv(t,28,180)+20)/100).toFixed(2)}</em>.`,

  t => `A light client would download <em>${tv(t,32,380)+120} KB</em> of block header data to trustlessly verify this transaction from block zero.`,

  t => `The probability of this exact 256-bit identifier existing is 1 in 1.16 × 10⁷⁷.<br>It exists. You are looking at it.`,

  t => `Script pattern analysis matches <em>${tv(t,36,14)+2}</em> known wallet implementations on input; <em>${tv(t,40,6)+1}</em> on output. Fingerprint confidence: <em>${tv(t,44,20)+75}%</em>.`,

  t => `Were the fee rate at broadcast doubled, probabilistic modelling suggests this chain would have settled <em>${tv(t,48,90)+10} blocks earlier</em> — a difference of roughly <em>${Math.round((tv(t,52,90)+10)*10)} minutes</em>.`,

  t => `At the block this chain terminates in, Bitcoin's total issued supply stood at <em>${(tv(t,56,199)+19700000).toLocaleString()} BTC</em> — <em>${((tv(t,0,199)+19700000)/21000000*100).toFixed(4)}%</em> of the 21 million hard cap.`,

  t => `Network propagation modelling estimates this transaction reached <em>${tv(t,60,4000)+8000}</em> of Bitcoin's reachable nodes within <em>${tv(t,4,8)+2} seconds</em> of initial broadcast.`,

  t => `The longest chain of ancestor transactions traceable from this TXID without a coinbase encounter is estimated at <em>${tv(t,8,180)+20} hops</em>.`,

  t => `RBF eligibility at broadcast: <em>${tv(t,12,2) === 0 ? 'sequence signalling detected — replaceable' : 'no sequence signal — final as broadcast'}</em>. Double-spend window: <em>${tv(t,16,8)+1} blocks</em>.`,
];

function updateOracleNotes(txid) {
  const el = document.getElementById('oracle-notes');
  if (!el || !txid) return;

  // Pick 3 non-repeating templates, deterministically seeded by the TXID
  const pool = ORACLE_TEMPLATES.length;
  const i0 = tv(txid, 0, pool);
  const i1 = (i0 + tv(txid, 10, pool - 1) + 1) % pool;
  const i2 = (i1 + tv(txid, 20, pool - 2) + 1) % pool;

  const labels = ['OBS.01', 'OBS.02', 'OBS.03'];
  el.innerHTML = [i0, i1, i2].map((idx, n) => `
    <div class="oracle-note">
      <span class="oracle-label">${labels[n]}</span>
      <p>${ORACLE_TEMPLATES[idx](txid)}</p>
    </div>`).join('');
}

// ─── Main handler ───────────────────────────────────────────────────────────
async function handleVisualize() {
  const raw   = document.getElementById('txid-input').value.trim();
  const txid  = raw.toLowerCase();
  const errEl = document.getElementById('status-msg');
  const btn   = document.getElementById('visualize-btn');

  errEl.className = '';
  errEl.textContent = '';

  if (!/^[0-9a-f]{64}$/.test(txid)) {
    errEl.textContent = 'Invalid TXID — must be exactly 64 hex characters.';
    errEl.className = 'error';
    return;
  }

  btn.disabled = true;
  errEl.textContent = 'Fetching chain\u2026';

  currentRootTxid = txid;
  expandedInputTxids.clear();
  expandedOutputTxids.clear();

  try {
    const tree = await buildTree(txid);
    renderTree(tree);
    updateSidebarTx(tree);
    updateOracleNotes(txid);
    // Update header drawing number with shortened TXID
    document.getElementById('drawing-no').textContent = txid.slice(0, 16) + '…';
    errEl.textContent = '';
  } catch (e) {
    errEl.textContent = `Error: ${e.message}`;
    errEl.className = 'error';
  } finally {
    btn.disabled = false;
  }
}

// ─── Event wiring ───────────────────────────────────────────────────────────
document.getElementById('visualize-btn')
  .addEventListener('click', handleVisualize);

document.getElementById('txid-input')
  .addEventListener('keydown', e => { if (e.key === 'Enter') handleVisualize(); });

document.getElementById('refresh-btn')
  .addEventListener('click', fetchNetworkStats);


// Load network stats immediately on page load
fetchNetworkStats();

// ─── Mobile: bottom-sheet panel toggle ──────────────────────────────────────
(function () {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('panel-backdrop');
  const fab      = document.getElementById('panel-fab');
  const closeBtn = document.getElementById('panel-close');

  function openPanel() {
    sidebar.classList.add('panel-open');
    backdrop.classList.add('visible');
    fab.setAttribute('aria-expanded', 'true');
  }
  function closePanel() {
    sidebar.classList.remove('panel-open');
    backdrop.classList.remove('visible');
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);

  // Close panel when user submits a TXID (so the viz is fully visible)
  document.getElementById('visualize-btn')
    .addEventListener('click', () => { if (window.innerWidth <= 700) closePanel(); });
})();

// ─── PWA: register service worker ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}
