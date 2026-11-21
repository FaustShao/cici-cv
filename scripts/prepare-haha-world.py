"""Render the three supplied PDF parts in reading order without cropping any source page.
Usage: python scripts/prepare-haha-world.py part-1.pdf part-2.pdf part-3.pdf
Requires PyMuPDF, Pillow and NumPy. This runs offline; no uploaded document is sent elsewhere.
"""
from pathlib import Path
import sys, json
import fitz
import numpy as np
from PIL import Image

out = Path(__file__).resolve().parent.parent / 'assets/haha-world'
for folder in ['pages', 'thumbs']:
    (out / folder).mkdir(parents=True, exist_ok=True)
if len(sys.argv) != 4:
    raise SystemExit('Provide part-1.pdf, part-2.pdf, part-3.pdf in that order.')
manifest = {'title': '哈哈世界 · VI 视觉识别系统手册', 'pages': [], 'parts': []}
number = 0
for part, source in enumerate(sys.argv[1:], 1):
    document = fitz.open(source)
    manifest['parts'].append({'part': part, 'start': number + 1, 'count': len(document)})
    for local, page in enumerate(document):
        number += 1
        width, height = page.rect.width, page.rect.height
        if number == 1:
            manifest.update(width=width, height=height)
        assert abs(width / height - manifest['width'] / manifest['height']) < 1e-5
        pix = page.get_pixmap(matrix=fitz.Matrix(2400 / width, 2400 / width), alpha=False)
        image = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        image.save(out / f'pages/{number:02}.webp', quality=94, method=6)
        image.thumbnail((320, 240))
        image.save(out / f'thumbs/{number:02}.webp', quality=84, method=6)
        text = page.get_text().strip()
        manifest['pages'].append({'src': f'../assets/haha-world/pages/{number:02}.webp', 'thumb': f'../assets/haha-world/thumbs/{number:02}.webp', 'number': number, 'part': part, 'sourcePage': local + 1, 'text': text, 'label': text.splitlines()[0] if text else f'第{number}页'})
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
# Extract only the existing white smile logotype in the lower half of the supplied cover.
cover = Image.open(out / 'pages/01.webp').convert('RGB')
a = np.array(cover); h, w = a.shape[:2]
mask = np.all(a > 225, axis=2); mask[:int(h * .48)] = False
y, x = np.where(mask)
crop = a[y.min()-5:y.max()+6, x.min()-5:x.max()+6]
alpha = np.clip((crop[:, :, 2].astype(float) - 6) / 249 * 255, 0, 255).astype('uint8')
logo = Image.new('RGBA', (crop.shape[1], crop.shape[0]), 'white'); logo.putalpha(Image.fromarray(alpha)); logo.save(out / 'logo.png')
# The sole added printed page: a brand-orange back cover with the original logo.
back = Image.new('RGB', (w, h), '#ff8d06')
logo.thumbnail((int(w * .42), int(h * .25)), Image.Resampling.LANCZOS)
back.paste(logo, ((w - logo.width)//2, (h - logo.height)//2), logo)
back.save(out / 'pages/back.webp', quality=95)
Image.new('RGB', (w, h), 'white').save(out / 'pages/inside-back.webp', quality=90)
grain = np.clip(np.random.default_rng(24).normal(246, 6, (256, 256)), 215, 255).astype('uint8')
Image.fromarray(grain).save(out / 'paper-grain.png')
print(f'{number} unaltered original pages + blank inside back + branded back cover.')
