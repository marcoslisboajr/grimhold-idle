// Confere as rotas dos mapas de caçada: tamanho do laço e se cada passo é vizinho.
// Rodar: npx tsx server/scripts/routes.ts
import * as maps from '../../client/src/world/map.ts';

for (const [name, fn] of Object.entries(maps)) {
  if (typeof fn !== 'function' || !name.endsWith('Map') || name === 'cityMap') continue;
  const m = (fn as () => maps.WorldMap)();
  const r = m.route;
  let broken = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) broken++;
  }
  console.log(`${name.padEnd(12)} ${m.w}x${m.h}  rota ${r.length} tiles  quebras ${broken}  objetos ${m.objects.length}`);
}
