// Generated, quiet interaction sounds; no music or external audio downloads.
export function getWorldAudio(){
  try{if(parent!==window&&parent.__ceciliaAudio)return parent.__ceciliaAudio;}catch{}
  if(window.__ceciliaAudio)return window.__ceciliaAudio;
  let ctx,master,windGain,enabled=true;
  try{enabled=localStorage.getItem('cecilia-sound')!=='off';}catch{}
  const ui=new Set();
  function refresh(){ui.forEach(button=>{button.textContent=`声音${enabled?'开':'关'}`;button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'关闭风声与点击音效':'开启风声与点击音效');});}
  function unlock(){
    if(!enabled)return;
    try{
      if(!ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        ctx=new Audio();master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);
        const noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),samples=noise.getChannelData(0);
        for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(.65+.25*Math.sin(i/samples.length*Math.PI*2));
        const source=ctx.createBufferSource();source.buffer=noise;source.loop=true;
        const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=420;
        const high=ctx.createBiquadFilter();high.type='highpass';high.frequency.value=100;
        windGain=ctx.createGain();windGain.gain.value=0;
        source.connect(low).connect(high).connect(windGain).connect(master);source.start();windGain.gain.linearRampToValueAtTime(.024,ctx.currentTime+1.5);
      }
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    }catch{}
  }
  function play(kind='click'){
    if(!enabled||document.hidden)return;unlock();if(!ctx||!master)return;
    const t=ctx.currentTime,frequencies=kind==='map'?[520,780]:kind==='device'?[330,660]:[620,850];
    frequencies.forEach((hz,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,t+i*.035);osc.frequency.exponentialRampToValueAtTime(hz*.8,t+.11+i*.035);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.009+i*.035);gain.gain.exponentialRampToValueAtTime(.001,t+.13+i*.035);osc.connect(gain).connect(master);osc.start(t);osc.stop(t+.18+i*.035);});
  }
  function toggle(){enabled=!enabled;try{localStorage.setItem('cecilia-sound',enabled?'on':'off');}catch{}if(enabled)unlock();if(master)master.gain.setTargetAtTime(enabled ? .65 : 0,ctx.currentTime,.12);refresh();if(enabled)play();}
  function bind(doc=document){
    doc.addEventListener('pointerdown',unlock,{passive:true});doc.addEventListener('keydown',unlock,{passive:true});
    doc.addEventListener('click',e=>{if(e.target.closest('button,a')&&!e.target.closest('#sound-toggle'))play(e.target.closest('#map-trigger,.map-location')?'map':'click');});
    const button=doc.getElementById('sound-toggle');if(button){ui.add(button);button.onclick=toggle;refresh();}
  }
  document.addEventListener('visibilitychange',()=>{if(master)master.gain.setTargetAtTime(enabled && !document.hidden ? .65 : 0,ctx.currentTime,.25);});
  const api={play,unlock,bind,get enabled(){return enabled},get state(){return ctx?.state||'locked'}};
  window.__ceciliaAudio=api;return api;
}
