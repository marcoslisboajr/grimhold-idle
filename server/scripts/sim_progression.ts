import { HUNTS, runCycle, playerStats, parseHuntNode, huntNode, eatAfterFight, XP_TABLE, levelForXp, equipmentBonus, itemById, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const VOCS = ['warrior','hunter','arcanist','devout'];
const foods = (items as any[]).filter(i=>i.food).sort((a,b)=>a.food-b.food);
function gear(voc:string, L:number){ const eq:any={}; for(const i of items as any[]){const e=i.equip; if(!e||i.legendary||e.level>L)continue; if(e.vocations&&!e.vocations.includes(voc))continue; const sc=(e.attack??0)*2+(e.defense??0)+(e.hp??0)/8+(e.crit??0)*100+(e.mana??0)*10+(e.lifesteal??0)*150-(e.speed??0)*20; const cur=eq[e.slot]; if(!cur||sc>cur.sc)eq[e.slot]={id:i.id,sc};} const o:any={}; for(const k in eq)o[k]=eq[k].id; return o;}
function food(L:number){ let f=foods[0]; for(const x of foods) if((x.level??0)<=L) f=x; return f; }
function evalHunt(voc:string,L:number,node:string){ const p=parseHuntNode(node)!; const xp=XP_TABLE[L]; const promo=L>=30?promotionsFor(voc)[0]?.id:null; const pl=playerStats(voc,xp,equipmentBonus(gear(voc,L)),promo,defaultSpells(voc,L)); const bank={[food(L).id]:1e9};
 let ms=0,x=0,d=0,N=150; for(let s=0;s<N;s++){const c=runCycle(p.hunt,pl,12345,s,p.difficulty,p.pack); if(c.outcome==='death'){d++;ms+=c.fightMs;continue;} const r=eatAfterFight(c,pl,bank); ms+=c.fightMs+r.restMs; x+=c.xp;} return {xph:x/ms*3.6e6, death:d/N}; }
const nodes=HUNTS.filter(h=>!h.boss).flatMap(h=>['normal','hard','nightmare'].flatMap(d=>[1,2,3].map(k=>huntNode(h.id,d as any,k))));
for(const voc of VOCS){ let hours=0; const rows:string[]=[];
 for(let L=1;L<75;L++){ let best={n:'',xph:0,death:0};
  for(const n of nodes){const r=evalHunt(voc,L,n); if(r.death<=0.005&&r.xph>best.xph)best={n,...r};}
  const need=XP_TABLE[L+1]-XP_TABLE[L]; const h=need/best.xph; hours+=h;
  if(L%5===0||L<5) rows.push(`L${L} ${best.n} ${Math.round(best.xph)}xp/h ${h.toFixed(2)}h acc=${hours.toFixed(1)}h`);}
 console.log('==',voc,'total',hours.toFixed(0),'h'); console.log(rows.join('\n'));}
