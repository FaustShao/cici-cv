const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const project = path.resolve(__dirname,'..');
const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/cici-cv/';
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
  if (entry.name.startsWith('.')) return [];
  const file = path.join(dir,entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:820},isMobile:width<700,hasTouch:width<700});
      const errors = [], requests = [];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400) errors.push(r.url())});
      page.on('request',r=>requests.push(r.url()));
      await page.goto(new URL('cardinal.html',root).href);
      const data = await page.evaluate(()=>cardinalCatalog);
      const roster = page.locator('.character');
      assert.equal(await roster.count(),27);
      const all = [...data.characters,...data.sections.flatMap(s=>s.items)];
      const versions = all.flatMap(i=>[i,...(i.layers || []),...(i.motions || [])]);
      const inputs = path.join(project,'InKore');
      assert.deepEqual(new Set(versions.flatMap(v=>v.sources)),new Set(walk(inputs).map(f=>path.relative(inputs,f))));
      for (const item of versions) {
        for (const key of ['full','thumb','sheet','download']) {
          if (item[key]) assert.ok(fs.existsSync(path.join(project,'assets/cardinal/archive',item[key])));
        }
      }
      const sheets = versions.filter(v=>v.sheet).map(v=>v.sheet);
      assert.ok(!requests.some(url=>sheets.some(sheet=>url.includes(sheet))));
      for (const i of [0,1,2,3]) {
        const card = roster.nth(i);
        await card.locator('.character-action').click();
        const canvas = card.locator('canvas');
        await canvas.waitFor();
        // Read the actual rendered pixels; advancing a frame label alone is insufficient.
        const first = await canvas.evaluate(c=>c.toDataURL());
        await page.waitForFunction(({first,i})=>{
          const c = document.querySelectorAll('.character')[i].querySelector('canvas');
          return c && c.toDataURL() !== first;
        },{first,i},{timeout:4500,polling:65});
        assert.equal(await page.locator('.character canvas').count(),1);
      }
      await roster.nth(3).locator('.character-action').click();
      assert.equal(await page.locator('.character canvas').count(),0);
      const detail = page.locator('#archive-view');
      const travel = roster.filter({hasText:'旅行者'});
      await travel.locator('.art-details').click();
      assert.equal(await detail.locator('#archive-versions button').count(),4);
      await detail.getByRole('button',{name:'逐帧原画',exact:true}).click();
      await detail.locator('canvas').waitFor();
      await detail.locator('#frame-next').click();
      const paused = await detail.locator('#frame-number').innerText();
      await page.waitForTimeout(280);
      assert.equal(await detail.locator('#frame-number').innerText(),paused);
      await detail.locator('#frame-prev').click();
      assert.notEqual(await detail.locator('#frame-number').innerText(),paused);
      await detail.locator('#archive-close').click();
      for (const [i,section] of data.sections.entries()) {
        await page.locator('#archive-tabs button').nth(i).click();
        const cards = page.locator('#archive-grid button');
        assert.equal(await cards.count(), section.items.length);
        await cards.first().click();
        await detail.locator('#archive-stage img').evaluate(img=>img.decode());
        if (section.items[0].motions) await detail.locator('canvas').waitFor();
        await detail.locator('#item-next').click();
        assert.equal(await detail.locator('#archive-name').innerText(),section.items[1].title);
        await detail.locator('#archive-close').click();
      }
      await page.getByRole('button',{name:'角色与卡牌设定',exact:true}).click();
      await page.locator('#archive-grid button').filter({hasText:'死灵法师 · 卡面合成'}).click();
      for (const label of ['背景','中景','前景','完整卡面']) {
        await detail.getByRole('button',{name:label,exact:true}).click();
        await detail.locator('#archive-stage img').evaluate(img=>img.decode());
      }
      await detail.locator('#archive-close').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      assert.deepEqual(errors,[]);
      console.log('PASS CARDINAL archive, rendered motion, layers and navigation at',width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
