import colorsys, sys
from PIL import Image
sheet = Image.open('../grimhold/assets-pixel/icones/marrows_icon32.png').convert('RGBA')
cell = lambda c: sheet.crop((c*32, 0, c*32+32, 32))
def recolor(img, box, hue=None, sat=None, light=0.0, only=None):
    img = img.copy(); px = img.load(); x0,y0,x1,y1 = box
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b,a = px[x,y]
            if a == 0: continue
            h,l,s = colorsys.rgb_to_hls(r/255,g/255,b/255)
            if s < 0.15 and l < 0.25: continue  # contorno
            if only and not only(h,l,s): continue
            if hue is not None: h = hue
            if sat is not None: s = s*sat
            l = max(0,min(1,l+light))
            r,g,b = colorsys.hls_to_rgb(h,l,s); px[x,y] = (int(r*255),int(g*255),int(b*255),a)
    return img
HEAD = (17,0,32,15); FLETCH = (0,17,15,32)
out = {
  'arrow_shaft': recolor(cell(11), HEAD, hue=0.08, sat=0.35, light=-0.05),
  'bronze_arrow': recolor(cell(11), HEAD, hue=0.07, sat=0.9),
  'iron_arrow': recolor(cell(10), HEAD, sat=0.0),
  'steel_arrow': cell(12),
  'mithril_arrow': cell(14),
  'poison_arrow': recolor(cell(14), (0,0,32,32), hue=0.3),
  'fire_arrow': cell(13),
  'void_arrow': cell(15),
}
dest = sys.argv[1]
strip = Image.new('RGBA', (32*len(out), 32), (60,50,40,255))
for i,(k,v) in enumerate(out.items()):
    if dest != '-': v.save(f'{dest}/{k}.png')
    strip.alpha_composite(v, (i*32,0))
strip.resize((strip.width*4, 128), Image.NEAREST).save(sys.argv[2])
