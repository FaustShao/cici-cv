"""Build the complete Chinese UI subset for the magazine (PDF glyphs stay in page artwork).
Usage: python scripts/build-haha-ui-font.py NotoSansSC-wght.ttf
Source: https://github.com/google/fonts/tree/main/ofl/notosanssc (SIL OFL 1.1).
"""
from pathlib import Path
import json, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
site = root / 'experiments/bruno-projects'
text = (site / 'haha-world.html').read_text() + (site / 'src/haha-world.js').read_text()
text += ''.join(p['label'] for p in json.loads((root / 'assets/haha-world/manifest.json').read_text())['pages'])
font = TTFont(sys.argv[1])
subsetter = subset.Subsetter(); subsetter.populate(text=text); subsetter.subset(font)
font = instantiateVariableFont(font, {'wght': 400}, inplace=True)
required = set(re.findall(r'[\u3000-\u9fff\uff00-\uffef]', text))
assert not {c for c in required if ord(c) not in font.getBestCmap()}
font.flavor = 'woff2'; font.save(site / 'public/fonts/haha-ui.woff2')
print('All Chinese UI glyphs covered at weight 400; original PDF typography unchanged.')
