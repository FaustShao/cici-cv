import { versionedURL } from "./world-base.js";
// Prepare final canvases before the scene is revealed. Switching never paints a provisional card.
export async function prepareLabCovers(projects, contentRoot) {
  return new Map(await Promise.all(projects.map(async project => {
    const card = document.createElement('canvas'); card.width = 1400; card.height = 900;
    const ctx = card.getContext('2d');
    if (project.cover) {
      try {
        const cover = new Image(); cover.decoding = 'async'; cover.src = versionedURL(project.cover, contentRoot);
        await cover.decode();
        ctx.fillStyle = '#f3f4f2'; ctx.fillRect(0,0,1400,900);
        const scale = Math.max(1400 / cover.naturalWidth,900 / cover.naturalHeight);
        const width = cover.naturalWidth*scale, height = cover.naturalHeight*scale;
        ctx.drawImage(cover,(1400-width)/2,(900-height)/2,width,height);
        card.dataset.source = project.cover;
        return [project,card];
      } catch (error) {
        console.warn(`Project cover unavailable: ${project.name}`,error);
      }
    }
    // The text card is the final design for projects without supplied cover art, or a real load failure.
    ctx.fillStyle='#f9e8ce';ctx.fillRect(0,0,1400,900);
    ctx.fillStyle='#a65765';ctx.fillRect(80,80,1240,12);ctx.fillRect(80,808,1240,12);
    ctx.fillStyle='#56344f';ctx.textAlign='left';ctx.font='400 64px Xiaolai';
    const parts=project.name.length>15?[project.name.slice(0,15),project.name.slice(15)]:[project.name];
    parts.forEach((part,i)=>ctx.fillText(part,100,240+i*80));
    ctx.font='400 34px Xiaolai';ctx.fillText(project.tags.join(' · '),100,560);ctx.fillText('点击阅读项目记录 ↗',100,710);
    card.dataset.source='text';return [project,card];
  })));
}
