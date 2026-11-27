// Runs independently of the 3D module, including while the scene is loading.
(() => {
  const loading = document.getElementById('loading');
  const fallback = document.getElementById('fallback');
  const heading = fallback.querySelector('h2');
  const message = document.getElementById('error-message');
  let stallTimer;
  function showLinks(failed) {
    if (document.body.dataset.ready || document.body.dataset.failed) return;
    loading.hidden = true;
    fallback.hidden = false;
    heading.textContent = failed ? '暂时无法显示 3D 场景' : '3D 场景正在加载';
    message.textContent = failed ? '可以直接阅读作品，或重新加载场景。' : '可以先阅读作品。场景准备好后会自动显示。';
    if (failed) document.body.dataset.failed = 'true';
  }
  function watchProgress() {
    clearTimeout(stallTimer);
    if (document.body.dataset.ready || document.body.dataset.failed) {
      progressObserver.disconnect();
      return;
    }
    const percent = Number(loading.getAttribute('aria-valuenow'));
    stallTimer = setTimeout(() => showLinks(false), percent < 4 ? 12000 : 25000);
  }
  const progressObserver = new MutationObserver(watchProgress);
  progressObserver.observe(loading, { attributes: true, attributeFilter: ['aria-valuenow'] });
  progressObserver.observe(document.body, { attributes: true, attributeFilter: ['data-ready', 'data-failed'] });
  watchProgress();
  window.addEventListener('error', event => {
    if (event.target?.type === 'module' || /\/hub-[\w-]+\.js(?:[?#]|$)/.test(event.filename || '')) showLinks(true);
  }, true);
  document.getElementById('retry-scene').onclick = () => location.reload();
  document.getElementById('loading-links').onclick = event => {
    event.preventDefault();
    showLinks(false);
    fallback.focus();
  };

  const audio = document.getElementById('background-music');
  const button = document.getElementById('music-switch');
  const fallbackButton = document.getElementById('fallback-music');
  let enabled = true;
  try { enabled = sessionStorage.getItem('cecilia-music-muted') !== 'true'; } catch {}
  audio.volume = .45;
  // Set this only after reading the speaker preference, before attempting play.
  audio.autoplay = enabled;
  let indicator;
  const source = audio.src;
  let recovering = false;
  let bufferedTrack;
  function update() {
    const playing = enabled && !audio.paused && !audio.error;
    for (const control of [button, fallbackButton]) control.setAttribute('aria-pressed', String(playing));
    if (indicator) indicator(playing);
  }
  function start() {
    if (!enabled || (!audio.paused && !audio.error)) return;
    // A gesture during the fallback download still needs to reach this element
    // while WebKit's user activation is live.
    if (audio.error) audio.load();
    // A rejected autoplay request keeps the track armed for the next user gesture.
    audio.play().catch(update);
  }
  function toggle() {
    enabled = audio.paused || Boolean(audio.error);
    try { sessionStorage.setItem('cecilia-music-muted', String(!enabled)); } catch {}
    audio.autoplay = enabled;
    if (enabled) start();
    else audio.pause();
    update();
  }
  function bind(doc) {
    function unlock(event) {
      if (event.isTrusted && !event.composedPath().some(el => el === button || el === fallbackButton)) start();
    }
    // Run within the gesture, even when an embedded control consumes its click.
    for (const type of ['click', 'keydown', 'touchend']) {
      doc.addEventListener(type, unlock, { capture: true, passive: true });
    }
    // The 3D speaker handles pointerup on the canvas. Let its toggle run first.
    doc.addEventListener('pointerup', unlock, { passive: true });
  }
  // Some media servers or caches reject the byte-range request made by WebKit.
  // Retry the small soundtrack as one ordinary file; keep the same audio element.
  async function recoverTrack() {
    if (!enabled || recovering || bufferedTrack) return;
    recovering = true;
    try {
      const response = await fetch(source, { cache: 'reload' });
      if (!response.ok) return;
      const blob = await response.blob();
      if (!audio.error && audio.readyState >= audio.HAVE_FUTURE_DATA) return;
      bufferedTrack = URL.createObjectURL(blob);
      audio.src = bufferedTrack;
    } catch {
      return;
    } finally {
      recovering = false;
    }
    if (enabled) audio.play().catch(update);
  }
  audio.addEventListener('error', recoverTrack);
  audio.addEventListener('stalled', () => {
    if (!audio.paused && audio.readyState === audio.HAVE_NOTHING) recoverTrack();
  });
  button.onclick = fallbackButton.onclick = toggle;
  for (const event of ['playing', 'pause', 'error']) audio.addEventListener(event, update);
  window.CeciliaMusic = { toggle, bind, setIndicator(fn) { indicator = fn; update(); } };
  bind(document);
  function resumeIfVisible() {
    if (!document.hidden) start();
  }
  resumeIfVisible();
  document.addEventListener('visibilitychange', resumeIfVisible);
  window.addEventListener('pageshow', resumeIfVisible);
  window.addEventListener('online', resumeIfVisible);

})();
