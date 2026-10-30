import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, SPECIAL_BOSSES, SPECIAL_BOSS_EVENTS, bossReward, doomStep, itemById, rescaleBossHp } from '@grimhold/shared';

const ghaz = SPECIAL_BOSSES.find((b) => b.id === 'ghazmorath')!;
const doom = ghaz.doom!;
const MAX = 1_000_000;

test("Ghaz'Morath: DOOM abre a janela no limite, cura se não der o IK e morre depois do quarto", () => {
  let state = { stage: 0, until: null as number | null };
  let healed = 0;
  let dealt = 0;
  const left = () => MAX - (dealt - healed);
  // Acima de 10%: nada.
  dealt = MAX * 0.85;
  assert.equal(doomStep(doom, state, left(), MAX, 0).kind, 'none');
  for (let i = 0; i < doom.at.length; i++) {
    // Chega ao limite: abre a janela de 30 s.
    dealt = MAX + healed - doom.at[i] * MAX;
    const open = doomStep(doom, state, left(), MAX, 1000);
    assert.equal(open.kind, 'open', `estágio ${i}`);
    state = { ...state, until: (open as { until: number }).until };
    assert.equal(state.until, 1000 + doom.windowMs);
    // Dentro da janela ainda vivo: nada.
    assert.equal(doomStep(doom, state, left(), MAX, 20_000).kind, 'none');
    // A janela acaba: DOOM cura de volta ao `back`.
    const hit = doomStep(doom, state, left(), MAX, 1000 + doom.windowMs);
    assert.equal(hit.kind, 'doom');
    healed += (hit as { heal: number }).heal;
    assert.ok(Math.abs(left() - doom.back[i] * MAX) < 1, `voltou para ${doom.back[i]}`);
    state = { stage: state.stage + 1, until: null };
  }
  // Depois do quarto DOOM: morre normal ao chegar a 0.
  dealt = MAX + healed;
  assert.equal(doomStep(doom, state, left(), MAX, 0).kind, 'dead');
});

test("Ghaz'Morath: alguém entrar depois de um DOOM não devolve vida ao chefe", () => {
  // Depois do 1º DOOM (curou 60%) e logo antes do 2º: falta 7% da vida.
  const damage = new Map([[1, MAX * 0.83], [2, MAX * 0.7]]);
  let healed = MAX * 0.6;
  const leftFrac = (max: number) => (max - ([...damage.values()].reduce((a, b) => a + b, 0) - healed)) / max;
  assert.ok(Math.abs(leftFrac(MAX) - 0.07) < 1e-9);
  // Entra mais gente: a barra cresce, mas a fração que falta continua 7% (antes virava ~61%).
  damage.set(3, 0);
  healed = rescaleBossHp(damage, healed, MAX, MAX * 1.4);
  assert.ok(Math.abs(leftFrac(MAX * 1.4) - 0.07) < 1e-9);
});

test("Ghaz'Morath: o primeiro DOOM sempre vem, mesmo zerando a vida antes dele", () => {
  // Zerou dentro da janela do primeiro grito: não morre, espera o DOOM.
  assert.equal(doomStep(doom, { stage: 0, until: 31_000 }, -50_000, MAX, 10_000).kind, 'none');
  // Passou do limite ao zero de uma vez: abre a janela em vez do IK.
  assert.equal(doomStep(doom, { stage: 0, until: null }, -50_000, MAX, 0).kind, 'open');
  // Acaba a janela: DOOM e volta para 70% (contando o dano a mais).
  const hit = doomStep(doom, { stage: 0, until: 31_000 }, -50_000, MAX, 31_000);
  assert.equal(hit.kind, 'doom');
  assert.equal((hit as { heal: number }).heal, doom.back[0] * MAX + 50_000);
});

test("Ghaz'Morath: IK dentro da janela dá o bônus do estágio (o segundo é o maior)", () => {
  const ik = doomStep(doom, { stage: 1, until: 31_000 }, 0, MAX, 10_000);
  assert.deepEqual(ik, { kind: 'ik', bonus: 1 });
  assert.deepEqual(doomStep(doom, { stage: 3, until: 31_000 }, -5, MAX, 10_000), { kind: 'ik', bonus: 0.2 });
  // Passou do limite ao zero no mesmo trecho: também é IK.
  assert.equal(doomStep(doom, { stage: 1, until: null }, -10, MAX, 0).kind, 'ik');
  // O bônus dobra a XP e o ouro e aumenta a chance do lendário.
  const base = bossReward(ghaz, 1, 2, 180, 50_000, true, true, 50_000);
  const big = bossReward(ghaz, 1, 2, 180, 50_000, true, true, 50_000, undefined, 1);
  assert.ok(Math.abs(big.xp - base.xp * 2) <= 1);
  assert.ok(Math.abs(big.gold - base.gold * 2) <= 1);
});

test("Ghaz'Morath: evento de 1 hora, set das 4 classes e o título", () => {
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'ghazmorath')!;
  assert.equal(ev.durationMs, 60 * 60_000);
  assert.equal(ghaz.legendarySet.length, 16);
  for (const id of ghaz.legendarySet) {
    const it = itemById(id);
    assert.ok(it?.equip && it.legendary, id);
    assert.equal(it!.equip!.level, 175);
  }
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    assert.equal(ghaz.legendarySet.filter((id) => itemById(id)!.equip!.vocations?.includes(voc as never)).length, 4, voc);
  }
  assert.ok(ACHIEVEMENTS.some((a) => a.id === 'immortal_slayer'));
});

test("Ghaz'Morath: o lendário que cai é sempre da vocação de quem ganhou", () => {
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    let got = 0;
    for (let id = 1; id <= 400; id++) {
      const r = bossReward(ghaz, 1_000_200, id, 175, 1e9, true, true, 1e6, undefined, 1, voc);
      if (r.legendary) {
        got++;
        assert.ok(r.legendary.endsWith(`_${voc}`), `${voc} ganhou ${r.legendary}`);
      }
    }
    assert.ok(got > 0, `${voc} nunca ganhou nada`);
  }
});
