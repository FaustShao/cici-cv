// No animation or minimum wait: paint only the actual current document's first layout.
(() => {
  const root=document.documentElement;
  root.dataset.pageBoot='pending';
  window.CeciliaAssetURL=value=>{
    const url=new URL(value,location.href),release=document.querySelector('meta[name="cecilia-release"]')?.content;
    const optimized=url.origin===location.origin&&window.CeciliaImageFormats?.get(url.pathname);
    if(optimized)url.pathname=optimized;
    if(release&&url.origin===location.origin)url.searchParams.set('build',release);
    return url.href;
  };
  try { if(parent!==window && parent.CeciliaProjectReader)root.dataset.readerHost='portfolio'; } catch {}
  const phone = matchMedia('(pointer: coarse) and (max-width: 767px), (pointer: coarse) and (max-width: 1024px) and (max-height: 600px)');
  const previewNodes = () => document.querySelectorAll('[data-preview-src]');
  const sourceAttribute = image => image instanceof SVGElement ? 'href' : 'src';
  let detailObserver;
  window.CeciliaSetArtwork = (image, value, lazy = false) => {
    if (phone.matches && lazy) image.loading = 'lazy';
    const full = window.CeciliaAssetURL(value);
    const preview = phone.matches && window.CeciliaMobilePreviews?.get(new URL(full).pathname);
    if (preview) {
      image.dataset.fullSrc = full;
      image.dataset.previewSrc = window.CeciliaAssetURL(preview);
      detailObserver?.observe(image);
    } else {
      delete image.dataset.fullSrc;
      delete image.dataset.previewSrc;
    }
    image.setAttribute(sourceAttribute(image), preview ? image.dataset.previewSrc : full);
  };
  window.CeciliaZoomArtwork = enlarged => {
    if (!phone.matches && !detailObserver) return;
    detailObserver?.disconnect();
    detailObserver = null;
    if (enlarged && 'IntersectionObserver' in window) {
      detailObserver = new IntersectionObserver((entries, observer) => {
        if (observer !== detailObserver) return;
        for (const {target, isIntersecting} of entries) {
          if (isIntersecting) target.setAttribute(sourceAttribute(target), target.dataset.fullSrc);
          else target.setAttribute(sourceAttribute(target), target.dataset.previewSrc);
        }
      }, {rootMargin: '120px'});
    }
    for (const image of previewNodes()) {
      if (detailObserver) detailObserver.observe(image);
      else image.setAttribute(sourceAttribute(image), enlarged ? image.dataset.fullSrc : image.dataset.previewSrc);
    }
  };
  const release=()=>{root.dataset.pageBoot='ready';};
  addEventListener('error',event=>{if(event.target===window)release();});
  document.addEventListener('DOMContentLoaded',()=>{
    release();
    try { window.frameElement?.dispatchEvent(new Event('cecilia-project-ready')); } catch {}
  },{once:true});
  addEventListener('pageshow',event=>{if(event.persisted)release();});
})();
