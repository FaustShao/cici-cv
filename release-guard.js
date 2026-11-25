// Prevent a cached entry document from painting an obsolete UI before loading a newer release.
(() => {
  const root=document.documentElement;
  const meta=name=>{const tag=document.querySelector('meta[name="'+name+'"]');return tag && tag.content;};
  const expected=meta('cecilia-release');
  const directory=meta('cecilia-release-root');
  if(!expected||!directory){delete root.dataset.releaseState;return;}
  let active;
  async function check(){
    const controller=new AbortController();
    active?.abort();
    active=controller;
    root.dataset.releaseState='checking';
    let replacing=false;
    const timer=setTimeout(()=>{
      if(active!==controller)return;
      delete root.dataset.releaseState;
      controller.abort();
    },4000);
    try{
      const response=await fetch(new URL('release.json',new URL(directory,location.href)),{cache:'no-store',signal:controller.signal});
      if(!response.ok)return;
      const {revision}=await response.json();
      if(active!==controller||controller.signal.aborted)return;
      const next=new URL(location.href);
      if(revision&&revision!==expected&&next.searchParams.get('build')!==revision){
        next.searchParams.set('build',revision);
        location.replace(next.href);
        replacing=true;
      }
    }catch{}finally{
      clearTimeout(timer);
      if(active===controller){
        active=null;
        if(!replacing)delete root.dataset.releaseState;
      }
    }
  }
  check();
  addEventListener('pagehide',event=>{
    if(!event.persisted)return;
    active?.abort();
    active=null;
    root.dataset.releaseState='checking';
  });
  addEventListener('pageshow',event=>{if(event.persisted)check();});
})();
