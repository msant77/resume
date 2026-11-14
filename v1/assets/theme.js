/*
 * Theme toggle. The stored choice is applied before the first paint by the
 * inline script in each page's <head>; this file only wires the button.
 * Storage can be unavailable (private mode, blocked site data): every access
 * is guarded and the page keeps following the system preference.
 * The key is the one the previous version of this site used, so a visitor's
 * earlier choice still applies.
 */
(function () {
  var KEY = 'theme';
  var root = document.documentElement;
  var button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  var label = button.querySelector('[data-theme-label]') || button;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function current() {
    var chosen = root.getAttribute('data-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return media && media.matches ? 'dark' : 'light';
  }

  function render() {
    // the label names the action, so it reads right with or without sight
    var key = current() === 'dark' ? 'common.theme.toLight' : 'common.theme.toDark';
    var t = window.SiteI18n ? window.SiteI18n.t(key) : null;
    var text = t && t !== key ? t : (current() === 'dark' ? 'Use light theme' : 'Use dark theme');
    label.textContent = text;
    button.setAttribute('title', text);
  }

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { window.localStorage.setItem(KEY, next); } catch (e) { /* storage off: session only */ }
    render();
  });

  if (media) {
    var onChange = function () { render(); };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  document.addEventListener('site:locale', render);
  button.hidden = false;
  render();
})();
