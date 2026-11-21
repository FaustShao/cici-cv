"""Subset Noto Sans SC (SIL OFL) for the ICoD UI, leaving PDF typography intact."""
from pathlib import Path
import json,sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
root=Path(__file__).resolve().parents[1];site=root/'experiments/bruno-projects'
text=(site/'icod.html').read_text()+(site/'src/icod.js').read_text()+(root/'assets/icod/manifest.json').read_text()
text+='TASA-ICoD 国际设计工作坊'
font=TTFont(sys.argv[1]);s=subset.Subsetter();s.populate(text=text);s.subset(font)
font=instantiateVariableFont(font,{'wght':400},inplace=True);font.flavor='woff2';font.save(site/'public/fonts/icod-ui.woff2')
print('ICoD interface font built; original page typography untouched.')
