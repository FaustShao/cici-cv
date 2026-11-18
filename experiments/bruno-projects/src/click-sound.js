import clickURL from '../../../assets/click-options/4-single.mp3?url';

// User-selected Kenney click_005. The audition default is 0.6; use 0.4 here.
// No ambient sound, oscillators, or automatic playback.
export function getClickSound() {
  if (window.__ceciliaClicks) return window.__ceciliaClicks;
  try {
    if (parent !== window && parent.__ceciliaClicks) {
      return (window.__ceciliaClicks = parent.__ceciliaClicks);
    }
  } catch {}
  const players = Array.from({ length: 4 }, () => {
    const player = new Audio(clickURL);
    player.preload = 'auto';
    player.volume = 0.4;
    return player;
  });
  let index = 0;
  const documents = new WeakSet();
  function play() {
    if (document.hidden) return;
    const player = players[index++ % players.length];
    player.pause();
    player.currentTime = 0;
    player.play().catch(() => {});
  }
  function bind(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    doc.addEventListener('click', (event) => {
      const control = event.target.closest?.('button,a,[role="button"],summary');
      if (control && !control.disabled && control.getAttribute('aria-disabled') !== 'true') play();
    }, { capture: true });
  }
  return (window.__ceciliaClicks = { play, bind });
}
