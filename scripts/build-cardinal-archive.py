"""Rebuild CARDINAL's browser editions from InKore (Pillow, psd-tools, PyMuPDF).
Source paths are recorded so new material cannot silently disappear from the archive.
"""
from pathlib import Path
import hashlib
import json
import math
import shutil

import fitz
from PIL import Image, ImageOps
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'InKore'
OUT = ROOT / 'assets/cardinal/archive'
OUT.mkdir(parents=True, exist_ok=True)
FILES = sorted(p.relative_to(SOURCE).as_posix() for p in SOURCE.rglob('*')
               if p.is_file() and not p.name.startswith('.')
               and not p.is_relative_to(SOURCE / 'UI References') and p != SOURCE / 'reference.pur')
covered = set()
characters = []
sections = {}
resample = Image.Resampling.LANCZOS


def token(text):
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def register(paths):
    covered.update(paths)
    return paths


def edition(im, name, limit):
    im = im.convert('RGBA')
    im.thumbnail((limit, limit), resample)
    path = name + '.webp'
    im.save(OUT / path, quality=93, method=4)
    return path


def still(title, paths, im=None):
    if im is None:
        im = ImageOps.exif_transpose(Image.open(SOURCE / paths[0]))
        # Loose marks may occupy a few pixels on a full-size layout canvas.
        # Keep every painted pixel; character layers and animation frames stay registered.
        if paths[0].startswith(('Boss 素材/', 'UI Component/', 'UI 2.5/UI Assets Seperete/')) and 'A' in im.getbands():
            box = im.getchannel('A').getbbox()
            if box and box[2]-box[0] < .65*im.width and box[3]-box[1] < .65*im.height:
                im = im.crop(box)
                im = ImageOps.expand(im, border=max(2,round(max(im.size)*.04)), fill=(0,0,0,0))
    key = token('|'.join(paths) + title)
    full = edition(im, key, 1920)
    thumb = edition(im, key + '-sm', 320) if max(im.size) > 320 or paths[0].startswith(('Boss 素材/', 'UI Component/', 'UI 2.5/UI Assets Seperete/')) else full
    return dict(title=title, thumb=thumb, full=full, sources=register(paths))


def add(section, record):
    sections.setdefault(section, []).append(record)
    return record


def folder(name):
    return [p for p in FILES if p.startswith(name + '/')]


def motion(title, paths):
    """Use the entire source canvas and identical framing in every cell."""
    side = 416
    if len(paths) == 1:
        gif = Image.open(SOURCE / paths[0])
        count = gif.n_frames
    else:
        gif = None
        count = len(paths)
    columns = math.ceil(math.sqrt(count))
    sheet = Image.new('RGBA', (columns * side, math.ceil(count / columns) * side))
    durations = []
    first = None
    distinct = set()
    for i in range(count):
        if gif:
            gif.seek(i)
            frame = gif.convert('RGBA')
            durations.append(gif.info.get('duration') or 80)
        else:
            frame = Image.open(SOURCE / paths[i]).convert('RGBA')
            durations.append(80)
        frame.thumbnail((side-12, side-12), resample)
        cell = Image.new('RGBA', (side, side))
        cell.paste(frame, ((side-frame.width)//2, (side-frame.height)//2))
        if first is None:
            first = cell
        distinct.add(hashlib.sha256(cell.tobytes()).digest())
        sheet.paste(cell, (i % columns * side, i // columns * side))
    assert len(distinct) > 1, paths
    name = token('|'.join(paths))
    sheet.save(OUT / (name + '.webp'), quality=94, method=4)
    return dict(title=title, sheet=name+'.webp', side=side, columns=columns,
                durations=durations, sources=register(paths)), first


# The numbered GIFs have no character names. These pairings were checked visually.
gif_names = {
    '(1)':'祀，剑誓领主', '(10)':'游侠', '(11) (1)':'斥候', '(11)':'战士',
    '(12)':'旅行者', '(13)':'迷雾法师', '(14)':'学徒', '(2) (1)':'灵，希望信使',
    '(2)':'火球法师', '(3) (1)':'剑誓学徒', '(3)':'模仿者', '(4)':'大亨',
    '(5) (1)':'后勤专家', '(5)':'剑誓先知', '(6) (1)':'忍者', '(6)':'充能法师',
    '(7) (1)':'莫诺，破界之点', '(7)':'盾卫', '(8)':'小贩', '(9)':'草药师', '':'希斯，梦中豪杰'
}
roster = {}
for path in folder('png character'):
    title = Path(path).stem
    roster[title] = still('章鱼 Boss' if title == 'Boss' else title, [path])
    characters.append(roster[title])
for path in folder('gif'):
    name = gif_names[Path(path).stem.partition('09 31 47')[2].strip()]
    roster[name]['motions'] = [motion('角色动作', [path])[0]]
traveller = roster['旅行者']['motions']
traveller.append(motion('另一版 GIF', ['动画/17 gif character.gif'])[0])
png_frames = sorted((p for p in folder('动画') if p.endswith('.png')), key=lambda p: int(Path(p).stem))
traveller.append(motion('逐帧原画', png_frames)[0])

boss = 'Boss 与特效'
for dirname, title, character in [
    ('小幽灵/幽灵平常','小幽灵 · 平常','虚无的灵魂'), ('小幽灵/攻击','小幽灵 · 攻击','虚无的灵魂'),
    ('章鱼/章鱼平常png','章鱼 · 平常','Boss'), ('烟雾/烟雾日常','烟雾 · 日常',None)
]:
    paths = folder('Boss 素材/' + dirname)
    clip, poster = motion(title, paths)
    entry = still(title, paths, poster)
    entry['motions'] = [clip]
    add(boss, entry)
    if character:
        roster[character].setdefault('motions', []).append(clip)
for path in folder('Boss 素材'):
    if path not in covered:
        parts = Path(path).parts
        add(boss, still(parts[1]+' · '+Path(path).stem, [path]))

process = '低保真与界面方案'
concept = '角色与卡牌设定'
ui = '界面组件'
materials = '纸纹与胶带'
menu = '开始菜单'
icons = '地图与图标'
design_names = {
    'Book UI.ai':['书本界面 · 九宫格线框'],
    'Main Game UI.ai':['界面图形与按钮','彩色卡牌布局','棋盘与操作区布局'],
    'UI Assets Iteration 1.ai':['早期组件 · 矢量稿'], 'GDM Showcase.ai':['早期战斗界面'],
    'New Game UI.psd':'书本界面 · 线框画板','Book UI.psd':'书本界面 · 双画板',
    'UI.PSD':'角色书 · 棋盘布局','UI彩铅.PSD':'角色书 · 彩铅方案',
    'UI 1.22.PSD':'角色、对手与道具的纸张布局','ui2.0.PSD':'铅笔棋盘方案',
    'Start Menu.PSD':'开始菜单 · 合成稿','UI Assets Iteration 1.psd':'早期组件 · 分层稿',
    'Character.psd':'角色书 · 战士','Recruite.psd':'招募者 · 剪影稿',
    'boxes.PSD':'手绘纸框','章鱼boss.PSD':'章鱼 · 分层原稿',
    '人物卡牌.PSD':'四张手绘卡牌','图标.PSD':'节点图标 · 分层稿'
}
for path in FILES:
    p = Path(path)
    if p.suffix.lower() == '.ai':
        with fitz.open(SOURCE / path) as doc:
            for page, title in zip(doc, design_names[p.name], strict=True):
                pix = page.get_pixmap(alpha=False)
                add(process, still(title,[path],Image.frombytes('RGB',(pix.width,pix.height),pix.samples)))
    if p.suffix.lower() == '.psd':
        group = process
        if path.startswith('Boss/'): group = boss
        elif p.stem in ('Character','Recruite','人物卡牌'): group = concept
        elif p.stem == 'Start Menu': group = menu
        elif p.stem == '图标': group = icons
        elif p.stem == 'boxes': group = ui
        title = design_names.get(p.name, '角色书 · 纸张与物件' if path.startswith('Character Book') else '桌面纸张与物件')
        document = PSDImage.open(SOURCE/path)
        preview = document.topil()
        entry = add(group, still(title, [path], preview))
        artboards = [layer for layer in document if layer.kind == 'artboard']
        if len(artboards) > 1:
            entry['layers'] = [still(title+' · '+layer.name, [path], preview.crop(layer.bbox))
                               for layer in artboards]
            entry['overall'] = '全部画板'

# Register the layers individually and show the full composition first.
for role, title in [('Archer','弓箭手'),('Necromancer','死灵法师'),('Recruit','招募者'),('Swordsman','剑士')]:
    layers = []
    composite = None
    for suffix, label in [('BG','背景'),('MG','中景'),('FG','前景')]:
        path = f'角色/Character-{role}-{suffix}.PNG'
        if path not in FILES:
            continue
        im = Image.open(SOURCE/path).convert('RGBA')
        if composite is None:
            composite = Image.new('RGBA', im.size)
        composite.alpha_composite(im)
        layers.append(still(title+' · '+label,[path],im))
    entry = still(title+' · 卡面合成', [item['sources'][0] for item in layers], composite)
    entry['layers'] = layers
    add(concept,entry)

names = {
    '8307d4371b68cbb0':'绿色角色设定','Recruiter':'招募者剪影',
    'book backgroud':'书页背景','Dog':'犬角色','dog':'犬角色设定','wolf':'狼角色设定','recruit':'招募者设定',
    'Desk':'桌面','Arrowpng':'指示箭头','common':'普通卡底','mythic':'红色卡底','rare':'黄色卡底',
    'Button Selection':'菜单选中标记','Menu Tab':'菜单纸牌','Start Menu Background':'开始画面背景',
    'Left':'左箭头','Right':'右箭头','Title':'CARDINAL 标题','Deck':'牌堆露出的卡边',
    'Board Paper':'棋盘纸','Boss Paper':'对手信息纸','BossPaper':'对手信息纸','Player Stats Paper':'角色状态纸',
    'Healthbar':'状态条笔画','Line1':'路线线段','Octopus Boss':'章鱼纸偶','money':'钱袋与金币',
    'cream paper':'米色纸','white paper':'白纸','rough white paper':'粗纹白纸','white moist paper':'湿纹白纸',
    'cardboard paper':'硬纸板','green_bg':'绿色底纹','red_bg':'红色底纹',
    'In Game UI':'战斗','Map UI':'地图','Event UI':'事件','Event UI-1':'事件变体','Shop UI':'商店'
}
for path in FILES:
    if path in covered:
        continue
    p = Path(path)
    title = names.get(p.stem,p.stem)
    if path.startswith('UI Mockup/'): group = 'UI Mockup'
    elif 'Start Menu/' in path: group = menu
    elif path.startswith('Ppaer') or '/Tape/' in path or p.stem.endswith('_bg'): group = materials
    elif path.startswith('icon/') or '/Map Icon/' in path: group = icons
    elif path.startswith(('角色/','Character Book ver/')): group = concept
    else: group = ui
    if p.suffix == '.svg':
        # The PNG and SVG depict the same move icon. Keep the actual vector available.
        raster = next(e for e in sections[icons] if e['sources'] == ['icon/move.png'])
        entry = dict(title='move · 矢量图', thumb=raster['thumb'], sources=register([path]))
        shutil.copyfile(SOURCE/path, OUT/'move.svg')
        entry['full'] = 'move.svg'
    else:
        entry = still(title,[path])
    add(group,entry)

archive_labels = {
    'Arrow':'三角箭头', 'Background':'桌面底纹','Board Background':'棋盘底板',
    'Board Background 1':'浅色棋盘底板','Board Background2 Color':'彩色棋盘底纸','Board Background2':'灰色棋盘底纸',
    'Boss':'骷髅标记','Bottom Left Background':'手牌区底板','Box 1':'纸框一','Box 2':'纸框二',
    'Button attack':'攻击印章','Button reset':'重置按钮','Elite':'交叉双剑标记','Event':'事件标记',
    'Grid':'棋盘底纹','Normal':'单剑标记','Rotation Arrow':'转向箭头','Shop':'摊位标记',
    'card1':'战士卡','card2':'学徒卡','card3':'斥候卡','card4':'迷雾法师卡','tag':'彩色标签',
    'Enemies 1':'单剑节点','Enemies 2':'双剑节点','Map Point BG':'圆形节点底板',
    'Map Point Battle BG':'菱形节点底板','ankh':'生命之符','card-pick':'选牌','card-random':'随机卡牌',
    'chest':'宝箱','cog':'齿轮','cycle':'循环','minotaur':'牛头怪','move':'移动',
    'move · 矢量图':'移动 · 矢量图','scroll-unfurled':'展开的卷轴','shop':'商店','treasure-map':'藏宝图',
    'two-coins':'金币','card 1':'彩色角色卡一','card 2':'彩色角色卡二','card 3':'彩色角色卡三'
}
for items in sections.values():
    for item in items:
        title = item['title']
        item['title'] = archive_labels.get(title, title.replace('Tape (','胶带 ').rstrip(')').replace('树精 · 树精','树精 · '))
assert covered == set(FILES), sorted(set(FILES)-covered)
order = [process, 'UI Mockup', menu, ui, icons, materials, concept, boss]
catalog = dict(characters=characters, sections=[dict(title=s,items=sections[s]) for s in order])
(ROOT/'cardinal-catalog.js').write_text('const cardinalCatalog = '+json.dumps(catalog,ensure_ascii=False,indent=1)+';\n')
print(f'{len(covered)} source files, {len(characters)} character portraits;', [(s,len(sections[s])) for s in order])
