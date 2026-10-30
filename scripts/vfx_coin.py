"""Moeda girando (projétil dos Baús Mordedores do Mímico Rei): o ícone de ouro do jogo
achatado de lado em 8 quadros. Grava client/public/assets/vfx/coin.png e a entrada no vfx.json."""
import json, math, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ICON = os.path.join(ROOT, "client", "public", "assets", "icons", "gold.png")
VFX = os.path.join(ROOT, "client", "public", "assets", "vfx")
S, N = 48, 8
src = Image.open(ICON).convert("RGBA").resize((S, S), Image.NEAREST)
sheet = Image.new("RGBA", (S * N, S), (0, 0, 0, 0))
for i in range(N):
    w = max(4, round(S * abs(math.cos(i / N * math.pi))))
    sheet.alpha_composite(src.resize((w, S), Image.NEAREST), (i * S + (S - w) // 2, 0))
sheet.save(os.path.join(VFX, "coin.png"))
p = os.path.join(VFX, "vfx.json")
raw = open(p, encoding="utf8", newline="").read()
meta = json.loads(raw)
meta["coin"] = {"w": S, "h": S, "frames": N}
nl = "\r\n" if "\r\n" in raw else "\n"
open(p, "w", encoding="utf8", newline="").write((json.dumps(meta, indent=1) + ("\n" if raw.endswith("\n") else "")).replace("\n", nl))
print("coin ok")
