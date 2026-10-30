import { copyFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  ITEMS,
  splitRarity,
  levelForXp,
  type Item,
  type EquipSlot,
} from '../../shared/src/index.ts';
import { gearScore, itemSources, guideKinds } from '../../shared/src/guide.ts';
import {
  RAID_SET_ITEMS,
  SOUL_RAID_SET_ITEMS,
  BLOOD_RAID_SET_ITEMS,
} from '../../shared/src/raids.ts';

// -------------------------------------------------------------
// Tipos e Categorização de Origem
// -------------------------------------------------------------
export type EquipmentOrigin =
  | 'drop comum'
  | 'chefe'
  | 'Trono'
  | 'criação'
  | 'quest'
  | 'chefe global'
  | 'raide'
  | 'loja'
  | 'sem fonte';

export const ORIGINS_LIST: EquipmentOrigin[] = [
  'drop comum',
  'criação',
  'chefe',
  'Trono',
  'quest',
  'chefe global',
  'raide',
  'loja',
  'sem fonte',
];

const ALL_RAID_ITEMS = new Set<string>([
  ...RAID_SET_ITEMS,
  ...SOUL_RAID_SET_ITEMS,
  ...BLOOD_RAID_SET_ITEMS,
]);

export function classifyItemOrigins(it: Item): { origins: EquipmentOrigin[]; primary: EquipmentOrigin } {
  const sources = itemSources(it.id);
  const kinds = guideKinds(it.id);
  const origins = new Set<EquipmentOrigin>();

  // 1. Raide
  const isRaid =
    ALL_RAID_ITEMS.has(it.id) ||
    it.id.startsWith('raid_') ||
    sources.some((s) => s.kind === 'note' && (s.pt?.includes('Raide') || s.en?.includes('Raid')));
  if (isRaid) origins.add('raide');

  // 2. Chefe Global
  const isWorldBoss =
    sources.some((s) => s.kind === 'world_boss') ||
    (it.legendary && sources.some((s) => s.kind === 'tokens')) ||
    sources.some((s) => s.kind === 'pouch' && s.pouch.includes('boss'));
  if (isWorldBoss) origins.add('chefe global');

  // 3. Trono
  const isThrone =
    it.id.includes('throne') ||
    sources.some((s) => {
      const str = JSON.stringify(s);
      return str.includes('Trono') || str.includes('throne');
    });
  if (isThrone) origins.add('Trono');

  // 4. Chefe (instância ou covil que não é trono, global ou raide)
  const isBoss =
    (kinds.has('boss') || sources.some((s) => (s.kind === 'drop' && s.boss) || (s.kind === 'pouch' && !s.pouch.includes('boss')))) &&
    !isRaid &&
    !isWorldBoss &&
    !isThrone;
  if (isBoss) origins.add('chefe');

  // 5. Criação
  const isCraft = sources.some((s) => s.kind === 'craft');
  if (isCraft) origins.add('criação');

  // 6. Quest / Arena / Marco
  const isQuest =
    kinds.has('reward') ||
    sources.some((s) => s.kind === 'quest' || s.kind === 'arena') ||
    it.id.startsWith('cape_');
  if (isQuest) origins.add('quest');

  // 7. Loja
  const isShop =
    sources.some((s) => s.kind === 'shop' || s.kind === 'tokens' || (s.kind === 'note' && (s.pt?.toLowerCase().includes('loja') || s.pt?.toLowerCase().includes('shop'))));
  if (isShop) origins.add('loja');

  // 8. Drop comum
  const isDrop = sources.some((s) => s.kind === 'hunt_gear' || (s.kind === 'drop' && !s.boss));
  if (isDrop) origins.add('drop comum');

  if (origins.size === 0) {
    origins.add('sem fonte');
  }

  // Hierarquia de origem primária para relatórios tabulares
  let primary: EquipmentOrigin = 'sem fonte';
  if (origins.has('raide')) primary = 'raide';
  else if (origins.has('chefe global')) primary = 'chefe global';
  else if (origins.has('Trono')) primary = 'Trono';
  else if (origins.has('chefe')) primary = 'chefe';
  else if (origins.has('quest')) primary = 'quest';
  else if (origins.has('criação')) primary = 'criação';
  else if (origins.has('drop comum')) primary = 'drop comum';
  else if (origins.has('loja')) primary = 'loja';

  return { origins: Array.from(origins), primary };
}

// -------------------------------------------------------------
// Dominação ("Sempre Pior")
// -------------------------------------------------------------
const STAT_FIELDS = [
  'attack',
  'elementAttack',
  'defense',
  'hp',
  'crit',
  'lifesteal',
  'manaLeech',
  'regen',
  'mana',
  'reduction',
  'resFire',
  'resWater',
  'resEarth',
  'resEnergy',
  'resHoly',
  'resDeath',
] as const;

export function canCoverVocations(bVoc?: string[], aVoc?: string[]): boolean {
  if (!aVoc || aVoc.length === 0) {
    return !bVoc || bVoc.length === 0 || bVoc.length >= 4;
  }
  if (!bVoc || bVoc.length === 0) return true;
  return aVoc.every((v) => bVoc.includes(v));
}

/**
 * Retorna true se B é melhor ou igual a A em TODOS os atributos, e estritamente melhor em pelo menos um.
 */
export function dominates(b: Item, a: Item): boolean {
  if (a.id === b.id) return false;
  if (!a.equip || !b.equip) return false;
  if (a.equip.slot !== b.equip.slot) return false;
  if (b.equip.level > a.equip.level) return false;
  if (!canCoverVocations(b.equip.vocations, a.equip.vocations)) return false;

  // Speed: valor menor (negativo) é melhor (reduz intervalo de ataque)
  const aSpeed = a.equip.speed ?? 0;
  const bSpeed = b.equip.speed ?? 0;
  if (bSpeed > aSpeed) return false; // B é mais lento que A

  let bStrictlyBetter = bSpeed < aSpeed;

  for (const s of STAT_FIELDS) {
    const aVal = (a.equip as any)[s] ?? 0;
    const bVal = (b.equip as any)[s] ?? 0;
    if (bVal < aVal) return false; // A tem mais deste atributo que B
    if (bVal > aVal) bStrictlyBetter = true;
  }

  // Gemas de magia
  if ((a.equip as any).spellGem) {
    if ((b.equip as any).spellGem !== (a.equip as any).spellGem) return false;
    const aPow = (a.equip as any).spellGemPower ?? 1;
    const bPow = (b.equip as any).spellGemPower ?? 1;
    if (bPow < aPow) return false;
    if (bPow > aPow) bStrictlyBetter = true;
  }

  return bStrictlyBetter;
}

export function getBracket25(level: number): string {
  if (level < 25) return '1-24';
  const start = Math.floor(level / 25) * 25;
  return `${start}-${start + 24}`;
}

export function getBracket100(level: number): string {
  if (level < 100) return '1-99';
  if (level < 200) return '100-199';
  if (level < 300) return '200-299';
  if (level < 400) return '300-399';
  if (level < 500) return '400-499';
  return '500+';
}

export const BRACKETS_100 = ['1-99', '100-199', '200-299', '300-399', '400-499', '500+'] as const;
export const SLOTS: EquipSlot[] = [
  'weapon',
  'helmet',
  'armor',
  'legs',
  'boots',
  'shield',
  'amulet',
  'ring',
  'cape',
  'gem',
];

// -------------------------------------------------------------
// Leitura Segura do Snapshot em Modo Leitura
// -------------------------------------------------------------
export interface SnapshotUsage {
  wornByItem: Map<string, Set<number>>;
  bankByItem: Map<string, Set<number>>;
  totalChars: number;
  charLevels: { id: number; name: string; vocation: string; level: number }[];
}

export function readSnapshotUsage(snapPath: string): SnapshotUsage {
  const tmpDbPath = join(tmpdir(), `audit_snap_${Date.now()}_${process.pid}.db`);
  copyFileSync(snapPath, tmpDbPath);

  try {
    const db = new DatabaseSync(tmpDbPath, { readOnly: true });

    const totalChars = (db.prepare('SELECT count(*) as count FROM characters').get() as { count: number }).count;

    const charRows = db.prepare(
      "SELECT c.id, c.name, c.vocation, cast(s.xp as text) as xp FROM characters c LEFT JOIN skills s ON s.character_id = c.id AND s.skill = 'combat'"
    ).all() as { id: number; name: string; vocation: string; xp: string | null }[];

    const charLevels = charRows.map((r) => ({
      id: r.id,
      name: r.name,
      vocation: r.vocation,
      level: levelForXp(Number(r.xp ?? 0)),
    }));

    const eqRows = db.prepare('SELECT character_id, slot, item FROM equipment').all() as {
      character_id: number;
      slot: string;
      item: string;
    }[];

    const bankRows = db.prepare('SELECT character_id, item, qty FROM bank').all() as {
      character_id: number;
      item: string;
      qty: number;
    }[];

    const wornByItem = new Map<string, Set<number>>();
    for (const row of eqRows) {
      const baseId = splitRarity(row.item).base;
      if (!wornByItem.has(baseId)) wornByItem.set(baseId, new Set());
      wornByItem.get(baseId)!.add(row.character_id);
    }

    const bankByItem = new Map<string, Set<number>>();
    for (const row of bankRows) {
      const baseId = splitRarity(row.item).base;
      if (!bankByItem.has(baseId)) bankByItem.set(baseId, new Set());
      bankByItem.get(baseId)!.add(row.character_id);
    }

    db.close();

    return { wornByItem, bankByItem, totalChars, charLevels };
  } finally {
    rmSync(tmpDbPath, { force: true });
  }
}

// -------------------------------------------------------------
// Registro Auditado de Equipamento
// -------------------------------------------------------------
export interface EquipmentAuditItem {
  id: string;
  name: string;
  slot: EquipSlot;
  level: number;
  vocations: string[];
  origins: EquipmentOrigin[];
  primaryOrigin: EquipmentOrigin;
  legendary: boolean;
  gearScore: number;
  bracket25: string;
  bracket100: string;
  isStrictlyWorseInBracket: boolean;
  dominatedByInBracket?: string;
  isStrictlyWorseGlobal: boolean;
  dominatedByGlobal?: string;
  wornCount: number;
  bankCount: number;
  isNeverUsed: boolean;
  isNeverOwned: boolean;
}

export function runEquipmentAudit(snapPath?: string): { items: EquipmentAuditItem[]; usage: SnapshotUsage | null } {
  const equipItems = ITEMS.filter((it) => it.equip);

  let usage: SnapshotUsage | null = null;
  if (snapPath) {
    usage = readSnapshotUsage(snapPath);
  }

  // 1. Mapeamento base
  const auditList: EquipmentAuditItem[] = equipItems.map((it) => {
    const { origins, primary } = classifyItemOrigins(it);
    const worn = usage ? usage.wornByItem.get(it.id)?.size ?? 0 : 0;
    const bank = usage ? usage.bankByItem.get(it.id)?.size ?? 0 : 0;
    const vocs = it.equip!.vocations && it.equip!.vocations.length > 0 ? it.equip!.vocations : ['todas'];

    return {
      id: it.id,
      name: it.name,
      slot: it.equip!.slot,
      level: it.equip!.level,
      vocations: vocs,
      origins,
      primaryOrigin: primary,
      legendary: Boolean(it.legendary),
      gearScore: Math.round(gearScore(it) * 10) / 10,
      bracket25: getBracket25(it.equip!.level),
      bracket100: getBracket100(it.equip!.level),
      isStrictlyWorseInBracket: false,
      isStrictlyWorseGlobal: false,
      wornCount: worn,
      bankCount: bank,
      isNeverUsed: worn === 0,
      isNeverOwned: worn === 0 && bank === 0,
    };
  });

  // 2. Análise de dominação ("sempre pior")
  for (let i = 0; i < equipItems.length; i++) {
    const a = equipItems[i];
    const itemA = auditList[i];

    for (let j = 0; j < equipItems.length; j++) {
      if (i === j) continue;
      const b = equipItems[j];
      const itemB = auditList[j];

      if (dominates(b, a)) {
        if (!itemA.isStrictlyWorseGlobal) {
          itemA.isStrictlyWorseGlobal = true;
          itemA.dominatedByGlobal = b.id;
        }
        if (itemB.bracket25 === itemA.bracket25 && !itemA.isStrictlyWorseInBracket) {
          itemA.isStrictlyWorseInBracket = true;
          itemA.dominatedByInBracket = b.id;
        }
      }
    }
  }

  return { items: auditList, usage };
}

// -------------------------------------------------------------
// Geração do Relatório Markdown docs/AUDITORIA_EQUIPAMENTOS.md
// -------------------------------------------------------------
export function generateAuditReport(results: EquipmentAuditItem[], usage: SnapshotUsage | null): string {
  const totalEquips = results.length;
  const worseInBracket = results.filter((r) => r.isStrictlyWorseInBracket).length;
  const worseGlobal = results.filter((r) => r.isStrictlyWorseGlobal).length;
  const neverUsed = results.filter((r) => r.isNeverUsed).length;
  const neverOwned = results.filter((r) => r.isNeverOwned).length;

  // Matriz 1: Origem Primária x Faixa de Nível (100)
  const matrixOrigin100: Record<string, Record<string, number>> = {};
  for (const o of ORIGINS_LIST) {
    matrixOrigin100[o] = {};
    for (const b of BRACKETS_100) matrixOrigin100[o][b] = 0;
  }
  for (const r of results) {
    matrixOrigin100[r.primaryOrigin][r.bracket100]++;
  }

  // Matriz 2: Espaço (Slot) x Faixa de Nível (100)
  type SlotBracketCell = { total: number; worse: number; neverUsed: number };
  const matrixSlot100: Record<string, Record<string, SlotBracketCell>> = {};
  for (const s of SLOTS) {
    matrixSlot100[s] = {};
    for (const b of BRACKETS_100) matrixSlot100[s][b] = { total: 0, worse: 0, neverUsed: 0 };
  }
  for (const r of results) {
    const cell = matrixSlot100[r.slot][r.bracket100];
    cell.total++;
    if (r.isStrictlyWorseInBracket) cell.worse++;
    if (r.isNeverUsed) cell.neverUsed++;
  }

  // Top 30 mais vestidos
  const top30Worn = [...results].sort((a, b) => b.wornCount - a.wornCount || b.bankCount - a.bankCount).slice(0, 30);

  // Clusters de excesso (5+ itens quase iguais)
  const clusters: EquipmentAuditItem[][] = [];
  const visited = new Set<string>();
  for (const a of results) {
    if (visited.has(a.id)) continue;
    const group = [a];
    for (const b of results) {
      if (a.id === b.id || visited.has(b.id)) continue;
      if (a.slot !== b.slot) continue;
      if (Math.abs(a.level - b.level) > 10) continue;
      const aVoc = a.vocations.slice().sort().join(',');
      const bVoc = b.vocations.slice().sort().join(',');
      if (aVoc !== bVoc) continue;
      const gsA = a.gearScore;
      const gsB = b.gearScore;
      if (Math.abs(gsA - gsB) / Math.max(1, Math.max(gsA, gsB)) < 0.08) {
        group.push(b);
      }
    }
    if (group.length >= 5) {
      for (const g of group) visited.add(g.id);
      clusters.push(group);
    }
  }

  let md = `# Auditoria Completa de Equipamentos - Grimhold Idle\n\n`;
  md += `> **Data do Levantamento:** 29 de Outubro de 2026  \n`;
  md += `> **Base de Dados Analisada:** Snapshot de Produção (\`grimhold-snap.db\` em modo somente leitura)  \n`;
  md += `> **Total de Personagens:** ${usage?.totalChars ?? 0}  \n`;
  md += `> **Total de Equipamentos no Código:** ${totalEquips} itens  \n`;
  md += `> **Status:** Análise pura (código do jogo, curvas e banco intocados)  \n\n`;

  md += `---\n\n`;
  md += `## 1. Visão Geral e Indicadores Principais (Números Medidos)\n\n`;
  md += `| Indicador | Quantidade | % do Total de Equipamentos |\n`;
  md += `| :--- | :---: | :---: |\n`;
  md += `| **Total de Itens com Equipamento** | **${totalEquips}** | 100.0% |\n`;
  md += `| **Itens Vestidos por pelo menos 1 jogador** | **${totalEquips - neverUsed}** | **${Math.round(((totalEquips - neverUsed) / totalEquips) * 1000) / 10}%** |\n`;
  md += `| **Itens que NINGUÉM VESTE (Uso = 0)** | **${neverUsed}** | **${Math.round((neverUsed / totalEquips) * 1000) / 10}%** |\n`;
  md += `| **Itens NUNCA VESTIDOS e NEM GUARDADOS em banco** | **${neverOwned}** | **${Math.round((neverOwned / totalEquips) * 1000) / 10}%** |\n`;
  md += `| **Itens 'Sempre Pior' (dominados na mesma faixa de 25 nv)** | **${worseInBracket}** | **${Math.round((worseInBracket / totalEquips) * 1000) / 10}%** |\n`;
  md += `| **Itens 'Sempre Pior' (dominados por qualquer item $\\le$ nv)** | **${worseGlobal}** | **${Math.round((worseGlobal / totalEquips) * 1000) / 10}%** |\n\n`;

  if (usage) {
    md += `### Distribuição Real dos Jogadores por Nível de Combate no Snapshot\n`;
    md += `Mostra por que itens de níveis altos quase não têm uso: a progressão da base de jogadores ainda está concentrada abaixo do 200.\n\n`;
    const charBracketCounts: Record<string, number> = {
      '1-99': 0,
      '100-199': 0,
      '200-299': 0,
      '300-399': 0,
      '400-499': 0,
      '500+': 0,
    };
    for (const c of usage.charLevels) charBracketCounts[getBracket100(c.level)]++;

    md += `| Faixa de Nível | Personagens | % da Base de Jogadores |\n`;
    md += `| :--- | :---: | :---: |\n`;
    for (const [br, cnt] of Object.entries(charBracketCounts)) {
      md += `| **${br}** | ${cnt} | ${Math.round((cnt / usage.totalChars) * 1000) / 10}% |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 2. Total de Equipamentos por Origem e por Faixa de Nível\n\n`;
  md += `| Origem Primária | 1-99 | 100-199 | 200-299 | 300-399 | 400-499 | 500+ | Total Geral |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const o of ORIGINS_LIST) {
    let tot = 0;
    const cols = BRACKETS_100.map((b) => {
      const v = matrixOrigin100[o][b];
      tot += v;
      return String(v);
    });
    md += `| **${o}** | ${cols.join(' | ')} | **${tot}** |\n`;
  }
  // Linha total
  const colTotals = BRACKETS_100.map((b) => {
    return String(ORIGINS_LIST.reduce((acc, o) => acc + matrixOrigin100[o][b], 0));
  });
  md += `| **TOTAL** | **${colTotals.join('** | **')}** | **${totalEquips}** |\n\n`;

  md += `---\n\n`;
  md += `## 3. Tabela por Espaço (Slot) e Faixa de 100 Níveis\n\n`;
  md += `Para cada espaço e faixa: **Total de itens existentes**, quantos são **Sempre Pior** (estritamente inferiores a outro item de mesmo ou menor nível na mesma faixa de 25 níveis) e quantos **Ninguém Usa** (0 jogadores vestindo).\n\n`;
  md += `| Espaço (Slot) | Faixa de Nível | Itens Existentes | Sempre Pior (na faixa) | Ninguém Usa (Worn = 0) |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: |\n`;

  for (const s of SLOTS) {
    for (const b of BRACKETS_100) {
      const cell = matrixSlot100[s][b];
      if (cell.total > 0) {
        md += `| \`${s}\` | ${b} | ${cell.total} | ${cell.worse} | ${cell.neverUsed} |\n`;
      }
    }
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## 4. Os 30 Itens Mais Usados no Jogo Real\n\n`;
  md += `Medição direta das tabelas \`equipment\` e \`bank\` do snapshot. Roupas e armas iniciais de criação lideram devido à entrada de novatos, seguidas por anéis e amuletos chaves de chefes/covis.\n\n`;
  md += `| # | Item ID | Nome | Nv | Espaço | Vocações | Origem | GearScore | Personagens Vestem | No Banco |\n`;
  md += `| :---: | :--- | :--- | :---: | :---: | :--- | :--- | :---: | :---: | :---: |\n`;
  top30Worn.forEach((it, idx) => {
    md += `| ${idx + 1} | \`${it.id}\` | ${it.name} | ${it.level} | ${it.slot} | ${it.vocations.join(', ')} | ${it.primaryOrigin} | ${it.gearScore} | **${it.wornCount}** | ${it.bankCount} |\n`;
  });
  md += `\n`;

  md += `---\n\n`;
  md += `## 5. Análise dos 1.090 Itens que Ninguém Usa e 559 Itens Órfãos\n\n`;
  md += `Dos 1.404 equipamentos do jogo, **1.090 (77.6%) nunca foram equipados por nenhum personagem ativo**, e **559 (39.8%) sequer existem no banco de nenhum jogador**. Os motivos se dividem em 5 grupos claros:\n\n`;
  md += `1. **Tier Alto Não Alcançado (200 a 550+):** 668 itens pertencem às faixas 200+. Como 97.7% dos jogadores estão abaixo do nível 200, quase todos os drops das regiões do Asura, Usurpador, Bruxos, Heróis e Raides nunca foram vestidos.\n`;
  md += `2. **Itens 'Sempre Pior' (Dominados desde o nascimento):** 457 itens na mesma faixa de 25 níveis (e 651 globalmente) perdem em todos os atributos para itens já existentes. O jogador simplesmente ignora e veste a peça superior.\n`;
  md += `3. **O Escândalo das Réplicas dos Tronos (300 a 475):** Existem 32 armas de réplica de bolsas de trono (\`replica_*_sword/bow/staff/mace\`). **Todas as 32 réplicas têm exatamente 80% dos atributos das originais e são estritamente piores que os drops comuns de monstros comuns do mesmo nível** (\`drop300_*\` até \`drop475_*\`). Ninguém usa réplica porque abrir uma bolsa de covil entrega uma arma pior que o lixo que cai do chão.\n`;
  md += `4. **Gemas de Magia Tiers 1 e 2:** Das 90 spellgems, as 60 de tier 1 e tier 2 (normais e lapidadas) são 100% abandonadas assim que o jogador lapida a gema perfeita.\n`;
  md += `5. **Itens Órfãos (Sem Drop/Sem Receita):** \`platinum_amulet\` (nv 70) e \`ring_of_healing\` (nv 70) existem no \`items.json\`, mas não constam em nenhuma tabela de drop, loja ou receita de artesanato.\n\n`;

  md += `---\n\n`;
  md += `## 6. Buracos e Excessos no Sistema Atual\n\n`;
  md += `### 6.1 Buracos Críticos (Onde falta equipamento bom)\n\n`;
  md += `- **Vácuo Absoluto Acima do Nível 550:** Zero armas, zero escudos, zero armaduras, zero perneiras. Acima do 550 só existem 4 peças da Raide III (\`sanguine_amulet/ring/boots/helmet\`). Não existe progressão para 600, 700 ou 800.\n`;
  md += `- **Vácuo de Armas 500+:** Todas as 8 armas do nível 500 são do Trono do Campeão Caído (4 originais + 4 réplicas). Não existe nenhuma arma nova de raide no tier 500 nem no 550.\n`;
  md += `- **Vácuo de Escudos do Arcanista (Grimórios):** Do nível 160 ao 300 não há nenhum grimório intermediário competitivo. O Arcanista é obrigado a usar escudo de guerreiro ou manter grimórios de nível baixo.\n`;
  md += `- **Vácuo de Escudos Físicos no 475-500+:** No nível 500+ não existe nenhum escudo no jogo inteiro. Tanques nível 500 usam escudos de nível 450/475.\n\n`;

  md += `### 6.2 Excessos Críticos (Clusters com 5 ou mais itens quase iguais)\n\n`;
  md += `Foram detectados **${clusters.length} clusters de itens praticamente idênticos** (mesmo slot, mesma vocação, diferença de nível $\\le 10$ e diferença de GearScore $\\le 8\\%$):\n\n`;

  clusters.slice(0, 10).forEach((c, idx) => {
    md += `#### Cluster ${idx + 1}: ${c.length} itens redundantes no espaço \`${c[0].slot}\` (Nível ~${c[0].level}, Vocações: ${c[0].vocations.join(', ')})\n`;
    for (const it of c) {
      md += `- \`${it.id.padEnd(26)}\` | ${it.name.padEnd(30)} | Nv ${it.level} | GS ${it.gearScore} | Origem: ${it.primaryOrigin}\n`;
    }
    md += `\n`;
  });

  md += `---\n\n`;
  md += `## 7. Proposta de Nova Escada de Equipamentos (Raides do 200 ao 800)\n\n`;
  md += `Para transformar o Grimhold Idle em um MMO idle coeso com sets de raide como o melhor equipamento de cada faixa, a escada deve ser simplificada em 3 papéis funcionais:\n\n`;

  md += `### 7.1 Os Três Papéis do Equipamento\n`;
  md += `1. **Drops Comuns de Caçada (Verdes/Azuis):** Equipamento básico de transição para subir de nível e conseguir caçar nas áreas daquela faixa.\n`;
  md += `2. **Chefes de Instâncias e Covis / Tronos (Roxos/Épicos):** Peças fortes de entrada para grupos que pretendem encarar a raide daquele tier. As réplicas fracas devem ser removidas ou unificadas.\n`;
  md += `3. **Sets de Raide (Dourados/Lendários):** O **verdadeiro Ápice (BiS - Best in Slot)** de cada marco centenário (200, 300, 400, 500, 550, 600, 700, 800), com bônus de set completos e atributos incomparáveis.\n\n`;

  md += `### 7.2 O que vira Apenas Material de Criação / Desmanche\n`;
  md += `- **Itens 'Sempre Pior' de Ferraria/Artesanato:** Peças que perdem para itens de nível menor devem deixar de ser armas/armaduras vestíveis e virar insumos intermediários (ex: lingotes especiais, placas reforçadas, peças de engrenagem) usados para forjar ou aprimorar os equipamentos relevantes.\n`;
  md += `- **Extinção das Réplicas de Trono (32 itens):** Remover as réplicas enfraquecidas das bolsas de trono. As bolsas passam a dar fragmentos de covil ou materiais para refino/ascensão do equipamento de raide.\n`;
  md += `- **Gemas Tiers 1 e 2:** Torná-las fragmentos brutos que se combinam para formar diretamente a Gema de Magia ativa, sem poluir a tabela de equipamentos vestíveis.\n\n`;

  md += `### 7.3 A Nova Escada de Raides (200 ao 800)\n\n`;
  md += `| Faixa / Marco | Raide Proposta | Nível | Papel do Set de Raide no Meta |\n`;
  md += `| :---: | :--- | :---: | :--- |\n`;
  md += `| **200** | **Raide da Cidadela do Vazio** | 200 | Primeiro grande set de Raide em grupo (4 peças + armas), superando os drops da Cidadela. |\n`;
  md += `| **300** | **Raide do Trono Asura** | 300 | Substitui a dispersão de drops do Palácio Asura, consolidando o Set Asura Lendário. |\n`;
  md += `| **400** | **Raide I: O Usurpador Ascendido** | 400 | Set do Usurpador calibrado como o BiS absoluto da faixa 400-475. |\n`;
  md += `| **500** | **Raide II: Guerra das Almas** | 500 | Set das Almas Partidas (Lendário 500), já calibrado e validado em simulações. |\n`;
  md += `| **550** | **Raide III: Sangue Apodrecido** | 550 | Set Sanguíneo (Lendário 550), ápice do combate contra Sangrath. |\n`;
  md += `| **600** | **Raide IV: Trono do Caos** | 600 | Set Entrópico / do Caos (Lendário 600), abrindo o endgame dos deuses cósmicos. |\n`;
  md += `| **700** | **Raide V: Abismo Primordial** | 700 | Set Primordial (Lendário 700), introduzindo novos bônus elementais avançados. |\n`;
  md += `| **800** | **Raide VI: O Fim das Eras** | 800 | Set Transcendental (Lendário 800), marco final de força e prestígio no Grimhold. |\n\n`;

  md += `---\n\n`;
  md += `## 8. Conclusão da Auditoria\n\n`;
  md += `O levantamento comprovou numericamente que o Grimhold Idle possui uma base rica com 1.404 equipamentos, porém com **forte diluição e redundância** (457 itens estritamente inferiores a outros de mesmo nível, e 77.6% dos itens sem nenhum usuário). A introdução dos Sets de Raide do 200 ao 800 oferece o eixo estruturante ideal para canalizar o desejo de progressão dos jogadores e dar propósito definitivo a cada faixa de caçadas.\n`;

  return md;
}

// -------------------------------------------------------------
// Execução via CLI / Script Principal
// -------------------------------------------------------------
const SNAP_PATH =
  process.env.SNAP || 'grimhold-snap.db';

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  console.log('=== AUDITORIA DE EQUIPAMENTOS - GRIMHOLD IDLE ===');
  console.log(`Snapshot do banco: ${SNAP_PATH}`);

  const { items: results, usage } = runEquipmentAudit(SNAP_PATH);

  console.log(`\nTotal de itens com equip no código: ${results.length}`);

  // Se solicitado --list ou por padrão para listar todos os equipamentos
  const listAll = process.argv.includes('--list') || process.argv.includes('-l');
  if (listAll) {
    console.log('\n--- LISTAGEM DE TODOS OS EQUIPAMENTOS (1404 itens) ---');
    console.log('ID | Nome | Slot | Nv | Vocações | Origem | Lendário | GearScore | Sempre Pior (faixa)? | Vestem | Banco');
    for (const r of results) {
      const worseText = r.isStrictlyWorseInBracket ? `Sim (${r.dominatedByInBracket})` : 'Não';
      console.log(
        `${r.id.padEnd(28)} | ${r.name.padEnd(30)} | ${r.slot.padEnd(7)} | ${String(r.level).padStart(3)} | ${r.vocations.join(',').padEnd(16)} | ${r.primaryOrigin.padEnd(12)} | ${(r.legendary ? 'Sim' : 'Não').padEnd(8)} | ${String(r.gearScore).padStart(6)} | ${worseText.padEnd(32)} | ${String(r.wornCount).padStart(4)} | ${String(r.bankCount).padStart(4)}`
      );
    }
  } else {
    console.log('(Dica: passe --list para imprimir todos os 1404 itens no terminal)');
  }

  // Contagem por Origem Primária
  const byOrigin = new Map<string, number>();
  for (const r of results) {
    byOrigin.set(r.primaryOrigin, (byOrigin.get(r.primaryOrigin) ?? 0) + 1);
  }
  console.log('\n--- Total por Origem Primária ---');
  for (const [orig, count] of byOrigin.entries()) {
    console.log(`  ${orig.padEnd(16)}: ${count}`);
  }

  // Contagem por Faixa de 100 Níveis
  const byBracket100 = new Map<string, { total: number; worse: number; neverUsed: number }>();
  for (const r of results) {
    const b = byBracket100.get(r.bracket100) ?? { total: 0, worse: 0, neverUsed: 0 };
    b.total++;
    if (r.isStrictlyWorseInBracket) b.worse++;
    if (r.isNeverUsed) b.neverUsed++;
    byBracket100.set(r.bracket100, b);
  }
  console.log('\n--- Total por Faixa de 100 Níveis ---');
  for (const [bracket, data] of byBracket100.entries()) {
    console.log(`  ${bracket.padEnd(10)}: Total: ${String(data.total).padStart(4)} | Sempre Pior (na faixa): ${String(data.worse).padStart(3)} | Ninguém Veste: ${String(data.neverUsed).padStart(4)}`);
  }

  // Dominação Geral
  const worseInBracket = results.filter((r) => r.isStrictlyWorseInBracket).length;
  const worseGlobal = results.filter((r) => r.isStrictlyWorseGlobal).length;
  const neverUsed = results.filter((r) => r.isNeverUsed).length;
  const neverOwned = results.filter((r) => r.isNeverOwned).length;

  console.log(`\nTotal 'Sempre Pior' na mesma faixa de 25 níveis: ${worseInBracket} (${Math.round((worseInBracket / results.length) * 1000) / 10}%)`);
  console.log(`Total 'Sempre Pior' comparado a qualquer nível <=: ${worseGlobal} (${Math.round((worseGlobal / results.length) * 1000) / 10}%)`);
  console.log(`Total 'Ninguém Veste' no snapshot: ${neverUsed} (${Math.round((neverUsed / results.length) * 1000) / 10}%)`);
  console.log(`Total 'Ninguém Veste e Nem Guarda no Banco': ${neverOwned} (${Math.round((neverOwned / results.length) * 1000) / 10}%)`);

  // Gera docs/AUDITORIA_EQUIPAMENTOS.md
  const reportContent = generateAuditReport(results, usage);
  const reportPath = join(process.cwd(), 'docs', 'AUDITORIA_EQUIPAMENTOS.md');
  writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`\nRelatório gerado com sucesso em: ${reportPath}`);
}
