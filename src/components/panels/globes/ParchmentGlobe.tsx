'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getMoonPosition, getMoonPhase, computeISSOrbit } from './celestial';
import { getAntiSolarPoint } from './terminator';
import { COUNTRY_NAMES } from './country-names';

const WORLD_ATLAS_URL = '/geo/countries-110m.json';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CATEGORY_COLORS: Record<string, string> = {
  bitcoin:   '#f7931a',
  conflict:  '#8b2020',
  disaster:  '#b8860b',
  economy:   '#2d6e5e', // dark teal — money/finance association
  political: '#5e3d75', // deep aubergine — authority association
};

export interface MapEvent {
  title: string;
  category: string;
  source: string;
  lat: number;
  lon: number;
  time: number;
  link?: string;
}

export interface GlobeControls {
  zoomIn: () => void;
  zoomOut: () => void;
  toggleRotation: () => void;
  isRotating: boolean;
}

interface ParchmentGlobeProps {
  events?: MapEvent[];
}

export function ParchmentGlobe({ events = [] }: ParchmentGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const autoRotateRef = useRef(true);
  const baseRadiusRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [globeReady, setGlobeReady] = useState(false);

  const redraw = useCallback(() => {
    if (!svgRef.current || !projectionRef.current) return;
    const svg = d3.select(svgRef.current);
    const projection = projectionRef.current;
    const path = d3.geoPath().projection(projection);
    const width = svgRef.current.clientWidth || 560;
    const height = svgRef.current.clientHeight || 420;

    // Sync ocean circle with current projection scale
    svg.select('g').select('.globe-ocean').attr('r', projection.scale());

    svg.select('g').selectAll('.graticule').attr('d', path as unknown as string);
    svg.select('g').selectAll('.country').attr('d', path as unknown as string);
    svg.select('g').selectAll('.boundary').attr('d', path as unknown as string);

    // Day/night terminator — geoCircle centred on anti-solar point
    const antiSolar = getAntiSolarPoint();
    const nightCircle = d3.geoCircle().center(antiSolar).radius(90)();
    const nightSel = svg.select('.night-layer');
    nightSel.selectAll('.terminator').remove();
    nightSel.append('path')
      .attr('class', 'terminator')
      .datum(nightCircle)
      .attr('d', path)
      .attr('fill', 'rgba(0,0,0,0.15)')
      .attr('stroke', 'rgba(0,0,0,0.08)')
      .attr('stroke-width', 0.5)
      .style('pointer-events', 'none');

    const center = projection.invert!([width / 2, height / 2]);
    const edgeFadeStart = Math.PI / 2 * 0.75;
    const edgeFadeEnd = Math.PI / 2 * 0.95;

    svg.select('.markers-layer').selectAll<SVGGElement, MapEvent>('.event-marker').each(function (d) {
      if (!d || d.lon == null) return;
      const coords = projection([d.lon, d.lat]);
      if (!coords || !center) return;
      const dist = d3.geoDistance([d.lon, d.lat], center);

      if (dist > edgeFadeEnd) {
        d3.select(this).style('display', 'none');
      } else {
        const opacity = dist > edgeFadeStart
          ? 1 - (dist - edgeFadeStart) / (edgeFadeEnd - edgeFadeStart)
          : 1;
        d3.select(this)
          .attr('transform', `translate(${coords[0]},${coords[1]})`)
          .style('display', '')
          .style('opacity', opacity);
      }
    });
  }, []);

  // Initialize globe
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 420;
    const radius = Math.min(width, height) / 2 - 30;
    baseRadiusRef.current = radius;

    // Clear previous
    d3.select(container).select('svg').remove();

    const svg = d3.select(container)
      .append('svg')
      .style('width', '100%')
      .style('height', '100%')
      .style('overflow', 'visible')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svgRef.current = svg.node();
    const g = svg.append('g');
    // Night terminator layer — between countries and markers
    svg.append('g').attr('class', 'night-layer').style('pointer-events', 'none');
    // Markers group — on top of everything
    svg.append('g').attr('class', 'markers-layer');

    const projection = d3.geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate([-30, -20, 0]);

    projectionRef.current = projection;
    const path = d3.geoPath().projection(projection);

    // Ocean
    g.append('circle')
      .attr('class', 'globe-ocean')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', radius)
      .attr('fill', '#f5f0e8')
      .attr('stroke', '#d4c9b8')
      .attr('stroke-width', 0.5);

    // Graticule
    const graticule = d3.geoGraticule().step([15, 15]);
    g.append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0,0,0,0.04)')
      .attr('stroke-width', 0.5);

    // Tooltip element
    const tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'globe-tooltip';
    tooltipDiv.style.cssText = 'display:none;position:absolute;background:var(--bg-card);border:1px solid var(--border-primary);padding:8px 10px;font-size:11px;line-height:1.5;max-width:280px;z-index:30;box-shadow:0 2px 8px rgba(0,0,0,0.2);pointer-events:none;font-family:var(--font-body);color:var(--text-primary);';
    container.appendChild(tooltipDiv);

    // Load countries
    d3.json(WORLD_ATLAS_URL).then((world: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topo = world as any;
      const countries = topojson.feature(topo, topo.objects.countries);

      // Country paths with hover
      g.selectAll('.country')
        .data((countries as unknown as GeoJSON.FeatureCollection).features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', path)
        .attr('fill', 'rgba(0,0,0,0.07)')
        .attr('stroke', '#2a2a2a')
        .attr('stroke-width', 0.3)
        .style('transition', 'fill 0.15s')
        .on('mouseenter', function (_event, d: any) {
          d3.select(this).attr('fill', 'rgba(0,0,0,0.16)');
          const id = parseInt(d.id || d.properties?.id);
          const name = COUNTRY_NAMES[id];
          if (name) {
            tooltipDiv.innerHTML = `<div style="font-weight:bold;font-size:12px">${escapeHtml(name)}</div>`;
            tooltipDiv.style.display = 'block';
          }
        })
        .on('mousemove', function (event) {
          const rect = container.getBoundingClientRect();
          tooltipDiv.style.left = (event.clientX - rect.left + 12) + 'px';
          tooltipDiv.style.top = (event.clientY - rect.top - 10) + 'px';
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill', 'rgba(0,0,0,0.07)');
          tooltipDiv.style.display = 'none';
        });

      // Country borders (mesh — shared edges drawn once)
      g.append('path')
        .datum(topojson.mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b))
        .attr('class', 'boundary')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(0,0,0,0.12)')
        .attr('stroke-width', 0.3);

      redraw();
    });

    // Drag — never restarts rotation if user has toggled pause
    let dragStart: { x: number; y: number; rotation: [number, number, number] } | null = null;
    let userPaused = false; // set by pause button, survives drag interactions

    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('start', (event) => {
        autoRotateRef.current = false;
        dragStart = { x: event.x, y: event.y, rotation: projection.rotate() as [number, number, number] };
      })
      .on('drag', (event) => {
        if (!dragStart) return;
        const r = dragStart.rotation;
        projection.rotate([
          r[0] + (event.x - dragStart.x) * 0.4,
          Math.max(-60, Math.min(60, r[1] - (event.y - dragStart.y) * 0.4)),
          r[2],
        ]);
        redraw();
      })
      .on('end', () => {
        // Only resume rotation if user hasn't explicitly paused
        if (!userPaused) {
          autoRotateRef.current = true;
        }
      });

    svg.call(drag);

    // Auto-rotate
    function spin() {
      if (autoRotateRef.current) {
        const r = projection.rotate();
        projection.rotate([r[0] + 0.075, r[1], r[2]]);
        redraw();
      }
      rafRef.current = requestAnimationFrame(spin);
    }
    rafRef.current = requestAnimationFrame(spin);

    setGlobeReady(true);

    // Globe controls — direct DOM buttons (V2 approach)
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'globe-controls';
    controlsDiv.style.cssText = 'position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:3px;z-index:10;';

    const btnStyle = 'width:24px;height:24px;border-radius:3px;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-secondary);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;';

    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Zoom in';
    zoomInBtn.style.cssText = btnStyle;
    zoomInBtn.onclick = () => {
      const s = projection.scale();
      const ns = Math.min(radius * 4, s * 1.3);
      projection.scale(ns);
      g.select('.globe-ocean').attr('r', ns);
      redraw();
    };

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.title = 'Zoom out';
    zoomOutBtn.style.cssText = btnStyle;
    zoomOutBtn.onclick = () => {
      const s = projection.scale();
      const ns = Math.max(radius * 0.5, s * 0.77);
      projection.scale(ns);
      g.select('.globe-ocean').attr('r', ns);
      redraw();
    };

    const rotateBtn = document.createElement('button');
    rotateBtn.innerHTML = '⏸';
    rotateBtn.title = 'Pause rotation';
    rotateBtn.style.cssText = btnStyle;
    rotateBtn.onclick = () => {
      userPaused = !userPaused;
      autoRotateRef.current = !userPaused;
      rotateBtn.innerHTML = userPaused ? '▶' : '⏸';
      rotateBtn.title = userPaused ? 'Resume rotation' : 'Pause rotation';
    };

    controlsDiv.appendChild(zoomInBtn);
    controlsDiv.appendChild(zoomOutBtn);
    controlsDiv.appendChild(rotateBtn);
    container.appendChild(controlsDiv);

    return () => {
      cancelAnimationFrame(rafRef.current);
      setGlobeReady(false);
      d3.select(container).select('svg').remove();
      controlsDiv.remove();
      tooltipDiv.remove();
    };
  }, [redraw]);

  // Update event markers when events change or globe becomes ready
  useEffect(() => {
    if (!globeReady || !svgRef.current || !projectionRef.current) return;
    const svg = d3.select(svgRef.current);
    const markersLayer = svg.select('.markers-layer');
    const projection = projectionRef.current;

    markersLayer.selectAll('.event-marker').remove();

    const geoEvents = events.filter((e) => e.lat != null && e.lon != null);

    const markers = markersLayer.selectAll('.event-marker')
      .data(geoEvents)
      .enter()
      .append('g')
      .attr('class', 'event-marker')
      .attr('transform', (d) => {
        const coords = projection([d.lon, d.lat]);
        return coords ? `translate(${coords[0]},${coords[1]})` : 'translate(-999,-999)';
      })
      .style('cursor', 'pointer');

    // Pulse ring — SMIL animated: expand r 4→14, fade opacity 0.6→0
    markers.each(function (d) {
      const g = d3.select(this);
      const color = CATEGORY_COLORS[d.category] || '#888';

      // Pulse ring
      const pulse = g.append('circle')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('r', 4)
        .attr('opacity', 0);

      pulse.append('animate')
        .attr('attributeName', 'r')
        .attr('from', '4')
        .attr('to', '14')
        .attr('dur', '2.5s')
        .attr('repeatCount', 'indefinite');

      pulse.append('animate')
        .attr('attributeName', 'opacity')
        .attr('from', '0.6')
        .attr('to', '0')
        .attr('dur', '2.5s')
        .attr('repeatCount', 'indefinite');

      // Solid dot
      g.append('circle')
        .attr('class', `event-dot ${d.category}`)
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#f5f0e8')
        .attr('stroke-width', 1);
    });

    // Tooltip reference — reuse the one from init
    const tooltipEl = containerRef.current?.querySelector('#globe-tooltip') as HTMLElement | null;

    markers
      .on('mouseenter', function (_event, d) {
        if (!tooltipEl) return;
        tooltipEl.innerHTML = `
          <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px;color:${CATEGORY_COLORS[d.category] || '#888'}">${d.category}</div>
          <div style="font-weight:bold;font-size:12px">${escapeHtml(d.title)}</div>
          <div style="font-size:10px;color:#777;margin-top:2px">${escapeHtml(d.source)}</div>`;
        tooltipEl.style.display = 'block';
      })
      .on('mousemove', function (event) {
        if (!tooltipEl || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        tooltipEl.style.left = (event.clientX - rect.left + 12) + 'px';
        tooltipEl.style.top = (event.clientY - rect.top - 10) + 'px';
      })
      .on('mouseleave', function () {
        if (tooltipEl) tooltipEl.style.display = 'none';
      })
      .on('click', (_event, d) => {
        if (d.link) window.open(d.link, '_blank');
      });

    redraw();
  }, [events, redraw, globeReady]);

  // Celestial bodies — moon + ISS (V2 pattern: build once, reposition on each frame)
  useEffect(() => {
    if (!globeReady || !svgRef.current || !projectionRef.current) return;

    const svg = d3.select(svgRef.current);
    const celestialLayer = svg.append('g').attr('class', 'celestial-layer');
    const projection = projectionRef.current;

    // Pre-create DOM elements (built once)
    const tooltipEl = containerRef.current?.querySelector('#globe-tooltip') as HTMLElement | null;

    const moonG = celestialLayer.append('g').attr('class', 'moon-group').style('display', 'none').style('cursor', 'pointer');
    moonG.append('circle').attr('class', 'moon-hit').attr('r', 12).attr('fill', 'transparent');
    moonG.append('circle').attr('class', 'moon-body').attr('r', 6).attr('fill', '#e8e4d4').attr('stroke', '#999').attr('stroke-width', 0.5).attr('opacity', 0.9);
    moonG.append('circle').attr('class', 'moon-shadow').attr('r', 5.5).attr('fill', 'rgba(30,30,40,0.7)');
    moonG.append('text').attr('class', 'moon-label').attr('x', 10).attr('y', 3).attr('fill', '#999').attr('font-size', '8px').attr('font-family', 'Georgia, serif');

    // Moon tooltip
    moonG.on('mouseenter', function () {
      if (!tooltipEl) return;
      const phase = getMoonPhase();
      tooltipEl.innerHTML = `<div style="font-weight:bold;font-size:12px">☽ Moon</div><div style="font-size:10px;color:#777;margin-top:2px">${phase.name} · ${phase.illumination}% illuminated</div>`;
      tooltipEl.style.display = 'block';
    }).on('mousemove', function (event) {
      if (!tooltipEl || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      tooltipEl.style.left = (event.clientX - rect.left + 12) + 'px';
      tooltipEl.style.top = (event.clientY - rect.top - 10) + 'px';
    }).on('mouseleave', function () {
      if (tooltipEl) tooltipEl.style.display = 'none';
    });

    const issG = celestialLayer.append('g').attr('class', 'iss-group').style('display', 'none').style('cursor', 'pointer');
    issG.append('circle').attr('r', 15).attr('fill', 'transparent'); // hit area
    issG.append('circle').attr('r', 4).attr('fill', 'rgba(50,100,180,0.5)').attr('stroke', '#fff').attr('stroke-width', 1);
    issG.append('rect').attr('x', -3).attr('y', -1).attr('width', 6).attr('height', 2).attr('fill', '#3264b4').attr('stroke', '#fff').attr('stroke-width', 0.5);
    issG.append('rect').attr('x', -6).attr('y', -0.6).attr('width', 12).attr('height', 1.2).attr('fill', '#4a90d9').attr('opacity', 0.8);
    issG.append('text').attr('x', 10).attr('y', 3).attr('fill', '#3264b4').attr('font-size', '8px').attr('font-family', 'Georgia, serif').attr('font-weight', 'bold').text('ISS');

    // ISS tooltip
    issG.on('mouseenter', function () {
      if (!tooltipEl) return;
      tooltipEl.innerHTML = `<div style="font-weight:bold;font-size:12px">International Space Station</div><div style="font-size:10px;color:#777;margin-top:2px">Lat: ${issLat.toFixed(2)}° · Lon: ${issLon.toFixed(2)}°</div><div style="font-size:10px;color:#777">Altitude: ~420 km · Speed: ~27,600 km/h</div>`;
      tooltipEl.style.display = 'block';
    }).on('mousemove', function (event) {
      if (!tooltipEl || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      tooltipEl.style.left = (event.clientX - rect.left + 12) + 'px';
      tooltipEl.style.top = (event.clientY - rect.top - 10) + 'px';
    }).on('mouseleave', function () {
      if (tooltipEl) tooltipEl.style.display = 'none';
    });

    const orbitPath = celestialLayer.append('path').attr('class', 'iss-orbit')
      .attr('fill', 'none').attr('stroke', 'rgba(50,100,180,0.6)').attr('stroke-width', 1.2).attr('stroke-dasharray', '4 3');

    let issLat = 0, issLon = 0, issLoaded = false;
    let orbitGeoJSON: GeoJSON.Feature | null = null;

    // Fast reposition — runs on every redraw frame (no DOM creation)
    function repositionCelestial() {
      if (!svgRef.current) return;
      const w = svgRef.current.clientWidth || 560;
      const h = svgRef.current.clientHeight || 420;
      const center = projection.invert!([w / 2, h / 2]);
      if (!center) return;
      const path = d3.geoPath().projection(projection);

      // Moon
      const moon = getMoonPosition();
      const moonCoords = projection([moon.lon, moon.lat]);
      const moonDist = d3.geoDistance([moon.lon, moon.lat], center);
      if (moonCoords && moonDist < Math.PI / 2 * 0.95) {
        const fade = moonDist > Math.PI / 2 * 0.75
          ? Math.max(0, 1 - (moonDist - Math.PI / 2 * 0.75) / (Math.PI / 2 * 0.2))
          : 1;
        moonG.style('display', '').style('opacity', fade)
          .attr('transform', `translate(${moonCoords[0]},${moonCoords[1]})`);
      } else {
        moonG.style('display', 'none');
      }

      // ISS position
      if (issLoaded) {
        const issCoords = projection([issLon, issLat]);
        const issDist = d3.geoDistance([issLon, issLat], center);
        if (issCoords && issDist < Math.PI / 2 * 0.95) {
          issG.style('display', '').attr('transform', `translate(${issCoords[0]},${issCoords[1]})`);
        } else {
          issG.style('display', 'none');
        }

        // Orbit path — use geoPath for proper clipping
        if (orbitGeoJSON) {
          orbitPath.attr('d', path(orbitGeoJSON));
        }
      }
    }

    // Slow rebuild — only when new ISS data arrives
    function rebuildOrbit() {
      const orbitPoints = computeISSOrbit(issLat, issLon);
      // Convert to GeoJSON LineString for proper projection clipping
      orbitGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: orbitPoints,
        },
      };

      // Update moon phase label
      const phase = getMoonPhase();
      moonG.select('.moon-shadow').attr('cx', 3 * phase.phase);
      moonG.select('.moon-label').text(`☽ ${phase.name}`);
    }

    // Patch the auto-rotate spin to call our reposition
    // We do this by running reposition on a fast interval synced to animation
    let celestialRaf: number;
    function celestialLoop() {
      repositionCelestial();
      celestialRaf = requestAnimationFrame(celestialLoop);
    }
    celestialRaf = requestAnimationFrame(celestialLoop);

    // Fetch ISS
    async function fetchISS() {
      try {
        const res = await fetch('/api/data/iss', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.iss_position) {
            issLat = parseFloat(data.iss_position.latitude);
            issLon = parseFloat(data.iss_position.longitude);
            issLoaded = true;
            rebuildOrbit();
          }
        }
      } catch { /* non-critical */ }
    }

    fetchISS();
    // Server-side cache TTL is 30s — match it to avoid wasted requests.
    const issTimer = setInterval(fetchISS, 30_000);

    return () => {
      cancelAnimationFrame(celestialRaf);
      clearInterval(issTimer);
      celestialLayer.remove();
    };
  }, [globeReady, redraw]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab' }}
    />
  );
}
