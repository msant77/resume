/*
 * The hero stage in real 3D (three.js r169, vendored), on this site's palette.
 *
 * A ThreeView for the story engine in assets/loop.js. One continuous board,
 * never a carousel: the three lanes (Harness, Production, Speed) are bands
 * of raised cards side by side, the Throughput counter stands at the end of
 * all three, and the client's team sits beside it. Nothing turns to the
 * front and nothing is paged through: the lanes run at the same time,
 * packets travel the curved links with a lit trail, running cards glow, and
 * the camera drifts slowly, follows a little pointer parallax and moves in
 * on a selection.
 *
 * Colours are read from the CSS variables in site.css (and re-read when the
 * theme changes); nothing here defines a colour of its own.
 */
import * as THREE from './vendor/three.module.js';

const loop = window.SiteLoop;
const ease = loop ? loop.ease : (p) => p;
const SPIN = ['◐', '◓', '◑', '◒'];
const GLYPH = { aguardando: '◌', rodando: '◐', 'concluído': '✓' };

const CARD_W = 2.7;          // world units, one column
const COL_W = 3.3;           // column pitch
const ROW_H = 2.25;          // row pitch
const PX = 640;              // canvas pixels across one column of card
const UNIT = PX / CARD_W;
const ROW_PX = 58;           // canvas pixels per meter row
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* write text at the given size, or smaller until it fits maxW */
function fit(g, text, weight, size, family, x, y, maxW, align) {
  let px = size;
  g.font = weight + ' ' + px + 'px ' + family;
  while (px > 16 && g.measureText(text).width > maxW) {
    px -= 2;
    g.font = weight + ' ' + px + 'px ' + family;
  }
  g.textAlign = align || 'left';
  g.fillText(text, x, y);
  g.textAlign = 'left';
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

class ThreeView {
  init(story) {
    this.s = story;
    this.host = story.stageEl;
    this.host.classList.add('is-3d');
    this.cards = {};
    this.lanes = {};
    this.edges = {};
    this.packets = [];
    this.dirty = new Set();
    this.sel = null;
    this.focusNode = null;
    this.pointer = new THREE.Vector2(0, 0);
    this.parallax = new THREE.Vector2(0, 0);
    this.pointerIn = false;
    this.spinFrame = -1;

    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'hero-canvas';
    renderer.domElement.style.touchAction = 'pan-y';
    this.host.appendChild(renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 160);
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3(0, 2, 20);
    this.camera.position.copy(this.camPos);

    this.ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.key = new THREE.DirectionalLight(0xffffff, 1.6);
    this.key.position.set(-6, 9, 10);
    this.packetLight = new THREE.PointLight(0xffffff, 0, 5, 1.6);
    this.scene.add(this.ambient, this.key, this.packetLight);

    this.board = new THREE.Group();
    this.scene.add(this.board);
    this.glowTex = glowTexture(false);
    this.cardGlowTex = glowTexture(true);

    this.readColors();
    const d = story.d;
    this.cols = d.cols || 5;
    this.rows = 1;
    for (const n of d.nodes) {
      const at = n.at || [1, 1];
      this.rows = Math.max(this.rows, at[1] + (at[3] || 1) - 1);
    }
    for (const n of d.nodes) this.buildCard(n);
    for (const l of (d.lanes || [])) this.buildLane(l);
    for (const e of d.edges) if (this.cards[e.from] && this.cards[e.to]) this.buildEdge(e);
    this.rebuildEdges();

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
      ]).then(() => { this.markAll(); this.drawLanes(); }, () => {});
    }
  }

  /* ---------- colours ---------- */
  readColors() {
    this.c = {
      panel: css('--term-panel'), bg: css('--term-bg'), text: css('--term-text'),
      muted: css('--term-muted'), line: css('--term-line'), accent: css('--scene-accent'),
      role: {
        harness: css('--role-harness'), production: css('--role-production'), speed: css('--role-speed'),
        core: css('--role-core'), client: css('--role-client')
      }
    };
  }

  applyColors() {
    for (const id in this.cards) {
      this.cards[id].slab.material.color.set(this.c.panel);
      this.cards[id].glow.material.color.set(this.c.role[this.cards[id].d.role] || this.c.accent);
    }
    for (const id in this.lanes) this.lanes[id].band.material.color.set(this.c.role[this.lanes[id].d.role] || this.c.line);
    for (const id in this.edges) this.edges[id].base.material.color.set(this.c.line);
    this.packetLight.color.set(this.c.accent);
    this.markAll();
    this.drawLanes();
  }

  /* ---------- the board: where each card stands ---------- */
  place(n) {
    const at = n.at || [1, 1], cs = at[2] || 1, rs = at[3] || 1;
    const x = (at[0] - 1 + (cs - 1) / 2 - (this.cols - 1) / 2) * COL_W;
    const y = -((at[1] - 1 + (rs - 1) / 2) - (this.rows - 1) / 2) * ROW_H;
    const w = CARD_W * cs + (COL_W - CARD_W) * (cs - 1);
    return { x, y, z: n.big ? 0.55 : 0, w };
  }

  /* ---------- cards ---------- */
  buildCard(n) {
    const p = this.place(n);
    // big type and few rows: the whole board is on screen at once, so each card is small
    let rows = 1;
    for (const m of (n.meters || [])) rows += m.big ? 2.4 : 1;
    const wpx = Math.round(PX * p.w / CARD_W);
    const hpx = Math.round(30 + 66 + rows * ROW_PX + 22);
    const h = hpx / UNIT;
    const canvas = document.createElement('canvas');
    canvas.width = wpx;
    canvas.height = hpx;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const group = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedShape(p.w, h, 0.12), {
      depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6
    });
    geo.center();
    const slab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: this.c.panel, roughness: 0.62, metalness: 0.12, transparent: true, opacity: 1
    }));
    slab.userData = { kind: 'node', id: n.id };
    const face = new THREE.Mesh(new THREE.PlaneGeometry(p.w, h), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, toneMapped: false
    }));
    face.position.z = 0.068;
    face.userData = { kind: 'node', id: n.id };
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(p.w + 1.4, h + 1.4), new THREE.MeshBasicMaterial({
      map: this.cardGlowTex, color: this.c.role[n.role] || this.c.accent, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    glow.position.z = -0.12;
    group.add(glow, slab, face);
    const scale = n.big ? 1.12 : 1;
    group.scale.setScalar(scale);
    group.position.set(p.x, p.y, p.z);
    this.board.add(group);

    this.cards[n.id] = {
      d: n, group, slab, face, glow, canvas, ctx: canvas.getContext('2d'), tex,
      w: p.w * scale, h: h * scale, home: new THREE.Vector3(p.x, p.y, p.z),
      status: n.status || 'aguardando', bars: {}, lift: 0, glowNow: 0, dim: 1, pulseUntil: 0
    };
    this.dirty.add(n.id);
  }

  markAll() { for (const id in this.cards) this.dirty.add(id); }
  drawLanes() { for (const id in this.lanes) this.drawLane(id); }

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

    const x = 34;
    let y = 30 + 56;
    g.textBaseline = 'alphabetic';
    g.fillStyle = role;
    const inner = W - 2 * x;
    fit(g, tt('title'), '700', 58, SANS, x, y, inner);
    for (const m of (n.meters || [])) {
      y += ROW_PX;
      if (m.kind === 'bar') {
        const v = k.bars[m.id] || 0;
        g.fillStyle = c.text;
        fit(g, tt('m.' + m.id), '400', 38, MONO, x, y, W * 0.5 - x - 12);
        const bx = W * 0.5, bw = W - x - bx, bh = 24;
        g.strokeStyle = c.line;
        g.lineWidth = 2;
        g.strokeRect(bx, y - 24, bw, bh);
        g.fillStyle = role;
        g.fillRect(bx + 3, y - 21, (bw - 6) * Math.max(0, Math.min(1, v / 100)), bh - 6);
      } else if (m.kind === 'stat' && m.big) {
        // the counter itself: its label, then the number, large
        g.fillStyle = c.text;
        fit(g, tt('m.' + m.stat), '400', 38, MONO, x, y, inner);
        y += ROW_PX * 1.4;
        g.fillStyle = role;
        fit(g, s.fill('{' + m.stat + '}'), '700', 96, MONO, x, y + 6, inner);
      } else if (m.kind === 'stat') {
        const val = s.fill('{' + m.stat + '}');
        g.font = '700 38px ' + MONO;
        const vw = g.measureText(val).width;
        g.fillStyle = role;
        fit(g, val, '700', 38, MONO, W - x, y, inner, 'right');
        g.fillStyle = c.text;
        fit(g, tt('m.' + m.stat), '400', 38, MONO, x, y, inner - vw - 16);
      } else {
        g.fillStyle = c.text;
        fit(g, s.fill(tt('m.' + m.key)), '400', 38, MONO, x, y, inner);
      }
    }
    y += ROW_PX;
    const st = k.status;
    const glyph = st === 'rodando' ? SPIN[Math.max(0, this.spinFrame) % 4] : (GLYPH[st] || '•');
    g.fillStyle = st === 'aguardando' ? c.muted : role;
    fit(g, glyph + ' ' + (loop ? loop.statusLabel(st) : st), '400', 38, MONO, x, y, inner);
    k.tex.needsUpdate = true;
  }

  /* ---------- lanes: a lit band behind each lane's cards, with its name ---------- */
  buildLane(l) {
    const members = l.nodes.map((id) => this.cards[id]).filter(Boolean);
    if (!members.length) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const k of members) {
      x0 = Math.min(x0, k.home.x - k.w / 2); x1 = Math.max(x1, k.home.x + k.w / 2);
      y0 = Math.min(y0, k.home.y - k.h / 2); y1 = Math.max(y1, k.home.y + k.h / 2);
    }
    const padX = 0.28, padTop = 0.7, padBot = 0.24;
    const w = x1 - x0 + 2 * padX, h = y1 - y0 + padTop + padBot;
    const band = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(w, h, 0.22)), new THREE.MeshBasicMaterial({
      color: this.c.role[l.role] || this.c.line, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false
    }));
    band.position.set((x0 + x1) / 2, (y0 + y1) / 2 + (padTop - padBot) / 2, -0.32);
    band.userData = { kind: 'lane', id: l.id };
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 96;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const lw = 5.6, lh = lw * canvas.height / canvas.width;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, toneMapped: false
    }));
    label.position.set(x0 - padX + 0.18 + lw / 2, y1 + padTop - 0.1 - lh / 2, -0.2);
    label.userData = { kind: 'lane', id: l.id };
    this.board.add(band, label);
    this.lanes[l.id] = { d: l, band, label, canvas, tex, dim: 1, heat: 0 };
    this.drawLane(l.id);
  }

  drawLane(id) {
    const ln = this.lanes[id];
    if (!ln) return;
    const g = ln.canvas.getContext('2d'), W = ln.canvas.width, H = ln.canvas.height;
    g.clearRect(0, 0, W, H);
    g.textBaseline = 'middle';
    g.font = '700 60px ' + MONO;
    g.fillStyle = this.c.role[ln.d.role] || this.c.accent;
    g.fillText(String(this.s.tt('lane.' + id + '.title')).toUpperCase(), 6, H / 2 + 2);
    ln.tex.needsUpdate = true;
  }

  /* ---------- links: curved tubes that bow out of the board ---------- */
  buildEdge(e) {
    const mat = new THREE.MeshBasicMaterial({ color: this.c.line, transparent: true, opacity: 0.55, toneMapped: false });
    const hot = new THREE.MeshBasicMaterial({ color: this.c.accent, transparent: true, opacity: 0, toneMapped: false });
    const base = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    const glow = new THREE.Mesh(new THREE.BufferGeometry(), hot);
    const hit = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'edge', id: e.id };
    this.board.add(base, glow, hit);
    this.edges[e.id] = { d: e, base, glow, hit, curve: null, hot: 0, heat: 0, dim: 1 };
  }

  curveFor(e) {
    const a = this.cards[e.from], b = this.cards[e.to];
    const dir = Math.sign(b.home.x - a.home.x) || 1;
    // leave from the side of one card, arrive at the side of the next, at the height they share
    const ya = a.home.y, yb = Math.max(b.home.y - b.h * 0.36, Math.min(b.home.y + b.h * 0.36, ya));
    const p0 = new THREE.Vector3(a.home.x + dir * a.w / 2, ya, a.home.z + 0.05);
    const p1 = new THREE.Vector3(b.home.x - dir * b.w / 2, yb, b.home.z + 0.05);
    const ctrl = p0.clone().add(p1).multiplyScalar(0.5);
    ctrl.z += e.over ? 1.4 : 0.9;
    ctrl.y += e.over ? 2.3 : 0.25;
    return new THREE.QuadraticBezierCurve3(p0, ctrl, p1);
  }

  rebuildEdges() {
    for (const id in this.edges) {
      const e = this.edges[id];
      e.curve = this.curveFor(e.d);
      for (const [mesh, r] of [[e.base, 0.012], [e.glow, 0.026], [e.hit, 0.2]]) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.TubeGeometry(e.curve, 48, r, 6, false);
      }
    }
  }

  /* ---------- size and framing ---------- */
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // the whole board on screen: every lane, the counter and the client's team at once
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const spanW = this.cols * COL_W + 0.6, spanH = this.rows * ROW_H + 1.0;
    this.fitDist = Math.max(spanH / 2 / (t * 0.94), spanW / 2 / (t * this.camera.aspect * 0.96));
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
    for (const id in this.lanes) targets.push(this.lanes[id].label, this.lanes[id].band);
    const hits = this.raycaster.intersectObjects(targets, false);
    return hits.length ? hits[0].object.userData : null;
  }

  hover(h) {
    this.hoverId = h && h.kind === 'node' ? h.id : null;
    this.hoverEdge = h && h.kind === 'edge' ? h.id : null;
    this.hoverLane = h && h.kind === 'lane' ? h.id : null;
  }

  select(sel, focusNode) {
    this.sel = sel;
    this.focusNode = focusNode && this.cards[focusNode] ? focusNode : null;
    this.focusLane = sel && sel.kind === 'lane' && this.lanes[sel.id] ? sel.id : null;
  }

  anchorRect(kind, id) {
    const root = this.s.root.getBoundingClientRect();
    const cv = this.renderer.domElement.getBoundingClientRect();
    const project = (v) => {
      const p = v.clone().project(this.camera);
      return { x: cv.left - root.left + (p.x + 1) / 2 * cv.width, y: cv.top - root.top + (1 - p.y) / 2 * cv.height };
    };
    let pts = [];
    const corners = (obj, hw, hh) => {
      obj.updateWorldMatrix(true, false);
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pts.push(project(new THREE.Vector3(sx * hw, sy * hh, 0).applyMatrix4(obj.matrixWorld)));
      }
    };
    if (kind === 'node' && this.cards[id]) {
      const k = this.cards[id];
      corners(k.group, k.w / 2 / k.group.scale.x, k.h / 2 / k.group.scale.y);
    } else if (kind === 'lane' && this.lanes[id]) {
      const b = this.lanes[id].band;
      b.geometry.computeBoundingBox();
      const bb = b.geometry.boundingBox;
      corners(b, (bb.max.x - bb.min.x) / 2, (bb.max.y - bb.min.y) / 2);
    } else if (kind === 'edge' && this.edges[id] && this.edges[id].curve) {
      const live = this.packets.find((p) => p.edge === this.edges[id]);
      const at = new THREE.Vector3();
      if (live) live.core.getWorldPosition(at);
      else at.copy(this.edges[id].curve.getPointAt(0.5)).applyMatrix4(this.board.matrixWorld);
      const p = project(at);
      pts = [{ x: p.x - 10, y: p.y - 10 }, { x: p.x + 10, y: p.y + 10 }];
    }
    if (!pts.length) return null;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  get tracksEdges() { return true; }

  /* ---------- story hooks ---------- */
  setStatus(id, s) {
    const k = this.cards[id];
    if (!k) return;
    k.status = s;
    this.dirty.add(id);
  }

  setBar(id, m, v) {
    const k = this.cards[id];
    if (!k) return;
    k.bars[m] = v;
    this.dirty.add(id);
  }

  statsChanged() { this.markAll(); }

  relocale() { this.markAll(); this.drawLanes(); }

  pulse(id) {
    const k = this.cards[id];
    if (k) k.pulseUntil = this.s.elapsed + 0.9;
  }

  reset() {
    for (const p of this.packets) this.disposePacket(p);
    this.packets = [];
    for (const id in this.edges) this.edges[id].hot = 0;
  }

  launch(edgeId, o) {
    const e = this.edges[edgeId];
    if (!e || !e.curve) return;
    const color = new THREE.Color(this.c.role[o.role] || this.c.accent);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color, transparent: true, opacity: 0.9,
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
    this.board.add(core, halo, hit, ...trail);
    e.hot++;
    e.glow.material.color.copy(color);
    this.packets.push({ edge: e, core, halo, trail, hit, start: this.s.t, dur: o.dur, back: o.back });
  }

  disposePacket(p) {
    for (const m of [p.core, p.halo, p.hit, ...p.trail]) {
      this.board.remove(m);
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

    // packets
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
      this.packetLight.intensity += (3 - this.packetLight.intensity) * k2;
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

    // camera: the whole board, drifting; in on a selected card or lane
    this.parallax.lerp(this.pointerIn ? this.pointer : new THREE.Vector2(0, 0), k1);
    const fov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    let target = new THREE.Vector3(0, -0.1, 0), dist = this.fitDist || 20;
    if (this.focusNode) {
      const k = this.cards[this.focusNode];
      target = k.home.clone();
      dist = Math.max((k.w * 2.4) / 2 / (Math.tan(fov) * this.camera.aspect), (k.h * 2.6) / 2 / Math.tan(fov));
      dist = Math.min(dist, this.fitDist || dist);
    } else if (this.focusLane) {
      const b = this.lanes[this.focusLane].band;
      b.geometry.computeBoundingBox();
      const bb = b.geometry.boundingBox;
      target = b.position.clone();
      dist = Math.max(((bb.max.x - bb.min.x) * 1.3) / 2 / (Math.tan(fov) * this.camera.aspect), ((bb.max.y - bb.min.y) * 2) / 2 / Math.tan(fov));
      dist = Math.min(dist, this.fitDist || dist);
    }
    const az = Math.sin(elapsed * 0.09) * 0.1 + this.parallax.x * 0.1;
    const elev = 0.12 + Math.sin(elapsed * 0.065) * 0.03 - this.parallax.y * 0.05;
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

    // cards: running ones lifted and lit, the counter glowing as work arrives
    const sel = this.s.selection;
    const laneSel = this.focusLane ? this.lanes[this.focusLane].d.nodes : null;
    const spin = Math.floor(elapsed * 6) % 4;
    const spinChanged = spin !== this.spinFrame;
    this.spinFrame = spin;
    for (const id in this.cards) {
      const k = this.cards[id];
      const chosen = this.focusNode === id || (laneSel && laneSel.indexOf(id) >= 0);
      const edgeEnd = sel && sel.kind === 'edge' && this.s.edgeById[sel.id] &&
        (this.s.edgeById[sel.id].from === id || this.s.edgeById[sel.id].to === id);
      const dimTo = sel ? (chosen || edgeEnd ? 1 : 0.3) : 1;
      k.dim += (dimTo - k.dim) * k2;
      const running = k.status === 'rodando';
      k.lift += ((running ? 0.16 : 0) - k.lift) * k2;
      k.group.position.set(k.home.x, k.home.y + k.lift, k.home.z + k.lift * 0.8);
      k.group.lookAt(this.camera.position.x * 0.35 + k.home.x * 0.65, this.camera.position.y * 0.35 + k.home.y * 0.65, this.camera.position.z);
      k.face.material.opacity = k.dim;
      k.slab.material.opacity = 0.4 + 0.6 * k.dim;
      const pulsing = elapsed < k.pulseUntil;
      const glowTo = this.focusNode === id ? 0.85 : pulsing ? 0.9 :
        running ? (k.d.big ? 0.3 : 0.45) + 0.12 * Math.sin(elapsed * 4 + k.home.x) :
        this.hoverId === id ? 0.45 : 0;
      k.glowNow += (glowTo - k.glowNow) * k2;
      k.glow.material.opacity = k.glowNow * k.dim;
      if (spinChanged && running) this.dirty.add(id);
    }
    for (const id in this.lanes) {
      const ln = this.lanes[id];
      const on = this.focusLane === id || this.hoverLane === id;
      const dimTo = sel ? (this.focusLane === id ? 1 : 0.35) : 1;
      ln.dim += (dimTo - ln.dim) * k2;
      ln.heat += ((on ? 1 : 0) - ln.heat) * k2;
      ln.band.material.opacity = (0.1 + 0.12 * ln.heat) * ln.dim;
      ln.label.material.opacity = ln.dim;
    }
    for (const id in this.edges) {
      const e = this.edges[id];
      const chosen = sel && sel.kind === 'edge' && sel.id === id;
      const near = sel && ((this.focusNode && (e.d.from === this.focusNode || e.d.to === this.focusNode)) ||
        (laneSel && laneSel.indexOf(e.d.from) >= 0));
      const dimTo = !sel || chosen || near ? 1 : 0.2;
      e.dim += (dimTo - e.dim) * k2;
      const heatTo = e.hot > 0 || chosen || this.hoverEdge === id ? 1 : 0;
      e.heat += (heatTo - e.heat) * k2;
      e.base.material.opacity = 0.55 * e.dim;
      e.glow.material.opacity = 0.9 * e.heat * e.dim;
    }

    let budget = 4;
    for (const id of this.dirty) {
      if (budget-- <= 0) break;
      this.dirty.delete(id);
      this.draw(id);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

if (loop) loop.registerView(ThreeView);
