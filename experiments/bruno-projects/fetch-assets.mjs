// Reproducible upstream asset acquisition, pinned to Bruno's MIT-licensed commit.
import {mkdir,stat,readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const run=promisify(execFile),base=new URL('.',import.meta.url).pathname;
const commit='41046b57eeed8d156d9c3fd7fa259900baef7816';
const assets=['areas/areas.glb','terrain/terrain.glb','terrain/terrain.png','palette.png','floor/slabs.png','foliage/foliageSDF.png','scenery/scenery.glb','oakTrees/oakTreesVisual.glb','oakTrees/oakTreesReferences.glb','birchTrees/birchTreesVisual.glb','birchTrees/birchTreesReferences.glb','cherryTrees/cherryTreesVisual.glb','cherryTrees/cherryTreesReferences.glb','bushes/bushesReferences.glb','benches/benches.glb','fences/fences.glb','lanterns/lanterns.glb','poleLights/poleLights.glb'];
let next=0;const manifest=[];
async function worker(){while(next<assets.length){const name=assets[next++],path=resolve(base,'public/bruno',name);await mkdir(dirname(path),{recursive:true});let existing=await stat(path).catch(()=>null);if(!existing?.size)await run('curl',['-L','--fail','--retry','2','--max-time','180',`https://raw.githubusercontent.com/brunosimon/folio-2025/${commit}/static/${name}`,'-o',path]);const buffer=await readFile(path);manifest.push({path:name,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')});console.log(name,buffer.length);}}
await Promise.all(Array.from({length:4},worker));
await run('curl',['-L','--fail','--max-time','30',`https://raw.githubusercontent.com/brunosimon/folio-2025/${commit}/license.md`,'-o',resolve(base,'public/BRUNO-LICENSE.txt')]);
await writeFile(resolve(base,'public/bruno/manifest.json'),JSON.stringify({repository:'https://github.com/brunosimon/folio-2025',commit,assets:manifest.sort((a,b)=>a.path.localeCompare(b.path))},null,2));
