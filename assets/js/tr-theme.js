(() => {
  const root = document.documentElement;
  const key = 'tr-appearance';
  let saved = 'light';
  try { saved = localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; } catch (_) {}
  const apply = mode => {
    root.dataset.trTheme = mode;
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.setAttribute('aria-label',mode === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
      btn.setAttribute('title',mode === 'dark' ? 'Tema claro' : 'Tema oscuro');
      btn.innerHTML = mode === 'dark' ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    }
  };
  apply(saved);
  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const next = root.dataset.trTheme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(key,next); } catch (_) {}
  });
})();
