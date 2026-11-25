// Runs independently of the 3D module, including while the scene is loading.
(() => {
  const audio = document.getElementById('background-music');
  const button = document.getElementById('music-switch');
  const fallbackButton = document.getElementById('fallback-music');
  const fallback = document.getElementById('fallback');
  let enabled = true;
  try { enabled = sessionStorage.getItem('cecilia-music-muted') !== 'true'; } catch {}
  audio.volume = .45;
  let indicator;
  function update() {
    const playing = enabled && !audio.paused && !audio.error;
    for (const control of [button, fallbackButton]) control.setAttribute('aria-pressed', String(playing));
    if (indicator) indicator(playing);
  }
  function start() {
    if (!enabled || !audio.paused) return;
    if (audio.error) audio.load();
    // A rejected autoplay request keeps the track armed for the next user gesture.
    audio.play().catch(update);
  }
  function toggle() {
    enabled = audio.paused || Boolean(audio.error);
    try { sessionStorage.setItem('cecilia-music-muted', String(!enabled)); } catch {}
    if (enabled) start();
    else audio.pause();
    update();
  }
  function bind(doc) {
    function unlock(event) {
      if (event.isTrusted && event.target !== button && event.target !== fallbackButton) start();
    }
    doc.addEventListener('click', unlock);
    doc.addEventListener('keydown', unlock);
  }
  button.onclick = fallbackButton.onclick = toggle;
  for (const event of ['playing', 'pause', 'error']) audio.addEventListener(event, update);
  window.CeciliaMusic = { toggle, bind, setIndicator(fn) { indicator = fn; update(); } };
  bind(document);
  start();
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });

  // A broken or unsupported module cannot reach the scene's own catch block.
  function showFallback() {
    if (document.body.dataset.ready || document.body.dataset.failed) return;
    document.getElementById('loading').hidden = true;
    fallback.hidden = false;
    document.getElementById('error-message').textContent = '场景未能启动，可以直接阅读作品，或重新加载。';
    document.body.dataset.failed = 'true';
  }
  window.addEventListener('error', event => {
    if (event.target && event.target.type === 'module') showFallback();
  }, true);
  document.getElementById('retry-scene').onclick = () => location.reload();
  document.getElementById('loading-links').onclick = () => {
    document.getElementById('loading').hidden = true;
    fallback.hidden = false;
    document.getElementById('error-message').textContent = '你可以直接阅读作品，场景会继续加载。';
    fallback.focus();
  };
})();
