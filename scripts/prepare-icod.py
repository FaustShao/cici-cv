"""Render the two original ICoD PDFs, preserving page order, framing and colour."""
import argparse, json
from pathlib import Path
import fitz
from PIL import Image
parser=argparse.ArgumentParser()
parser.add_argument('mid',type=Path)
parser.add_argument('final',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'assets/icod'
root.mkdir(parents=True,exist_ok=True)
labels={
'mid':['2050：恶化情境','可持续性情境矩阵','全球升温','冰川消融与海平面','蚊虫繁殖','干旱与水资源','山火风险','气候迁徙','数字生活方式','社会差距','文化遗产','文化多样性','消费','生产','能源','技术','健康影响概览','健康风险分类','蚊媒疾病','儿童与孕妇','讨论'],
'final':['Prot-mask：呼吸防护面罩','2050情境矩阵','空气污染情境','呼吸系统健康影响','目标使用人群','呼吸防护面罩','主要设计问题','佩戴体验考量','初步草图','方案深化','原型建模','呼吸阀结构','过滤材料结构','面部特征与表达','个性化定制','讨论']}
sections=[]
for key,filename,title,subtitle in [('final',args.final,'最终设计','132 · 呼吸防护面罩'),('mid',args.mid,'中期研究','2408 · 2050情境推演')]:
 doc=fitz.open(filename)
 folder=root/key;folder.mkdir(exist_ok=True)
 pages=[]
 assert len(doc)==len(labels[key])
 for i,page in enumerate(doc):
  pix=page.get_pixmap(matrix=fitz.Matrix(2560/page.rect.width,2560/page.rect.width),alpha=False)
  im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
  stem=f'{i+1:02}'
  im.save(folder/f'{stem}.webp',quality=94,method=6)
  im.thumbnail((1200,1200));im.save(folder/f'{stem}-preview.webp',quality=88,method=6)
  im.thumbnail((480,480));im.save(folder/f'{stem}-thumb.webp',quality=84,method=6)
  pages.append({'number':i+1,'label':labels[key][i],'image':f'{key}/{stem}.webp','preview':f'{key}/{stem}-preview.webp','thumb':f'{key}/{stem}-thumb.webp'})
 sections.append({'id':key,'title':title,'subtitle':subtitle,'source':filename.name,'pages':pages})
data={'title':'2050 / Prot-mask','sections':sections}
if (root/'manifest.json').exists():
 old=json.loads((root/'manifest.json').read_text())
 if 'certificate' in old:data['certificate']=old['certificate']
(root/'manifest.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('Rendered',sum(len(s['pages']) for s in sections),'pages; final 16 / interim 21. Original artwork unchanged.')
