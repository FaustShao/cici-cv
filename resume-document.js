(() => {
  const root=document.documentElement;
  const layout=window.RESUME_LAYERS;
  if(layout){
    for(const layer of layout.layers){
      const image=document.createElement('img');image.className='resume-art';image.alt='';image.draggable=false;
      image.src=window.CeciliaAssetURL('assets/resume/layers/'+encodeURIComponent(layer.file));
      image.dataset.source=layer.file;image.width=layer.w;image.height=layer.h;image.decoding='async';
      image.style.cssText=`left:${layer.x/layout.width*100}%;top:${layer.y/layout.height*100}%;width:${layer.w/layout.width*100}%;height:${layer.h/layout.height*100}%`;
      image.addEventListener('error',()=>{document.getElementById('resume-feedback').textContent='部分简历素材未加载，请刷新或下载简历 PDF。';});
      document.querySelector(`.resume-artwork[data-page="${layer.page}"]`).append(image);
    }
  }
  let zoom=1,timer;
  function setZoom(value){
    zoom=Math.max(.75,Math.min(2.5,value));root.style.setProperty('--zoom',zoom);
    root.toggleAttribute('data-zoomed',zoom>1);
    document.getElementById('zoom-reset').textContent=Math.round(zoom*100)+'%';
    document.getElementById('zoom-out').disabled=zoom<=.75;document.getElementById('zoom-in').disabled=zoom>=2.5;
  }
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
