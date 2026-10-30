import { itemValue, HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, itemById, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const foods=(items as any[]).filter(i=>i.food).sort((a,b)=>a.food-b.food);
function gear(voc:string,L:number){const eq:any={};for(const i of items as any[]){const e=i.equip;if(!e||i.legendary||e.level>L)continue;if(e.vocations&&!e.vocations.includes(voc))continue;const sc=(e.attack??0)*2+(e.defense??0)+(e.hp??0)/8;const c=eq[e.slot];if(!c||sc>c.sc)eq[e.slot]={id:i.id,sc};}const o:any={};for(const k in eq)o[k]=eq[k].id;return o;}
const val=(id:string)=>id==='gold'?1:itemValue(id);
for(const h of HUNTS){const L=Math.max(1,h.level);const voc='hunter';const p=parseHuntNode(h.id)!;const pl=playerStats(voc,XP_TABLE[L],equipmentBonus(gear(voc,L)),L>=30?promotionsFor(voc)[0]?.id:null,defaultSpells(voc,L));const bank={[foods.filter(f=>(f.level??0)<=L).pop()?.id??foods[0].id]:1e9};
let ms=0,x=0,g=0,gear_=0,d=0;const by:Record<string,number>={};const N=h.boss?2:400;for(let s=0;s<N;s++){const c=runCycle(h,pl,99,s,p.difficulty,1);if(c.outcome==='death'){d++;ms+=c.fightMs;continue;}ms+=c.fightMs+eatAfterFight(c,pl,bank).restMs;x+=c.xp;for(const[k,q]of Object.entries(c.loot)){const v=val(k)*q;if(itemById(k.split('+')[0])?.equip)gear_+=v;else{g+=v;by[k]=(by[k]??0)+v;}}}
const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+':'+Math.round(v/ms*3.6e6)).join(' ');
console.log(h.id.padEnd(16),String(h.level).padStart(2),'xp/h',Math.round(x/ms*3.6e6).toString().padStart(7),'gold/h mat',Math.round(g/ms*3.6e6).toString().padStart(6),'gear',Math.round(gear_/ms*3.6e6).toString().padStart(6),'mortes',d,'|',top);}
