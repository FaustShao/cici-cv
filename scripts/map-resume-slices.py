"""Read-only registration of user PNG slices against their original PDF renders.
Development tool only: requires OpenCV. Outputs measurements, not a new design.
"""
import cv2, json, sys, subprocess
import numpy as np
from pathlib import Path

folder=Path('assets/resume/slices/cv拆分')
if not Path('/tmp/resume-full-1.png').exists():
    subprocess.run(['pdftoppm','-scale-to-x','1588','-scale-to-y','2248','-png','assets/resume/wang-yuxin-resume.pdf','/tmp/resume-full'],check=True)
pages=[cv2.imread('/tmp/resume-full-%d.png'%i) for i in (1,2)]
gray=[cv2.cvtColor(p,cv2.COLOR_BGR2GRAY) for p in pages]
result=[]
for path in sorted(folder.glob('*.png')):
    if path.name.startswith('Divider'):continue
    art=cv2.imread(str(path),cv2.IMREAD_UNCHANGED)
    h,w=art.shape[:2]
    if art.shape[2]==4:
        alpha=art[:,:,3:4]/255
        flat=(art[:,:,:3]*alpha+255*(1-alpha)).astype(np.uint8)
    else:flat=art
    template=cv2.cvtColor(cv2.resize(flat,(round(w/1.5),round(h/1.5)),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY)
    candidates=[]
    for page,reference in enumerate(gray,1):
        score=cv2.matchTemplate(reference,template,cv2.TM_CCOEFF_NORMED)
        _,confidence,_,location=cv2.minMaxLoc(score)
        candidates.append((confidence,page,location))
    confidence,page,(x,y)=max(candidates)
    result.append(dict(file=path.name,page=page,x=x,y=y,w=w/1.5,h=h/1.5,pixelWidth=w,pixelHeight=h,confidence=round(confidence,5)))
    print(path.name,page,x,y,round(confidence,4),file=sys.stderr)
# Four identical full-width divider exports and one shorter header rule.
lines=[]
for page,reference in enumerate(gray,1):
    rows=np.where((reference[:,90:1498]<175).mean(axis=1)>.985)[0]
    groups=[]
    for y in rows:
        if not groups or y>groups[-1][-1]+1:groups.append([int(y)])
        else:groups[-1].append(int(y))
    for group in groups:lines.append((page,group[0]))
for file,(page,y) in zip(['Divider-1.png','Divider-2.png','Divider-3.png','Divider-4.png'],lines):
    result.append(dict(file=file,page=page,x=88,y=y,w=1412,h=2,pixelWidth=2118,pixelHeight=3,confidence=1))
short=np.where((gray[0][:400,90:1240]<175).mean(axis=1)>.985)[0]
result.append(dict(file='Divider.png',page=1,x=88,y=int(short[0]),w=1154,h=2,pixelWidth=1731,pixelHeight=3,confidence=1))
print(json.dumps(dict(width=1588,height=2248,layers=result),ensure_ascii=False))
