// Prevent a cached entry document from painting an obsolete UI before loading a newer release.
(() => {
  const root=document.documentElement;
  const expected=document.querySelector('meta[name="cecilia-release"]')?.content;
  const directory=document.querySelector('meta[name="cecilia-release-root"]')?.content;
  if(!expected||!directory){delete root.dataset.releaseState;return;}
  let pending;
  function check(){
    if(pending)return pending;
    root.dataset.releaseState='checking';
    pending=(async()=>{
      try{
        const response=await fetch(new URL('release.json',new URL(directory,location.href)),{cache:'no-store',signal:AbortSignal.timeout(4000)});
        if(response.ok){
          const {revision}=await response.json();
          const next=new URL(location.href);
          if(revision&&revision!==expected&&next.searchParams.get('build')!==revision){
            next.searchParams.set('build',revision);location.replace(next.href);return;
          }
        }
        delete root.dataset.releaseState;
      }catch{delete root.dataset.releaseState;}
      finally{pending=null;}
    })();return pending;
  }
  check();
  addEventListener('pagehide',()=>{root.dataset.releaseState='checking';});
  addEventListener('pageshow',event=>{if(event.persisted)check();});
})();
