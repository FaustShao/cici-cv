// Full-resolution UI previews share a native modal, preserving project scroll and focus.
(() => {
  const assets = [{"project":"dream","node":"34:799","title":"首页与实时安全监测","file":"dream-homepage.webp","width":3842,"height":2318,"originalTitle":"Group 1000002378","order":1},{"project":"dream","node":"34:739","title":"环境风险感知","file":"dream-environment.webp","width":3828,"height":2318,"originalTitle":"Frame 11","order":2},{"project":"dream","node":"34:740","title":"用户身体状态","file":"dream-body-status.webp","width":3833,"height":2318,"originalTitle":"Frame 12","order":3},{"project":"dream","node":"34:746","title":"安全撤离路线","file":"dream-navigation.webp","width":3837,"height":2318,"originalTitle":"Frame 13","order":4},{"project":"dream","node":"34:747","title":"设备连接与运行参数","file":"dream-devices.webp","width":3837,"height":2318,"originalTitle":"Frame 14","order":5},{"project":"safepaw","node":"54:957","title":"登录与注册","file":"safepaw-welcome.webp","width":1211,"height":2600,"originalTitle":"01 -开屏","order":1},{"project":"safepaw","node":"54:1241","title":"连接设备","file":"safepaw-connection.webp","width":1211,"height":2600,"originalTitle":"连接设备","order":2},{"project":"safepaw","node":"54:1091","title":"连接成功","file":"safepaw-connection-success.webp","width":1211,"height":2600,"originalTitle":"连接成功","order":3},{"project":"safepaw","node":"54:1312","title":"首页与整体数据","file":"safepaw-overview.webp","width":1211,"height":2600,"originalTitle":"整体数据","order":4},{"project":"safepaw","node":"54:1935","title":"宠物名片","file":"safepaw-dog-card-1.webp","width":1211,"height":2600,"originalTitle":"狗狗名片1","order":5},{"project":"safepaw","node":"54:2051","title":"宠物详细档案","file":"safepaw-dog-card-2.webp","width":1211,"height":2600,"originalTitle":"狗狗名片2","order":6},{"project":"safepaw","node":"54:2137","title":"设备管理","file":"safepaw-device-management.webp","width":330,"height":709,"originalTitle":"设备管理","order":7},{"project":"safepaw","node":"54:1604","title":"历史监测记录","file":"safepaw-monitor.webp","width":1211,"height":2619,"originalTitle":"动态监测","order":8},{"project":"safepaw","node":"54:1468","title":"监测数据详情","file":"safepaw-details.webp","width":1211,"height":2600,"originalTitle":"详细数据","order":9},{"project":"safepaw","node":"54:1717","title":"互动消息","file":"safepaw-messages.webp","width":1193,"height":2582,"originalTitle":"消息","order":10},{"project":"safepaw","node":"54:1819","title":"互动影像回放","file":"safepaw-record.webp","width":1193,"height":2582,"originalTitle":"record","order":11}];
  let dialog, image, caption, previous, next, trigger, scrollX, scrollY, group=[], index=0, request=0;
  const lookup=new Map(assets.map(a=>[a.project+':'+a.node,a]));
  const assetURL=asset=>window.CeciliaAssetURL('assets/project-ui-details/'+asset.file);
  function display(){
    const asset=group[index],token=++request;
    const focused=document.activeElement;
    previous.disabled=index===0;next.disabled=index===group.length-1;
    if((focused===previous&&previous.disabled)||(focused===next&&next.disabled))dialog.focus({preventScroll:true});
    image.hidden=true;image.removeAttribute('src');
    image.alt=(asset.project==='safepaw'?'宠爱守护':'梦境哨兵')+' · '+asset.title+'高清界面';
    caption.textContent=`${index+1} / ${group.length} · ${asset.title}　｜　点击空白处关闭`;
    dialog.dataset.project=asset.project;dialog.dataset.index=String(index+1);
    const decoded=new Image();decoded.decoding='async';decoded.src=assetURL(asset);
    decoded.decode().then(()=>{
      if(token!==request||!dialog.open)return;
      image.src=decoded.src;image.hidden=false;
      // Warm only the next original; there is no forced transition or loading animation.
      if(group[index+1]){const preload=new Image();preload.src=assetURL(group[index+1]);}
    }).catch(()=>{if(token===request&&dialog.open){image.src=decoded.src;image.hidden=false;}});
  }
  function move(step){const target=index+step;if(target<0||target>=group.length)return;index=target;display();}
  function create(){
    dialog=document.createElement('dialog');dialog.className='project-ui-lightbox';dialog.tabIndex=-1;dialog.setAttribute('aria-label','高清界面预览');
    const close=document.createElement('button');close.type='button';close.className='ui-zoom-close';close.textContent='×';close.setAttribute('aria-label','关闭高清预览');
    previous=document.createElement('button');previous.type='button';previous.className='ui-zoom-previous';previous.textContent='‹';previous.setAttribute('aria-label','上一张界面');
    next=document.createElement('button');next.type='button';next.className='ui-zoom-next';next.textContent='›';next.setAttribute('aria-label','下一张界面');
    const figure=document.createElement('figure');image=new Image();image.draggable=false;image.decoding='async';caption=document.createElement('figcaption');caption.id='ui-zoom-caption';caption.setAttribute('aria-live','polite');caption.setAttribute('aria-atomic','true');dialog.setAttribute('aria-describedby',caption.id);figure.append(image,caption);dialog.append(close,previous,figure,next);document.body.append(dialog);
    close.addEventListener('click',()=>dialog.close());
    previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}
    });
    dialog.addEventListener('close',()=>{++request;document.body.classList.remove('ui-zoom-open');trigger?.focus({preventScroll:true});window.scrollTo(scrollX,scrollY);image.hidden=true;image.removeAttribute('src');});
  }
  window.ProjectUIZoom={
    get(project,node){return lookup.get(project+':'+node);},
    open(asset,from){
      if(!asset)return;if(!dialog)create();
      trigger=from;scrollX=window.scrollX;scrollY=window.scrollY;
      group=assets.filter(a=>a.project===asset.project).sort((a,b)=>a.order-b.order);index=group.findIndex(a=>a.node===asset.node);
      if(index<0)return;document.body.classList.add('ui-zoom-open');if(!dialog.open)dialog.showModal();display();
    }
  };
})();
