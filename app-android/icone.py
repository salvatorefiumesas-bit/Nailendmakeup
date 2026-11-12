# Genera icone e schermata di avvio dell'app Android a partire dalle icone del sito.
# Uso: python3 icone.py   (dalla cartella app-android)
import glob, os
from PIL import Image, ImageDraw

RES = 'android/app/src/main/res'
icona = Image.open('../icon-512.png').convert('RGBA')
maskable = Image.open('../icon-maskable-512.png').convert('RGBA')
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

def tonda(im):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0) + im.size, fill=255)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), m)
    return out

for d, k in DENS.items():
    cartella = f'{RES}/mipmap-{d}'
    l = round(48 * k)
    icona.resize((l, l), Image.LANCZOS).save(f'{cartella}/ic_launcher.png')
    tonda(icona.resize((l, l), Image.LANCZOS)).save(f'{cartella}/ic_launcher_round.png')
    f = round(108 * k)
    maskable.resize((f, f), Image.LANCZOS).save(f'{cartella}/ic_launcher_foreground.png')

# Schermata di avvio: sfondo prugna con l'icona al centro
for p in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(p).size
    s = Image.new('RGB', (w, h), (62, 26, 60))
    l = int(min(w, h) * 0.32)
    ic = tonda(maskable.resize((l, l), Image.LANCZOS))
    s.paste(ic, ((w - l) // 2, (h - l) // 2), ic)
    s.save(p)
print('icone e splash aggiornate')
