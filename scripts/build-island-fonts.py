"""Build local OFL subsets and extrudable Fredoka outlines.
Usage: python scripts/build-island-fonts.py Fredoka.ttf NotoSansSC.ttf
Requires fonttools[woff] for development only. Licenses in assets/fonts.
"""
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen

root=Path(__file__).resolve().parents[1]
options=subset.Options()
options.flavor='woff2'
latin=TTFont(sys.argv[1])
subsetter=subset.Subsetter(options=options)
subsetter.populate(unicodes=range(0x20,0x250))
subsetter.subset(latin)
latin.flavor='woff2'
latin.save(root/'assets/fonts/fredoka.woff2')
chinese=TTFont(sys.argv[2])
text=''.join((root/file).read_text() for file in ['index.html','island-ui.js','island-models.js','island-scene.js','resume.js'])
text+='个人简历作品集其他项目联系方式王钰欣工业设计交互设计打开完整阅读翻阅上一件下一件海藻茶循环服务未来地方志梦境哨兵写邮件打电话复制微信国际设计工作坊游戏用户研究'
subsetter=subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(chinese)
chinese.flavor='woff2'
chinese.save(root/'assets/fonts/island-sc.woff2')
font=instantiateVariableFont(TTFont(sys.argv[1]),{'wght':650,'wdth':100},inplace=False)
glyph_set=font.getGlyphSet()
scale=1000/font['head'].unitsPerEm

class OutlinePen(BasePen):
    def __init__(self):
        super().__init__(glyph_set)
        self.commands=[]
        self.start=None
    def nums(self,values): return ' '.join(str(round(v,2)) for p in values for v in p)
    def _moveTo(self,p): self.start=p;self.commands.append('m '+self.nums([p]))
    def _lineTo(self,p): self.commands.append('l '+self.nums([p]))
    def _qCurveToOne(self,c,p): self.commands.append('q '+self.nums([p,c]))
    def _curveToOne(self,a,b,p): self.commands.append('b '+self.nums([p,a,b]))
    def _closePath(self): self.commands.append('l '+self.nums([self.start]))
    def _endPath(self): pass

glyphs={}
for char in ' CeciliaABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./&':
    name=font.getBestCmap().get(ord(char))
    if not name: continue
    pen=OutlinePen()
    glyph_set[name].draw(TransformPen(pen,(scale,0,0,scale,0,0)))
    glyphs[char]={'ha':font['hmtx'][name][0]*scale,'o':' '.join(pen.commands)}
data={'glyphs':glyphs,'familyName':'Fredoka','resolution':1000,'boundingBox':{'yMin':-250,'yMax':1100},'underlineThickness':50}
(root/'assets/fonts/fredoka.typeface.json').write_text(json.dumps(data,separators=(',',':')))
