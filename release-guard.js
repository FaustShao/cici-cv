// Prevent a cached entry document from painting an obsolete UI before loading a newer release.
(() => {
  const root=document.documentElement;
  const meta=name=>{const tag=document.querySelector('meta[name="'+name+'"]');return tag && tag.content;};
  const expected=meta('cecilia-release');
  const directory=meta('cecilia-release-root');
  if(!expected||!directory){delete root.dataset.releaseState;return;}
  let pending;
  function check(){
    if(pending)return pending;
    root.dataset.releaseState='checking';
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      delete root.dataset.releaseState;
      controller.abort();
    },4000);
    pending=Promise.resolve().then(async()=>{
      try{
        const response=await fetch(new URL('release.json',new URL(directory,location.href)),{cache:'no-store',signal:controller.signal});
        if(response.ok){
          const {revision}=await response.json();
          const next=new URL(location.href);
          if(revision&&revision!==expected&&next.searchParams.get('build')!==revision){
            next.searchParams.set('build',revision);location.replace(next.href);return;
          }
        }
        delete root.dataset.releaseState;
      }catch{delete root.dataset.releaseState;}
      finally{clearTimeout(timer);pending=null;}
    });return pending;
  }
  check();
  addEventListener('pagehide',event=>{if(event.persisted)root.dataset.releaseState='checking';});
  addEventListener('pageshow',event=>{if(event.persisted)check();});
})();
