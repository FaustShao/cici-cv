(() => {
  const root = document.querySelector('#project');
  const viewer = document.querySelector('#image-viewer');
  const names = {home:'HOME',research:'RESEARCH',diary:'DESIGN DIARY',teas:'TEAS',merch:'MERCH',service:'SERVICE SYSTEM',packaging:'Packaging',material:'Material',about:'About Us'};
  const available = new Set(['home','research','teas','material','packaging','merch','diary','service']);
  const image = (folder, file, alt) => {
    const img = document.createElement('img');
    img.src = `assets/tideline/${folder}/${encodeURIComponent(file)}.png`;
    img.alt = alt;
    img.decoding = 'async';
    return img;
  };
  let observer;
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
    function layer(folder,file,x,y,w,h,alt,zoom=false) {
      const img=image(folder,file,alt);img.width=Math.round(w*2);img.height=Math.round(h*2);
      if(y>2000)img.loading='lazy';
      const node=zoom?document.createElement('button'):img;
      if(zoom){node.type='button';node.className='image-button';node.setAttribute('aria-label',`Enlarge: ${alt}`);node.append(img);node.addEventListener('click',()=>{viewer.querySelector('img').src=img.src;viewer.querySelector('img').alt=alt;viewer.showModal();});}
      node.classList.add('layer');Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});canvas.append(node);return node;
    }
    const folder=current==='research'?'RESEARCH':current==='material'?'Material':current==='packaging'?'Packaging':current==='merch'?'Merch':current==='diary'?'Diary':current==='service'?'Service':'HOME';
    if(current==='home') {
      layer(folder,'Background',0,0,1728,1296,'Findhorn coast and beach hut');
      layer(folder,'Intro',283,376,1158.5,41.5,'A tea that restores you like the land is being restored.');
      const strip=document.createElement('div');strip.className='strip';strip.tabIndex=0;strip.setAttribute('role','region');strip.setAttribute('aria-label','Six tea blends — scroll horizontally');strip.append(image(folder,'横向滚页','Heather Mist, Shore Greens, Coastal Citrus, Saltmarsh Harmony, Gorse Blossom and Pine Breeze'));canvas.append(strip);
      strip.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();strip.scrollLeft+=event.key==='ArrowRight'?434:-434;}});
      enableStripScrolling(strip);
      layer(folder,'Line 6',47,1410,1633,3,'');layer(folder,'Line 7',38,1926,1633,3,'');
      layer(folder,'Group 19',38,2041,1633,683,'Packaging, Material and About Us');
      for(const [i,key] of ['packaging','material','about'].entries()){const a=document.createElement('a');a.className='feature-link';a.href=`#${key}`;a.setAttribute('aria-label',names[key]);a.style.left=`${38+i*558}px`;a.style.width='517px';canvas.append(a);}
      layer(folder,'Group 22',0,2868,1728,494,'Tideline Tea revives seaweed as a traditional coastal food. Newsletter sign-up shown in the design is not active.');
    } else if(current==='service') {
      layer(folder,'Service Process',680,281,362.5,45.5,'Service Process');
      layer(folder,'未标题-1_画板 1 1',253,393,1222,1728,'Tideline service process and circular service system',true);
      layer(folder,'Space Layout',716,2424,293.5,55.5,'Space Layout');
      layer(folder,'1 1',253,2538,1222,864,'Tea house space layout, zoning and visitor routes',true);
      layer(folder,'3 1',229,3402,1250,884,'Tea house spatial design and service experience',true);
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
      for(const [file,x,y,w,h,label] of blocks)layer(folder,file,x,y,w,h,label,true);
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
      const blocks=[['History',265,194,1235,8252.5,'History of Findhorn and seaweed'],['Geology',290,8501,1185,787,'Geology'],['Frame 19',140,9334,1441,2361,'Geology research'],['Biology-1',271,11922,1185,787,'Biology'],['Biology',89.5,12885,1557,2402,'Biology research'],['Relationship-1',289,15423,1185,787,'Relationship'],['Relationship',99,16346,1567,1593,'Community relationships']];
      for(const [file,x,y,w,h,alt] of blocks)layer(folder,file,x,y,w,h,alt,true);
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
