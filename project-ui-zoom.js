// Full-resolution UI previews share a native modal, preserving project scroll and focus.
(() => {
  const assets = [{"project":"dream","node":"34:739","title":"环境风险感知","file":"dream-environment.webp","width":3828,"height":2318,"originalTitle":"Frame 11"},{"project":"dream","node":"34:746","title":"安全撤离路线","file":"dream-navigation.webp","width":3837,"height":2318,"originalTitle":"Frame 13"},{"project":"dream","node":"34:740","title":"用户身体状态","file":"dream-body-status.webp","width":3833,"height":2318,"originalTitle":"Frame 12"},{"project":"dream","node":"34:747","title":"设备连接与运行参数","file":"dream-devices.webp","width":3837,"height":2318,"originalTitle":"Frame 14"},{"project":"dream","node":"34:799","title":"首页与实时安全监测","file":"dream-homepage.webp","width":3842,"height":2318,"originalTitle":"Group 1000002378"},{"project":"safepaw","node":"54:1091","title":"连接成功","file":"safepaw-connection-success.webp","width":1211,"height":2600,"originalTitle":"连接成功"},{"project":"safepaw","node":"54:1819","title":"record","file":"safepaw-record.webp","width":1193,"height":2582,"originalTitle":"record"},{"project":"safepaw","node":"54:1312","title":"整体数据","file":"safepaw-overview.webp","width":1211,"height":2600,"originalTitle":"整体数据"},{"project":"safepaw","node":"54:1241","title":"连接设备","file":"safepaw-connection.webp","width":1211,"height":2600,"originalTitle":"连接设备"},{"project":"safepaw","node":"54:957","title":"01 -开屏","file":"safepaw-welcome.webp","width":1211,"height":2600,"originalTitle":"01 -开屏"},{"project":"safepaw","node":"54:1468","title":"详细数据","file":"safepaw-details.webp","width":1211,"height":2600,"originalTitle":"详细数据"},{"project":"safepaw","node":"54:2051","title":"狗狗名片2","file":"safepaw-dog-card-2.webp","width":1211,"height":2600,"originalTitle":"狗狗名片2"},{"project":"safepaw","node":"54:1935","title":"狗狗名片1","file":"safepaw-dog-card-1.webp","width":1211,"height":2600,"originalTitle":"狗狗名片1"},{"project":"safepaw","node":"54:1717","title":"消息","file":"safepaw-messages.webp","width":1193,"height":2582,"originalTitle":"消息"},{"project":"safepaw","node":"54:1604","title":"动态监测","file":"safepaw-monitor.webp","width":1211,"height":2619,"originalTitle":"动态监测"}];
  let dialog, image, caption, trigger, scrollX, scrollY;
  const lookup=new Map(assets.map(a=>[a.project+':'+a.node,a]));
  function create(){
    dialog=document.createElement('dialog');dialog.className='project-ui-lightbox';dialog.setAttribute('aria-label','高清界面预览');
    const close=document.createElement('button');close.type='button';close.className='ui-zoom-close';close.textContent='×';close.setAttribute('aria-label','关闭高清预览');
    const figure=document.createElement('figure');image=new Image();image.draggable=false;image.decoding='sync';caption=document.createElement('figcaption');caption.id='ui-zoom-caption';dialog.setAttribute('aria-describedby',caption.id);figure.append(image,caption);dialog.append(close,figure);document.body.append(dialog);
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.addEventListener('keydown',event=>event.stopPropagation());
    dialog.addEventListener('close',()=>{document.body.classList.remove('ui-zoom-open');trigger?.focus({preventScroll:true});window.scrollTo(scrollX,scrollY);image.removeAttribute('src');});
  }
  window.ProjectUIZoom={
    get(project,node){return lookup.get(project+':'+node);},
    open(asset,from){
      if(!asset)return;if(!dialog)create();
      trigger=from;scrollX=window.scrollX;scrollY=window.scrollY;
      image.alt=(asset.project==='safepaw'?'宠爱守护':'梦境哨兵')+' · '+asset.title+'高清界面';image.src=window.CeciliaAssetURL('assets/project-ui-details/'+asset.file);
      caption.textContent='点击图片外的空白处关闭';document.body.classList.add('ui-zoom-open');dialog.showModal();
    }
  };
})();
