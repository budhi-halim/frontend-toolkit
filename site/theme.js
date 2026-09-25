/* Shared interface theme. This does not change any effect's motion policy. */
(() => {
  'use strict';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let manual = null;
  // A fresh tab starts from the system preference; page navigation keeps an explicit choice.
  try { const stored = sessionStorage.getItem('ft-site-theme'); if (stored === 'light' || stored === 'dark') manual = stored; } catch {}
  const button = document.querySelector('[data-theme-toggle]');
  function apply() {
    const dark = (manual || (system.matches ? 'dark' : 'light')) === 'dark';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    button?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    button?.setAttribute('title', `Switch to ${dark ? 'light' : 'dark'} theme`);
  }
  button?.addEventListener('click', () => {
    manual = document.documentElement.style.colorScheme === 'dark' ? 'light' : 'dark';
    try { sessionStorage.setItem('ft-site-theme', manual); } catch {}
    apply();
  });
  system.addEventListener?.('change', () => { if (!manual) apply(); });
  apply();
})();
