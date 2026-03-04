// Apply saved theme before React mounts to prevent flash
try {
  var s = JSON.parse(localStorage.getItem('ui-storage') || '{}');
  var t = s.state && s.state.theme || 'system';
  if (t === 'system') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch(e) {}
