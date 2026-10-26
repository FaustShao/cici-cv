(() => {
  const root = document.querySelector('#project');
  const viewer = document.querySelector('#image-viewer');
  const names = {home:'HOME',research:'RESEARCH',diary:'DESIGN DIARY',teas:'TEAS',merch:'MERCH',service:'SERVICE SYSTEM',packaging:'Packaging',material:'Material',about:'About Us'};
  const available = new Set(['home','research']);
  const image = (folder, file, alt) => {
    const img = document.createElement('img');
    img.src = `assets/tideline/${folder}/${encodeURIComponent(file)}.png`;
    img.alt = alt;
    img.decoding = 'async';
    return img;
  };
  let observer;
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
    const height=current==='home'?3538:18112;canvas.style.height=`${height}px`;
    shell.append(canvas);root.append(shell);
    function layer(folder,file,x,y,w,h,alt,zoom=false) {
      const img=image(folder,file,alt);img.width=Math.round(w*2);img.height=Math.round(h*2);
      if(y>2000)img.loading='lazy';
      const node=zoom?document.createElement('button'):img;
      if(zoom){node.type='button';node.className='image-button';node.setAttribute('aria-label',`Enlarge: ${alt}`);node.append(img);node.addEventListener('click',()=>{viewer.querySelector('img').src=img.src;viewer.querySelector('img').alt=alt;viewer.showModal();});}
      node.classList.add('layer');Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});canvas.append(node);return node;
    }
    const folder=current==='home'?'HOME':'RESEARCH';
    if(current==='home') {
      layer(folder,'Background',0,0,1728,1296,'Findhorn coast and beach hut');
      layer(folder,'Intro',283,376,1158.5,41.5,'A tea that restores you like the land is being restored.');
      const strip=document.createElement('div');strip.className='strip';strip.tabIndex=0;strip.setAttribute('role','region');strip.setAttribute('aria-label','Tea blends — scroll horizontally');strip.append(image(folder,'横向滚页','Heather Mist, Shore Greens, Coastal Citrus and Saltmarsh Harmony'));canvas.append(strip);
      layer(folder,'Line 6',47,1410,1633,3,'');layer(folder,'Line 7',38,1926,1633,3,'');
      layer(folder,'Group 19',38,2041,1633,683,'Packaging, Material and About Us');
      for(const [i,key] of ['packaging','material','about'].entries()){const a=document.createElement('a');a.className='feature-link';a.href=`#${key}`;a.setAttribute('aria-label',names[key]);a.style.left=`${38+i*558}px`;a.style.width='517px';canvas.append(a);}
      layer(folder,'Group 22',0,2868,1728,494,'Tideline Tea revives seaweed as a traditional coastal food. Newsletter sign-up shown in the design is not active.');
    } else {
      const blocks=[['History',265,194,1235,8252.5,'History of Findhorn and seaweed'],['Geology',290,8501,1185,787,'Geology'],['Frame 19',140,9334,1441,2361,'Geology research'],['Biology-1',271,11922,1185,787,'Biology'],['Biology',89.5,12885,1557,2402,'Biology research'],['Relationship-1',289,15423,1185,787,'Relationship'],['Relationship',99,16346,1567,1593,'Community relationships']];
      for(const [file,x,y,w,h,alt] of blocks)layer(folder,file,x,y,w,h,alt,true);
      layer(folder,'Rectangle 333',0,17765,1728,347,'');
      layer(folder,'Created by Haojie, Yuchen and Yuxin',1202,17422,455.5,31.5,'Created by Haojie, Yuchen and Yuxin');
      const button=document.createElement('button');button.type='button';button.className='back-top';button.setAttribute('aria-label','Back to top');Object.assign(button.style,{left:'1400px',top:'17814px',width:'81px',height:'92px'});button.append(image(folder,'Arrow 1',''));button.addEventListener('click',()=>window.scrollTo({top:0}));canvas.append(button);
    }
    const nav=document.createElement('nav');nav.className='navigator';nav.setAttribute('aria-label','Project navigation');nav.append(image(folder,'Navigator','Tideline'));
    const routes=[['home',51.51,15.38,5],['research',68.11,15.38,9],['diary',84.79,15.38,13],['teas',51.51,64.84,5],['merch',68.11,64.84,8],['service',84.79,64.84,15]];
    for(const [key,x,y,w] of routes){const a=document.createElement('a');a.href=`#${key}`;a.className='nav-link';a.setAttribute('aria-label',names[key]);a.textContent=names[key];Object.assign(a.style,{left:`${x}%`,top:`${y}%`,width:`${w}%`,height:'27%'});if(key===current)a.setAttribute('aria-current','page');nav.append(a);}canvas.append(nav);
    const resize=()=>{const scale=shell.clientWidth/1728;canvas.style.transform=`scale(${scale})`;shell.style.height=`${height*scale}px`;};
    observer=new ResizeObserver(resize);observer.observe(shell);resize();
  }
  viewer.querySelector('button').addEventListener('click',()=>viewer.close());
  window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
  render();
})();
