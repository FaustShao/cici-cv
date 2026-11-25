"""Fail publication if legacy UI, redirect entry documents or missing references return."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,parse_qs
import hashlib,json,re,sys
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
   elif target.parent==root/'cecilia-world/assets' and re.fullmatch(r'.+-[\w-]{8}\.js',target.name):
    if u.query:errors.append(f'Hashed module URL differs from its imports: {value}')
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
# The opt-in image map must never publish a missing or altered alternative.
image_manifest=root/'assets/project-lossless/manifest.json'
if image_manifest.exists():
 for record in json.loads(image_manifest.read_text())['files']:
  for key,expected in [('source',record['sourceSha256']),('target',record.get('sha256'))]:
   if not expected:continue
   path=(root/record[key]).resolve()
   if not path.is_relative_to(root)or not path.is_file():
    errors.append('Missing image source/alternative: '+record[key]);continue
   with path.open('rb')as stream:actual=hashlib.file_digest(stream,'sha256').hexdigest()
   if actual!=expected:errors.append('Image checksum differs from verified conversion: '+record[key])
  if record['status']=='webp'and record['bytes']>=record['originalBytes']:
   errors.append('Image alternative is not smaller: '+record['target'])
mobile_map=(root/'project-mobile-previews.js').read_text()
for source,target in json.loads(mobile_map.split('Object.entries(',1)[1].split(').map',1)[0]).items():
 path=root/target
 if not (root/source).is_file() or not path.is_file():
  errors.append('Missing mobile artwork or full image: '+target)
 elif hashlib.sha256(path.read_bytes()).hexdigest()[:20]!=path.stem:
  errors.append('Mobile artwork checksum mismatch: '+target)
if errors:raise SystemExit('\n'.join(sorted(set(errors))))
print(f'PASS production revision {revision}: current entry documents, versioned runtime references, no legacy UI, all static HTML/CSS dependencies present.')
