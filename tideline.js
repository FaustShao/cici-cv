(() => {
  const root = document.querySelector('#project');
  const viewer = document.querySelector('#image-viewer');
  const names = {home:'HOME',research:'RESEARCH',diary:'DESIGN DIARY',teas:'TEAS',merch:'MERCH',service:'SERVICE SYSTEM',packaging:'Packaging',material:'Material',about:'About Us'};
  const available = new Set(['home','research','teas','material','packaging','merch','diary','service']);
  const image = (folder, file, alt) => {
    const img = document.createElement('img');
    img.src = `assets/tideline/${folder}/${encodeURIComponent(file)}.png`;
    if(folder==='RESEARCH'&&file==='Relationship')img.src+='?v=relationship-2';
    img.alt = alt;
    img.decoding = 'async';
    return img;
  };
  let observer;
  let stopServiceTrail;
  function attachServiceTrail(host) {
    const ns='http://www.w3.org/2000/svg';
    const svgNode=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));return n;};
    const svg=svgNode('svg',{viewBox:'0 0 937 1326','aria-hidden':'true',class:'service-trail'});
    // Trace the user's marked dashed-road route, in coordinates of their reference image.
    const points=[[420,1313],[510,1250],[610,1200],[710,1135],[745,1105],[770,1090],[777,1065],[765,1053],[720,1022],[693,1007],[685,992],[697,984],[715,998],[800,1040],[847,1072],[882,1102],[902,1111],[904,1083],[897,1066],[882,1054],[886,1037],[945,1008],[996,977],[1064,940],[1094,914],[1101,894],[1092,880],[1051,849],[993,817],[932,787],[866,755],[802,735],[746,707],[686,675],[638,645],[620,621],[584,599],[550,572],[520,559],[482,544],[464,525],[476,500],[515,465],[570,422],[624,381],[650,362],[734,318],[810,282],[884,251],[953,212],[1020,177],[1093,136],[1122,122]].map(([x,y])=>[x-261,y-102]);
    let d=`M ${points[0].join(' ')}`;
    for(let i=0;i<points.length-1;i++){
      const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],e=points[Math.min(points.length-1,i+2)];
      d+=` C ${b[0]+(c[0]-a[0])/6} ${b[1]+(c[1]-a[1])/6}, ${c[0]-(e[0]-b[0])/6} ${c[1]-(e[1]-b[1])/6}, ${c.join(' ')}`;
    }
    const path=svgNode('path',{d,fill:'none',stroke:'none'});svg.append(path);
    const group=svgNode('g',{class:'service-trail-particles'});svg.append(group);
    const tail=Array.from({length:14},(_,i)=>{
      const dot=svgNode('circle',{r:5.5-i*.31,fill:'#ca151e',class:'service-trail-dot'});group.append(dot);return dot;
    });
    const ball=svgNode('circle',{r:8,fill:'#ca151e',class:'service-trail-ball'});group.append(ball);host.append(svg);
    const length=path.getTotalLength();
    const samples=Array.from({length:1201},(_,i)=>path.getPointAtLength(length*i/1200));
    const position=t=>{
      const index=Math.min(1200,Math.max(0,t)*1200),i=Math.min(1199,Math.floor(index)),f=index-i;
      const x=samples[i].x+(samples[i+1].x-samples[i].x)*f;
      const ground=samples[i].y+(samples[i+1].y-samples[i].y)*f;
      return {x,y:ground-Math.abs(Math.sin(t*Math.PI*28))*11,ground};
    };
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,start=0,hovered=false,focused=false;
    const stop=()=>{cancelAnimationFrame(frame);frame=0;svg.classList.remove('is-running');};
    const tick=now=>{
      if(!host.isConnected||reduced.matches){stop();return;}
      const elapsed=(now-start)%13000,progress=Math.min(1,elapsed/12000);
      group.style.opacity=String(elapsed>12000?1-(elapsed-12000)/1000:1);
      const head=position(progress);ball.setAttribute('cx',head.x);ball.setAttribute('cy',head.y);
      tail.forEach((dot,i)=>{
        const t=progress-(i+1)*.0048;
        dot.setAttribute('opacity',t<0?'0':String(.62*(1-i/tail.length)));
        if(t>=0){const p=position(t);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);}
      });
      frame=requestAnimationFrame(tick);
    };
    const sync=()=>{if((hovered||focused)&&!reduced.matches){if(!frame){start=performance.now();svg.classList.add('is-running');frame=requestAnimationFrame(tick);}}else stop();};
    host.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;sync();}});
    host.addEventListener('pointerleave',()=>{hovered=false;sync();});
    host.addEventListener('focusin',()=>{focused=host.matches(':focus-visible');sync();});
    host.addEventListener('focusout',()=>{focused=false;sync();});
    reduced.addEventListener('change',sync);
    return ()=>{stop();reduced.removeEventListener('change',sync);};
  }
  function createBouncingIntro(canvas) {
    const sentence = 'A tea that restores you like the land is being restored.';
    // Glyph bounds in the uploaded 2317 × 83 PNG preserve the original lettering exactly.
    const glyphs = [[0,35],[82,105],[120,150],[168,198],[247,270],[286,315],[334,363],[381,404],[452,477],[495,525],[543,572],[589,611],[627,657],[677,702],[720,750],[768,797],[845,876],[893,923],[942,971],[1024,1031],[1053,1060],[1082,1110],[1126,1155],[1203,1226],[1243,1271],[1291,1321],[1372,1379],[1400,1429],[1449,1478],[1497,1526],[1579,1586],[1607,1636],[1686,1715],[1734,1764],[1784,1791],[1813,1841],[1860,1894],[1942,1967],[1985,2015],[2033,2062],[2079,2101],[2117,2147],[2167,2192],[2210,2240],[2259,2288],[2307,2317]];
    const heading = document.createElement('h1');
    heading.className = 'bouncing-intro';heading.setAttribute('aria-label',sentence);
    const source = image('HOME','Intro','').src;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    glyphs.forEach((glyph,index) => {
      const left = index === 0 ? 0 : (glyphs[index-1][1]+glyph[0])/2;
      const right = index === glyphs.length-1 ? 2317 : (glyph[1]+glyphs[index+1][0])/2;
      const hit = document.createElement('span');hit.className='intro-letter';hit.setAttribute('aria-hidden','true');
      Object.assign(hit.style,{left:`${left/2}px`,width:`${(right-left)/2}px`});
      const ink = document.createElement('span');ink.className='intro-letter-ink';
      Object.assign(ink.style,{backgroundImage:`url("${source}")`,backgroundPosition:`-${left/2}px 0`});
      hit.append(ink);heading.append(hit);
      hit.addEventListener('pointerenter',event=>{
        if(event.pointerType==='mouse' && !reduced.matches) ink.classList.add('is-bouncing');
      });
      ink.addEventListener('animationend',()=>ink.classList.remove('is-bouncing'));
    });
    canvas.append(heading);
  }
  function enableStripScrolling(strip) {
    const scale = () => strip.getBoundingClientRect().width / strip.offsetWidth || 1;
    strip.querySelector('img').draggable = false;
    strip.addEventListener('wheel', event => {
      if (event.ctrlKey) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? strip.clientWidth : 1;
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit / scale();
      const max = strip.scrollWidth - strip.clientWidth;
      if ((delta > 0 && strip.scrollLeft < max - 1) || (delta < 0 && strip.scrollLeft > 1)) {
        event.preventDefault();
        strip.scrollLeft += delta;
      }
    }, {passive:false});
    let drag = null;
    strip.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      // Leave the native scrollbar available for direct use.
      const bounds = strip.getBoundingClientRect();
      if (event.clientY - bounds.top >= strip.clientHeight * scale()) return;
      drag = {id:event.pointerId, x:event.clientX, left:strip.scrollLeft};
      strip.setPointerCapture(event.pointerId);
      strip.classList.add('is-dragging');
      strip.focus({preventScroll:true});
      event.preventDefault();
    });
    strip.addEventListener('pointermove', event => {
      if (drag && event.pointerId === drag.id) strip.scrollLeft = drag.left - (event.clientX - drag.x) / scale();
    });
    const finish = event => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      strip.classList.remove('is-dragging');
      if (strip.hasPointerCapture(event.pointerId)) strip.releasePointerCapture(event.pointerId);
    };
    strip.addEventListener('pointerup', finish);
    strip.addEventListener('pointercancel', finish);
    strip.addEventListener('lostpointercapture', finish);
  }
  function render() {
    observer?.disconnect();
    stopServiceTrail?.();stopServiceTrail=null;
    const route = location.hash.slice(1) || 'home';
    const current = Object.hasOwn(names,route) ? route : 'home';
    root.replaceChildren();
    const mobile = document.createElement('nav');
    mobile.className='mobile-nav';mobile.setAttribute('aria-label','Project pages');
    for(const key of ['home','research','diary','teas','merch','service']) {
      const a=document.createElement('a');a.href=`#${key}`;a.textContent=names[key];
      if(key===current)a.setAttribute('aria-current','page');
      mobile.append(a);
    }
    root.append(mobile);
    if(!available.has(current)) {
      const section=document.createElement('section');section.className='pending';
      const h=document.createElement('h1');h.textContent=names[current];
      const p=document.createElement('p');p.textContent='This part of the project is being added. / 此部分内容待补充。';
      const a=document.createElement('a');a.href='#home';a.textContent='← Back to HOME';
      section.append(h,p,a);root.append(section);return;
    }
    const shell=document.createElement('div');shell.className='canvas-shell';
    const canvas=document.createElement('section');canvas.className='canvas';canvas.setAttribute('aria-label',names[current]);
    const height=current==='home'?3538:current==='teas'?2243:current==='merch'?2590:current==='material'?2736:current==='packaging'?3130:current==='diary'?12961:current==='service'?4307:18112;canvas.style.height=`${height}px`;
    shell.append(canvas);root.append(shell);
    function layer(folder,file,x,y,w,h,alt,zoom=false,external=null) {
      const img=image(folder,file,alt);img.width=Math.round(w*2);img.height=Math.round(h*2);
      if(y>2000)img.loading='lazy';
      const node=external?document.createElement('a'):zoom?document.createElement('button'):img;
      if(external){
        node.className=`research-external${external.plant?' plant-link':''}`;node.href=external.url;node.target='_blank';node.rel='noopener noreferrer';
        node.setAttribute('aria-label',external.plant?`${external.name} — ${external.related?'甜菜相关介绍':'百度百科词条'} (opens in a new tab)`:`Visit ${external.name} official website (opens in a new tab)`);
        const hint=document.createElement('span');hint.className='external-hint';hint.setAttribute('aria-hidden','true');
        if(external.plant){
          const name=document.createElement('strong');name.textContent=external.name;
          const action=document.createElement('small');action.textContent=external.related?'百度百科 · 甜菜相关介绍 ↗':'查看百度百科 ↗';
          hint.append(name,action);
        }else hint.textContent='访问官网 / Visit website ↗';
        node.append(img,hint);
      } else if(zoom){node.type='button';node.className='image-button';node.setAttribute('aria-label',`Enlarge: ${alt}`);node.append(img);node.addEventListener('click',()=>{viewer.querySelector('img').src=img.src;viewer.querySelector('img').alt=alt;viewer.showModal();});}
      node.classList.add('layer');Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});canvas.append(node);return node;
    }
    const folder=current==='research'?'RESEARCH':current==='material'?'Material':current==='packaging'?'Packaging':current==='merch'?'Merch':current==='diary'?'Diary':current==='service'?'Service':'HOME';
    if(current==='home') {
      layer(folder,'Background',0,0,1728,1296,'Findhorn coast and beach hut');
      createBouncingIntro(canvas);
      const strip=document.createElement('div');strip.className='strip';strip.tabIndex=0;strip.setAttribute('role','region');strip.setAttribute('aria-label','Six tea blends — scroll horizontally');strip.append(image(folder,'横向滚页','Heather Mist, Shore Greens, Coastal Citrus, Saltmarsh Harmony, Gorse Blossom and Pine Breeze'));canvas.append(strip);
      strip.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();strip.scrollLeft+=event.key==='ArrowRight'?434:-434;}});
      enableStripScrolling(strip);
      layer(folder,'Line 6',47,1410,1633,3,'');layer(folder,'Line 7',38,1926,1633,3,'');
      const featureSource=image(folder,'Group 19','').src;
      for(const [i,key] of ['packaging','material','about'].entries()){
        const a=document.createElement('a');a.className='feature-link';a.href=`#${key}`;a.setAttribute('aria-label',names[key]);a.style.left=`${38+i*558}px`;a.style.width='517px';
        const art=document.createElement('span');art.className='feature-art';art.setAttribute('aria-hidden','true');
        art.style.backgroundImage=`url("${featureSource}")`;art.style.backgroundPosition=`-${i*558}px 0`;
        a.append(art);canvas.append(a);
      }
      layer(folder,'Group 22',0,2868,1728,494,'Tideline Tea revives seaweed as a traditional coastal food. Newsletter sign-up shown in the design is not active.');
    } else if(current==='service') {
      layer(folder,'Service Process',680,281,362.5,45.5,'Service Process');
      const processImage=layer(folder,'未标题-1_画板 1 1',253,393,1222,1728,'Tideline service process and circular service system');
      const process=document.createElement('div');process.className='layer service-process';process.style.cssText=processImage.style.cssText;
      process.tabIndex=0;process.setAttribute('role','group');process.setAttribute('aria-label','Service process diagram with animated route');
      processImage.classList.remove('layer');processImage.removeAttribute('style');canvas.replaceChild(process,processImage);process.append(processImage);
      stopServiceTrail=attachServiceTrail(process);
      layer(folder,'Space Layout',716,2424,293.5,55.5,'Space Layout');
      layer(folder,'1 1',253,2538,1222,864,'Tea house space layout, zoning and visitor routes');
      layer(folder,'3 1',229,3402,1250,884,'Tea house spatial design and service experience');
    } else if(current==='diary') {
      layer(folder,'Rectangle 334',0,12614,1728,347,'');
      const headings=[['Insight',253,165,147,53.5,'Insight'],['Further research',253,5058,383,45,'Further research'],['Brainstorm',253,7220,247.5,45,'Brainstorm'],['Further research-1',253,9393,383,45,'Further research']];
      for(const [file,x,y,w,h,label] of headings)layer(folder,file,x,y,w,h,label);
      const blocks=[
        ['7830f7811b53d4b09d26ba0163b237ef 1',253,264,1222,917,'Initial insight and research board'],
        ['Group 31',253,1254,1254,1629,'Design insights and opportunity development'],
        ['Group 34',279.7,3075.47,1253.5,1776,'Design proposal and concept development'],
        ['image 48',253,5144,1222,590,'Further research board 1'],
        ['image 50',253,5788,1221,588,'Further research board 2'],
        ['image 49',253,6430,1221,589,'Further research board 3'],
        ['d93bf0dc8853c0fab9b48c099d07f7b9 1',253,7318,1222,920,'Brainstorm and design exploration 1'],
        ['f5ffb646704a421cbcbfdc0cbcfa3752 1',253,8274,1222,971,'Brainstorm and design exploration 2'],
        ['site comparison 1 1',253,9498,1241,983,'Site comparison'],
        ['image 20',253,10575,1222,642,'Further research and proposal board'],
        ['image 16',253,11311,548,411,'Project process photograph 1'],
        ['image 17',927,11313,548,410,'Project process photograph 2'],
        ['image 15',253,11759,548,411,'Project process photograph 3'],
        ['image 14',927,11759,548,411,'Project process photograph 4'],
        ['image 13',253,12208,548,411,'Project process photograph 5'],
        ['Group 35',927,12208,548,411,'Project process photograph 6']
      ];
      const websites={
        'image 48':{name:'SHORE Seaweed',url:'https://shoreseaweed.com/'},
        'image 50':{name:'The Cornish Seaweed Company',url:'https://www.cornishseaweed.co.uk/'},
        'image 49':{name:'Hebridean Seaweed',url:'https://hebrideanseaweed.com/'}
      };
      const plants=[
        ['image 16','Heather','帚石南'],
        ['image 17','Gorse','荆豆/5365339'],
        ['image 15','Sea Beet','甜菜/183950',true],
        ['image 14','Rock Samphire','海茴香/7830206'],
        ['image 13','Sea Purslane','海马齿/8298641'],
        ['Group 35','Scots Pine','欧洲赤松/7238416']
      ];
      for(const [file,name,entry,related=false] of plants){
        websites[file]={name,plant:true,related,url:`https://baike.baidu.com/item/${entry.split('/').map(encodeURIComponent).join('/')}`};
      }
      for(const [file,x,y,w,h,label] of blocks)layer(folder,file,x,y,w,h,label,!websites[file],websites[file]||null);
      layer(folder,'Created by Yuxin',1241,2820,209,31.5,'Created by Yuxin');
      const top=document.createElement('button');top.type='button';top.className='back-top';top.setAttribute('aria-label','Back to top');
      Object.assign(top.style,{left:'1392px',top:'12696px',width:'81px',height:'92px'});top.append(image(folder,'Arrow 2',''));top.addEventListener('click',()=>window.scrollTo({top:0}));canvas.append(top);
    } else if(current==='packaging') {
      layer(folder,'union.20ps 1',0,1834,1728,1296,'Tideline seaweed tea packaging presentation',true);
      layer(folder,'Group 30',323,851,1081,810,'Four coloured seaweed tea pouches',true);
      layer(folder,'union.19 1',253,192,1221,687,'Tideline tea packaging render',true);
      const credit=document.createElement('p');credit.className='packaging-credit';credit.textContent='Rendered by Haojie';canvas.append(credit);
    } else if(current==='material') {
      layer(folder,'Rectangle 331',253,165,1222,692,'Seaweed material experimentation overview',true);
      layer(folder,'画板 1 2',253,895,1222,864,'Seaweed bioplastic experiment: ingredients, procedures and drying time',true);
      const gallery=document.createElement('div');gallery.className='strip material-strip';gallery.tabIndex=0;
      gallery.setAttribute('role','region');gallery.setAttribute('aria-label','Seaweed paper experiments — scroll or drag horizontally to see all six photographs');
      gallery.append(image(folder,'Group 32','Six photographs of handmade seaweed paper: moulding, botanical patterns and coloured material samples'));
      canvas.append(gallery);enableStripScrolling(gallery);
      gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();gallery.scrollLeft+=event.key==='ArrowRight'?434:-434;}});
    } else if(current==='merch') {
      canvas.classList.add('teas-canvas');shell.classList.add('teas-shell');
      const grid=document.createElement('div');grid.className='tea-grid merch-grid';canvas.append(grid);
      grid.append(image(folder,'Intro','Merch — coastal-inspired seaweed objects and materials'));
      const products=[['Paper','Seaweed Paper'],['Packaging','Seaweed Packaging'],['Plant','Plant Pot'],['Dye','Kelp-dyed Label'],['Food Bag','Food Bag'],['Envelope','Seaweed Envelope'],['Hand Bag','Hand Bag'],['Kitchen','Kitchen Set']];
      for(const [file,label] of products){
        const card=document.createElement('article');card.className='merch-card';
        const img=image(folder,file,label);card.append(img);grid.append(card);
      }
      grid.append(image(folder,'Coming soon','More objects coming soon.'));
    } else if(current==='teas') {
      canvas.classList.add('teas-canvas');shell.classList.add('teas-shell');
      const grid=document.createElement('div');grid.className='tea-grid';canvas.append(grid);
      grid.append(image('TEAS','Intro','Teas — coastal-inspired seaweed and shoreline botanical blends.'));
      const blends=['Heather Mist','Shore Greens','Coastal Citrus','Saltmarsh Harmony','Gorse Blossom','Pine Breeze'];
      const notes=['Floral honey, soft mineral, gentle sweetness','Warm greens, mild umami, coastal sweetness','Citrus-bright, mineral crisp, salty spice','Light brine, green mineral, coastal herb','Coconut floral, bright freshness, coastal warmth','Resin-fresh, crisp herbal, mineral cool'];
      for(let i=1;i<=6;i++) {
        const card=document.createElement('button');card.type='button';card.className='tea-card';card.dataset.blend=String(i);
        card.setAttribute('aria-label',`${blends[i-1]} — ${notes[i-1]}. Toggle tasting details.`);card.setAttribute('aria-pressed','false');
        const front=image('TEAS',`${i}F`,'');front.className='tea-front';
        const back=image('tea2/Tea card',String(i),'');back.className='tea-back';
        card.append(front,back);
        card.addEventListener('click',()=>card.setAttribute('aria-pressed',String(card.getAttribute('aria-pressed')!=='true')));
        card.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')card.setAttribute('aria-pressed','false');});
        card.addEventListener('keydown',event=>{if(event.key==='Escape')card.setAttribute('aria-pressed','false');});
        grid.append(card);
      }
      grid.append(image('TEAS','Coming soon','More blends coming soon.'));
    } else {
      const blocks=[['History',265,194,1235,8252.5,'History of Findhorn and seaweed'],['Geology',290,8501,1185,787,'Geology'],['Frame 19',140,9334,1441,2361,'Geology research'],['Biology-1',271,11922,1185,787,'Biology'],['Biology',89.5,12885,1557,2402,'Biology research'],['Relationship-1',289,15423,1185,787,'Relationship'],['Relationship layout',99,16346,1567,1593,'Community relationships']];
      for(const [file,x,y,w,h,alt] of blocks)layer(folder,file,x,y,w,h,alt,true);
      // Replace only the photograph inside the original composite; keep all surrounding text.
      layer(folder,'Relationship',99,16949,1567,521,'Community relationship mapping photograph',true);
      layer(folder,'Rectangle 333',0,17765,1728,347,'');
      layer(folder,'Created by Haojie, Yuchen and Yuxin',1202,17422,455.5,31.5,'Created by Haojie, Yuchen and Yuxin');
      const button=document.createElement('button');button.type='button';button.className='back-top';button.setAttribute('aria-label','Back to top');Object.assign(button.style,{left:'1400px',top:'17814px',width:'81px',height:'92px'});button.append(image(folder,'Arrow 1',''));button.addEventListener('click',()=>window.scrollTo({top:0}));canvas.append(button);
    }
    const nav=document.createElement('nav');nav.className='navigator';nav.setAttribute('aria-label','Project navigation');nav.append(image(current==='merch'?'HOME':folder,'Navigator','Tideline'));
    const routes=[['home',51.51,15.38,5],['research',68.11,15.38,9],['diary',84.79,15.38,13],['teas',51.51,64.84,5],['merch',68.11,64.84,8],['service',84.79,64.84,15]];
    for(const [key,x,y,w] of routes){const a=document.createElement('a');a.href=`#${key}`;a.className='nav-link';a.setAttribute('aria-label',names[key]);a.textContent=names[key];Object.assign(a.style,{left:`${x}%`,top:`${y}%`,width:`${w}%`,height:'27%'});if(key===current)a.setAttribute('aria-current','page');nav.append(a);}canvas.append(nav);
    const resize=()=>{const scale=shell.clientWidth/1728;canvas.style.transform=`scale(${scale})`;shell.style.height=`${height*scale}px`;};
    observer=new ResizeObserver(resize);observer.observe(shell);resize();
  }
  viewer.querySelector('button').addEventListener('click',()=>viewer.close());
  window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
  render();
})();
