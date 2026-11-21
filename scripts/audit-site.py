"""Fail publication if legacy UI, redirect entry documents or missing references return."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,parse_qs
import json,re,sys
root=Path(sys.argv[1]if len(sys.argv)>1 else 'public').resolve()
release=json.loads((root/'release.json').read_text());revision=release['revision'];errors=[]
for name in ['island.css','island-ui.js','island-scene.js','island-models.js','app.js','styles.css','world-resume.css','site.js','site.css','click-sounds.html','cecilia-world/review','assets/vendor/three.module.min.js','assets/vendor/FontLoader.js','assets/vendor/TextGeometry.js','assets/vendor/RoundedBoxGeometry.js']:
 if(root/name).exists():errors.append('Legacy file still published: '+name)
class Check(HTMLParser):
 def __init__(self,file):super().__init__();self.file=file
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta'and a.get('http-equiv','').lower()=='refresh':errors.append('Redirect entry document: '+str(self.file))
  for key in ['src','href']:
   value=a.get(key,'');u=urlsplit(value)
   if not u.path or u.scheme or u.netloc or value.startswith(('#','/')):continue
   target=(self.file.parent/unquote(u.path)).resolve()
   if not target.is_relative_to(root)or not target.exists():errors.append(f'Missing reference: {self.file.relative_to(root)} -> {value}')
   elif target.suffix in {'.html','.js','.css'}and parse_qs(u.query).get('build')!=[revision]:errors.append(f'Unversioned runtime: {value}')
for p in root.rglob('*.html'):
 text=p.read_text();Check(p).feed(text)
 if re.search(r'location\.(?:replace|assign)\(',text):errors.append('Entry still uses script redirect: '+str(p.relative_to(root)))
for p in root.rglob('*.css'):
 for _,value in re.findall(r'url\(\s*(["\']?)([^)"\']+)\1\s*\)',p.read_text()):
  u=urlsplit(value)
  if not u.path or u.scheme or u.netloc or value.startswith(('#','/')):continue
  if not(p.parent/unquote(u.path)).resolve().is_file():errors.append(f'Missing CSS resource: {p.relative_to(root)} -> {value}')
for name in ['index.html','portfolio.html','works.html','bruno-preview/hub.html','bruno-preview/index.html']:
 text=(root/name).read_text()
 if 'name="cecilia-world-root"'not in text or 'id="world"'not in text:errors.append('Alias is not the current application: '+name)
if errors:raise SystemExit('\n'.join(sorted(set(errors))))
print(f'PASS production revision {revision}: current entry documents, versioned runtime references, no legacy UI, all static HTML/CSS dependencies present.')
