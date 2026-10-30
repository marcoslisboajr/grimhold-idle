import { spellsFor, maxSpells, HUNTS, runCycle, playerStats, parseHuntNode, huntNode, eatAfterFight, XP_TABLE, levelForXp, equipmentBonus, itemById, defaultSpells, promotionsFor, withRunes } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const VOCS = process.env.VOCS ? process.env.VOCS.split(',') : ['warrior','hunter','arcanist','devout'];
const foods = (items as any[]).filter(i=>i.food).sort((a,b)=>a.food-b.food);
function gear(voc:string, L:number){ const eq:any={}; for(const i of items as any[]){const e=i.equip; if(!e||i.legendary||e.level>L)continue; if(e.vocations&&!e.vocations.includes(voc))continue; const sc=(e.attack??0)*2+(e.defense??0)+(e.hp??0)/8+(e.crit??0)*100+(e.mana??0)*10+(e.lifesteal??0)*150-(e.speed??0)*20; const cur=eq[e.slot]; if(!cur||sc>cur.sc)eq[e.slot]={id:i.id,sc};} const o:any={}; for(const k in eq)o[k]=eq[k].id; return o;}
// Melhor escolha de magias: a padrão ou as mais novas liberadas (que o jogador tende a pegar).
function spellSets(voc:string,L:number){ const open=spellsFor(voc).filter(s=>s.level<=L); const latest=[...open].sort((a,b)=>b.level-a.level).slice(0,maxSpells(L)).map(s=>s.id); return [defaultSpells(voc,L), latest]; }
// RUNES=1: leva a melhor runa de ataque e de cura do nível (Criação de Runas ~ nível de combate).
const runeItems=(items as any[]).filter(i=>i.rune);
function bestRunes(L:number):string[]{ const pick=(k:string)=>runeItems.filter(i=>i.rune.kind===k&&i.rune.level<=L).sort((a,b)=>b.rune.level-a.rune.level)[0]?.id; const k=process.env.RUNES; return [k!=='heal'?pick('strike'):undefined,k!=='strike'?pick('heal'):undefined].filter(Boolean); }
function food(L:number){ let f=foods[0]; for(const x of foods) if((x.level??0)<=L) f=x; return f; }
function evalHunt(voc:string,L:number,node:string,SP:string[]){ const p=parseHuntNode(node)!; const xp=XP_TABLE[L]; const promo=L>=30?promotionsFor(voc)[0]?.id:null; const pl0=playerStats(voc,xp,equipmentBonus(gear(voc,L)),promo,SP); const pl=process.env.RUNES?withRunes(pl0,bestRunes(L),{[bestRunes(L)[0]]:1e9,[bestRunes(L)[1]]:1e9}):pl0; const bank={[food(L).id]:1e9};
 let ms=0,x=0,d=0,N=150; for(let s=0;s<N;s++){const c=runCycle(p.hunt,pl,12345,s,p.difficulty,p.pack); if(c.outcome==='death'){d++;ms+=c.fightMs;continue;} const r=eatAfterFight(c,pl,bank); ms+=c.fightMs+r.restMs; x+=c.xp;} return {xph:x/ms*3.6e6, death:d/N}; }
const nodes=HUNTS.filter(h=>!h.boss).flatMap(h=>['normal','hard','nightmare'].flatMap(d=>[1,2,3].map(k=>huntNode(h.id,d as any,k))));
for(const voc of VOCS){ let hours=0; const rows:string[]=[];
 for(let L=1;L<120;L++){ let best:any={n:"",xph:0,death:0};
  for(const SP of spellSets(voc,L)) for(const n of nodes){const r=evalHunt(voc,L,n,SP); if(r.death<=0.005&&r.xph>best.xph)best={n,...r};}
  const need=XP_TABLE[L+1]-XP_TABLE[L]; const h=need/best.xph; hours+=h;
  if(L%5===0) rows.push(`L${L} ${best.n} ${Math.round(best.xph)}xp/h ${h.toFixed(2)}h acc=${hours.toFixed(1)}h`);}
 console.log('==',voc,'total',hours.toFixed(0),'h'); console.log(rows.join('\n'));}
