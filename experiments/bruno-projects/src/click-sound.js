import clickURL from '../../../assets/click-options/4-single.mp3?url';
import sample from '../../../assets/click-options/4-single.pcm.json';

export function getClickSound() {
  if (window.__ceciliaClicks) return window.__ceciliaClicks;
  try {
    if (parent !== window && parent.__ceciliaClicks) {
      return (window.__ceciliaClicks = parent.__ceciliaClicks);
    }
  } catch {}

  const documents = new WeakSet();
  let context, buffer, volume, fallback;
  let latest = 0;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext({ latencyHint: 'interactive' });
    buffer = context.createBuffer(1, sample.samples.length, sample.sampleRate);
    const channel = buffer.getChannelData(0);
    sample.samples.forEach((value, i) => { channel[i] = value / 32768; });
    volume = context.createGain();
    volume.gain.value = 0.4;
    volume.connect(context.destination);
  } catch {
    context = null;
    fallback = new Audio(clickURL);
    fallback.preload = 'auto';
    fallback.volume = 0.4;
  }

  function warm() {
    if (context && context.state !== 'running') context.resume().catch(() => {});
  }

  function start() {
    const voice = context.createBufferSource();
    voice.buffer = buffer;
    voice.connect(volume);
    voice.onended = () => voice.disconnect();
    voice.start();
  }

  function play() {
    if (document.hidden) return;
    const request = ++latest;
    if (!context) {
      fallback.currentTime = 0;
      fallback.play().catch(() => {});
    } else if (context.state === 'running') {
      start();
    } else {
      // After an OS interruption, do not replay an old press or a backlog of clicks.
      const deadline = performance.now() + 150;
      context.resume().then(() => {
        if (request === latest && context.state === 'running' && !document.hidden && performance.now() <= deadline) start();
      }).catch(() => {});
    }
  }

  function enabledControl(event) {
    const el = event.target.closest?.('button,a,[role="button"],summary');
    if (el && !el.matches(':disabled') && !el.closest('[aria-disabled="true"]')) return el;
  }

  function bind(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    let soundedPress;
    doc.addEventListener('pointerdown', event => {
      if (!event.isTrusted || !event.isPrimary || event.button !== 0) return;
      soundedPress = null;
      const control = enabledControl(event);
      if (control && event.pointerType === 'mouse' && !control.closest('[draggable="true"]') &&
          !['grab', 'grabbing', 'move'].includes(doc.defaultView.getComputedStyle(event.target).cursor)) {
        soundedPress = control;
        play();
      } else {
        // A canvas tap, touch scroll or drag is resolved by the owning control on release.
        warm();
      }
    }, true);
    doc.addEventListener('keydown', event => {
      if (event.isTrusted && (event.key === 'Enter' || event.key === ' ')) warm();
    }, true);
    doc.addEventListener('pointercancel', () => { soundedPress = null; }, true);
    doc.addEventListener('click', event => {
      if (!event.isTrusted || event.button !== 0) return;
      const control = enabledControl(event);
      if (control && (event.detail === 0 || soundedPress !== control)) play();
      soundedPress = null;
    }, true);
  }
  return (window.__ceciliaClicks = { play, bind });
}
