import audioURL from '../../../assets/gazette/audio/page-turn.mp3?url';

// One quiet paper recording per actual, user-initiated page change. Never autoplay.
export function createPageTurnSound(){
  let context,buffer,ready,source,ticket=0,armed=false,disposed=false;
  const bytes=fetch(audioURL).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);
  function unlock(event){
    if(!event.isTrusted)return;
    if(event.type==='keydown'&&!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))return;
    armed=true;
    try{
      if(!context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;context=new C();ready=bytes.then(data=>data?context.decodeAudioData(data):null).then(value=>{buffer=value}).catch(()=>{});}
      if(context.state==='suspended')context.resume().catch(()=>{});
    }catch{}
  }
  document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
  return {
    play(){
      if(!context||!ready||!armed||disposed||document.hidden)return;
      armed=false;const current=++ticket;
      const start=()=>{
        if(disposed||ticket!==current||!buffer||context.state!=='running'||document.hidden)return;
        try{source?.stop();const next=context.createBufferSource(),gain=context.createGain();next.buffer=buffer;gain.gain.value=.12;next.connect(gain);gain.connect(context.destination);source=next;next.onended=()=>{next.disconnect();gain.disconnect();if(source===next)source=null};next.start();}catch{}
      };
      if(buffer)start();else ready.then(start).catch(()=>{});
    },
    reset(){armed=false;++ticket;try{source?.stop()}catch{}},
    dispose(){disposed=true;++ticket;try{source?.stop();context?.close().catch(()=>{})}catch{}document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);}
  };
}
