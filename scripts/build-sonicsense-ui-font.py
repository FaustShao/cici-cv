"""Build a complete Noto Sans SC UI subset; original PDF typography is unchanged."""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
root=Path(__file__).resolve().parents[1];site=root/'experiments/bruno-projects'
text=(site/'sonicsense.html').read_text()+(site/'src/sonicsense.js').read_text()+(root/'assets/sonicsense/manifest.json').read_text()
text+='Sound Sensor in 2036 · 声学传感概念探索'
font=TTFont(sys.argv[1]);s=subset.Subsetter();s.populate(text=text);s.subset(font)
font=instantiateVariableFont(font,{'wght':400},inplace=True);font.flavor='woff2';font.save(site/'public/fonts/sonicsense-ui.woff2')
print('SonicSense UI font built with all Chinese characters.')
