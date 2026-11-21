// No animation or minimum wait: paint only the actual current document's first layout.
(() => {
  const root=document.documentElement;
  root.dataset.pageBoot='pending';
  window.CeciliaAssetURL=value=>{
    const url=new URL(value,location.href),release=document.querySelector('meta[name="cecilia-release"]')?.content;
    if(release&&url.origin===location.origin)url.searchParams.set('build',release);
    return url.href;
  };
  try { if(parent!==window && parent.CeciliaProjectReader)root.dataset.readerHost='portfolio'; } catch {}
  const release=()=>{root.dataset.pageBoot='ready';};
  addEventListener('error',event=>{if(event.target===window)release();});
  document.addEventListener('DOMContentLoaded',async()=>{
    try{
      await document.fonts.ready;
      // Allow the current layout and its lazy SVG artwork to be positioned before choosing the first viewport.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const images=[...document.querySelectorAll('img,svg image')].filter(img=>{
        if(img.loading==='lazy')return false;
        const source=img.getAttribute('src')||img.getAttribute('href');
        const r=img.getBoundingClientRect();return source&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
      });
      await Promise.allSettled(images.map(img=>{
        if(img instanceof HTMLImageElement)return img.decode();
        const copy=new Image();copy.src=img.getAttribute('href');return copy.decode();
      }));
    }finally{requestAnimationFrame(release);}
  },{once:true});
  addEventListener('pageshow',event=>{if(event.persisted)release();});
})();
