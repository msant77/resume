/*
 * Site i18n: English (default), Brazilian Portuguese and Spanish. The same
 * loader as the company's other sites.
 *
 * Every string lives in assets/i18n/<locale>.json (same keys in every
 * locale, checked by scripts/i18n-check.mjs). Markup carries keys:
 *   data-i18n="key"            text content
 *   data-i18n-html="key"       trusted markup from our own files
 *   data-i18n-attr="attr:key;attr:key"
 *   data-href="home"           internal links that follow the locale
 *   data-lang-btn="<locale>"   the header switcher
 *
 * Locale: ?lang= wins, then the page's preset (generated entry pages), then
 * the saved choice (localStorage "lang"), then navigator.languages, then
 * English. Switching re-renders in place and fires "site:locale" so
 * the scene and the theme toggle redraw their text.
 */
(function () {
  'use strict';
  var LOCALES = ['en', 'pt-BR', 'es'];
  var FALLBACK = 'en';
  var KEY = 'lang';
  var html = document.documentElement;
  var base = html.getAttribute('data-i18n-base') || '/assets/i18n/';
  var dicts = {};
  var current = null;

  function norm(x) {
    x = String(x || '').toLowerCase();
    var loc = null;
    if (x.indexOf('pt') === 0) loc = 'pt-BR';
    else if (x.indexOf('es') === 0) loc = 'es';
    else if (x.indexOf('en') === 0) loc = 'en';
    return loc && LOCALES.indexOf(loc) >= 0 ? loc : null;
  }
  function saved() { try { return norm(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function resolve() {
    var q = null;
    try { q = norm(new URLSearchParams(location.search).get('lang')); } catch (e) { /* old browser */ }
    if (q) return q;
    var preset = norm(html.getAttribute('data-locale-preset'));
    if (preset) return preset;
    var s = saved();
    if (s) return s;
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < langs.length; i++) { var l = norm(langs[i]); if (l) return l; }
    return FALLBACK;
  }

  function lookup(dict, key) {
    var v = dict;
    var parts = String(key).split('.');
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  /* t(key, vars): the value for the current locale; strings get {name} filled */
  function t(key, vars) {
    var v = lookup(dicts[current] || {}, key);
    if (v === undefined) v = lookup(dicts[FALLBACK] || {}, key);
    if (v === undefined) return key;
    if (typeof v === 'string' && vars) {
      v = v.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    }
    return v;
  }

  function load(loc) {
    if (dicts[loc]) return Promise.resolve(dicts[loc]);
    return fetch(base + loc + '.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { dicts[loc] = d; return d; });
  }

  function href(name, loc) {
    if (name === 'home') return loc === 'en' ? '/' : '/' + loc.toLowerCase().slice(0, 2) + '/';
    return null;
  }

  function apply(root) {
    root = root || document;
    var all = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < all.length; i++) all[i].textContent = t(all[i].getAttribute('data-i18n'));
    all = root.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < all.length; i++) all[i].innerHTML = t(all[i].getAttribute('data-i18n-html'));
    all = root.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < all.length; i++) {
      var pairs = all[i].getAttribute('data-i18n-attr').split(';');
      for (var j = 0; j < pairs.length; j++) {
        var p = pairs[j].split(':');
        if (p.length === 2) all[i].setAttribute(p[0].trim(), t(p[1].trim()));
      }
    }
    all = root.querySelectorAll('[data-href]');
    for (i = 0; i < all.length; i++) {
      var h = href(all[i].getAttribute('data-href'), current);
      if (h) all[i].setAttribute('href', h);
    }
    all = root.querySelectorAll('[data-lang-btn]');
    for (i = 0; i < all.length; i++) {
      all[i].setAttribute('aria-pressed', all[i].getAttribute('data-lang-btn') === current ? 'true' : 'false');
    }
    html.setAttribute('lang', current);
  }

  function set(loc, remember) {
    loc = norm(loc) || FALLBACK;
    return Promise.all([load(loc), load(FALLBACK).catch(function () { return null; })]).then(function () {
      current = loc;
      if (remember) {
        try { localStorage.setItem(KEY, loc); } catch (e) { /* storage off: session only */ }
        try {
          var u = new URL(location.href);
          var preset = norm(html.getAttribute('data-locale-preset')) || FALLBACK;
          if (loc === preset) u.searchParams.delete('lang'); else u.searchParams.set('lang', loc);
          history.replaceState(null, '', u.pathname + u.search + u.hash);
        } catch (e) { /* no URL API: the saved choice still applies */ }
      }
      apply(document);
      document.dispatchEvent(new CustomEvent('site:locale', { detail: { locale: loc } }));
      return loc;
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lang-btn]') : null;
    if (!b) return;
    e.preventDefault();
    set(b.getAttribute('data-lang-btn'), true);
  });

  current = resolve();
  var ready = set(current, false).catch(function () {
    // a locale file failed to load: fall back to English, which the markup already shows
    current = FALLBACK;
    return load(FALLBACK).then(function () { apply(document); return FALLBACK; }, function () { return FALLBACK; });
  });

  window.SiteI18n = {
    t: t,
    ready: ready,
    set: set,
    apply: apply,
    locale: function () { return current; },
    locales: LOCALES
  };
})();
