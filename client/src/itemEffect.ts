import { ELEMENTS, SKILLS, capeBonus, MEAL_MS, POTION_FIGHTS, bonusText, type Item } from '@grimhold/shared';
import { getLang, t, tr } from './i18n.ts';

/**
 * O que um consumível faz, numa linha (o relatório de UI: a maioria das poções e comidas não dizia).
 * Usado na criação (Alquimia, Culinária, Runas, Flechas), na mochila e na barra de combate.
 */
export function itemEffectText(it: Item | undefined): string | null {
  if (!it) return null;
  const pct = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;
  const num = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const elName = (e: keyof typeof ELEMENTS) => (getLang() === 'pt' ? ELEMENTS[e].pt : ELEMENTS[e].en).toLowerCase();
  if (it.food) return tr(`cura ${num(it.food)} de vida`, `heals ${num(it.food)} HP`);
  if (it.manaPotion) return tr(`recupera ${num(it.manaPotion)} de mana`, `restores ${num(it.manaPotion)} mana`);
  if (it.potion) {
    const parts: string[] = [];
    if (it.potion.attack) parts.push(tr(`+${pct(it.potion.attack)} de ataque`, `+${pct(it.potion.attack)} attack`));
    if (it.potion.defense) parts.push(tr(`+${pct(it.potion.defense)} de defesa`, `+${pct(it.potion.defense)} defense`));
    return `${parts.join(', ')} ${tr(`por ${POTION_FIGHTS} lutas`, `for ${POTION_FIGHTS} fights`)}`;
  }
  if (it.meal) return `${mealText(it.meal)} ${tr(`por ${MEAL_MS / 60_000} min`, `for ${MEAL_MS / 60_000} min`)}`;
  if (it.rune) {
    const r = it.rune;
    if (r.kind === 'heal') return tr(`cura ${pct(r.pct)} da vida quando ela fica abaixo de ${pct(r.below)}`, `heals ${pct(r.pct)} HP when below ${pct(r.below)}`);
    const el = r.element ? ` ${tr('de', 'of')} ${elName(r.element)}` : tr(' físico', ' physical');
    return tr(`golpe extra de ${num(r.mult)}× o dano${el}${r.area ? ' em todos' : ''}`, `extra hit of ${num(r.mult)}× damage${el}${r.area ? ' to all' : ''}`);
  }
  if (it.arrow) {
    const a = it.arrow;
    const el = a.element ? ` (${elName(a.element)})` : '';
    const splash = a.splash ? tr(`, ${pct(a.splash)} nos outros monstros`, `, ${pct(a.splash)} to other monsters`) : '';
    return tr(`+${pct(a.mult - 1)} de dano${el}${splash}, 1 por luta`, `+${pct(a.mult - 1)} damage${el}${splash}, 1 per fight`);
  }
  if (it.sigil) return bonusText(it.sigil);
  if (it.tool) {
    const sk = t('skill.' + it.tool.skill, it.tool.skill);
    return tr(`ferramenta, nível ${it.tool.level} de ${sk}: +${pct(it.tool.speed)} de velocidade`, `tool, ${sk} level ${it.tool.level}: +${pct(it.tool.speed)} speed`);
  }
  const cape = capeBonus(it.id);
  if (cape) {
    const sk = cape.skill ? SKILLS.find((x) => x.id === cape.skill) : null;
    const name = sk ? t('skill.' + sk.id, sk.name) : null;
    if (cape.skill === 'slayer')
      return tr(`+${pct(cape.bonus)} de XP de Slayer e +${pct(cape.bonus)} de dano no monstro da tarefa (equipada)`, `+${pct(cape.bonus)} Slayer XP and +${pct(cape.bonus)} damage to the task monster (equipped)`);
    return name
      ? tr(`+${pct(cape.bonus)} de XP em ${name} (equipada)`, `+${pct(cape.bonus)} ${name} XP (equipped)`)
      : tr(`+${pct(cape.bonus)} de XP em todas as profissões (equipada)`, `+${pct(cape.bonus)} XP in every profession (equipped)`);
  }
  return null;
}

/** Bônus da refeição (sem a duração). */
export function mealText(m: NonNullable<Item['meal']>): string {
  const v = Math.round(m.value * 100);
  switch (m.buff) {
    case 'combat_xp': return tr(`+${v}% XP de combate`, `+${v}% combat XP`);
    case 'rest_speed': return tr(`descanso ${v}% mais rápido`, `rest ${v}% faster`);
    case 'loot': return `+${v}% loot`;
    case 'profession_xp': return tr(`+${v}% XP de profissão`, `+${v}% profession XP`);
    case 'stamina_cost': return tr(`-${v}% gasto de stamina`, `-${v}% stamina cost`);
    case 'crit_chance': return tr(`+${v}% chance de crítico`, `+${v}% crit chance`);
    case 'all_xp_loot': return tr(`+${v}% XP e +${v}% loot`, `+${v}% XP & +${v}% loot`);
    default: return '';
  }
}
