/*
 * Live scene: the story engine, the same one as the company's other sites.
 *
 * A Story plays one scene declared as data (window.SiteScenes[name], in
 * assets/scenes.js): a timeline of events that changes node status, bars and
 * counters, sends packets along edges and writes the session log. The stage
 * is one continuous picture, not a sequence: lanes run side by side, and a
 * continuous scene repeats its timeline without resetting what it shows.
 * A View draws it: ThreeView (assets/hero3d.js, three.js, depth) or DomView
 * (below: HTML cards and SVG edges; the view on narrow stages, without WebGL
 * and the still picture under prefers-reduced-motion).
 *
 * Interaction is the page: hovering or focusing an object (a lane, a node,
 * a link) previews its caption, clicking / tapping / Enter pins it (the view
 * focuses that part and dims the rest, the log pins that node's lines),
 * clicking again, clicking the background or Esc returns to the overview.
 * Captions are also in the DOM for screen readers (each keyboard proxy is
 * described by its caption).
 *
 * The clock is requestAnimationFrame; it stops when the tab is hidden, the
 * scene is off screen or the visitor presses pause. Every movement eases.
 *
 * Exposes window.SiteLoop = { Story, DomView, Captions, registerView, ease }.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var SPIN = ['◐', '◓', '◑', '◒'];
  var GLYPH = { aguardando: '◌', rodando: '◐', 'concluído': '✓', ignorado: '⊘' };
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var coarse = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(ms) {
    var d = new Date(ms);
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  /* easeInOutCubic: nothing in the scenes moves linearly */
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  /* strings come from assets/i18n/<locale>.json through window.SiteI18n */
  function T(key, vars) { return window.SiteI18n ? window.SiteI18n.t(key, vars) : key; }
  function locale() { return window.SiteI18n ? window.SiteI18n.locale() : 'en'; }
  var STATUS_KEY = { aguardando: 'wait', rodando: 'run', 'concluído': 'done', ignorado: 'skip' };
  function statusLabel(s) { return STATUS_KEY[s] ? T('common.status.' + STATUS_KEY[s]) : s; }
  function format(v, kind) {
    if (kind === 'money') {
      // the reader's currency (meta.currency): BRL in pt-BR, USD in en and es
      var txt = v.toFixed(2);
      return T('meta.currency.symbol') + ' ' + (T('meta.currency.decimal') === '.' ? txt : txt.replace('.', ','));
    }
    return Math.round(v).toLocaleString(locale());
  }
  var uid = 0;
  function nextId(prefix) { uid += 1; return prefix + '-' + uid; }

  /* ---------- caption panel (shared by every scene) ---------- */
  function Captions(root, panel) {
    this.root = root;
    this.panel = panel;
    panel.classList.add('cap');
    panel.setAttribute('aria-live', 'polite');
    panel.hidden = true;
    this.kicker = el('div', 'cap-kicker');
    this.title = el('div', 'cap-title');
    this.body = el('div', 'cap-body');
    this.close = el('button', 'cap-close', '×');
    this.close.type = 'button';
    this.close.setAttribute('aria-label', T('common.closeCaption'));
    panel.appendChild(this.close);
    panel.appendChild(this.kicker);
    panel.appendChild(this.title);
    panel.appendChild(this.body);
    this.pinned = false;
    this.onClose = null;
    var self = this;
    this.close.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self.onClose) self.onClose();
    });
  }
  Captions.prototype.show = function (cap, rect, pinned) {
    if (!cap) { this.hide(); return; }
    this.kicker.textContent = cap.kicker || '';
    this.kicker.hidden = !cap.kicker;
    this.title.textContent = cap.title || '';
    this.body.textContent = '';
    (cap.lines || []).forEach(function (line) { this.body.appendChild(el('p', '', line)); }, this);
    if (cap.link) {
      // a node may offer one public link; it can be followed once the caption is pinned
      var a = el('a', 'cap-link', cap.link.text);
      a.href = cap.link.href;
      a.rel = 'noopener noreferrer';
      var lp = el('p');
      lp.appendChild(a);
      this.body.appendChild(lp);
    }
    this.pinned = !!pinned;
    this.panel.classList.toggle('is-pinned', this.pinned);
    this.panel.hidden = false;
    this.place(rect);
  };
  /* Where the caption goes: a bottom sheet on phones, otherwise beside the
     object (below or above it when there is no room beside it). */
  Captions.prototype.place = function (rect) {
    var p = this.panel, box = this.root.getBoundingClientRect();
    var sheet = window.innerWidth < 768;
    p.classList.toggle('is-sheet', sheet);
    if (sheet || !rect) { p.style.left = ''; p.style.top = ''; return; }
    var pw = p.offsetWidth || 300, ph = p.offsetHeight || 120, gap = 14;
    // the caption stays inside its area (the stage), never over the page copy around it
    var top = 8, bottom = box.height - 8, right = box.width - 8;
    if (this.area) {
      var a = this.area.getBoundingClientRect();
      top = Math.max(top, a.top - box.top + 8);
      bottom = Math.min(bottom, a.bottom - box.top - 8);
      right = Math.min(right, a.right - box.left - 8);
    }
    var x = rect.right + gap, y, beside = true;
    if (x + pw > box.width - 8) x = rect.left - gap - pw;
    if (x < 8) { beside = false; x = Math.max(8, Math.min(box.width - pw - 8, rect.left + rect.width / 2 - pw / 2)); }
    if (beside) {
      y = rect.top + rect.height / 2 - ph / 2;
      y = Math.max(top, Math.min(bottom - ph, y));
    } else {
      // no room beside it (a wide lane): below the object, or above it, else in the stage's top corner
      y = rect.bottom + gap;
      if (y + ph > bottom) {
        if (rect.top - gap - ph >= top) y = rect.top - gap - ph;
        else { y = top; x = right - pw; }
      }
    }
    p.style.left = Math.round(x) + 'px';
    p.style.top = Math.round(y) + 'px';
  };
  Captions.prototype.hide = function () {
    this.panel.hidden = true;
    this.pinned = false;
  };

  /* Wire plain HTML objects to a caption panel.
     objects: [data-cap="id"] inside root; caps: {id: {title, lines}}. */
  Captions.wire = function (root, panel, getCaps, hooks) {
    var caps = typeof getCaps === 'function' ? getCaps() : getCaps;
    var cap = new Captions(root, panel);
    var descs = [];
    var current = null;
    hooks = hooks || {};
    var nodes = root.querySelectorAll('[data-cap]');
    var descHost = el('div', 'sr-only');
    root.appendChild(descHost);
    function rectOf(node) {
      var r = node.getBoundingClientRect(), b = root.getBoundingClientRect();
      return { left: r.left - b.left, top: r.top - b.top, right: r.right - b.left,
               bottom: r.bottom - b.top, width: r.width, height: r.height };
    }
    function clear() {
      if (current) { current.classList.remove('is-sel'); current.setAttribute('aria-expanded', 'false'); }
      current = null;
      root.classList.remove('has-sel');
      cap.hide();
      if (hooks.select) hooks.select(null);
    }
    function pin(node) {
      if (current === node) { clear(); return; }
      if (current) { current.classList.remove('is-sel'); current.setAttribute('aria-expanded', 'false'); }
      current = node;
      node.classList.add('is-sel');
      node.setAttribute('aria-expanded', 'true');
      root.classList.add('has-sel');
      cap.show(caps[node.getAttribute('data-cap')], rectOf(node), true, node);
      if (hooks.select) hooks.select(node.getAttribute('data-cap'));
    }
    cap.onClose = clear;
    Array.prototype.forEach.call(nodes, function (node) {
      var id = node.getAttribute('data-cap');
      if (!caps[id]) return;
      var d = el('div', '');
      d.id = nextId('cap');
      descHost.appendChild(d);
      descs.push({ node: node, desc: d, id: id });
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-expanded', 'false');
      node.setAttribute('aria-describedby', d.id);
      node.addEventListener('click', function (e) { e.stopPropagation(); pin(node); });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pin(node); }
      });
      if (!coarse) {
        node.addEventListener('mouseenter', function () { if (!current) cap.show(caps[id], rectOf(node), false, node); });
        node.addEventListener('mouseleave', function () { if (!current) cap.hide(); });
      }
      node.addEventListener('focus', function () { if (!current) cap.show(caps[id], rectOf(node), false, node); });
      node.addEventListener('blur', function () { if (!current) cap.hide(); });
    });
    root.addEventListener('click', function () { if (current) clear(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) { var n = current; clear(); n.focus(); } });
    function refresh() {
      if (typeof getCaps === 'function') caps = getCaps();
      descs.forEach(function (x) {
        var c = caps[x.id] || {};
        x.desc.textContent = (c.title || '') + '. ' + (c.lines || []).join(' ');
        x.node.setAttribute('aria-label', c.title || x.id);
      });
      cap.close.setAttribute('aria-label', T('common.closeCaption'));
      if (current) cap.show(caps[current.getAttribute('data-cap')], rectOf(current), true, current);
    }
    refresh();
    return { clear: clear, captions: cap, refresh: refresh };
  };

  /* ---------- the story ---------- */
  function Story(root, data) {
    this.root = root;
    this.d = data;
    this.duration = data.duration || 30;
    this.events = (data.events || []).slice().sort(function (a, b) { return a.t - b.t; });
    this.nodeById = {};
    this.edgeById = {};
    this.laneById = {};
    (data.nodes || []).forEach(function (n) { this.nodeById[n.id] = n; }, this);
    (data.edges || []).forEach(function (e) { this.edgeById[e.id] = e; }, this);
    (data.lanes || []).forEach(function (l) { this.laneById[l.id] = l; }, this);
    this.stats = {};
    for (var k in (data.stats || {})) {
      var s = data.stats[k];
      this.stats[k] = { value: s.value || 0, initial: s.value || 0, fmt: s.fmt, reset: !!s.reset };
    }
    this.state = {};
    this.tweens = [];
    this.bindings = [];
    this.logAll = [];
    this.logByNode = {};
    this.t = 0;
    this.next = 0;
    this.elapsed = 0;
    this.clock0 = Date.now();
    this.paused = false;
    this.visible = !document.hidden;
    this.inView = true;
    this.running = false;
    this.last = 0;
    this.selection = null;
    this.hovered = null;
    this.started = false;
    var self = this;
    this.frame = function (ts) { self.tick(ts); };
    this.build();
  }

  /* text of this scene: "<scene>.<path>" in the locale files */
  Story.prototype.tt = function (path) { return T((this.d.i18n || 'hero') + '.' + path); };
  /* {stat} placeholders; snap = the values when a log line was written */
  Story.prototype.fill = function (str, snap) {
    var stats = this.stats;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      if (!stats[k]) return m;
      return format(snap && snap[k] != null ? snap[k] : stats[k].value, stats[k].fmt);
    });
  };
  /* node text that follows counters and the locale; fn returns the template */
  Story.prototype.bind = function (node, fn) {
    node.textContent = this.fill(fn());
    this.bindings.push({ node: node, fn: fn });
  };
  Story.prototype.statsChanged = function () {
    for (var i = 0; i < this.bindings.length; i++) {
      var b = this.bindings[i], v = this.fill(b.fn());
      if (b.node.textContent !== v) b.node.textContent = v;
    }
    if (this.view && this.view.statsChanged) this.view.statsChanged();
  };

  /* Root markup: [data-stage], [data-log], [data-ctl], [data-caption],
     [data-proxies]; whichever is missing is created. */
  Story.prototype.part = function (name, tag, cls) {
    var e = this.root.querySelector('[data-' + name + ']');
    if (!e) { e = el(tag, cls); e.setAttribute('data-' + name, ''); this.root.appendChild(e); }
    return e;
  };

  Story.prototype.build = function () {
    var self = this, d = this.d;
    this.root.classList.add('story');
    this.stageEl = this.part('stage', 'div', 'story-stage');
    this.logEl = this.part('log', 'div', 'story-log');
    this.ctl = this.part('ctl', 'button', 'scene-ctl');
    this.capEl = this.part('caption', 'div', 'cap');
    this.proxiesEl = this.part('proxies', 'ul', 'proxies');

    // session log
    this.logEl.setAttribute('aria-hidden', 'true');
    this.logHead = el('div', 'log-head', T('common.log.head'));
    this.logList = el('ul', 'log-list');
    this.logEl.appendChild(this.logHead);
    this.logEl.appendChild(this.logList);

    // pause control
    this.ctl.type = 'button';
    this.ctl.textContent = T('common.pause');
    this.ctl.setAttribute('aria-pressed', 'false');
    this.ctl.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(); });
    if (reduced) this.ctl.hidden = true;

    // captions and keyboard proxies: one button per lane and per node, described by its caption
    this.captions = new Captions(this.root, this.capEl);
    this.captions.area = this.stageEl.parentNode && this.stageEl.parentNode.classList.contains('stage-frame') ? this.stageEl.parentNode : this.stageEl;
    this.captions.onClose = function () { self.clear(); };
    this.proxiesEl.classList.add('proxies');
    this.proxies = {};
    var desc = el('div', 'sr-only');
    this.root.appendChild(desc);
    this.proxyDescs = {};
    this.proxyItems().forEach(function (it) {
      var key = it.kind + ':' + it.id;
      var dd = el('div', '', [].concat(self.tt(it.kind + '.' + it.id + '.cap')).join(' '));
      dd.id = nextId('cap');
      desc.appendChild(dd);
      self.proxyDescs[key] = dd;
      var li = el('li');
      var b = el('button', 'proxy', self.tt(it.kind + '.' + it.id + '.title'));
      b.type = 'button';
      b.setAttribute('aria-describedby', dd.id);
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('focus', function () { self.hover(it.kind, it.id); });
      b.addEventListener('blur', function () { self.hover(null); });
      b.addEventListener('click', function (e) { e.stopPropagation(); self.pick(it.kind, it.id); });
      li.appendChild(b);
      self.proxiesEl.appendChild(li);
      self.proxies[key] = b;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.selection) {
        var back = self.proxies[self.selection.kind + ':' + self.selection.id] || null;
        self.clear();
        if (back) back.focus();
      }
    });
  };

  /* what the keyboard walks through: each lane, then each node */
  Story.prototype.proxyItems = function () {
    var out = [];
    (this.d.lanes || []).forEach(function (l) { out.push({ kind: 'lane', id: l.id }); });
    (this.d.nodes || []).forEach(function (n) { out.push({ kind: 'node', id: n.id }); });
    return out;
  };

  /* the text for the whole scene again, in the new locale */
  Story.prototype.relocale = function () {
    var self = this;
    this.logHead.textContent = T('common.log.head');
    this.ctl.textContent = T(this.paused ? 'common.resume' : 'common.pause');
    this.captions.close.setAttribute('aria-label', T('common.closeCaption'));
    this.proxyItems().forEach(function (it) {
      var key = it.kind + ':' + it.id;
      self.proxies[key].textContent = self.tt(it.kind + '.' + it.id + '.title');
      self.proxyDescs[key].textContent = [].concat(self.tt(it.kind + '.' + it.id + '.cap')).join(' ');
    });
    if (this.view && this.view.relocale) this.view.relocale();
    this.statsChanged();
    this.renderLog();
    var cur = this.selection || this.hovered;
    if (cur && !this.captions.panel.hidden) {
      this.captions.show(this.capFor(cur.kind, cur.id), this.anchor(cur.kind, cur.id), !!this.selection);
    }
  };

  /* ---------- selection and captions ---------- */
  Story.prototype.capFor = function (kind, id) {
    var self = this, lines = function (v) { return [].concat(v).map(function (l) { return self.fill(l); }); };
    if (kind === 'node' && this.nodeById[id]) {
      var n = this.nodeById[id];
      return { kicker: '', title: this.tt('node.' + id + '.title'), lines: lines(this.tt('node.' + id + '.cap')),
               link: n.link ? { href: n.link, text: this.tt('node.' + id + '.linkText') } : null };
    }
    if (kind === 'edge' && this.edgeById[id]) {
      return { kicker: T('common.kicker.edge'), title: this.tt('edge.' + id + '.title'), lines: lines(this.tt('edge.' + id + '.cap')) };
    }
    if (kind === 'lane' && this.laneById[id]) {
      return { kicker: T('common.kicker.lane'), title: this.tt('lane.' + id + '.title'), lines: lines(this.tt('lane.' + id + '.cap')) };
    }
    return null;
  };

  Story.prototype.anchor = function (kind, id) {
    return this.view && this.view.anchorRect ? this.view.anchorRect(kind, id) : null;
  };

  Story.prototype.hover = function (kind, id) {
    if (this.selection) return;
    this.hovered = kind ? { kind: kind, id: id } : null;
    if (this.view && this.view.hover) this.view.hover(this.hovered);
    if (!kind) { this.captions.hide(); return; }
    this.captions.show(this.capFor(kind, id), this.anchor(kind, id), false);
  };

  Story.prototype.pick = function (kind, id) {
    if (this.selection && this.selection.kind === kind && this.selection.id === id) { this.clear(); return; }
    this.setExpanded(false);
    this.selection = { kind: kind, id: id };
    this.setExpanded(true);
    this.root.classList.add('has-sel');
    var focusNode = kind === 'node' ? id
      : kind === 'edge' ? (this.edgeById[id] || {}).to : null;
    if (this.view && this.view.select) this.view.select(this.selection, focusNode);
    this.renderLog();
    var self = this;
    // the view moves the camera first; place the caption once it has settled a little
    this.captions.show(this.capFor(kind, id), this.anchor(kind, id), true);
    setTimeout(function () {
      if (self.selection && self.selection.id === id) self.captions.place(self.anchor(kind, id));
    }, reduced ? 0 : 700);
  };

  Story.prototype.setExpanded = function (on) {
    var s = this.selection;
    if (!s) return;
    var b = this.proxies[s.kind + ':' + s.id];
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
  };

  Story.prototype.clear = function () {
    this.setExpanded(false);
    this.selection = null;
    this.root.classList.remove('has-sel');
    this.captions.hide();
    if (this.view && this.view.select) this.view.select(null, null);
    this.renderLog();
  };

  /* ---------- state ---------- */
  Story.prototype.setStatus = function (id, s) {
    if (!this.state[id]) return;
    this.state[id].status = s;
    if (this.view) this.view.setStatus(id, s);
  };
  Story.prototype.setBar = function (id, m, v) {
    if (!this.state[id]) return;
    this.state[id].bars[m] = v;
    if (this.view) this.view.setBar(id, m, v);
  };

  /* Start of a pass. A continuous scene sets its nodes once and then carries
     everything over (statuses, bars, counters), so the stage never jumps back:
     only the counters marked reset start again. */
  Story.prototype.resetLoop = function () {
    var self = this, first = !this.started || !this.d.continuous;
    if (first) {
      (this.d.nodes || []).forEach(function (n) {
        self.state[n.id] = self.state[n.id] || { status: null, bars: {} };
        (n.meters || []).forEach(function (m) { if (m.kind === 'bar') self.setBar(n.id, m.id, m.value || 0); });
        self.setStatus(n.id, n.status || 'aguardando');
      });
    }
    this.started = true;
    for (var k in this.stats) if (this.stats[k].reset) this.stats[k].value = this.stats[k].initial;
    this.tweens = [];
    if (this.view && this.view.reset) this.view.reset();
    this.statsChanged();
  };

  Story.prototype.log = function (entry) {
    var n = this.nodeById[entry.n] || {};
    var snap = {};
    for (var k in this.stats) snap[k] = this.stats[k].value;
    var line = { time: clock(this.clock0 + this.elapsed * 1000), n: entry.n,
                 role: n.role || 'core', key: 'log.' + entry.k, snap: snap };
    this.logAll.push(line);
    if (this.logAll.length > 40) this.logAll.shift();
    var list = this.logByNode[entry.n] = this.logByNode[entry.n] || [];
    list.push(line);
    if (list.length > 6) list.shift();
    this.renderLog(line);
  };

  Story.prototype.renderLog = function (fresh) {
    // phones keep more lines in a three-line window that scrolls to the newest
    var phone = window.innerWidth < 768;
    var max = phone ? 12 : (this.d.logLines || 4);
    var sel = this.selection && this.selection.kind === 'node' ? this.selection.id : null;
    var lines = sel ? (this.logByNode[sel] || []) : this.logAll;
    this.logHead.textContent = sel
      ? T('common.log.pinned', { name: this.tt('node.' + sel + '.short') })
      : T('common.log.head');
    this.logEl.classList.toggle('is-pinned', !!sel);
    var view = lines.slice(-max);
    this.logList.textContent = '';
    if (!view.length) this.logList.appendChild(el('li', 'log-empty', T('common.log.empty')));
    for (var i = 0; i < view.length; i++) {
      var l = view[i];
      var li = el('li', fresh && l === fresh ? 'is-new' : '');
      li.appendChild(el('span', 'log-t', l.time));
      li.appendChild(el('span', 'log-who r-' + l.role, this.tt('node.' + l.n + '.short')));
      li.appendChild(el('span', 'log-x', this.fill(this.tt(l.key), l.snap)));
      this.logList.appendChild(li);
    }
    if (phone) this.logList.scrollTop = this.logList.scrollHeight;
  };

  Story.prototype.tween = function (from, to, dur, set) {
    this.tweens.push({ from: from, to: to, start: this.t, dur: dur, set: set });
  };

  Story.prototype.apply = function (ev, instant) {
    var self = this, k;
    if (ev.status) for (k in ev.status) this.setStatus(k, ev.status[k]);
    if (ev.bar) {
      for (k in ev.bar) {
        var p = k.split('.'), id = p[0], m = p[1];
        if (!this.state[id]) continue;
        var from = this.state[id].bars[m] || 0;
        if (instant) this.setBar(id, m, ev.bar[k]);
        else this.tween(from, ev.bar[k], ev.dur || 1.2, (function (ii, mm) {
          return function (v) { self.setBar(ii, mm, v); };
        })(id, m));
      }
    }
    if (ev.add) {
      for (k in ev.add) {
        var s = this.stats[k];
        if (!s) continue;
        var to = s.value + ev.add[k];
        if (instant) { s.value = to; this.statsChanged(); }
        else this.tween(s.value, to, 0.7, (function (ss) {
          return function (v) { ss.value = v; self.statsChanged(); };
        })(s));
      }
    }
    if (ev.pulse && !instant && this.view && this.view.pulse) this.view.pulse(ev.pulse);
    if (ev.packet && !instant && this.view) {
      var e = this.edgeById[ev.packet];
      if (e) this.view.launch(ev.packet, { dur: ev.dur || 1.4, back: !!ev.back,
                                           role: ev.role || (this.nodeById[e.from] || {}).role || 'core' });
    }
    if (ev.log) this.log(ev.log);
  };

  Story.prototype.advance = function (dt) {
    this.t += dt;
    this.elapsed += dt;
    while (this.next < this.events.length && this.events[this.next].t <= this.t) {
      this.apply(this.events[this.next], false);
      this.next++;
    }
    var keep = [];
    for (var i = 0; i < this.tweens.length; i++) {
      var tw = this.tweens[i];
      var p = Math.min(1, (this.t - tw.start) / tw.dur);
      tw.set(tw.from + (tw.to - tw.from) * ease(p));
      if (p < 1) keep.push(tw);
    }
    this.tweens = keep;
    if (this.view) this.view.frame(dt, this.t, this.elapsed);
    // the 3D objects move (camera drift, packets): keep the caption on them
    var shown = this.selection || this.hovered;
    if (shown && !this.captions.panel.hidden && this.view.tracksEdges) {
      this.captions.place(this.anchor(shown.kind, shown.id));
    }
    if (this.t >= this.duration) {
      for (i = 0; i < this.tweens.length; i++) this.tweens[i].set(this.tweens[i].to);
      this.t -= this.duration;
      this.next = 0;
      this.resetLoop();
    }
  };

  Story.prototype.tick = function (ts) {
    if (!this.running) return;
    var dt = this.last ? Math.min((ts - this.last) / 1000, 0.1) : 0;
    this.last = ts;
    // paused: the story's clock stops, the view keeps easing its camera
    // the story waits while someone touches the scene or reads a caption on a touch screen
    var hold = this.paused || this.touching || (coarse && !!this.selection);
    if (hold) { if (this.view) this.view.frame(dt, this.t, this.elapsed, true); }
    else this.advance(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  Story.prototype.sync = function () {
    var go = this.visible && this.inView && this.active !== false && !reduced;
    if (go && !this.running) {
      this.running = true;
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    } else if (!go && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  };

  Story.prototype.toggle = function () {
    this.paused = !this.paused;
    this.ctl.textContent = T(this.paused ? 'common.resume' : 'common.pause');
    this.ctl.setAttribute('aria-pressed', this.paused ? 'true' : 'false');
    this.root.classList.toggle('is-paused', this.paused);
    this.sync();
  };

  Story.prototype.attach = function (view) {
    var self = this;
    this.view = view;
    view.init(this);
    this.resetLoop();
    if (reduced) {
      for (var i = 0; i < this.events.length; i++) this.apply(this.events[i], true);
      this.root.classList.add('is-static');
      if (view.frame) view.frame(0, this.t, 0);
      return;
    }
    // draw one still frame now, so a scene that starts idle is never blank
    if (view.frame) view.frame(0, this.t, this.elapsed, true);
    document.addEventListener('visibilitychange', function () {
      self.visible = !document.hidden;
      arbitrate();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        self.inView = e.isIntersecting;
        self.ratio = e.isIntersecting ? e.intersectionRatio : 0;
        arbitrate();
      }, { threshold: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1] }).observe(this.root);
    }
    stories.push(this);
    arbitrate();
  };

  /* Only one scene animates at a time: the one most in view. The others keep
     their last frame (still readable, still answering captions). */
  var stories = [];
  function arbitrate() {
    var best = null;
    stories.forEach(function (st) {
      if (st.inView && st.visible && (!best || (st.ratio || 0) > (best.ratio || 0))) best = st;
    });
    stories.forEach(function (st) {
      st.active = st === best;
      st.root.classList.toggle('is-idle', !st.active);
      st.sync();
    });
  }

  /* ---------- an HTML node card (the flat view) ---------- */
  function htmlCard(s, n) {
    var c = el('div', 'node r-' + n.role + (n.big ? ' is-big' : ''));
    c.setAttribute('aria-hidden', 'true');
    c.dataset.anchor = n.id;
    var key = function (f) { return function () { return s.tt('node.' + n.id + '.' + f); }; };
    var title = el('div', 'node-title');
    s.bind(title, key('title'));
    c.appendChild(title);
    var sub = el('div', 'node-sub');
    s.bind(sub, key('sub'));
    c.appendChild(sub);
    var meters = {};
    (n.meters || []).forEach(function (m) {
      var row = el('div', 'm-row is-' + (m.kind || 'text') + (m.big ? ' is-big' : ''));
      var label = el('span', 'm-label');
      if (m.kind !== 'text') s.bind(label, key('m.' + (m.id || m.stat)));
      if (m.kind === 'bar') {
        row.appendChild(label);
        var track = el('span', 'm-bar'), fill = el('i');
        track.appendChild(fill);
        row.appendChild(track);
        var val = el('span', 'm-val');
        row.appendChild(val);
        meters[m.id] = { fill: fill, val: val };
      } else if (m.kind === 'stat') {
        row.appendChild(label);
        var v = el('span', 'm-val');
        s.bind(v, function () { return '{' + m.stat + '}'; });
        row.appendChild(v);
      } else {
        var tx = el('span', 'm-text');
        s.bind(tx, key('m.' + m.key));
        row.appendChild(tx);
      }
      c.appendChild(row);
    });
    var status = el('div', 'node-status');
    var glyph = el('span', 'st-glyph'), label = el('span', 'st-label');
    status.appendChild(glyph);
    status.appendChild(label);
    c.appendChild(status);
    c.addEventListener('click', function (e) { e.stopPropagation(); s.pick('node', n.id); });
    if (!coarse) {
      c.addEventListener('mouseenter', function () { s.hover('node', n.id); });
      c.addEventListener('mouseleave', function () { s.hover(null); });
    }
    return { d: n, el: c, glyph: glyph, label: label, meters: meters, status: null };
  }
  function cardStatus(k, s) {
    k.status = s;
    k.el.classList.remove('st-run', 'st-done', 'st-wait', 'st-other');
    k.el.classList.add(s === 'rodando' ? 'st-run' : s === 'concluído' ? 'st-done' : s === 'aguardando' ? 'st-wait' : 'st-other');
    k.el.classList.toggle('is-active', s === 'rodando');
    k.glyph.textContent = GLYPH[s] || '•';
    k.label.textContent = statusLabel(s);
  }
  function cardSpin(k, elapsed) {
    if (k.status === 'rodando') k.glyph.textContent = SPIN[Math.floor(elapsed * 6) % SPIN.length];
  }

  /* ---------- DomView: HTML cards + SVG edges (fallback and static) ---------- */
  function DomView() {}

  DomView.prototype.init = function (story) {
    var self = this, d = story.d;
    this.s = story;
    this.cards = {};
    this.edges = {};
    this.packets = [];
    this.wide = null;
    var stage = this.stage = el('div', 'dom-stage');
    story.stageEl.classList.add('is-dom');
    story.stageEl.appendChild(stage);
    // the lanes: a band behind each one's cards, labelled, with its own caption
    this.lanes = {};
    (d.lanes || []).forEach(function (l) {
      var band = el('div', 'dom-lane r-' + l.role);
      band.setAttribute('aria-hidden', 'true');
      var label = el('span', 'lane-label');
      story.bind(label, function () { return story.tt('lane.' + l.id + '.title'); });
      band.appendChild(label);
      label.addEventListener('click', function (e) { e.stopPropagation(); story.pick('lane', l.id); });
      if (!coarse) {
        label.addEventListener('mouseenter', function () { story.hover('lane', l.id); });
        label.addEventListener('mouseleave', function () { story.hover(null); });
      }
      stage.appendChild(band);
      self.lanes[l.id] = { d: l, el: band, label: label };
    });
    this.svg = svgEl('svg', { 'class': 'term-edges', focusable: 'false', 'aria-hidden': 'true' });
    var defs = svgEl('defs', {});
    this.markerId = nextId('tm');
    var marker = svgEl('marker', { id: this.markerId, viewBox: '0 0 8 8', refX: '7', refY: '4',
                                   markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    marker.appendChild(svgEl('path', { d: 'M0 0L8 4L0 8z', 'class': 'edge-head' }));
    defs.appendChild(marker);
    this.svg.appendChild(defs);
    this.edgeLayer = svgEl('g', {});
    this.packetLayer = svgEl('g', {});
    this.svg.appendChild(this.edgeLayer);
    this.svg.appendChild(this.packetLayer);
    stage.appendChild(this.svg);

    (d.nodes || []).forEach(function (n, i) { self.card(n, i); });
    // edges marked flat: false (arcs over the 3D ring) would cross cards here
    (d.edges || []).forEach(function (e) { if (e.flat !== false) self.edge(e); });
    stage.addEventListener('click', function () { if (story.selection) story.clear(); });

    var relayout = function () { self.layout(); };
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(stage);
    else window.addEventListener('resize', relayout);
    this.layout();
  };

  DomView.prototype.card = function (n, index) {
    var k = htmlCard(this.s, n);
    this.stage.appendChild(k.el);
    k.order = n.order != null ? n.order : index;
    this.cards[n.id] = k;
  };

  DomView.prototype.edge = function (e) {
    var s = this.s;
    var path = svgEl('path', { 'class': 'edge', 'marker-end': 'url(#' + this.markerId + ')' });
    var hit = svgEl('path', { 'class': 'edge-hit' });
    hit.addEventListener('click', function (ev) { ev.stopPropagation(); s.pick('edge', e.id); });
    if (!coarse) {
      hit.addEventListener('mouseenter', function () { s.hover('edge', e.id); });
      hit.addEventListener('mouseleave', function () { s.hover(null); });
    }
    this.edgeLayer.appendChild(path);
    this.edgeLayer.appendChild(hit);
    this.edges[e.id] = { d: e, path: path, hit: hit, hot: 0 };
  };

  DomView.prototype.setMode = function (wide) {
    if (this.wide === wide) return;
    this.wide = wide;
    var d = this.s.d, cols = d.cols || 3;
    this.stage.classList.toggle('is-wide', wide);
    var narrowCols = d.narrowCols || 2;
    this.stage.style.gridTemplateColumns = 'repeat(' + (wide ? cols : narrowCols) + ', minmax(0, 1fr))';
    for (var id in this.cards) {
      var n = this.cards[id], st = n.el.style;
      var at = wide ? n.d.at : n.d.atNarrow;
      if (at) {
        st.gridColumn = at[0] + (at[2] ? ' / span ' + at[2] : '');
        st.gridRow = at[1] + (at[3] ? ' / span ' + at[3] : '');
        st.order = '';
      } else {
        st.gridColumn = n.d.half ? 'span 1' : '1 / -1';
        st.gridRow = '';
        st.order = String(n.order);
      }
    }
  };

  DomView.prototype.box = function (id, origin) {
    var c = this.cards[id];
    if (!c) return null;
    var r = c.el.getBoundingClientRect();
    var l = r.left - origin.left, t = r.top - origin.top;
    return { l: l, t: t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2 };
  };

  DomView.prototype.route = function (e, a, b, width) {
    var how = this.wide ? e.route : (e.narrowRoute || e.route);
    if (how === 'over' && this.wide) {
      // the loop back: out on the right, up the gutter, across above the first row, down into the card
      var gr = width - 7, top = b.t - 14;
      return 'M' + a.r + ' ' + a.cy + 'H' + gr + 'V' + top + 'H' + b.cx + 'V' + (b.t - 2);
    }
    if (how === 'side' || how === 'over') {
      var gx = width - 7;
      return 'M' + a.r + ' ' + a.cy + 'H' + gx + 'V' + b.cy + 'H' + (b.r + 2);
    }
    var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    if (ox > 16) {
      var cx = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2;
      return b.t >= a.b ? 'M' + cx + ' ' + a.b + 'V' + (b.t - 2) : 'M' + cx + ' ' + a.t + 'V' + (b.b + 2);
    }
    var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (oy > 16) {
      var cy = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2;
      return b.l >= a.r ? 'M' + a.r + ' ' + cy + 'H' + (b.l - 2) : 'M' + a.l + ' ' + cy + 'H' + (b.r + 2);
    }
    if (b.t >= a.b) {
      var my = (a.b + b.t) / 2;
      return 'M' + a.cx + ' ' + a.b + 'V' + my + 'H' + b.cx + 'V' + (b.t - 2);
    }
    var my2 = (b.b + a.t) / 2;
    return 'M' + a.cx + ' ' + a.t + 'V' + my2 + 'H' + b.cx + 'V' + (b.b + 2);
  };

  DomView.prototype.layout = function () {
    var width = this.stage.clientWidth;
    if (!width) return;
    this.setMode(width >= (this.s.d.wideMin || 640));
    var origin = this.stage.getBoundingClientRect();
    var w = Math.round(origin.width), h = Math.round(origin.height);
    this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    // each lane's band wraps its cards, with room above for its label
    for (var lid in this.lanes) {
      var lane = this.lanes[lid], box = null;
      lane.d.nodes.forEach(function (nid) {
        var bx = this.box(nid, origin);
        if (!bx) return;
        box = box ? { l: Math.min(box.l, bx.l), t: Math.min(box.t, bx.t), r: Math.max(box.r, bx.r), b: Math.max(box.b, bx.b) } : bx;
      }, this);
      if (!box) continue;
      var ls = lane.el.style;
      ls.left = (box.l - 6) + 'px';
      ls.top = (box.t - 24) + 'px';
      ls.width = (box.r - box.l + 12) + 'px';
      ls.height = (box.b - box.t + 30) + 'px';
    }
    for (var k in this.edges) {
      var e = this.edges[k];
      var a = this.box(e.d.from, origin), b = this.box(e.d.to, origin);
      if (!a || !b) continue;
      var dd = this.route(e.d, a, b, w);
      e.path.setAttribute('d', dd);
      e.hit.setAttribute('d', dd);
    }
  };

  DomView.prototype.setStatus = function (id, s) {
    if (this.cards[id]) cardStatus(this.cards[id], s);
  };

  DomView.prototype.relocale = function () {
    for (var id in this.cards) this.setStatus(id, this.cards[id].status);
    this.layout();
  };

  DomView.prototype.setBar = function (id, m, v) {
    var n = this.cards[id];
    if (!n || !n.meters[m]) return;
    n.meters[m].fill.style.width = Math.max(0, Math.min(100, v)) + '%';
    n.meters[m].val.textContent = Math.round(v) + '%';
  };

  DomView.prototype.reset = function () {
    this.packets.forEach(function (p) { p.g.remove(); });
    this.packets = [];
    for (var e in this.edges) { this.edges[e].hot = 0; this.edges[e].path.setAttribute('class', 'edge'); }
  };

  DomView.prototype.pulse = function (id) {
    var c = this.cards[id];
    if (!c) return;
    c.el.classList.remove('is-pulse');
    void c.el.offsetWidth;
    c.el.classList.add('is-pulse');
  };

  DomView.prototype.launch = function (edgeId, o) {
    var e = this.edges[edgeId];
    if (!e) return;
    var g = svgEl('g', { 'class': 'packet r-' + o.role });
    g.appendChild(svgEl('circle', { r: '1.6', 'class': 'trail' }));
    g.appendChild(svgEl('circle', { r: '2.2', 'class': 'trail' }));
    g.appendChild(svgEl('circle', { r: '3.6' }));
    this.packetLayer.appendChild(g);
    e.hot++;
    e.path.setAttribute('class', 'edge is-hot r-' + o.role);
    this.packets.push({ e: e, g: g, start: this.s.t, dur: o.dur, back: o.back });
  };

  DomView.prototype.frame = function (dt, t, elapsed) {
    var keep = [];
    for (var i = 0; i < this.packets.length; i++) {
      var pk = this.packets[i];
      var q = (t - pk.start) / pk.dur;
      if (q >= 1 || q < 0) {
        pk.g.remove();
        if (--pk.e.hot <= 0) { pk.e.hot = 0; pk.e.path.setAttribute('class', 'edge'); }
        continue;
      }
      var L = pk.e.path.getTotalLength();
      var s = ease(q) * L;
      if (pk.back) s = L - s;
      var dir = pk.back ? 1 : -1, c = pk.g.childNodes;
      for (var j = 0; j < 3; j++) {
        var pt = pk.e.path.getPointAtLength(Math.max(0, Math.min(L, s + dir * (2 - j) * 7)));
        c[j].setAttribute('cx', pt.x.toFixed(1));
        c[j].setAttribute('cy', pt.y.toFixed(1));
      }
      keep.push(pk);
    }
    this.packets = keep;
    for (var id in this.cards) cardSpin(this.cards[id], elapsed);
  };

  DomView.prototype.hover = function (h) {
    for (var id in this.cards) this.cards[id].el.classList.toggle('is-hover', !!h && h.kind === 'node' && h.id === id);
    for (var lid in this.lanes) this.lanes[lid].el.classList.toggle('is-hover', !!h && h.kind === 'lane' && h.id === lid);
  };

  DomView.prototype.select = function (sel, focusNode) {
    this.stage.classList.toggle('has-sel', !!sel);
    var lane = sel && sel.kind === 'lane' ? this.s.laneById[sel.id] : null;
    for (var id in this.cards) {
      this.cards[id].el.classList.toggle('is-sel', id === focusNode || (!!lane && lane.nodes.indexOf(id) >= 0));
    }
    for (var lid in this.lanes) this.lanes[lid].el.classList.toggle('is-sel', !!lane && lane.id === lid);
    for (var k in this.edges) {
      var on = !!sel && sel.kind === 'edge' && sel.id === k;
      this.edges[k].path.classList.toggle('is-sel', on);
    }
  };

  DomView.prototype.anchorRect = function (kind, id) {
    var root = this.s.root.getBoundingClientRect(), r;
    if (kind === 'node' && this.cards[id]) r = this.cards[id].el.getBoundingClientRect();
    else if (kind === 'lane' && this.lanes[id]) r = this.lanes[id].el.getBoundingClientRect();
    else if (kind === 'edge' && this.edges[id]) r = this.edges[id].path.getBoundingClientRect();
    if (!r) return null;
    return { left: r.left - root.left, top: r.top - root.top, right: r.right - root.left,
             bottom: r.bottom - root.top, width: r.width, height: r.height };
  };

  /* ---------- mounting ---------- */
  var pending = [];
  var ThreeViewCtor = null;

  function webgl() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function mount() {
    var scenes = window.SiteScenes || {};
    var roots = document.querySelectorAll('[data-story]');
    Array.prototype.forEach.call(roots, function (root) {
      if (root.classList.contains('story')) return;
      var data = scenes[root.getAttribute('data-story')];
      if (!data) return;
      var story = new Story(root, data);
      document.addEventListener('site:locale', function () { story.relocale(); });
      var kind = root.getAttribute('data-view');
      var named = window.SiteViews && window.SiteViews[kind];
      if (named) { story.attach(new named()); return; }
      // depth needs room: the whole board is on screen at once, so narrow stages stay flat
      var want3d = kind === '3d' && !reduced && root.clientWidth >= 700 && webgl();
      if (!want3d) { story.attach(new DomView()); return; }
      root.classList.add('is-3d');
      if (ThreeViewCtor) { attach3d(story); return; }
      pending.push(story);
      // the module did not arrive (blocked, old browser): fall back to HTML
      setTimeout(function () {
        var i = pending.indexOf(story);
        if (i >= 0) { pending.splice(i, 1); root.classList.remove('is-3d'); story.attach(new DomView()); }
      }, 5000);
    });
  }

  function attach3d(story) {
    try { story.attach(new ThreeViewCtor()); }
    catch (err) {
      story.root.classList.remove('is-3d');
      story.stageEl.textContent = '';
      story.attach(new DomView());
    }
  }

  window.SiteLoop = {
    Story: Story,
    DomView: DomView,
    Captions: Captions,
    ease: ease,
    T: T,
    statusLabel: statusLabel,
    htmlCard: htmlCard,
    cardStatus: cardStatus,
    cardSpin: cardSpin,
    reduced: reduced,
    coarse: coarse,
    registerView: function (Ctor) {
      ThreeViewCtor = Ctor;
      var list = pending.splice(0);
      list.forEach(attach3d);
    }
  };

  function start() {
    var ready = window.SiteI18n ? window.SiteI18n.ready : Promise.resolve();
    ready.then(mount, mount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
