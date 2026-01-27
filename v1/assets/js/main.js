/* ==========================================================================
   Marco Santana Resume — Main JS
   Theme toggle + scroll reveal animations
   ========================================================================== */

(function () {
  'use strict';

  // --- Theme Toggle ---
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // --- Scroll Reveal ---
  var els = document.querySelectorAll('.animate-on-scroll');
  if (!els.length) return;

  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Start hidden
  els.forEach(function (el) {
    el.classList.add('reveal');
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // No observer — show everything
    els.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
})();
