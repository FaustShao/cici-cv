(() => {
  const root=document.documentElement;
  let zoom=1,timer;
  function fit(){root.style.setProperty('--fit-width',Math.min(1060,root.clientWidth-(innerWidth<=700?24:48))+'px');}
  function setZoom(value){
    zoom=Math.max(.75,Math.min(2.5,value));root.style.setProperty('--zoom',zoom);
    document.getElementById('zoom-reset').textContent=Math.round(zoom*100)+'%';
    document.getElementById('zoom-out').disabled=zoom<=.75;document.getElementById('zoom-in').disabled=zoom>=2.5;
  }
  fit();addEventListener('resize',fit);
  document.getElementById('zoom-in').onclick=()=>setZoom(zoom+.25);
  document.getElementById('zoom-out').onclick=()=>setZoom(zoom-.25);
  document.getElementById('zoom-reset').onclick=()=>setZoom(1);
  document.getElementById('print').onclick=()=>window.print();
  if(window.top!==window)document.querySelector('.back-world').hidden=true;
  document.getElementById('copy-wechat').onclick=async()=>{
    const feedback=document.getElementById('resume-feedback');
    try{await navigator.clipboard.writeText('Cecilia_cici68');feedback.textContent='微信号已复制：Cecilia_cici68';}
    catch{feedback.textContent='微信号：Cecilia_cici68';}
    clearTimeout(timer);timer=setTimeout(()=>{feedback.textContent='';},4500);
  };
})();
