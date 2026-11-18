/* Shared CSS-only cube loader. Layout reference: cssinate, https://codepen.io/cssinate/pen/vXEwmX */
(() => {
  if (window.CeciliaLoader) return;
  const digits={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111'],'%':['11001','11010','00100','01011','10011']};
  function markup(){
    let cubes='';for(let h=1;h<=3;h++)for(let w=1;w<=3;w++)for(let l=1;l<=3;l++)cubes+=`<div class="cube h${h}w${w}l${l}"><div class="face top"></div><div class="face left"></div><div class="face right"></div></div>`;
    return `<div class="cube-scene" aria-hidden="true"><div class="cube-origin">${cubes}</div></div><div class="pixel-percent" aria-hidden="true"></div>`;
  }
  function create(element,inline=false){
    if(element._ceciliaLoader)return element._ceciliaLoader;
    element.classList.add('cecilia-loader');if(inline)element.classList.add('cecilia-loader--inline');
    element.setAttribute('role','progressbar');element.setAttribute('aria-label','正在加载');element.setAttribute('aria-valuemin','0');element.setAttribute('aria-valuemax','100');
    if(!element.querySelector('.cube-origin'))element.innerHTML=markup();
    let value=-1,finished=false;
    function setPercent(next){
      if(finished)return;
      const rounded=Math.max(value,Math.min(100,Math.floor(next)));
      if(rounded===value)return;value=rounded;element.dataset.percent=String(value);element.setAttribute('aria-valuenow',String(value));
      element.querySelector('.pixel-percent').innerHTML=[...`${value}%`].map(char=>{const rows=digits[char];return `<span class="pixel-digit" style="--columns:${rows[0].length}">${rows.join('').split('').map(cell=>`<i${cell==='1'?' class="on"':''}></i>`).join('')}</span>`;}).join('');
    }
    function finish(){if(finished)return;setPercent(100);finished=true;setTimeout(()=>{element.hidden=true;element.dispatchEvent(new Event('loadercomplete'));},120);}
    function cancel(){finished=true;element.hidden=true;}
    const api={element,setPercent,finish,cancel};element._ceciliaLoader=api;setPercent(0);return api;
  }
  function watchImages(element,images,inline=false){
    const loader=create(element,inline),list=[...images];let done=0;
    const promises=list.map(image=>new Promise(resolve=>{
      let settled=false;function settle(){if(settled)return;settled=true;done++;loader.setPercent(done/Math.max(1,list.length)*95);resolve();}
      if(image instanceof HTMLImageElement){if(image.complete&&image.currentSrc){settle();return;}image.addEventListener('load',settle,{once:true});image.addEventListener('error',settle,{once:true});}
      else {const source=image.getAttribute('href');if(!source){settle();return;}const probe=new Image();probe.onload=probe.onerror=settle;probe.src=source;}
    }));
    const ready=Promise.all(promises).then(()=>document.fonts?.ready).then(()=>{loader.finish();});return {...loader,ready};
  }
  function watchDocument(){
    const element=document.createElement('div');element.id='document-loading';document.body.append(element);const loader=create(element);
    const start=()=>requestAnimationFrame(()=>{
      const images=[...document.querySelectorAll('img,svg image')].filter(image=>!image.closest('.cecilia-loader')&&(image.getAttribute('href')||image.currentSrc||image.getAttribute('src'))&&(!(image instanceof HTMLImageElement)||image.loading!=='lazy'||(()=>{const r=image.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>=0&&r.top<innerHeight+100;})()));
      watchImages(element,images);
    });
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
    return loader;
  }
  window.CeciliaLoader={create,watchImages,watchDocument,markup};
  if(document.currentScript?.hasAttribute('data-auto-loader'))watchDocument();
})();
