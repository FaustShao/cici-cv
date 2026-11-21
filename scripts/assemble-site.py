"""Build the only production file tree. Run after the Vite build.
No historical UI, preview screenshots or alternate deployment paths are published.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,parse_qsl,urlencode
import hashlib,html,json,posixpath,re,shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir()
entries=['resume.html','tideline.html','safepaw.html','dream-sentinel.html','gazette.html']
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  for key in ['src','href']:
   if key in a:self.urls.append(a[key])
files=set(entries+['site-loader.js','site-loader.css','release-guard.js'])
for name in entries:
 links=Links();links.feed((ROOT/name).read_text())
 for value in links.urls:
  u=urlsplit(value);path=unquote(u.path)
  if u.scheme or path.startswith('assets/') or not path:continue
  if Path(path).suffix in ['.js','.css']:
   assert (ROOT/path).is_file(),f'Missing runtime dependency: {path}'
   files.add(path)
for name in sorted(files):shutil.copyfile(ROOT/name,OUT/name)
asset_dirs=['tideline','dream-sentinel','safepaw-family','gazette','gazette-research','gazette-desk','project-ui-details','haha-world','icod','resume']
for name in asset_dirs:shutil.copytree(ROOT/'assets'/name,OUT/'assets'/name)
shutil.copytree(ROOT/'assets/vendor/page-flip',OUT/'assets/vendor/page-flip')
for directory,patterns in [('portfolio-covers',['*-v3.webp']),('fonts',['huiwen*'])]:
 dest=OUT/'assets'/directory;dest.mkdir(parents=True,exist_ok=True)
 for pattern in patterns:
  for p in (ROOT/'assets'/directory).glob(pattern):shutil.copyfile(p,dest/p.name)
(OUT/'assets/click-options').mkdir(parents=True,exist_ok=True)
shutil.copyfile(ROOT/'assets/click-options/LICENSE.txt',OUT/'assets/click-options/LICENSE.txt')
shutil.copytree(ROOT/'cecilia-world',OUT/'cecilia-world')
shutil.rmtree(OUT/'cecilia-world/review',ignore_errors=True)
for p in (OUT/'cecilia-world/projects/images').glob('*'):
 if not p.name.endswith('-v3.webp'):p.unlink()
# Rebase the exact current application into its public addresses, without an intermediate page.
attr=re.compile(r'(?P<key>\b(?:src|href))=(?P<q>["\'])(?P<url>.*?)(?P=q)')
def application(source,alias,place=None):
 body=(OUT/source).read_text();srcdir=posixpath.dirname(source);destdir=posixpath.dirname(alias) or '.'
 def move(match):
  value=match['url'];u=urlsplit(value)
  if not value or value.startswith(('#','/')) or u.scheme or u.netloc:return match[0]
  target=posixpath.normpath(posixpath.join(srcdir,unquote(u.path)))
  value=posixpath.relpath(target,destdir)+(('?'+u.query)if u.query else '')+(('#'+u.fragment)if u.fragment else '')
  return f'{match["key"]}={match["q"]}{value}{match["q"]}'
 body=attr.sub(move,body)
 base=posixpath.relpath('cecilia-world',destdir)+'/'
 body=body.replace('name="cecilia-world-root" content="./"',f'name="cecilia-world-root" content="{base}"')
 if place:body=body.replace('</head>',f'<meta name="cecilia-initial-place" content="{place}"></head>')
 target=OUT/alias;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(body)
application('cecilia-world/hub.html','index.html')
application('cecilia-world/index.html','portfolio.html')
application('cecilia-world/hub.html','works.html','other')
application('cecilia-world/hub.html','bruno-preview/hub.html')
application('cecilia-world/index.html','bruno-preview/index.html')
# A historic direct reader bookmark opens the same current Gazette document, not a redirect shell.
shutil.copyfile(OUT/'gazette.html',OUT/'portfolio-local.html')
# Useful non-WebGL access remains; it uses only current project data, without the old site shell.
profile=json.loads((ROOT/'resume.js').read_text().split('=',1)[1].strip().rstrip(';'))
notes=[p for p in profile['projects']if p.get('collection')!='portfolio']
items=[]
for p in notes:
 link=f'<a href="{html.escape(p["url"])}">打开项目</a>'if p.get('url')else ''
 details=''.join(f'<li>{html.escape(t)}</li>'for t in p.get('details',[]))
 items.append(f'<article><h2>{html.escape(p["name"])}</h2><p>{html.escape(p["description"])}</p><ul>{details}</ul>{link}</article>')
(OUT/'other-projects.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>其他项目 · 王钰欣</title><style>@font-face{font-family:Xiaolai;src:url('cecilia-world/fonts/world-xiaolai.woff2')}body{max-width:900px;margin:0 auto;padding:32px 24px;background:#f9efdf;color:#493143;font:16px/1.8 Xiaolai,sans-serif}h1{font-size:28px}h2{font-size:22px}article{border-top:1px solid #b9869b;padding:20px 0}a{color:inherit}</style></head><body><a href="index.html#other">返回设计世界</a><h1>其他项目</h1>'''+''.join(items)+'</body></html>')
(OUT/'404.html').write_text('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面未找到 · Cecilia</title></head><body style="background:#f9efdf;color:#493143;font:16px/1.8 sans-serif;padding:8vw"><h1>这个地址暂时没有内容</h1><a href="/cici-cv/">返回王钰欣的设计世界</a></body></html>')
(OUT/'.nojekyll').touch()
# One content-derived revision for all manually maintained entry resources.
# Vite already fingerprints module imports; HTML/CSS font and document dependencies also need this.
h=hashlib.sha256();h.update(Path(__file__).read_bytes())
for p in sorted(OUT.rglob('*')):
 if p.is_file():
  h.update(str(p.relative_to(OUT)).encode())
  with p.open('rb') as stream:
   for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
revision=h.hexdigest()[:16]
def version(value,parent):
 u=urlsplit(html.unescape(value))
 if value=='/cici-cv/':return value+'?build='+revision
 if not u.path or u.scheme or u.netloc or value.startswith(('#','/')):return value
 target=(parent/unquote(u.path)).resolve()
 if not target.is_relative_to(OUT) or not target.is_file():return value
 if target.suffix.lower()not in {'.html','.js','.css','.woff2','.ttf','.otf','.png','.webp','.svg','.jpg'}:return value
 query=dict(parse_qsl(u.query));query['build']=revision
 return u.path+'?'+urlencode(query)+(('#'+u.fragment)if u.fragment else '')
# An inline pre-paint gate also covers cached HTML and browser back/forward restores.
for p in OUT.rglob('*.html'):
 directory=posixpath.relpath('.',str(p.relative_to(OUT).parent))+'/'
 guard=posixpath.relpath('release-guard.js',str(p.relative_to(OUT).parent))
 boot=(f'<meta name="cecilia-release" content="{revision}">'
       f'<meta name="cecilia-release-root" content="{directory}">'
       '<style>html[data-release-state="checking"] body{visibility:hidden;opacity:0!important;pointer-events:none}</style>'
       '<script>document.documentElement.dataset.releaseState="checking";</script>'
       f'<script src="{guard}" onerror="delete document.documentElement.dataset.releaseState"></script>')
 body=p.read_text()
 charset=re.search(r'<meta charset=[^>]+>',body)
 encoding=charset[0] if charset else '<meta charset="utf-8">'
 if charset:body=body.replace(encoding,'',1)
 body=body.replace('<head>','<head>'+encoding+boot,1)
 body=re.sub(r'url\(\s*(["\']?)([^)"\']+)\1\s*\)',lambda m:'url('+m[1]+version(m[2],p.parent)+m[1]+')',body)
 p.write_text(body)
for p in OUT.rglob('*'):
 if p.suffix=='.html':
  body=p.read_text();body=attr.sub(lambda m:f'{m["key"]}={m["q"]}{version(m["url"],p.parent)}{m["q"]}',body)
  def responsive(match):
   if match[3].startswith('data:'):return match[0]
   candidates=[]
   for candidate in match[3].split(','):
    parts=candidate.strip().split();candidates.append(version(parts[0],p.parent)+(' '+' '.join(parts[1:]) if len(parts)>1 else ''))
   return match[1]+'='+match[2]+', '.join(candidates)+match[2]
  body=re.sub(r'\b(imagesrcset|srcset)=(["\'])(.*?)\2',responsive,body)
  p.write_text(body)
 elif p.suffix=='.css':
  body=p.read_text();body=re.sub(r'url\(\s*(["\']?)([^)"\']+)\1\s*\)',lambda m:'url('+m[1]+version(m[2],p.parent)+m[1]+')',body);p.write_text(body)
report={'revision':revision,'entrypoints':['index.html','portfolio.html','works.html','resume.html','bruno-preview/hub.html','bruno-preview/index.html',*entries[1:],'cecilia-world/haha-world.html','cecilia-world/icod.html'],'runtime_files':sorted(files),'excluded':['island*.js','island.css','app.js','styles.css','world-resume.css','site.js','site.css','click-sounds.html','cecilia-world/review','assets/vendor/three.module.min.js','*-v2.webp','legacy redirect documents'],'entry_mode':'current application HTML; no intermediate redirect','resource_versioning':'content-derived build query + Vite module hashes'}
(OUT/'release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Assembled revision {revision}: {len(report["entrypoints"])} current entries; {len(files)} root runtime files; no legacy interface or review assets.')
