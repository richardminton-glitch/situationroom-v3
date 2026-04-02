'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as topojson from 'topojson-client';

const WORLD_ATLAS_URL = '/geo/countries-110m.json';

const C_ACCENT = 0x00d4c8;
const C_GRID = 0x0d2e2e;
const C_COAST = 0x007a74;
const C_SPHERE = 0x03050f;
const C_GLOW = 0x00d4c8;
const C_FLOW = 0x00d4c8;
const C_NODE = 0x00d4c8;

const GLOBE_R = 100;
const ROT_SPEED = 0.0008;
const NUM_STATIC_ARCS = 60;
const ARC_SEGMENTS = 48;
const ARC_HEIGHT_FACTOR = 0.08;
const PULSE_SPEED = 0.15;
const PULSE_SPAWN_RATE = 2.5;
const MIN_CLUSTER_DOTS = 6;
const MAX_CLUSTER_DOTS = 50;

// BTC node countries (simplified — would come from API in production)
const BTC_NODES = [
  { country: 'US', lat: 39.8, lon: -95.6, nodes: 2800, spread: 15 },
  { country: 'DE', lat: 51.2, lon: 10.5, nodes: 1400, spread: 8 },
  { country: 'FR', lat: 46.6, lon: 2.3, nodes: 600, spread: 6 },
  { country: 'GB', lat: 54.0, lon: -2.0, nodes: 500, spread: 5 },
  { country: 'CA', lat: 56.1, lon: -106.3, nodes: 450, spread: 12 },
  { country: 'NL', lat: 52.1, lon: 5.3, nodes: 400, spread: 3 },
  { country: 'SG', lat: 1.3, lon: 103.8, nodes: 350, spread: 2 },
  { country: 'JP', lat: 36.2, lon: 138.3, nodes: 300, spread: 6 },
  { country: 'AU', lat: -25.3, lon: 133.8, nodes: 250, spread: 10 },
  { country: 'CH', lat: 46.8, lon: 8.2, nodes: 200, spread: 3 },
  { country: 'BR', lat: -14.2, lon: -51.9, nodes: 180, spread: 10 },
  { country: 'IN', lat: 20.6, lon: 79.0, nodes: 150, spread: 8 },
  { country: 'RU', lat: 61.5, lon: 105.3, nodes: 130, spread: 15 },
  { country: 'KR', lat: 35.9, lon: 127.8, nodes: 120, spread: 3 },
  { country: 'ZA', lat: -30.6, lon: 22.9, nodes: 80, spread: 5 },
];

const MARKETS = [
  { name: 'New York (NYSE)', lat: 40.71, lon: -74.01, openUTC: 14.5, closeUTC: 21 },
  { name: 'London (LSE)', lat: 51.51, lon: -0.13, openUTC: 8, closeUTC: 16.5 },
  { name: 'Tokyo (TSE)', lat: 35.68, lon: 139.69, openUTC: 0, closeUTC: 6 },
  { name: 'Shanghai (SSE)', lat: 31.23, lon: 121.47, openUTC: 1.5, closeUTC: 7 },
  { name: 'Hong Kong (HKEX)', lat: 22.32, lon: 114.17, openUTC: 1.5, closeUTC: 8 },
  { name: 'Frankfurt (XETRA)', lat: 50.11, lon: 8.68, openUTC: 8, closeUTC: 16.5 },
  { name: 'Sydney (ASX)', lat: -33.87, lon: 151.21, openUTC: 0, closeUTC: 6 },
  { name: 'Toronto (TSX)', lat: 43.65, lon: -79.38, openUTC: 14.5, closeUTC: 21 },
  { name: 'Mumbai (BSE)', lat: 19.08, lon: 72.88, openUTC: 3.75, closeUTC: 10 },
  { name: 'São Paulo (B3)', lat: -23.55, lon: -46.63, openUTC: 13, closeUTC: 21 },
  { name: 'Singapore (SGX)', lat: 1.28, lon: 103.85, openUTC: 1, closeUTC: 9 },
  { name: 'Johannesburg (JSE)', lat: -26.2, lon: 28.05, openUTC: 7, closeUTC: 15 },
];

function isMarketOpen(market: typeof MARKETS[0]): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  if (market.openUTC < market.closeUTC) {
    return utcHour >= market.openUTC && utcHour < market.closeUTC;
  }
  return utcHour >= market.openUTC || utcHour < market.closeUTC;
}

function ll(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function DarkGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 560;
    const h = container.clientHeight || 420;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 2000);
    camera.position.z = 345;

    const pivot = new THREE.Group();
    let rotY = -0.5;
    let rotX = 0.2;
    scene.add(pivot);

    // Sphere
    const sphereGeo = new THREE.SphereGeometry(GLOBE_R * 0.995, 48, 48);
    const sphereMat = new THREE.MeshBasicMaterial({ color: C_SPHERE });
    pivot.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(GLOBE_R * 1.06, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: C_GLOW, transparent: true, opacity: 0.04, side: THREE.BackSide,
    });
    pivot.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Grid wireframe
    const gridPts: THREE.Vector3[] = [];
    const step = 2;
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += step) {
        gridPts.push(ll(lat, lon, GLOBE_R));
        gridPts.push(ll(lat, lon + step, GLOBE_R));
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -88; lat < 88; lat += step) {
        gridPts.push(ll(lat, lon, GLOBE_R));
        gridPts.push(ll(lat + step, lon, GLOBE_R));
      }
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPts);
    const gridMat = new THREE.LineBasicMaterial({ color: C_GRID, transparent: true, opacity: 0.9 });
    pivot.add(new THREE.LineSegments(gridGeo, gridMat));

    // Load coastlines
    fetch(WORLD_ATLAS_URL)
      .then((r) => r.json())
      .then((topo) => {
        const geojson = topojson.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
        const pts: THREE.Vector3[] = [];
        const R = GLOBE_R * 1.002;
        const addRing = (coords: number[][]) => {
          for (let i = 0; i < coords.length - 1; i++) {
            pts.push(ll(coords[i][1], coords[i][0], R));
            pts.push(ll(coords[i + 1][1], coords[i + 1][0], R));
          }
        };
        geojson.features.forEach((f) => {
          const g = f.geometry;
          if (!g) return;
          if (g.type === 'Polygon') (g.coordinates as number[][][]).forEach(addRing);
          else if (g.type === 'MultiPolygon') (g.coordinates as number[][][][]).forEach((poly) => poly.forEach(addRing));
        });
        if (pts.length) {
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: C_COAST, transparent: true, opacity: 0.6 });
          pivot.add(new THREE.LineSegments(geo, mat));
        }
      })
      .catch(() => {});

    // BTC Node clusters
    const maxNodes = Math.max(...BTC_NODES.map((c) => c.nodes));
    const allPositions: THREE.Vector3[] = [];
    BTC_NODES.forEach((country, ci) => {
      const t = Math.log(country.nodes + 1) / Math.log(maxNodes + 1);
      const dotCount = Math.round(MIN_CLUSTER_DOTS + t * (MAX_CLUSTER_DOTS - MIN_CLUSTER_DOTS));
      const rng = seededRandom(ci * 7919 + 42);
      for (let i = 0; i < dotCount; i++) {
        const angle = rng() * Math.PI * 2;
        const radius = country.spread * Math.sqrt(rng()) * 0.7;
        const dlat = Math.sin(angle) * radius;
        const dlon = Math.cos(angle) * radius / Math.cos(((country.lat + dlat) * Math.PI) / 180 || 1);
        allPositions.push(ll(country.lat + dlat, country.lon + dlon, GLOBE_R * 1.005));
      }
    });

    let nodeClusterMat: THREE.ShaderMaterial | null = null;
    if (allPositions.length) {
      const positions = new Float32Array(allPositions.length * 3);
      const sizes = new Float32Array(allPositions.length);
      const phases = new Float32Array(allPositions.length);
      for (let i = 0; i < allPositions.length; i++) {
        positions[i * 3] = allPositions[i].x;
        positions[i * 3 + 1] = allPositions[i].y;
        positions[i * 3 + 2] = allPositions[i].z;
        sizes[i] = 2.0 + Math.random() * 2.5;
        phases[i] = Math.random() * Math.PI * 2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

      nodeClusterMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(C_NODE) } },
        vertexShader: `
          attribute float aSize;
          attribute float aPhase;
          varying float vAlpha;
          uniform float uTime;
          void main() {
            float twinkle = 0.3 + 0.35 * sin(uTime * 0.6 + aPhase);
            vAlpha = twinkle;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPos;
            gl_PointSize = aSize * (280.0 / -mvPos.z);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float glow = 1.0 - smoothstep(0.0, 0.45, dist);
            gl_FragColor = vec4(uColor, vAlpha * glow);
          }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      pivot.add(new THREE.Points(geo, nodeClusterMat));
    }

    // Static data-flow arcs
    interface ArcData { mat: THREE.ShaderMaterial }
    const staticArcs: ArcData[] = [];
    const arcPulses: { arcIdx: number; progress: number; speed: number }[] = [];
    let lastPulseSpawn = 0;

    const usedPairs = new Set<string>();
    const arcPairs: { from: typeof BTC_NODES[0]; to: typeof BTC_NODES[0] }[] = [];
    for (const c of BTC_NODES) {
      let nearest = BTC_NODES[0];
      let nearestDist = Infinity;
      for (const o of BTC_NODES) {
        if (o === c) continue;
        const d = Math.hypot(c.lat - o.lat, c.lon - o.lon);
        if (d < nearestDist && !usedPairs.has(c.country + o.country)) {
          nearestDist = d;
          nearest = o;
        }
      }
      arcPairs.push({ from: c, to: nearest });
      usedPairs.add(c.country + nearest.country);
      usedPairs.add(nearest.country + c.country);
    }
    while (arcPairs.length < NUM_STATIC_ARCS) {
      const from = BTC_NODES[Math.floor(Math.random() * BTC_NODES.length)];
      const to = BTC_NODES[Math.floor(Math.random() * BTC_NODES.length)];
      if (from === to || usedPairs.has(from.country + to.country)) continue;
      arcPairs.push({ from, to });
      usedPairs.add(from.country + to.country);
    }

    const R = GLOBE_R * 1.008;
    for (const { from, to } of arcPairs) {
      const fromPos = ll(from.lat, from.lon, R);
      const toPos = ll(to.lat, to.lon, R);
      const dist = fromPos.distanceTo(toPos);
      const arcH = dist * ARC_HEIGHT_FACTOR;

      const posArr = new Float32Array((ARC_SEGMENTS + 1) * 3);
      const arcT = new Float32Array(ARC_SEGMENTS + 1);
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const t = i / ARC_SEGMENTS;
        const v = new THREE.Vector3().lerpVectors(fromPos, toPos, t).normalize().multiplyScalar(R + Math.sin(t * Math.PI) * arcH);
        posArr[i * 3] = v.x; posArr[i * 3 + 1] = v.y; posArr[i * 3 + 2] = v.z;
        arcT[i] = t;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute('arcT', new THREE.BufferAttribute(arcT, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(C_FLOW) },
          uPulse0: { value: -1.0 }, uPulse1: { value: -1.0 }, uPulse2: { value: -1.0 },
        },
        vertexShader: `
          attribute float arcT; varying float vArcT;
          void main() { vArcT = arcT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          uniform vec3 uColor; uniform float uPulse0; uniform float uPulse1; uniform float uPulse2;
          varying float vArcT;
          float pulseGlow(float p) {
            if (p < -0.5) return 0.0;
            float d = abs(vArcT - p);
            float bright = exp(-d * d * 80.0) * 0.9;
            float behind = p - vArcT;
            float trail = smoothstep(0.0, 0.08, behind) * (1.0 - smoothstep(0.0, 0.25, behind)) * 0.25;
            return max(bright, trail);
          }
          void main() {
            float alpha = 0.08;
            float endFade = smoothstep(0.0, 0.05, vArcT) * smoothstep(1.0, 0.95, vArcT);
            alpha += pulseGlow(uPulse0) + pulseGlow(uPulse1) + pulseGlow(uPulse2);
            alpha *= endFade;
            gl_FragColor = vec4(uColor, min(alpha, 1.0));
          }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      pivot.add(new THREE.Line(geo, mat));
      staticArcs.push({ mat });
    }

    // Market indicator dots with pulse rings
    interface PulseRing { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; dotMat: THREE.MeshBasicMaterial; market: typeof MARKETS[0]; phase: number }
    const pulseRings: PulseRing[] = [];

    MARKETS.forEach((market, i) => {
      const pos = ll(market.lat, market.lon, GLOBE_R * 1.012);
      const normal = pos.clone().normalize();

      // Static dot
      const dotGeo = new THREE.SphereGeometry(2.0, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: C_ACCENT });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      pivot.add(dot);

      // Expanding pulse ring
      const ringGeo = new THREE.RingGeometry(1.8, 3.2, 20);
      const ringMat = new THREE.MeshBasicMaterial({
        color: C_ACCENT, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      pivot.add(ring);

      pulseRings.push({ mesh: ring, mat: ringMat, dotMat, market, phase: (i / MARKETS.length) * Math.PI * 2 });
    });

    // Interaction
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const el = renderer.domElement;
    el.style.cursor = 'grab';
    el.addEventListener('mousedown', (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; el.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevMouse.x) * 0.006;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - prevMouse.y) * 0.004));
      prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; el.style.cursor = 'grab'; });

    // Animation loop
    let raf: number;
    let rotationPaused = false;

    // Globe controls — direct DOM buttons
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'position:absolute;bottom:4px;right:8px;display:flex;flex-direction:column;gap:3px;z-index:10;';

    const btnStyle = 'width:24px;height:24px;border-radius:3px;border:1px solid rgba(45,54,64,0.8);background:rgba(10,15,20,0.85);color:#00d4c8;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;';

    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Zoom in';
    zoomInBtn.style.cssText = btnStyle;
    zoomInBtn.onclick = () => { camera.position.z = Math.max(180, camera.position.z - 30); };

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.title = 'Zoom out';
    zoomOutBtn.style.cssText = btnStyle;
    zoomOutBtn.onclick = () => { camera.position.z = Math.min(600, camera.position.z + 30); };

    const rotateBtn = document.createElement('button');
    rotateBtn.innerHTML = '⏸';
    rotateBtn.title = 'Pause rotation';
    rotateBtn.style.cssText = btnStyle;
    rotateBtn.onclick = () => {
      rotationPaused = !rotationPaused;
      rotateBtn.innerHTML = rotationPaused ? '▶' : '⏸';
      rotateBtn.title = rotationPaused ? 'Resume rotation' : 'Pause rotation';
    };

    const chartBtn = document.createElement('button');
    chartBtn.innerHTML = '📈';
    chartBtn.title = 'Switch to BTC chart';
    chartBtn.style.cssText = btnStyle;
    chartBtn.onclick = () => {
      container.closest('[style*="min-height"]')?.dispatchEvent(new Event('globe-toggle-chart', { bubbles: true }));
    };

    controlsDiv.appendChild(zoomInBtn);
    controlsDiv.appendChild(zoomOutBtn);
    controlsDiv.appendChild(rotateBtn);
    controlsDiv.appendChild(chartBtn);
    container.appendChild(controlsDiv);

    function loop() {
      raf = requestAnimationFrame(loop);
      const t = performance.now() * 0.001;

      if (!isDragging && !rotationPaused) rotY += ROT_SPEED;
      pivot.rotation.y = rotY;
      pivot.rotation.x = rotX;

      if (nodeClusterMat) nodeClusterMat.uniforms.uTime.value = t;

      // Market pulse rings — expand & fade, colour by open/closed
      const colOpen = new THREE.Color(0xffffff);
      const colClosed = new THREE.Color(C_ACCENT);
      pulseRings.forEach(({ mesh, mat, dotMat, market, phase }) => {
        const cycle = ((t * 0.4 + phase / (Math.PI * 2)) % 1);
        const open = isMarketOpen(market);
        const col = open ? colOpen : colClosed;
        mat.color.copy(col);
        dotMat.color.copy(col);
        mesh.scale.setScalar(1 + cycle * 3.5);
        mat.opacity = (1 - cycle) * (open ? 0.9 : 0.5);
      });

      // Pulse spawning & updates
      const dt = 1 / 60;
      if (staticArcs.length && t - lastPulseSpawn > 1.0 / PULSE_SPAWN_RATE) {
        const idx = Math.floor(Math.random() * staticArcs.length);
        const dir = Math.random() > 0.5 ? 1 : -1;
        arcPulses.push({ arcIdx: idx, progress: dir > 0 ? 0 : 1, speed: PULSE_SPEED * (0.7 + Math.random() * 0.6) * dir });
        lastPulseSpawn = t;
      }
      for (const arc of staticArcs) {
        arc.mat.uniforms.uPulse0.value = -1;
        arc.mat.uniforms.uPulse1.value = -1;
        arc.mat.uniforms.uPulse2.value = -1;
      }
      for (let i = arcPulses.length - 1; i >= 0; i--) {
        const p = arcPulses[i];
        p.progress += p.speed * dt;
        if (p.progress > 1.3 || p.progress < -0.3) { arcPulses.splice(i, 1); continue; }
        const arc = staticArcs[p.arcIdx];
        if (!arc) { arcPulses.splice(i, 1); continue; }
        if (arc.mat.uniforms.uPulse0.value < -0.5) arc.mat.uniforms.uPulse0.value = p.progress;
        else if (arc.mat.uniforms.uPulse1.value < -0.5) arc.mat.uniforms.uPulse1.value = p.progress;
        else if (arc.mat.uniforms.uPulse2.value < -0.5) arc.mat.uniforms.uPulse2.value = p.progress;
      }

      renderer.render(scene, camera);
    }
    loop();

    // Resize
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth || 560;
      const nh = container.clientHeight || 420;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      controlsDiv.remove();
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0d1117', borderRadius: '4px' }}
    />
  );
}
