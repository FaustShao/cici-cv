"""Export every supplied personal-document page in natural numeric order, without recolouring."""
import argparse,json,re
from pathlib import Path
import fitz
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[1]/'assets/sonicsense';root.mkdir(parents=True,exist_ok=True)
files=sorted(args.source.rglob('Yuxin_Wang_stage2_project_doc-*.pdf'),key=lambda f:tuple(map(int,re.findall(r'\d+',f.name.split('doc-')[1]))))
assert len(files)==19,f'Expected 19 PDF parts, got {len(files)}'
chapters=[{'id':'research','title':'技术研究','en':'RESEARCH','start':0},{'id':'future','title':'未来情境','en':'SCENARIOS','start':7},{'id':'touch','title':'触摸实验','en':'EXPERIMENT','start':18},{'id':'iteration','title':'形态迭代','en':'ITERATION','start':20},{'id':'outcomes','title':'最终成果','en':'OUTCOMES','start':22},{'id':'reflection','title':'个人反思','en':'REFLECTION','start':26}]
labels=[
('Sound Sensor in 2036','2036 年声学传感概念探索 · 个人过程档案'),
('原稿目录','研究、情境推演、产品设计与个人反思的完整记录'),
('发现技术的微弱信号','用弱信号与技术成熟度曲线判断探索方向'),
('声学传感能识别什么','关注接触振动与材料属性，梳理声学传感的应用范围'),
('收拢研究方向','比较应用价值、技术可行性、伦理问题与社会影响'),
('聚焦 SonicSense','以机器人接触式声学研究为起点，设想未来的可穿戴应用'),
('十年趋势推演','讨论触摸、振动数据与材料验证之间的关系'),
('情境发散','探索宠物、建筑、服装与盲盒等不同使用情境'),
('三种情境的比较','用分镜比较方案，并记录各情境带来的问题'),
('定格动画的制作','个人承担人物绘制，通过逐帧叙事检查故事细节'),
('伦理讨论与方向选择','讨论感知能力扩大后，隐私、选择权与信任受到的影响'),
('确定服装验证情境','设想消费者通过触摸核验服装材料声明'),
('为什么选择服装材料','结合技术边界、情境可控性与消费信任问题作出选择'),
('2036 世界观','推演材料检测如何从建筑安全进入零售与日常消费'),
('触摸的意义','讨论表面触感、内部信息和可验证数据之间的联系'),
('情境叙事流程','串联材料造假、监管、零售采用与消费者习惯等假设事件'),
('技术发展的未来想象','探索健康、交通、资源管理与设备协同的潜在应用'),
('情境探索的反思','记录技术可行性、社会需求与伦理判断之间的取舍'),
('产品系统的角色','概念由硅胶指套采集接触信息，腕部设备呈现结果'),
('触摸频率实验','用颜料接触纸张，观察拇指、食指和中指的接触分布'),
('形态草图','记录个人参与整理与绘制的多轮方案草图'),
('形态迭代逻辑','比较戒指、手套与指套，并调整佩戴方式和收纳尺寸'),
('最终原型与渲染','展示指套与腕部设备的概念结构、收纳和材质方案'),
('交互界面流程','呈现团队设计的信号采集、分析与材料结果反馈'),
('拼贴情境影片','个人负责整套拼贴场景视觉，用故事演示概念的使用情境'),
('未来商家宣传单','为 2036 世界观制作的虚构商业宣传材料'),
('补充研究：生物声学','记录早期支线研究及案例整理过程'),
('团队协作反思','梳理四人团队分工、讨论中的困难与个人收获'),
('全过程反思','回顾情境选择、形态迭代、表达方式与设计判断'),
('参考文献','保留原稿的技术研究、设计虚构与方法参考来源'),
('封底','Sound Sensor in 2036 · Yuxin Wang · April 2026')]
pages=[]
for f in files:
 doc=fitz.open(f)
 for local,page in enumerate(doc):
  index=len(pages);num=f'{index+1:02}';label,description=labels[index]
  scale=3000/page.rect.width;pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False)
  im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
  im.save(root/f'{num}.webp',quality=94,method=6)
  im.thumbnail((1500,1500));im.save(root/f'{num}-preview.webp',quality=89,method=6)
  im.thumbnail((440,440));im.save(root/f'{num}-thumb.webp',quality=84,method=6)
  chapter=next(c['id'] for c in reversed(chapters)if index>=c['start'])
  pages.append({'number':index+1,'title':label,'description':description,'chapter':chapter,'image':f'{num}.webp','preview':f'{num}-preview.webp','thumb':f'{num}-thumb.webp','width':page.rect.width,'height':page.rect.height,'source':f.name,'sourcePage':local+1})
assert len(pages)==31
(root/'manifest.json').write_text(json.dumps({'title':'Sound Sensor in 2036','chapters':chapters,'pages':pages},ensure_ascii=False,indent=2)+'\n')
print(f'Exported {len(pages)} original pages in order to {root}')
