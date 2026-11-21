"""Add the user's actual certificate file, without redrawing its type, marks or signatures.
Usage: python scripts/add-icod-certificate.py certificate.png  (or .jpg / .pdf)
"""
from pathlib import Path
import json, shutil, sys
import fitz
from PIL import Image, ImageOps
source=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]/'assets/icod'
if source.suffix.lower()=='.pdf':
 doc=fitz.open(source)
 assert len(doc)==1,'Supply the single-page participation certificate.'
 p=doc[0];pix=p.get_pixmap(matrix=fitz.Matrix(2560/p.rect.width,2560/p.rect.width),alpha=False)
 im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
 full='certificate.webp';im.save(root/full,quality=98,method=6)
else:
 assert source.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}
 full='certificate'+source.suffix.lower();shutil.copyfile(source,root/full)
 im=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
im.thumbnail((1600,1600));im.save(root/'certificate-preview.webp',quality=94,method=6)
p=root/'manifest.json';data=json.loads(p.read_text());data['certificate']={'label':'王钰欣 · TASA–ICoD 工作坊参与证书','image':full,'preview':'certificate-preview.webp','source':source.name}
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Certificate added from the original file. No redrawing or fabricated signatures.')
