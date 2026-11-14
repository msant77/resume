/*
 * The hero: the work loop in real 3D (three.js r169, vendored), the same view
 * as the company's other sites, on this site's palette.
 *
 * A ThreeView for the story engine in assets/loop.js. The loop's steps are
 * raised cards on a carousel: whichever step is running (or selected) turns
 * to the front, nearest the camera, lifted and lit, so nothing ever covers
 * it; idle cards stay readable but dimmed. Edges are curved tubes that turn
 * with the carousel, packets are lit points with a trail and a moving light.
 * The camera drifts slowly, follows a little pointer parallax and moves in
 * on a selection.
 *
 * Side cards that are not steps of the ring are fixed HTML "satellites"
 * outside the 3D area: they never turn or scale, and a thin leader joins
 * each one to its anchor card's current position on screen (node.anchor,
 * else the scene's satelliteAnchor).
 *
 * Colours are read from the CSS variables in site.css (and re-read when the
 * theme changes); nothing here defines a colour of its own.
 */
import * as THREE from './vendor/three.module.js';

const loop = window.SiteLoop;
const ease = loop ? loop.ease : (p) => p;
const SPIN = ['◐', '◓', '◑', '◒'];
const GLYPH = { aguardando: '◌', rodando: '◐', 'concluído': '✓' };
const SVGNS = 'http://www.w3.org/2000/svg';

const CARD_W = 2.7;          // world units
const PX = 640;              // canvas pixels across a card
const UNIT = PX / CARD_W;
const TAU = Math.PI * 2;

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
}
function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* soft white glow, tinted by the material colour */
function glowTexture(rounded) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (rounded) {
    g.filter = 'blur(14px)';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(g, 30, 30, 68, 68, 14);
    g.fill();
  } else {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.55)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

class ThreeView {
  init(story) {
    this.s = story;
    this.host = story.stageEl;
    this.host.classList.add('is-3d');
    story.root.classList.add('cap-docks');
    this.cards = {};
    this.edges = {};
    this.packets = [];
    this.dirty = new Set();
    this.sel = null;
    this.focusNode = null;
    this.actor = null;
    this.pointer = new THREE.Vector2(0, 0);
    this.parallax = new THREE.Vector2(0, 0);
    this.pointerIn = false;
    this.spinFrame = -1;
    this.spin = 0;              // carousel angle
    this.ringIds = (story.d.ring || []).slice();
    this.satIds = (story.d.satellites || []).slice();

    const narrowDevice = window.matchMedia && window.matchMedia('(hover: none)').matches;
    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrowDevice ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'hero-canvas';
    renderer.domElement.style.touchAction = 'pan-y';
    this.host.appendChild(renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3(0, 4, 14);
    this.camera.position.copy(this.camPos);

    this.ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.key = new THREE.DirectionalLight(0xffffff, 1.7);
    this.key.position.set(-5, 9, 8);
    this.packetLight = new THREE.PointLight(0xffffff, 0, 4.5, 1.6);
    this.scene.add(this.ambient, this.key, this.packetLight);

    this.world = new THREE.Group();
    this.ring = new THREE.Group();   // turns: cards, edges, packets, shadows
    this.world.add(this.ring);
    this.scene.add(this.world);
    this.glowTex = glowTexture(false);
    this.cardGlowTex = glowTexture(true);
    this.shadowTex = shadowTexture();

    this.readColors();
    this.buildFloor();
    const byId = {};
    for (const n of story.d.nodes) byId[n.id] = n;
    for (const id of this.ringIds) if (byId[id]) this.buildCard(byId[id]);
    for (const e of story.d.edges) if (this.cards[e.from] && this.cards[e.to]) this.buildEdge(e);
    this.buildSatellites(byId);

    this.raycaster = new THREE.Raycaster();
    this.bindEvents();
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(this.host);
    else window.addEventListener('resize', () => this.resize());

    const recolor = () => { this.readColors(); this.applyColors(); };
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', recolor);
    }
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('700 40px Inter'),
        document.fonts.load('400 24px "JetBrains Mono"'),
        document.fonts.load('700 24px "JetBrains Mono"')
      ]).then(() => this.markAll(), () => {});
    }
  }

  /* ---------- colours ---------- */
  readColors() {
    this.c = {
      panel: css('--term-panel'), bg: css('--term-bg'), text: css('--term-text'),
      muted: css('--term-muted'), line: css('--term-line'), accent: css('--scene-accent'),
      role: {
        client: css('--role-client'), core: css('--role-core'), agent: css('--role-agent'),
        github: css('--role-github'), human: css('--role-human')
      }
    };
  }

  applyColors() {
    for (const id in this.cards) {
      this.cards[id].slab.material.color.set(this.c.panel);
      this.cards[id].glow.material.color.set(this.c.accent);
    }
    for (const id in this.edges) this.edges[id].base.material.color.set(this.c.line);
    this.track.material.color.set(this.c.accent);
    this.packetLight.color.set(this.c.accent);
    this.markAll();
  }

  /* ---------- floor: the carousel's track ---------- */
  buildFloor() {
    const pts = new THREE.EllipseCurve(0, 0, 1, 1, 0, TAU).getPoints(160);
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, p.y)));
    this.track = new THREE.LineLoop(geo, new THREE.LineDashedMaterial({
      color: this.c.accent, dashSize: 0.02, gapSize: 0.025, transparent: true, opacity: 0.55
    }));
    this.track.computeLineDistances();
    this.ring.add(this.track);
  }

  /* ---------- cards ---------- */
  buildCard(n) {
    const rows = 2 + (n.meters ? n.meters.length : 0) + 1;
    const hpx = 36 + 60 + (rows - 1) * 46 + 28;
    const h = hpx / UNIT;
    const canvas = document.createElement('canvas');
    canvas.width = PX;
    canvas.height = hpx;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const group = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedShape(CARD_W, h, 0.12), {
      depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6
    });
    geo.center();
    const slab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: this.c.panel, roughness: 0.62, metalness: 0.12, transparent: true, opacity: 1
    }));
    slab.userData = { kind: 'node', id: n.id };
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, h), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, toneMapped: false
    }));
    face.position.z = 0.068;
    face.userData = { kind: 'node', id: n.id };
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W + 1.4, h + 1.4), new THREE.MeshBasicMaterial({
      map: this.cardGlowTex, color: this.c.accent, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    glow.position.z = -0.12;
    group.add(glow, slab, face);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.3, 1.1), new THREE.MeshBasicMaterial({
      map: this.shadowTex, transparent: true, opacity: 0.35, depthWrite: false
    }));
    shadow.rotation.x = -Math.PI / 2;
    this.ring.add(group, shadow);

    const i = this.ringIds.indexOf(n.id);
    this.cards[n.id] = {
      d: n, group, slab, face, glow, shadow, canvas, ctx: canvas.getContext('2d'), tex, h,
      angle: -i * TAU / this.ringIds.length,
      status: n.status || 'aguardando', bars: {}, lift: 0, liftTo: 0, pull: 0, glowNow: 0,
      dim: 1, home: new THREE.Vector3(), pulseUntil: 0
    };
    this.dirty.add(n.id);
  }

  markAll() { for (const id in this.cards) this.dirty.add(id); }

  draw(id) {
    const k = this.cards[id];
    if (!k) return;
    const n = k.d, g = k.ctx, W = k.canvas.width, H = k.canvas.height, c = this.c;
    const role = c.role[n.role] || c.accent;
    const s = this.s;
    const tt = (f) => s.tt('node.' + n.id + '.' + f);
    g.clearRect(0, 0, W, H);
    roundRect(g, 3, 3, W - 6, H - 6, 26);
    g.fillStyle = c.panel;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = role;
    g.stroke();
    roundRect(g, 13, 13, W - 26, H - 26, 18);   // stitched inner edge
    g.lineWidth = 1;
    g.globalAlpha = 0.35;
    g.strokeStyle = c.accent;
    g.stroke();
    g.globalAlpha = 1;

    const x = 34, mono = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
    let y = 36 + 44;
    g.textBaseline = 'alphabetic';
    g.fillStyle = role;
    g.font = '700 42px Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
    g.fillText(tt('title'), x, y);
    g.font = '400 27px ' + mono;
    y += 42;
    g.fillStyle = c.muted;
    g.fillText(s.fill(tt('sub')), x, y);
    for (const m of (n.meters || [])) {
      y += 46;
      if (m.kind === 'bar') {
        const v = k.bars[m.id] || 0;
        g.fillStyle = c.text;
        g.fillText(tt('m.' + m.id), x, y);
        const bx = W * 0.6, bw = W * 0.2, bh = 18;
        g.strokeStyle = c.line;
        g.lineWidth = 2;
        g.strokeRect(bx, y - 17, bw, bh);
        g.fillStyle = role;
        g.fillRect(bx + 2, y - 15, (bw - 4) * Math.max(0, Math.min(1, v / 100)), bh - 4);
        g.font = '700 27px ' + mono;
        g.textAlign = 'right';
        g.fillText(Math.round(v) + '%', W - x, y);
        g.textAlign = 'left';
        g.font = '400 27px ' + mono;
      } else if (m.kind === 'stat') {
        g.fillStyle = c.text;
        g.fillText(tt('m.' + m.stat), x, y);
        g.font = '700 27px ' + mono;
        g.fillStyle = role;
        g.textAlign = 'right';
        g.fillText(s.fill('{' + m.stat + '}'), W - x, y);
        g.textAlign = 'left';
        g.font = '400 27px ' + mono;
      } else {
        g.fillStyle = c.text;
        g.fillText(s.fill(tt('m.' + m.key)), x, y);
      }
    }
    y += 46;
    const st = k.status;
    const glyph = st === 'rodando' ? SPIN[Math.max(0, this.spinFrame) % 4] : (GLYPH[st] || '•');
    g.fillStyle = st === 'aguardando' ? c.muted : role;
    g.fillText(glyph + ' ' + (loop ? loop.statusLabel(st) : st), x, y);
    k.tex.needsUpdate = true;
  }

  /* ---------- edges (in the ring's own frame, so they turn with it) ---------- */
  buildEdge(e) {
    const mat = new THREE.MeshBasicMaterial({ color: this.c.line, transparent: true, opacity: 0.55, toneMapped: false });
    const hot = new THREE.MeshBasicMaterial({ color: this.c.accent, transparent: true, opacity: 0, toneMapped: false });
    const base = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    const glow = new THREE.Mesh(new THREE.BufferGeometry(), hot);
    const hit = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'edge', id: e.id };
    this.ring.add(base, glow, hit);
    this.edges[e.id] = { d: e, base, glow, hit, curve: null, hot: 0, heat: 0, dim: 1 };
  }

  curveFor(e) {
    const a = this.cards[e.from].home, b = this.cards[e.to].home;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const ctrl = mid.clone();
    if (e.across) {
      ctrl.y += 2.4;
    } else {
      const out = new THREE.Vector3(mid.x, 0, mid.z);
      // arc over the cards rather than in front of them, so the lead card stays clear
      if (out.lengthSq() > 0.01) out.normalize().multiplyScalar(-0.6);
      ctrl.add(out);
      ctrl.y += 1.6;
    }
    return new THREE.QuadraticBezierCurve3(a.clone(), ctrl, b.clone());
  }

  rebuildEdges() {
    for (const id in this.edges) {
      const e = this.edges[id];
      e.curve = this.curveFor(e.d);
      for (const [mesh, r] of [[e.base, 0.011], [e.glow, 0.024], [e.hit, 0.2]]) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.TubeGeometry(e.curve, 72, r, 6, false);
      }
    }
  }

  /* ---------- satellites: fixed HTML cards outside the 3D area ---------- */
  buildSatellites(byId) {
    if (!this.satIds.length || !loop.htmlCard) return;
    const root = this.s.root;
    const box = document.createElement('div');
    box.className = 'satellites';
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'sat-leaders');
    svg.setAttribute('aria-hidden', 'true');
    this.sats = {};
    for (const id of this.satIds) {
      const n = byId[id];
      if (!n) continue;
      const k = loop.htmlCard(this.s, n);
      k.el.classList.add('is-satellite');
      box.appendChild(k.el);
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('class', 'sat-leader r-' + n.role);
      const dot = document.createElementNS(SVGNS, 'circle');
      dot.setAttribute('r', '3.5');
      dot.setAttribute('class', 'sat-packet r-' + n.role);
      svg.appendChild(path);
      svg.appendChild(dot);
      k.path = path;
      k.dot = dot;
      k.packet = null;
      this.sats[id] = k;
    }
    root.appendChild(svg);
    root.appendChild(box);
    this.satBox = box;
    this.satSvg = svg;
  }

  satFor(edge) {
    if (!this.sats || !edge) return null;
    return this.sats[edge.from] || this.sats[edge.to] || null;
  }

  updateLeaders(t) {
    if (!this.sats) return;
    const root = this.s.root.getBoundingClientRect();
    const cv = this.renderer.domElement.getBoundingClientRect();
    const r = this.radius || 4;
    this.satSvg.setAttribute('width', Math.round(root.width));
    this.satSvg.setAttribute('height', Math.round(root.height));
    for (const id in this.sats) {
      const k = this.sats[id];
      const anchor = this.cards[k.d.anchor || this.s.d.satelliteAnchor];
      if (!anchor) continue;
      const wp = new THREE.Vector3();
      anchor.group.getWorldPosition(wp);
      const p = wp.clone().project(this.camera);
      const px = cv.left - root.left + (p.x + 1) / 2 * cv.width;
      const py = cv.top - root.top + (1 - p.y) / 2 * cv.height;
      // fade the leader while its anchor is on the far side of the carousel
      const front = Math.max(0, Math.min(1, (wp.z / r + 0.35) / 0.9));
      const b = k.el.getBoundingClientRect();
      const stacked = this.narrow;
      const sx = stacked ? b.left - root.left + b.width / 2 : b.left - root.left;
      const sy = stacked ? b.top - root.top : b.top - root.top + b.height / 2;
      const c1x = stacked ? sx : sx - 80, c1y = stacked ? sy - 60 : sy;
      const d = `M${sx.toFixed(1)} ${sy.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${(px + (stacked ? 0 : 60)).toFixed(1)} ${(py + (stacked ? 40 : 0)).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
      k.path.setAttribute('d', d);
      const lit = k.status === 'rodando' || k.packet ? 1 : 0.55;
      k.path.style.opacity = (front * lit).toFixed(2);
      if (k.packet) {
        const q = (t - k.packet.start) / k.packet.dur;
        if (q >= 1 || q < 0) { k.packet = null; k.dot.style.opacity = '0'; continue; }
        const L = k.path.getTotalLength();
        const pt = k.path.getPointAtLength(ease(q) * L);
        k.dot.setAttribute('cx', pt.x.toFixed(1));
        k.dot.setAttribute('cy', pt.y.toFixed(1));
        k.dot.style.opacity = String(Math.max(0.35, front));
      } else {
        k.dot.style.opacity = '0';
      }
    }
  }

  /* ---------- layout ---------- */
  layout() {
    const scale = this.cardScale = this.narrow ? 0.86 : 1.25;
    // room for every step around the circle, whatever their number
    const n = Math.max(1, this.ringIds.length);
    const r = this.radius = Math.max(this.narrow ? 3.2 : 4.4, (n * CARD_W * scale * 0.95) / TAU);
    for (const id in this.cards) {
      const k = this.cards[id];
      k.home.set(r * Math.sin(k.angle), 0, r * Math.cos(k.angle));
      k.group.scale.setScalar(scale);
      k.group.position.copy(k.home);
      k.shadow.position.set(k.home.x, -1.32, k.home.z);
      k.shadow.rotation.z = -k.angle;
    }
    this.track.scale.set(r, 1, r);
    this.track.position.y = -1.3;
    this.rebuildEdges();
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const narrow = w < 1080 || w / h < 0.95;
    if (narrow !== this.narrow) { this.narrow = narrow; this.layout(); }
    // distance that fits the carousel in the middle column (the caption docks
    // on the left, the satellites on the right) or the whole width on phones
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const availW = narrow ? 1 : 0.54, availH = narrow ? 0.7 : 0.62;
    const span = 2 * this.radius + CARD_W * (narrow ? 0.86 : 1.25);
    const fitW = narrow ? CARD_W * 0.86 / 0.8 : span, fitH = narrow ? 6 : 6.4;
    this.fitDist = Math.max(fitH / 2 / (t * availH), fitW / 2 / (t * this.camera.aspect * availW));
    // phones get a short stage sized to the card: the card sits low, clear of the pause control
    this.narrowY = w < 430 ? -0.15 : 0.06;
    this.offTo = narrow ? { x: 0, y: this.narrowY } : { x: -0.035, y: -0.06 };
    if (!this.off) this.off = { x: this.offTo.x, y: this.offTo.y };
    this.snap = true;
  }

  /* ---------- interaction ---------- */
  bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pointerIn = e.pointerType === 'mouse';
    });
    el.addEventListener('pointerleave', () => {
      this.pointerIn = false;
      if (this.hoverKey && !this.s.selection) { this.hoverKey = null; this.s.hover(null); el.style.cursor = ''; }
    });
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
      if (e.pointerType !== 'mouse') this.s.touching = true;
    });
    const release = () => { this.s.touching = false; };
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerup', (e) => {
      release();
      if (down && e.pointerType !== 'mouse') {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) > 50 && Math.abs(dy) < 60) { down = null; this.s.stepBy(dx < 0 ? 1 : -1); return; }
      }
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down = null; return; }
      down = null;
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const hit = this.pick();
      if (hit) this.s.pick(hit.kind, hit.id);
      else if (this.s.selection) this.s.clear();
    });
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [];
    for (const id in this.cards) targets.push(this.cards[id].slab, this.cards[id].face);
    for (const p of this.packets) targets.push(p.hit);
    for (const id in this.edges) targets.push(this.edges[id].hit);
    const hits = this.raycaster.intersectObjects(targets, false);
    return hits.length ? hits[0].object.userData : null;
  }

  hover(h) {
    this.hoverId = h && h.kind === 'node' ? h.id : null;
    this.hoverEdge = h && h.kind === 'edge' ? h.id : null;
    if (this.sats) for (const id in this.sats) this.sats[id].el.classList.toggle('is-hover', this.hoverId === id);
  }

  select(sel, focusNode) {
    this.sel = sel;
    this.focusNode = focusNode && this.cards[focusNode] ? focusNode : null;
    if (this.sats) for (const id in this.sats) this.sats[id].el.classList.toggle('is-sel', !!sel && sel.kind === 'node' && sel.id === id);
  }

  anchorRect(kind, id) {
    const root = this.s.root.getBoundingClientRect();
    if (kind === 'node' && this.sats && this.sats[id]) {
      const r = this.sats[id].el.getBoundingClientRect();
      return { left: r.left - root.left, top: r.top - root.top, right: r.right - root.left,
               bottom: r.bottom - root.top, width: r.width, height: r.height };
    }
    const cv = this.renderer.domElement.getBoundingClientRect();
    const project = (v) => {
      const p = v.clone().project(this.camera);
      return { x: cv.left - root.left + (p.x + 1) / 2 * cv.width, y: cv.top - root.top + (1 - p.y) / 2 * cv.height };
    };
    let pts = [];
    if (kind === 'node' && this.cards[id]) {
      const k = this.cards[id];
      const hw = CARD_W / 2, hh = k.h / 2;
      k.group.updateWorldMatrix(true, false);
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pts.push(project(new THREE.Vector3(sx * hw, sy * hh, 0).applyMatrix4(k.group.matrixWorld)));
      }
    } else if (kind === 'edge' && this.edges[id] && this.edges[id].curve) {
      const live = this.packets.find((p) => p.edge === this.edges[id]);
      const at = new THREE.Vector3();
      if (live) live.core.getWorldPosition(at);
      else at.copy(this.edges[id].curve.getPointAt(0.5)).applyMatrix4(this.ring.matrixWorld);
      const p = project(at);
      pts = [{ x: p.x - 10, y: p.y - 10 }, { x: p.x + 10, y: p.y + 10 }];
    } else if (kind === 'edge' && this.sats) {
      const sat = this.satFor(this.s.edgeById[id]);
      if (sat) return this.anchorRect('node', sat.d.id);
    }
    if (!pts.length) return null;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  get tracksEdges() { return true; }

  /* ---------- story hooks ---------- */
  setStatus(id, s) {
    if (this.sats && this.sats[id]) { loop.cardStatus(this.sats[id], s); return; }
    const k = this.cards[id];
    if (!k) return;
    k.status = s;
    k.liftTo = s === 'rodando' ? 0.32 : 0;
    // the card that just started or just finished is the one the carousel shows
    if (s === 'rodando' || s === 'concluído') this.actor = id;
    this.dirty.add(id);
  }

  setBar(id, m, v) {
    const k = this.cards[id];
    if (!k) return;
    k.bars[m] = v;
    this.dirty.add(id);
  }

  statsChanged() { this.markAll(); }

  relocale() {
    this.markAll();
    if (this.sats) for (const id in this.sats) loop.cardStatus(this.sats[id], this.sats[id].status);
  }

  pulse(id) {
    const k = this.cards[id];
    if (k) { k.pulseUntil = this.s.elapsed + 1.4; this.actor = id; }
  }

  reset() {
    for (const p of this.packets) this.disposePacket(p);
    this.packets = [];
    for (const id in this.edges) this.edges[id].hot = 0;
    if (this.sats) for (const id in this.sats) this.sats[id].packet = null;
  }

  launch(edgeId, o) {
    const edge = this.s.edgeById[edgeId];
    const sat = this.satFor(edge);
    if (sat) { sat.packet = { start: this.s.t, dur: o.dur }; return; }
    const e = this.edges[edgeId];
    if (!e || !e.curve) return;
    const color = new THREE.Color(this.c.role[o.role] || this.c.accent);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: this.c.accent, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    halo.scale.setScalar(0.75);
    const trail = [0.42, 0.3, 0.2].map((s, i) => {
      const t = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color, transparent: true, opacity: 0.55 - i * 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      }));
      t.scale.setScalar(s);
      return t;
    });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'edge', id: edgeId };
    this.ring.add(core, halo, hit, ...trail);
    e.hot++;
    e.glow.material.color.copy(color);
    this.packets.push({ edge: e, core, halo, trail, hit, start: this.s.t, dur: o.dur, back: o.back });
  }

  disposePacket(p) {
    for (const m of [p.core, p.halo, p.hit, ...p.trail]) {
      this.ring.remove(m);
      if (m.geometry) m.geometry.dispose();
      m.material.dispose();
    }
    p.edge.hot = Math.max(0, p.edge.hot - 1);
  }

  /* ---------- frame ---------- */
  frame(dt, t, elapsed) {
    if (!this.w) this.resize();
    const k1 = 1 - Math.exp(-dt * 2.4);      // camera
    const k2 = 1 - Math.exp(-dt * 6);        // fades and lifts
    const kSpin = 1 - Math.exp(-dt * (this.narrow ? 3.4 : 1.9));   // carousel: snappier on phones

    // carousel: the selected card, else the running one, turns to the front
    const lead = this.focusNode || this.actor;
    if (lead && this.cards[lead]) {
      const want = -this.cards[lead].angle;
      this.spin += wrap(want - this.spin) * kSpin;
    }
    this.ring.rotation.y = this.spin;
    this.ring.updateMatrixWorld(true);

    // packets (ring frame)
    let newest = null;
    this.packets = this.packets.filter((p) => {
      const q = (t - p.start) / p.dur;
      if (q >= 1 || q < 0) { this.disposePacket(p); return false; }
      const at = (x) => p.edge.curve.getPointAt(Math.max(0, Math.min(1, p.back ? 1 - ease(x) : ease(x))));
      const pos = at(q);
      p.core.position.copy(pos);
      p.halo.position.copy(pos);
      p.hit.position.copy(pos);
      p.halo.material.opacity = 0.65 + 0.3 * Math.sin(elapsed * 14);
      p.trail.forEach((s, i) => s.position.copy(at(q - 0.035 * (i + 1))));
      newest = p;
      return true;
    });
    if (newest) {
      newest.core.getWorldPosition(this.packetLight.position);
      this.packetLight.intensity += (3.2 - this.packetLight.intensity) * k2;
    } else {
      this.packetLight.intensity += (0 - this.packetLight.intensity) * k2;
    }

    // hover via raycast (mouse only, nothing selected)
    if (this.pointerIn && !this.s.selection) {
      const hit = this.pick();
      const key = hit ? hit.kind + ':' + hit.id : null;
      if (key !== this.hoverKey) {
        this.hoverKey = key;
        this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
        this.s.hover(hit ? hit.kind : null, hit ? hit.id : null);
      }
    }

    // camera: overview of the carousel, or in on the focused (front) card
    this.parallax.lerp(this.pointerIn ? this.pointer : new THREE.Vector2(0, 0), k1);
    const r = this.radius || 4.4;
    const fov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    let target, dist, elev;
    const close = this.focusNode || this.narrow;
    if (close) {
      target = new THREE.Vector3(0, 0.25, r + 0.9);
      // the lead card is pulled out by 0.9 and scaled by 1.16: frame it at ~30 % of a wide hero
      const want = (CARD_W * (this.narrow ? 0.86 : 1.25) * 1.16) / (this.narrow ? 0.8 : 0.3);
      dist = want / 2 / (Math.tan(fov) * this.camera.aspect);
      elev = this.narrow ? 0.12 : 0.18;
    } else {
      target = new THREE.Vector3(0, 0.35, 0.9);
      dist = this.fitDist || 15;
      elev = 0.33;
    }
    const az = Math.sin(elapsed * 0.09) * (this.narrow ? 0.04 : 0.1) + this.parallax.x * 0.12;
    elev += Math.sin(elapsed * 0.065) * 0.025 - this.parallax.y * 0.06;
    const pos = new THREE.Vector3(
      target.x + Math.sin(az) * Math.cos(elev) * dist,
      target.y + Math.sin(elev) * dist,
      target.z + Math.cos(az) * Math.cos(elev) * dist
    );
    if (this.snap) { this.camTarget.copy(target); this.camPos.copy(pos); this.snap = false; }
    this.camTarget.lerp(target, k1);
    this.camPos.lerp(pos, k1);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    const offTo = this.focusNode ? (this.narrow ? { x: 0, y: this.narrowY } : { x: -0.06, y: -0.1 }) : this.offTo;
    this.off.x += (offTo.x - this.off.x) * k1;
    this.off.y += (offTo.y - this.off.y) * k1;
    this.camera.setViewOffset(this.w, this.h, this.off.x * this.w, this.off.y * this.h, this.w, this.h);

    // cards: face the camera, the lead one lifted and pulled forward, idle ones dimmed
    const sel = this.s.selection;
    const spin = Math.floor(elapsed * 6) % 4;
    const spinChanged = spin !== this.spinFrame;
    this.spinFrame = spin;
    const camLocal = this.ring.worldToLocal(this.camera.position.clone());
    for (const id in this.cards) {
      const k = this.cards[id];
      const isLead = id === lead;
      const focused = this.focusNode === id;
      const dimTo = sel ? (focused ? 1 : 0.28) : (lead ? (isLead || k.status === 'rodando' ? 1 : 0.62) : 1);
      k.dim += (dimTo - k.dim) * k2;
      k.lift += ((isLead ? 0.38 : k.liftTo) - k.lift) * k2;
      k.pull += ((isLead ? 1 : 0) - k.pull) * k2;
      const out = new THREE.Vector3(k.home.x, 0, k.home.z).normalize().multiplyScalar(0.9 * k.pull);
      k.group.position.set(k.home.x + out.x, k.home.y + k.lift, k.home.z + out.z);
      k.group.scale.setScalar(this.cardScale * (1 + 0.16 * k.pull));
      k.group.lookAt(this.ring.localToWorld(new THREE.Vector3(camLocal.x, k.group.position.y, camLocal.z)));
      k.face.material.opacity = k.dim;
      k.slab.material.opacity = 0.4 + 0.6 * k.dim;
      k.face.renderOrder = k.slab.renderOrder = isLead ? 10 : 0;
      const pulsing = elapsed < k.pulseUntil;
      const glowTo = focused ? 0.85 : isLead && k.status === 'rodando' ? 0.5 + 0.15 * Math.sin(elapsed * 4) :
        (this.hoverId === id || pulsing) ? 0.45 : 0;
      k.glowNow += (glowTo - k.glowNow) * k2;
      k.glow.material.opacity = k.glowNow * k.dim;
      k.shadow.material.opacity = 0.32 * k.dim;
      if (spinChanged && k.status === 'rodando') this.dirty.add(id);
    }
    for (const id in this.edges) {
      const e = this.edges[id];
      const chosen = sel && sel.kind === 'edge' && sel.id === id;
      const near = sel && this.focusNode && (e.d.from === this.focusNode || e.d.to === this.focusNode);
      const dimTo = !sel || chosen || near ? 1 : 0.2;
      e.dim += (dimTo - e.dim) * k2;
      const heatTo = e.hot > 0 || chosen || this.hoverEdge === id ? 1 : 0;
      e.heat += (heatTo - e.heat) * k2;
      e.base.material.opacity = 0.55 * e.dim;
      e.glow.material.opacity = 0.9 * e.heat * e.dim;
    }
    if (this.sats) for (const id in this.sats) loop.cardSpin(this.sats[id], elapsed);

    let budget = 4;
    for (const id of this.dirty) {
      if (budget-- <= 0) break;
      this.dirty.delete(id);
      this.draw(id);
    }
    this.renderer.render(this.scene, this.camera);
    this.updateLeaders(t);
  }
}

if (loop) loop.registerView(ThreeView);
