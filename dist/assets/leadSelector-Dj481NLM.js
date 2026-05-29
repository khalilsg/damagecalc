import{a as e,d as t,n,o as r,s as i,u as a}from"./chaos-DFE1WZAB.js";function o(e){let t={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};for(let n of e.split(`/`)){let[e,r]=n.trim().split(` `),i={HP:`hp`,Atk:`atk`,Def:`def`,SpA:`spa`,SpD:`spd`,Spe:`spe`};i[r]&&(t[i[r]]=parseInt(e))}return t}function s(e){let t={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};for(let n of e.split(`/`)){let[e,r]=n.trim().split(` `),i={HP:`hp`,Atk:`atk`,Def:`def`,SpA:`spa`,SpD:`spd`,Spe:`spe`};i[r]&&(t[i[r]]=parseInt(e))}return t}function c(e){let t=[...e.matchAll(/\[([^\]]+)\]/g)].map(e=>e[1]),n=e.replace(/\s*\[[^\]]+\]/g,``).trim(),r=t.find(e=>[`physical`,`special`,`both`].includes(e.toLowerCase())),i=r?r.toLowerCase():`both`,a=t.filter(e=>/^[+-]\d+\s+\w+$/.test(e)).map(e=>{let[t,n]=e.split(/\s+/);return{modifier:parseInt(t),stat:n}}),[o,s]=n.split(`@`).map(e=>e.trim()),c=o.match(/\s*\(([MF])\)$/);return{name:c?o.replace(/\s*\([MF]\)$/,``).trim():o,gender:c?c[1]:void 0,item:s??void 0,attackerType:i,boosts:a}}function l(e){return e.trim().split(/\n\s*\n/).filter(e=>e.trim()).map(e=>{let t=e.trim().split(`
`),{name:n,gender:r,item:i,attackerType:a,boosts:l}=c(t[0]),u={name:n,gender:r,item:i,attackerType:a,boosts:l,ability:void 0,level:50,evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},nature:`Serious`,teraType:void 0,moves:[]};for(let e of t.slice(1)){let t=e.trim();t.startsWith(`Ability:`)?u.ability=t.replace(`Ability:`,``).trim():t.startsWith(`Level:`)?u.level=parseInt(t.replace(`Level:`,``).trim()):t.startsWith(`EVs:`)?u.evs=o(t.replace(`EVs:`,``).trim()):t.startsWith(`IVs:`)?u.ivs=s(t.replace(`IVs:`,``).trim()):t.startsWith(`Tera Type:`)?u.teraType=t.replace(`Tera Type:`,``).trim():t.includes(`Nature`)?u.nature=t.replace(`Nature`,``).trim():t.startsWith(`-`)&&u.moves.push(t.replace(/^-\s*/,``).trim())}return u})}var u=[{name:`Blastoise-M + Lopunny-M + Zoroark + Hatterene`,text:`Blastoise-Mega @ Blastoisinite [+2 SpA] [+2 Spe]
Ability: Mega Launcher
Tera Type: Ghost
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Protect
- Dark Pulse
- Water Spout
- Shell Smash

Lopunny-Mega @ Lopunnite
Ability: Scrappy
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Close Combat
- Fake Out
- Triple Axel
- After You

Whimsicott @ Fairy Feather
Ability: Prankster
Tera Type: Steel
EVs: 252 HP / 252 SpA
Modest Nature
IVs: 0 Atk
- Moonblast
- Taunt
- Encore
- Tailwind

Volcarona @ Leftovers
Ability: Flame Body
EVs: 144 HP / 96 Def / 24 SpD / 256 Spe
Timid Nature
- Struggle Bug
- Overheat

Zoroark-H @ Focus Sash [+2 SpA]
Ability: Illusion
EVs: 16 HP / 256 SpA / 256 Spe
- Bitter Malice
- Hyper Voice

Hatterene (F) @ Twisted Spoon
Ability: Magic Bounce
Level: 50
EVs: 252 HP / 252 SpA
Quiet Nature
- Psychic
- Dazzling Gleam
- Protect
- Giga Drain

Rhyperior @ Hard Stone [-1 Atk]
Ability: Lightning Rod
Level: 50
EVs: 252 HP / 252 Atk
Adamant Nature
- Rock Slide
- Poison Jab
- High Horsepower
- Ice Punch
`},{name:`Blastzam`,text:`Alakazam-Mega @ Alakazite
Ability: Trace
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Dazzling Gleam
- Focus Blast
- Psychic
- Protect

Blastoise-Mega @ Blastoisinite [+2 SpA] [+2 Spe]
Ability: Mega Launcher
Tera Type: Ghost
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Protect
- Dark Pulse
- Water Spout
- Shell Smash

Sneasler @ White Herb
Ability: Unburden
Level: 50
Tera Type: Dark
EVs: 4 HP / 252 Atk / 252 Spe
Adamant Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Tera Type: Ghost
EVs: 252 Atk / 252 Def
Adamant Nature
- Fake Out
- Flare Blitz
- Close Combat
- Parting Shot

Whimsicott @ Fairy Feather
Ability: Prankster
Tera Type: Steel
EVs: 252 HP / 252 SpA
Modest Nature
IVs: 0 Atk
- Moonblast
- Taunt
- Encore
- Tailwind

Liepard
Ability: Limber
Level: 50
EVs: 252 HP / 8 Def / 252 SpD
Calm Nature
- Protect
- Encore
- Foul Play
- Protect
`},{name:`Blastzam - Maushold`,text:`Alakazam-Mega @ Alakazite
Ability: Trace
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Dazzling Gleam
- Focus Blast
- Psychic
- Protect

Blastoise-Mega @ Blastoisinite [+2 SpA] [+2 Spe]
Ability: Mega Launcher
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Protect
- Dark Pulse
- Water Spout
- Shell Smash

Sneasler @ White Herb
Ability: Unburden
Level: 50
Tera Type: Dark
EVs: 4 HP / 252 Atk / 252 Spe
Adamant Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Tera Type: Ghost
EVs: 252 Atk / 252 Def
Adamant Nature
- Fake Out
- Flare Blitz
- Close Combat
- Parting Shot

Whimsicott @ Fairy Feather
Ability: Prankster
Tera Type: Steel
EVs: 252 HP / 252 SpA
Modest Nature
IVs: 0 Atk
- Moonblast
- Taunt
- Encore
- Tailwind

Maushold
Ability: Friend Guard
Tera Type: Steel
EVs: 252 HP / 252 SpD
Calm Nature
IVs: 0 Atk
- Protect
`},{name:`Blastzam - Maushold 2`,text:`Blastoise-Mega @ Blastoisinite [+2 SpA] [+2 Spe]
Ability: Mega Launcher
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Protect
- Dark Pulse
- Water Spout
- Shell Smash

Alakazam-Mega @ Alakazite [+2 SpA]
Ability: Trace
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Dazzling Gleam
- Focus Blast
- Psychic
- Protect

Sneasler @ White Herb [-1 Atk]
Ability: Unburden
EVs: 4 HP / 252 Atk / 252 Spe
Adamant Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect

Volcarona @ Sitrus Berry [+1 Spe] [+1 SpA]
Ability: Flame Body
EVs: 252 SpA / 252 Spe
Modest Nature
- Giga Drain
- Heat Wave

Whimsicott @ Fairy Feather
Ability: Prankster
EVs: 252 HP / 252 SpA
Modest Nature
- Moonblast
- Taunt
- Encore
- Tailwind

Maushold @ Chople Berry
Ability: Friend Guard
EVs: 252 HP / 252 SpD
Calm Nature
- Feint
- Super Fang
- Follow Me
- Helping Hand
`},{name:`Blastzam3`,text:`Blastoise-Mega @ Blastoisinite [+2 SpA] [+2 Spe] [-2 SpD] [-2 Def]
Ability: Mega Launcher
EVs: 32 SpA / 2 SpD / 32 Spe
Modest Nature
- Aura Sphere
- Dark Pulse
- Water Spout
- Shell Smash

Alakazam-Mega @ Alakazite [+2 SpA]
Ability: Trace
EVs: 32 SpA / 2 SpD / 32 Spe
Timid Nature
- Dazzling Gleam
- Focus Blast
- Psychic
- Protect

Sableye @ Sitrus Berry
Ability: Prankster
EVs: 32 HP / 32 SpD / 2 Def
Calm Nature
- Rain Dance
- Foul Play
- Reflect
- Encore

Volcarona @ Sitrus Berry [+1 Spe] [+1 SpA] [+1 SpD]
Ability: Flame Body
EVs: 32 HP / 30 Def / 4 SpA
Calm Nature
- Struggle Bug
- Rage Powder
- Quiver Dance
- Heat Wave

Whimsicott @ Fairy Feather
Ability: Prankster
EVs: 252 HP / 252 SpA
Modest Nature
- Moonblast
- Taunt
- Light Screen
- Tailwind

Maushold @ Choice Scarf
Ability: Friend Guard
EVs: 32 HP / 32 SpD / 2 Spe
Calm Nature
- Follow Me
- Super Fang
- Follow Me
- Helping Hand
`},{name:`SunSand`,text:`Whimsicott @ Sitrus Berry
Ability: Prankster
Level: 50
Serious Nature
- Tailwind
- Encore
- Moonblast
- Protect

Incineroar @ Chople Berry
Ability: Intimidate
Level: 50
Serious Nature
- Throat Chop
- Flare Blitz
- Fake Out
- Parting Shot

Floette-Eternal
Ability: Flower Veil
Level: 50
Serious Nature
- Light of Ruin
- Protect
- Moonblast
- Dazzling Gleam

Tyranitar @ Focus Sash
Ability: Sand Stream
Level: 50
Serious Nature
- Rock Slide
- Knock Off
- Protect
- High Horsepower

Garchomp @ White Herb
Ability: Sand Veil
Level: 50
Serious Nature
- Protect
- Earthquake
- Outrage
- Rock Slide

Charizard-Mega-Y @ Charizardite Y
Ability: Solar Power
Level: 50
Serious Nature
- Heat Wave
- Focus Blast
- Protect
- Air Slash
`}],d=t(),f=()=>({atk:0,spa:0,def:0,spd:0,spe:0}),p={myStages:{},opponentStages:{},opponentMoves:{},weather:null,myScreens:{reflect:!1,lightScreen:!1},opponentScreens:{reflect:!1,lightScreen:!1},myFriendGuard:!1,opponentFriendGuard:!1,myHelpingHand:{}},m=new Set;function h(e){return m.add(e),()=>m.delete(e)}function g(){m.forEach(e=>e(p))}function ee(e,t){p.myStages=Object.fromEntries(e.map(e=>[e,f()])),p.opponentStages=Object.fromEntries(t.map(e=>[e,f()])),p.opponentMoves=Object.fromEntries(t.map(e=>[e,[]])),p.weather=null,p.myScreens={reflect:!1,lightScreen:!1},p.opponentScreens={reflect:!1,lightScreen:!1},p.myFriendGuard=!1,p.opponentFriendGuard=!1,p.myHelpingHand=Object.fromEntries(e.map(e=>[e,!1])),g()}function _(e,t,n){p.myStages[e]&&(p.myStages[e][t]=pe(p.myStages[e][t]+n),g())}function v(e,t,n){p.opponentStages[e]&&(p.opponentStages[e][t]=pe(p.opponentStages[e][t]+n),g())}function te(e){p.myStages[e]&&(p.myStages[e]=f(),g())}function ne(e){p.opponentStages[e]&&(p.opponentStages[e]=f(),g())}function re(e,t,n,r=[]){p.opponentMoves[e]&&(p.opponentMoves[e].find(e=>e.name.toLowerCase()===t.toLowerCase())||(p.opponentMoves[e].push({name:t,calcs:n,defGrids:r}),g()))}function ie(e,t){p.opponentMoves[e]&&(p.opponentMoves[e]=p.opponentMoves[e].filter(e=>e.name!==t),g())}function ae(e){p.weather=p.weather===e?null:e,g()}function oe(e,t){p.myScreens[e]=t,g()}function se(e,t){p.opponentScreens[e]=t,g()}function ce(e){p.myFriendGuard=e,g()}function le(e){p.opponentFriendGuard=e,g()}function ue(e){e in p.myHelpingHand&&(p.myHelpingHand[e]=!p.myHelpingHand[e],g())}function de(e){delete p.myStages[e],delete p.myHelpingHand[e],g()}function fe(e){delete p.opponentStages[e],delete p.opponentMoves[e],g()}function pe(e){return Math.max(-6,Math.min(6,e))}function me(e){return Math.max(-6,Math.min(6,e??0))}function he(e){return e>=100?`#2a7a2a`:e>=50?`#b07000`:`#888`}function ge(e){return e>=100?`rgba(42,122,42,0.28)`:e>=50?`rgba(176,112,0,0.28)`:`rgba(136,136,136,0.28)`}function _e(e,t,n){let r=Math.min(100,t??0),i=Math.min(100,n??0),a=he(n),o=ge(n);i<=0||(e.style.backgroundImage=r>=1&&r<i-.5?`linear-gradient(to right, ${a} ${r}%, ${o} ${r}%, ${o} ${i}%, transparent ${i}%)`:`linear-gradient(to right, ${a} ${i}%, transparent ${i}%)`)}function ve(e,t){let n=Math.round(e??t??0),r=Math.round(t??0);return n===r?`${r}%`:`${n}–${r}%`}var y=[`guaranteed-ohko`,`chance-ohko`,`2hko`,``];function ye(e,t){return y.indexOf(e??``)<=y.indexOf(t??``)?e??``:t??``}function be(e){let t=new Map;for(let n of e){let e=n.move;if(!t.has(e))t.set(e,{move:e,minPct:n.minPct??0,maxPct:n.maxPct??0,classification:n.classification??``});else{let r=t.get(e);r.minPct=Math.min(r.minPct,n.minPct??0),r.maxPct=Math.max(r.maxPct,n.maxPct??0),r.classification=ye(r.classification,n.classification)}}return[...t.values()]}function xe(e){if(!e)return null;let t=x(`span`,`mv-ko-tag`);if(e===`guaranteed-ohko`)t.className=`mv-ko-tag mv-ko-ohko`,t.textContent=`OHKO ✓`;else if(e===`chance-ohko`)t.className=`mv-ko-tag mv-ko-chance`,t.textContent=`OHKO ~`;else if(e===`2hko`)t.className=`mv-ko-tag mv-ko-2hko`,t.textContent=`2HKO`;else return null;return t}function b(e,t,n,r){let i=x(`div`,`mv-visual-row`),a=x(`div`,`mv-visual-top`),o=x(`span`,`mv-name`);o.textContent=e,a.appendChild(o);let s=xe(t);if(s&&a.appendChild(s),i.appendChild(a),(r??0)>0){let e=x(`div`,`mv-visual-bot`),t=x(`div`,`mv-track`);_e(t,n,r),e.appendChild(t);let a=x(`span`,`mv-pct`);a.textContent=ve(n,r),e.appendChild(a),i.appendChild(e)}return i}function Se(e,t,n,r){n.innerHTML=``;for(let{playerName:i,matchups:a}of e){let e=r?.myStages?.[i]??{},o=t?.find(e=>e.playerName===i),s=x(`div`,`player-section`);s.appendChild(Ce(`▸ ${i}`));let c=x(`div`,`matchup-cards`);for(let{opponentName:t,scenarios:n}of a){let i=x(`div`,`matchup-card`);i.appendChild(we(`vs. ${t}`));let a=r?.opponentStages?.[t]??{};if((Object.values(e).some(e=>e!==0)||Object.values(a).some(e=>e!==0))&&o){let n=o.matchups.find(e=>e.opponentName===t);if(n){let t=!1;for(let{moveName:r,category:o,grid:s}of n.moveCalcs){let n=o===`special`?`spa`:`atk`,c=o===`special`?`spd`:`def`,l=s[`${me(e[n]??0)},${me(a[c]??0)}`];l&&(t=!0,i.appendChild(b(r,l.classification,l.minPct,l.maxPct)))}t||i.appendChild(Ee(`No data at current stages.`))}}else for(let{label:e,rows:t}of n){e!==`Base`&&i.appendChild(Te(e));for(let{move:e,classification:n,minPct:r,maxPct:a}of be(t))i.appendChild(b(e,n,r,a))}c.appendChild(i)}s.appendChild(c),n.appendChild(s)}}function x(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Ce(e){let t=x(`div`,`section-header`);return t.textContent=e,t}function we(e){let t=x(`div`,`card-header`);return t.textContent=e,t}function Te(e){let t=x(`div`,`scenario-label`);return t.textContent=e,t}function Ee(e){let t=x(`div`,`moves-empty`);return t.textContent=e,t}function S(e){return Math.max(-6,Math.min(6,e??0))}function De(e){return e>=100?`#c00`:e>=50?`#d6600a`:`#888`}function Oe(e){return e>=100?`rgba(200,0,0,0.2)`:e>=50?`rgba(214,96,10,0.2)`:`rgba(136,136,136,0.2)`}function ke(e,t,n){let r=Math.min(100,t??0),i=Math.min(100,n??0),a=De(n),o=Oe(n);i<=0||(e.style.backgroundImage=r>=1&&r<i-.5?`linear-gradient(to right, ${a} ${r}%, ${o} ${r}%, ${o} ${i}%, transparent ${i}%)`:`linear-gradient(to right, ${a} ${i}%, transparent ${i}%)`)}function Ae(e,t){let n=Math.round(e??t??0),r=Math.round(t??0);return n===r?`${r}%`:`${n}–${r}%`}var je=[`guaranteed-ohko`,`chance-ohko`,`2hko`,``];function Me(e,t){return je.indexOf(e??``)<=je.indexOf(t??``)?e??``:t??``}function Ne(e){let t=new Map;for(let n of e){let e=n.move;if(!t.has(e))t.set(e,{move:e,minPct:n.minPct??0,maxPct:n.maxPct??0,classification:n.classification??``});else{let r=t.get(e);r.minPct=Math.min(r.minPct,n.minPct??0),r.maxPct=Math.max(r.maxPct,n.maxPct??0),r.classification=Me(r.classification,n.classification)}}return[...t.values()]}function Pe(e,t){let n=w(`span`,`mv-ko-tag`);if(e===`guaranteed-ohko`)n.className=`mv-ko-tag mv-def-danger`,n.textContent=`OHKO ✗`;else if(e===`chance-ohko`)n.className=`mv-ko-tag mv-def-warn`,n.textContent=`OHKO ~`;else if(e===`2hko`)n.className=`mv-ko-tag mv-def-2hko`,n.textContent=`2HKO`;else if(t<50)n.className=`mv-ko-tag mv-def-ok`,n.textContent=`Survives`;else return null;return n}function C(e,t,n,r,i=!1){let a=w(`div`,i?`mv-visual-row mv-live-row`:`mv-visual-row`),o=w(`div`,`mv-visual-top`);if(i){let e=w(`span`,`in-battle-badge`);e.textContent=`LIVE`,o.appendChild(e)}let s=w(`span`,`mv-name`);s.textContent=e,o.appendChild(s);let c=Pe(t,r);if(c&&o.appendChild(c),a.appendChild(o),(r??0)>0){let e=w(`div`,`mv-visual-bot`),t=w(`div`,`mv-track`);ke(t,n,r),e.appendChild(t);let i=w(`span`,`mv-pct`);i.textContent=Ae(n,r),e.appendChild(i),a.appendChild(e)}return a}function Fe(e,t,n,r){n.innerHTML=``;for(let{playerName:i,matchups:a}of e){let e=t?.find(e=>e.playerName===i),o=w(`div`,`player-section`);o.appendChild(Ie(`▸ ${i} (incoming)`));let s=w(`div`,`matchup-cards`);for(let{opponentName:t,scenarios:n}of a){if(n.length===0)continue;let a=w(`div`,`matchup-card`);a.appendChild(Le(`${t} attacking`));let o=r?.myStages?.[i]??{},c=r?.opponentStages?.[t]??{},l=Object.values(o).some(e=>e!==0)||Object.values(c).some(e=>e!==0),u=r?.opponentMoves?.[t]??[];for(let{name:e,calcs:t}of u){let n=(t??[]).find(e=>e.playerName===i);if(!(!n||n.rows.length===0))for(let{move:t,classification:r,minPct:i,maxPct:o}of Ne(n.rows))a.appendChild(C(t??e,r,i,o,!0))}if(l&&e){let n=e.matchups.find(e=>e.opponentName===t);if(n){let e=!1;for(let{moveName:t,category:r,grid:i}of n.moveCalcs){let n=r===`special`?`spa`:`atk`,s=r===`special`?`spd`:`def`,l=i[`${S(c[n]??0)},${S(o[s]??0)}`];l&&(e=!0,a.appendChild(C(t,l.classification,l.minPct,l.maxPct)))}!e&&u.length===0&&a.appendChild(ze(`No data at current stages.`))}}else{let e=new Map;for(let{label:t,rows:r}of n)e.has(t)||e.set(t,[]),e.get(t).push(...r);for(let[t,n]of e){t!==`Base`&&a.appendChild(Re(`My ${t}`));for(let{move:e,classification:t,minPct:r,maxPct:i}of Ne(n))a.appendChild(C(e,t,r,i))}}s.appendChild(a)}o.appendChild(s),n.appendChild(o)}}function w(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Ie(e){let t=w(`div`,`section-header`);return t.textContent=e,t}function Le(e){let t=w(`div`,`card-header`);return t.textContent=e,t}function Re(e){let t=w(`div`,`scenario-label`);return t.textContent=e,t}function ze(e){let t=w(`div`,`moves-empty`);return t.textContent=e,t}function T(e){return Math.max(-6,Math.min(6,e??0))}function Be(e,t,n){t.innerHTML=``;for(let{playerName:r,matchups:i}of e){let e=E(`div`,`player-section`);e.appendChild(Ve(`▸ ${r}`));let a=E(`div`,`matchup-cards`);for(let{opponentName:e,moveCalcs:t}of i){if(t.length===0)continue;let i=E(`div`,`matchup-card`);i.appendChild(He(`vs. ${e}`));let o=!1;for(let{moveName:a,category:s,grid:c}of t){let t=c[`${T(s===`special`?n?.myStages?.[r]?.spa:n?.myStages?.[r]?.atk)},${T(s===`special`?n?.opponentStages?.[e]?.spd:n?.opponentStages?.[e]?.def)}`];if(!t)continue;o=!0;let l=E(`div`,`scenario-label`);l.textContent=a,i.appendChild(l);let u=E(`div`,`calc-row ${Ue(t.classification)}`);u.textContent=t.formattedDesc,i.appendChild(u)}o&&a.appendChild(i)}e.appendChild(a),t.appendChild(e)}}function E(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Ve(e){let t=E(`div`,`section-header`);return t.textContent=e,t}function He(e){let t=E(`div`,`card-header`);return t.textContent=e,t}function Ue(e){return e===`guaranteed-ohko`?`ko-guaranteed`:e===`chance-ohko`?`ko-chance`:e===`2hko`?`ko-2hko`:``}function D(e){return Math.max(-6,Math.min(6,e??0))}function We(e,t,n){t.innerHTML=``;for(let{playerName:r,matchups:i}of e){let e=O(`div`,`player-section`);e.appendChild(Ge(`▸ ${r} (incoming)`));let a=O(`div`,`matchup-cards`);for(let{opponentName:e,moveCalcs:t}of i){let i=O(`div`,`matchup-card`);i.appendChild(Ke(`${e} attacking`));let o=!1,s=n?.opponentMoves?.[e]??[];for(let{name:t,defGrids:a}of s){let s=(a??[]).find(e=>e.playerName===r);if(!s)continue;let{category:c,grid:l}=s,u=l[`${D(c===`special`?n?.opponentStages?.[e]?.spa:n?.opponentStages?.[e]?.atk)},${D(c===`special`?n?.myStages?.[r]?.spd:n?.myStages?.[r]?.def)}`];if(!u)continue;o=!0;let d=O(`div`,`scenario-label in-battle-label`);d.textContent=`★ ${t}`,i.appendChild(d);let f=O(`div`,`calc-row ${k(u.classification)} in-battle-row`),p=O(`span`,`in-battle-badge`);p.textContent=`LIVE`,f.appendChild(p),f.appendChild(document.createTextNode(` `+u.formattedDesc)),i.appendChild(f)}for(let{moveName:a,category:s,grid:c}of t){let t=c[`${D(s===`special`?n?.opponentStages?.[e]?.spa:n?.opponentStages?.[e]?.atk)},${D(s===`special`?n?.myStages?.[r]?.spd:n?.myStages?.[r]?.def)}`];if(!t)continue;o=!0;let l=O(`div`,`scenario-label`);l.textContent=a,i.appendChild(l);let u=O(`div`,`calc-row ${k(t.classification)}`);u.textContent=t.formattedDesc,i.appendChild(u)}o&&a.appendChild(i)}e.appendChild(a),t.appendChild(e)}}function O(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Ge(e){let t=O(`div`,`section-header`);return t.textContent=e,t}function Ke(e){let t=O(`div`,`card-header`);return t.textContent=e,t}function k(e){return e===`guaranteed-ohko`?`ko-guaranteed`:e===`chance-ohko`?`ko-chance`:e===`2hko`?`ko-2hko`:``}function qe(e,t,n){t.innerHTML=``;let r=[],i=[],o=new Set,s=new Set;for(let{playerName:t,opponentName:c,basicComparisons:l,fullComparisons:u}of e){let e=n?.myStages?.[t]?.spe??0,d=n?.opponentStages?.[c]?.spe??0;for(let n of l){let i=a(n.playerSpeed,e),s=`player-${t}-${n.playerLabel}-${i}`;o.has(s)||(o.add(s),r.push({displayName:t,speed:i,isPlayer:!0}));let l=a(n.opponentSpeed,d),u=`opp-${c}-${n.opponentLabel}-${l}`;o.has(u)||(o.add(u),r.push({displayName:`${c}${n.opponentLabel}`,speed:l,isPlayer:!1}))}for(let n of u){let r=a(n.playerSpeed,e),o=`player-${t}-${n.playerLabel}-${r}`;if(!s.has(o)){s.add(o);let e=n.playerLabel===`Base`?``:` (${n.playerLabel})`;i.push({displayName:`${t}${e}`,speed:r,isPlayer:!0})}let l=a(n.opponentSpeed,d),u=`opp-${c}-${n.opponentLabel}-${l}`;if(!s.has(u)){s.add(u);let e=n.opponentLabel?` ${n.opponentLabel}`:``;i.push({displayName:`${c}${e}`,speed:l,isPlayer:!1})}}}r.sort((e,t)=>t.speed-e.speed),i.sort((e,t)=>t.speed-e.speed);let c=document.createElement(`div`);c.style.cssText=`display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start;`,c.appendChild(A(`Basic`,r)),c.appendChild(A(`Full Scenarios`,i)),t.appendChild(c)}function A(e,t){let n=document.createElement(`div`);n.style.cssText=`flex: 1; min-width: 280px;`;let r=document.createElement(`div`);r.className=`ladder-header`,r.textContent=e,n.appendChild(r);let i=document.createElement(`div`);i.className=`speed-ladder`;for(let{displayName:e,speed:n,isPlayer:r}of t){let t=document.createElement(`div`);t.className=`speed-entry ${r?`speed-player`:`speed-opponent`}`;let a=document.createElement(`span`);a.className=`speed-name`,a.textContent=e;let o=document.createElement(`span`);o.className=`speed-value`,o.textContent=n,t.appendChild(a),t.appendChild(o),i.appendChild(t)}return n.appendChild(i),n}var j=d.Generations.get(9),Je=new d.Field({gameType:`Doubles`}),Ye=252/32,M=new Set([`Protect`,`Wide Guard`,`Quick Guard`,`Detect`,`Kings Shield`,`Tailwind`,`Trick Room`,`Helping Hand`,`Follow Me`,`Rage Powder`,`Parting Shot`,`Taunt`,`Encore`,`After You`,`Fake Out`,`Thunder Wave`,`Will-O-Wisp`,`Spore`,`Sleep Powder`,`Recover`,`Roost`,`Heal Pulse`,`Instruct`]),Xe={"Fake Out":2,Tailwind:1.5,"Trick Room":1.5,"Follow Me":1.3,"Rage Powder":1.3,"Parting Shot":1.3,"U-turn":1.2,Encore:1.2};function N(e){return e.includes(`-Mega`)}var P={offense:.4,defense:.35,speed:.15,hardCounter:-.1};function F(e){let t={};for(let[n,r]of Object.entries(e??{}))t[n]=Math.min(252,Math.round((r??0)*Ye));return t}function I(e){if(e)return j.items.get(e.toLowerCase().replace(/[-\s]/g,``))?.name??void 0}function L(e,t){return new d.Pokemon(j,t,{level:e.level??50,evs:F(e.evs),ivs:e.ivs,nature:e.nature,ability:e.ability,item:I(e.item)})}function R(e){return new d.Pokemon(j,e.name,{level:50,evs:F(e.spread.evs),nature:e.spread.nature,item:I(e.item)})}function z(e,t,n){let r={pct:0,minPct:0,moveName:null};for(let i of n)if(!M.has(i))try{let n=new d.Move(j,i);if((n.bp??0)===0)continue;let a=(0,d.calculate)(j,e,t,n,Je);if(a.desc().includes(`No damage`))continue;let o=a.damage,s=t.stats.hp,c,l;if(Array.isArray(o)&&Array.isArray(o[0]))c=o.reduce((e,t)=>e+t[t.length-1],0),l=o.reduce((e,t)=>e+t[0],0);else{let e=Array.isArray(o)?o:[o];c=e[e.length-1],l=e[0]}let u=c/s*100,f=l/s*100;u>r.pct&&(r={pct:u,minPct:f,moveName:i})}catch{}return r}function B(e){return e>=100?3:e>=50?1.5:e>=30?.5:0}function Ze(e,t){let n=e>=100,r=t>=100;return!n&&!r?2:!n||!r?1:-2}function Qe(e){let t=1;for(let n of e.moves??[]){let e=Xe[n];e&&e>t&&(t=e)}return t}function V(e){let t=[];for(let n=0;n<e.length;n++)for(let r=n+1;r<e.length;r++)t.push([e[n],e[r]]);return t}function $e(e,t,r){let a=e.map(e=>{let t=i(e.name);return{set:e,resolvedName:t,pokemon:L(e,t),moves:(e.moves??[]).filter(e=>e)}}),o=t.map(e=>{let t=n(r,e)??{name:e,spread:{nature:`Serious`,evs:{}},moves:[],item:null,usage:0};return{...t,pokemon:R(t)}}),s=o.map(Qe),c=s.reduce((e,t)=>e+t,0),l=s.map(e=>e/c),u=a.map(({pokemon:e,moves:t})=>o.map(n=>({damageOut:z(e,n.pokemon,t).pct,damageIn:z(n.pokemon,e,n.moves).pct,youOutspeed:e.stats.spe>n.pokemon.stats.spe}))),d=V(a.map((e,t)=>t)).map(([e,t])=>{let n=0,r=0,i=0,s=[];for(let a=0;a<o.length;a++){let c=l[a],d=u[e][a],f=u[t][a];n+=B(Math.max(d.damageOut,f.damageOut))*c,r+=Ze(d.damageIn,f.damageIn)*c,(d.youOutspeed||f.youOutspeed)&&(i+=c),d.damageIn>=100&&f.damageIn>=100&&s.push(o[a].name)}let c=n/3*100,d=(r+2)/4*100,f=i*100,p=s.length/o.length*100,m=Math.max(0,Math.round(P.offense*c+P.defense*d+P.speed*f+P.hardCounter*p)),h=o.filter((n,r)=>Math.max(u[e][r].damageOut,u[t][r].damageOut)>=50).map(e=>e.name);return{score:m,monA:a[e].resolvedName,monB:a[t].resolvedName,offNorm:Math.round(c),defNorm:Math.round(d),spdNorm:Math.round(f),threats:h,hardCounters:s,_idxA:e,_idxB:t}}).filter(e=>!(N(e.monA)&&N(e.monB)));return d.sort((e,t)=>t.score-e.score),d.map(e=>({...e,backPair:tt(e,a,u,o)}))}function et(e,t,r){let a=e.map(e=>{let t=i(e.name);return{resolvedName:t,pokemon:L(e,t),moves:(e.moves??[]).filter(e=>e)}});return t.map(e=>{let t=n(r,e),i=t??{name:e,spread:{nature:`Serious`,evs:{}},moves:[],item:null,usage:0},o=R(i),s=i.moves.filter(e=>!M.has(e)).map(e=>({move:e,targets:a.map(({resolvedName:t,pokemon:n})=>{let{pct:r,minPct:i}=z(o,n,[e]);return{mon:t,pct:r,minPct:i}}).filter(e=>e.pct>=30).sort((e,t)=>t.pct-e.pct)})).filter(({targets:e})=>e.length>0),c=a.map(({resolvedName:e,pokemon:t,moves:n})=>{let{moveName:r,pct:i,minPct:a}=z(t,o,n);return{mon:e,move:r,pct:i,minPct:a}});return{name:i.name,spread:i.spread,moves:i.moves,item:i.item,usage:i.usage,inChaos:t!==null,threatsOut:s,answers:c}})}function tt(e,t,n,r){let{_idxA:i,_idxB:a}=e,o=t.map((e,t)=>t).filter(e=>e!==i&&e!==a);if(o.length<2)return null;let s=1-[i,a].filter(e=>N(t[e].resolvedName)).length,c=r.map((e,t)=>t).filter(e=>Math.max(n[i][e].damageOut,n[a][e].damageOut)<50),l=V(o).filter(([e,n])=>[e,n].filter(e=>N(t[e].resolvedName)).length<=s);if(l.length===0)return null;let u=l,d=u[0],f=-1/0;for(let[e,t]of u){let r=0;for(let i of c)r+=B(Math.max(n[e][i].damageOut,n[t][i].damageOut)),n[e][i].damageIn<100&&(r+=.5),n[t][i].damageIn<100&&(r+=.5);r>f&&(f=r,d=[e,t])}return{monA:t[d[0]].resolvedName,monB:t[d[1]].resolvedName,covers:c.map(e=>r[e].name)}}var nt={hp:`HP`,atk:`Atk`,def:`Def`,spa:`SpA`,spd:`SpD`,spe:`Spe`};function rt(e){return e?Object.entries(e).filter(([,e])=>e>0).map(([e,t])=>`${t} ${nt[e]??e}`).join(` / `):``}function it(e){return e>=100?`#2a7a2a`:e>=50?`#b07000`:`#888`}function at(e){return e>=100?`rgba(42,122,42,0.28)`:e>=50?`rgba(176,112,0,0.28)`:`rgba(136,136,136,0.28)`}function ot(e,t,n){let r=Math.min(100,t??0),i=Math.min(100,n),a=it(n),o=at(n);i<=0||(e.style.backgroundImage=r>=1&&r<i-.5?`linear-gradient(to right, ${a} ${r}%, ${o} ${r}%, ${o} ${i}%, transparent ${i}%)`:`linear-gradient(to right, ${a} ${i}%, transparent ${i}%)`)}function st(e,t){let n=Math.round(e??t),r=Math.round(t);return n===r?`${r}%`:`${n}–${r}%`}function ct(e){let t=U(`div`,`matchup-card`),n=U(`div`,`card-header`);if(n.textContent=e.item?`${e.name} — ${e.item}`:e.name,t.appendChild(n),!e.inChaos){let e=U(`div`,`tm-no-data`);return e.textContent=`No chaos data — set unknown`,t.appendChild(e),t}let r=rt(e.spread.evs),i=U(`div`,`tm-set-info`);if(i.textContent=e.spread.nature+(r?` · ${r}`:``),t.appendChild(i),e.moves.length>0){let n=U(`div`,`tm-moves-row`);for(let t of e.moves){let e=U(`span`,`tm-move-chip`+(M.has(t)?` tm-skip`:``));e.textContent=t,n.appendChild(e)}t.appendChild(n)}let a=U(`div`,`tm-section-head`);if(a.textContent=`Their Threats`,t.appendChild(a),e.threatsOut.length===0){let e=U(`div`,`tm-no-threats`);e.textContent=`No significant threats to your team`,t.appendChild(e)}else{let n=U(`div`,`tm-threats`);for(let{move:t,targets:r}of e.threatsOut){let e=U(`div`,`tm-threat-row`),i=U(`span`,`tm-threat-move`);i.textContent=t,e.appendChild(i);let a=U(`span`,`tm-targets`);for(let{mon:e,pct:t,minPct:n}of r){let r=U(`span`,t>=100?`tm-target tm-ohko`:t>=50?`tm-target tm-warn`:`tm-target tm-chip`);r.textContent=`${e} ${st(n,t)}`,a.appendChild(r)}e.appendChild(a),n.appendChild(e)}t.appendChild(n)}let o=U(`div`,`tm-section-head`);o.textContent=`Your Coverage`,t.appendChild(o);let s=U(`div`,`tm-answers`);for(let{mon:t,move:n,pct:r,minPct:i}of e.answers){let e=U(`div`,`tm-answer-row`),a=U(`div`,`tm-answer-top`),o=U(`span`,`tm-answer-mon`);o.textContent=t,a.appendChild(o);let c=U(`span`,n?`tm-answer-move`:`tm-answer-move tm-no-move`);c.textContent=n??`—`,a.appendChild(c),e.appendChild(a);let l=U(`div`,`tm-answer-bot`);if(n){let e=U(`div`,`tm-answer-track`);ot(e,i,r),l.appendChild(e);let t=U(`span`,`tm-answer-pct`);t.textContent=st(i,r),l.appendChild(t)}else{let e=U(`span`,`tm-answer-pct`);e.textContent=`—`,l.appendChild(e)}e.appendChild(l),s.appendChild(e)}return t.appendChild(s),t}function lt(e,t,n=null){if(t.innerHTML=``,n&&n.length>0){let e=U(`div`,`player-section`),r=U(`div`,`section-header`);r.textContent=`Opponent Sets & Threats`,e.appendChild(r);let i=U(`div`,`matchup-cards threat-cards`);for(let e of n)i.appendChild(ct(e));e.appendChild(i),t.appendChild(e)}if(!e)return;let{offense:r,defense:i,speed:a}=e,o=[],s=[],c=[],l=[],u=[],d=[];for(let{playerName:e,matchups:t}of r)for(let{opponentName:n,scenarios:r}of t)for(let{label:t,rows:i}of r)if(t===`Base`)for(let{formattedBase:t,kochanceText:r,classification:a}of i){let i={playerName:e,opponentName:n,desc:t,kochance:r};if(a===`guaranteed-ohko`)o.push(i);else if(a===`chance-ohko`)s.push(i);else if(a===`2hko`){let e=r?.match(/([\d.]+)%/);(r?.includes(`guaranteed`)||e&&parseFloat(e[1])>25)&&c.push(i)}}for(let{playerName:e,matchups:t}of i)for(let{opponentName:n,scenarios:r}of t)for(let{label:t,rows:i}of r)if(t===`Base`)for(let{formattedBase:t,kochanceText:r,classification:a,isInBattle:o}of i){if(o)continue;let i={playerName:e,opponentName:n,desc:t,kochance:r};if(a===`guaranteed-ohko`)l.push(i);else if(a===`chance-ohko`)u.push(i);else if(a===`2hko`){let e=r?.match(/([\d.]+)%/);(r?.includes(`guaranteed`)||e&&parseFloat(e[1])>25)&&d.push(i)}}let f=[],p=[],m=new Set,h=new Set;for(let{playerName:e,opponentName:t,basicComparisons:n}of a){for(let{playerLabel:r,playerSpeed:i,opponentLabel:a,tie:o}of n)if(o){let n=`${e}-${r}-${t}-${a}-${i}`;m.has(n)||(m.add(n),f.push({playerName:e,playerLabel:r,opponentName:t,opponentLabel:a,speed:i}))}let r=n.find(e=>e.playerLabel===`Base`&&e.opponentLabel===``),i=n.find(e=>e.playerLabel===`Base`&&e.opponentLabel===`+`);if(r&&i&&!r.playerFaster&&i.playerFaster){let n=`${e}-${t}`;h.has(n)||(h.add(n),p.push({playerName:e,opponentName:t,note:`Outsped by opponent+ but faster than opponent`}))}}H(t,`Guaranteed OHKOs I Can Deal`,o,`summary-red`,e=>`${e.playerName} → ${e.opponentName}`,e=>e.desc),H(t,`Chance OHKOs I Can Deal (>5%)`,s,`summary-orange`,e=>`${e.playerName} → ${e.opponentName}`,e=>`${e.desc} — ${e.kochance}`),H(t,`Notable 2HKOs I Can Deal (>25%)`,c,`summary-yellow`,e=>`${e.playerName} → ${e.opponentName}`,e=>`${e.desc} — ${e.kochance}`),H(t,`Guaranteed OHKOs Against My Team`,l,`summary-red`,e=>`${e.opponentName} → ${e.playerName}`,e=>e.desc),H(t,`Chance OHKOs Against My Team`,u,`summary-orange`,e=>`${e.opponentName} → ${e.playerName}`,e=>`${e.desc} — ${e.kochance}`),H(t,`Notable 2HKOs Against My Team (>25%)`,d,`summary-yellow`,e=>`${e.opponentName} → ${e.playerName}`,e=>`${e.desc} — ${e.kochance}`),ut(t,`Speed Ties`,f.map(e=>`${e.playerName} (${e.playerLabel||`Base`}) ties ${e.opponentName} (${e.opponentLabel||`min`}) at ${e.speed}`),`summary-cyan`),ut(t,`Critical Speed Matchups`,p.map(e=>`${e.playerName} vs ${e.opponentName}: ${e.note}`),`summary-cyan`)}function H(e,t,n,r,i,a){if(n.length===0)return;let o=new Map;for(let e of n){let t=i(e),n=a(e);o.has(t)||o.set(t,new Set),o.get(t).add(n)}let s=U(`div`,`summary-block`),c=U(`div`,`summary-block-header ${r}`);c.textContent=t,s.appendChild(c);for(let[e,t]of o){let n=U(`div`,`summary-pair-header ${r}`);n.textContent=e,s.appendChild(n);for(let e of t){let t=U(`div`,`summary-detail-row`);t.textContent=e,s.appendChild(t)}}e.appendChild(s)}function ut(e,t,n,r){if(n.length===0)return;let i=U(`div`,`summary-block`),a=U(`div`,`summary-block-header ${r}`);a.textContent=t,i.appendChild(a);let o=new Set;for(let e of n){if(o.has(e))continue;o.add(e);let t=U(`div`,`summary-row ${r}`);t.textContent=e,i.appendChild(t)}e.appendChild(i)}function U(e,t){let n=document.createElement(e);return t&&(n.className=t),n}var dt=[{label:`Atk`,key:`atk`},{label:`SpA`,key:`spa`},{label:`Def`,key:`def`},{label:`SpD`,key:`spd`},{label:`Spe`,key:`spe`}],ft=[{label:`Sun`,value:`Sun`},{label:`Rain`,value:`Rain`},{label:`Sand`,value:`Sand`},{label:`Snow`,value:`Snow`}];function pt(e,t,n){e.innerHTML=``;let r=Object.keys(t.myStages).length>0;if(r&&e.appendChild(mt(t)),!r){let t=W(`p`,`tracker-placeholder`);t.textContent=`Run an analysis to start tracking.`,e.appendChild(t);return}gt(e,`My Team`);for(let[n,r]of Object.entries(t.myStages))e.appendChild(_t(n,r,t.myHelpingHand?.[n]??!1));gt(e,`Opponents`);for(let[r,i]of Object.entries(t.opponentStages))e.appendChild(vt(r,i,t.opponentMoves[r]??[],n,t))}function mt(e){let t=W(`div`,`field-controls`),n=W(`div`,`field-row-label`);n.textContent=`Weather`,t.appendChild(n);let r=W(`div`,`field-btn-row`);for(let{label:t,value:n}of ft){let i=W(`button`,`field-btn${e.weather===n?` active`:``}`);i.textContent=t,i.addEventListener(`click`,()=>ae(n)),r.appendChild(i)}t.appendChild(r);let i=W(`div`,`field-row-label`);i.textContent=`My Screens`,t.appendChild(i),t.appendChild(ht(e.myScreens,(e,t)=>oe(e,t)));let a=W(`div`,`field-row-label`);a.textContent=`Opp Screens`,t.appendChild(a),t.appendChild(ht(e.opponentScreens,(e,t)=>se(e,t)));let o=W(`div`,`field-row-label`);o.textContent=`My Side`,t.appendChild(o);let s=W(`div`,`field-btn-row`),c=W(`button`,`field-btn${e.myFriendGuard?` active`:``}`);c.textContent=`Friend Guard`,c.title=`Partner has Friend Guard — halves damage I take`,c.addEventListener(`click`,()=>ce(!e.myFriendGuard)),s.appendChild(c),t.appendChild(s);let l=W(`div`,`field-row-label`);l.textContent=`Opp Side`,t.appendChild(l);let u=W(`div`,`field-btn-row`),d=W(`button`,`field-btn${e.opponentFriendGuard?` active`:``}`);return d.textContent=`Friend Guard`,d.title=`Opponent partner has Friend Guard — halves damage they take`,d.addEventListener(`click`,()=>le(!e.opponentFriendGuard)),u.appendChild(d),t.appendChild(u),t}function ht(e,t){let n=W(`div`,`field-btn-row`);for(let[r,i]of[[`reflect`,`Reflect`],[`lightScreen`,`Light Screen`]]){let a=W(`button`,`field-btn${e[r]?` active`:``}`);a.textContent=i,a.addEventListener(`click`,()=>t(r,!e[r])),n.appendChild(a)}return n}function gt(e,t){let n=W(`div`,`tracker-section-label`);n.textContent=t,e.appendChild(n)}function _t(e,t,n){let r=W(`div`,`tracker-card`);r.appendChild(yt(e,()=>te(e),()=>de(e)));for(let{label:n,key:i}of dt)r.appendChild(bt(n,t[i]??0,()=>_(e,i,-1),()=>_(e,i,1)));let i=W(`div`,`card-footer-row`),a=W(`button`,`hh-btn${n?` active`:``}`);return a.textContent=`Helping Hand`,a.title=n?`Helping Hand active (+50% damage) — click to remove`:`Toggle Helping Hand for this turn`,a.addEventListener(`click`,()=>ue(e)),i.appendChild(a),r.appendChild(i),r}function vt(t,n,i,a,o){let s=W(`div`,`tracker-card`);s.appendChild(yt(t,()=>ne(t),()=>fe(t)));for(let{label:e,key:r}of dt)s.appendChild(bt(e,n[r]??0,()=>v(t,r,-1),()=>v(t,r,1)));let c=W(`div`,`moves-section-label`);if(c.textContent=`Moves used:`,s.appendChild(c),i.length===0){let e=W(`div`,`moves-empty`);e.textContent=`None logged`,s.appendChild(e)}else for(let{name:e}of i){let n=W(`div`,`move-tag`),r=W(`span`);r.textContent=e;let i=W(`button`,`move-remove-btn`);i.textContent=`×`,i.title=`Remove`,i.addEventListener(`click`,()=>ie(t,e)),n.appendChild(r),n.appendChild(i),s.appendChild(n)}let l=W(`div`,`move-input-row`),u=W(`input`,`move-input`);u.type=`text`,u.placeholder=`e.g. Shadow Ball`;let d=W(`button`,`move-log-btn`);d.textContent=`Log`;let f=async()=>{let n=u.value.trim();if(n){d.textContent=`…`,d.disabled=!0;try{let i={weather:o.weather,myScreens:o.myScreens,opponentScreens:o.opponentScreens,myFriendGuard:o.myFriendGuard};re(t,n,await r(n,t,a,i),(a??[]).flatMap(r=>{let a=e(n,t,r,i);return a?[a]:[]})),u.value=``}catch(e){console.warn(`Could not log move:`,e.message)}finally{d.textContent=`Log`,d.disabled=!1}}};return d.addEventListener(`click`,f),u.addEventListener(`keydown`,e=>{e.key===`Enter`&&f()}),l.appendChild(u),l.appendChild(d),s.appendChild(l),s}function yt(e,t,n){let r=W(`div`,`tracker-card-header`),i=W(`span`,`tracker-poke-name`);i.textContent=e;let a=W(`button`,`tracker-reset-btn`);a.textContent=`Reset`,a.addEventListener(`click`,t);let o=W(`button`,`ko-btn`);return o.textContent=`✕`,o.title=`KO — remove from tracker`,o.addEventListener(`click`,n),r.appendChild(i),r.appendChild(a),r.appendChild(o),r}function bt(e,t,n,r){let i=W(`div`,`stat-row`),a=W(`span`,`stat-label`);a.textContent=e;let o=W(`button`,`stage-sm-btn`);o.textContent=`−`,o.addEventListener(`click`,n);let s=W(`span`,t>0?`stage-val pos`:t<0?`stage-val neg`:`stage-val`);s.textContent=t>0?`+${t}`:`${t}`;let c=W(`button`,`stage-sm-btn`);return c.textContent=`+`,c.addEventListener(`click`,r),i.appendChild(a),i.appendChild(o),i.appendChild(s),i.appendChild(c),i}function W(e,t){let n=document.createElement(e);return t&&(n.className=t),n}var G=null,K=null;function q(e,t,n){if(!e){t.innerHTML=``;let e=X(`p`,`matchup-placeholder`);e.textContent=`Run an analysis first.`,t.appendChild(e);return}let r=e.offenseExpanded.map(e=>e.playerName),i=e.offenseExpanded[0]?.matchups.map(e=>e.opponentName)??[];G&&!r.includes(G)&&(G=null),K&&!i.includes(K)&&(K=null),t.innerHTML=``;let a=X(`div`,`matchup-selector-row`),o=wt(`— My Pokémon —`,r,G);o.addEventListener(`change`,()=>{G=o.value||null,q(e,t,n)});let s=X(`span`,`matchup-vs`);s.textContent=`vs.`;let c=wt(`— Opponent —`,i,K);if(c.addEventListener(`change`,()=>{K=c.value||null,q(e,t,n)}),a.appendChild(o),a.appendChild(s),a.appendChild(c),t.appendChild(a),!G||!K){let e=X(`p`,`matchup-placeholder`);e.textContent=`Select a Pokémon from each side to see the matchup.`,t.appendChild(e);return}let l=n?.myStages?.[G]??{},u=n?.opponentStages?.[K]??{},d=n?.myHelpingHand?.[G]??!1,f=xt(l,u,G,K);f&&t.appendChild(f),t.appendChild(St(`${G} → ${K}`,d,e.offenseExpanded,`offense`,G,K,l,u)),t.appendChild(St(`${G} defending vs ${K}`,!1,e.defenseExpanded,`defense`,G,K,l,u));let p=n?.opponentMoves?.[K]??[];p.length>0&&t.appendChild(Ct(`Live — ${K}'s moves vs ${G}`,p,G,u,l))}function xt(e,t,n,r){let i=Object.entries(e).filter(([,e])=>e!==0),a=Object.entries(t).filter(([,e])=>e!==0);if(i.length===0&&a.length===0)return null;let o=X(`div`,`matchup-stages`);if(i.length>0){let e=X(`span`,`matchup-stage-entry my-stage`);e.textContent=n+`: `+i.map(([e,t])=>`${e} ${t>0?`+`:``}${t}`).join(`, `),o.appendChild(e)}if(a.length>0){let e=X(`span`,`matchup-stage-entry opp-stage`);e.textContent=r+`: `+a.map(([e,t])=>`${e} ${t>0?`+`:``}${t}`).join(`, `),o.appendChild(e)}return o}function St(e,t,n,r,i,a,o,s){let c=X(`div`,`matchup-card`),l=X(`div`,`card-header`);if(l.textContent=e,t){let e=X(`span`,`in-battle-badge`);e.textContent=`HH`,e.title=`Helping Hand active (+50%)`,e.style.marginLeft=`6px`,l.appendChild(e)}c.appendChild(l);let u=n.find(e=>e.playerName===i)?.matchups.find(e=>e.opponentName===a);if(!u||u.moveCalcs.length===0)return c.appendChild(J(`No data.`)),c;let d=!1;for(let{moveName:e,category:t,grid:n}of u.moveCalcs){let i=t===`special`?`spa`:`atk`,a=t===`special`?`spd`:`def`,l=r===`offense`?n[`${Y(o[i]??0)},${Y(s[a]??0)}`]:n[`${Y(s[i]??0)},${Y(o[a]??0)}`];if(!l)continue;d=!0;let u=X(`div`,`scenario-label`);u.textContent=e,c.appendChild(u);let f=X(`div`,`calc-row ${Tt(l.classification)}`);f.textContent=l.formattedDesc??``,c.appendChild(f)}return d||c.appendChild(J(`No data at current stages.`)),c}function Ct(e,t,n,r,i){let a=X(`div`,`matchup-card`),o=X(`div`,`card-header`);o.textContent=e,a.appendChild(o);let s=!1;for(let{name:e,defGrids:o}of t){let t=(o??[]).find(e=>e.playerName===n);if(!t)continue;let{category:c,grid:l}=t,u=c===`special`?`spa`:`atk`,d=c===`special`?`spd`:`def`,f=l[`${Y(r[u]??0)},${Y(i[d]??0)}`];if(!f)continue;s=!0;let p=X(`div`,`scenario-label in-battle-label`);p.textContent=`★ ${e}`,a.appendChild(p);let m=X(`div`,`calc-row ${Tt(f.classification)} in-battle-row`),h=X(`span`,`in-battle-badge`);h.textContent=`LIVE`,m.appendChild(h),m.appendChild(document.createTextNode(` `+f.formattedDesc)),a.appendChild(m)}return s||a.appendChild(J(`No tracked move data for this matchup.`)),a}function wt(e,t,n){let r=X(`select`,`matchup-select`),i=document.createElement(`option`);i.value=``,i.textContent=e,r.appendChild(i);for(let e of t){let t=document.createElement(`option`);t.value=e,t.textContent=e,e===n&&(t.selected=!0),r.appendChild(t)}return r}function J(e){let t=X(`div`,`moves-empty`);return t.textContent=e,t}function Y(e){return Math.max(-6,Math.min(6,e??0))}function Tt(e){return e===`guaranteed-ohko`?`ko-guaranteed`:e===`chance-ohko`?`ko-chance`:e===`2hko`?`ko-2hko`:``}function X(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Z(e,t,n){let r=document.createElement(e);return t&&(r.className=t),n&&(r.textContent=n),r}function Q(e){return e>=65?`#2a7a2a`:e>=40?`#b07000`:`#a02020`}function $(e,t){let n=Z(`div`,`ls-sub-row`),r=Z(`span`,`ls-sub-label`,e),i=Z(`div`,`ls-bar-track`),a=Z(`div`,`ls-bar-fill`),o=Z(`span`,`ls-sub-num`,String(t));return a.style.width=`${Math.min(100,t)}%`,a.style.backgroundColor=Q(t),i.appendChild(a),n.append(r,i,o),n}function Et(e){e.innerHTML=``;let t=Z(`div`,`ls-wrap`);e.append(t);let n=Z(`div`,`ls-status`,`Run ANALYZE MATCHUP to generate lead recommendations.`);t.append(n);let r=Z(`div`,`ls-results`);return t.append(r),{render(e,t){n.style.display=`none`,Dt(r,e,t)},showMessage(e){n.textContent=e,n.style.display=``,r.innerHTML=``}}}function Dt(e,t,n){if(e.innerHTML=``,t.length===0){e.append(Z(`p`,`ls-empty`,`No results.`));return}let r=Z(`div`,`ls-results-heading`,`Top ${t.length} Lead Pairs`);e.append(r);let i=Z(`div`,`ls-cards-grid`);e.append(i),t.forEach((e,t)=>{i.append(Ot(e,t+1,n))})}function Ot(e,t,n){let r=Z(`div`,`ls-card`),i=Z(`div`,`ls-card-header`),a=Z(`span`,`ls-rank`,String(t)),o=Z(`span`,`ls-names`,`${e.monA} + ${e.monB}`),s=Z(`span`,`ls-score-chip`,String(e.score));s.style.backgroundColor=Q(e.score),i.append(a,o,s),r.append(i);let c=Z(`div`,`ls-bars`);c.append($(`Offense`,e.offNorm),$(`Defense`,e.defNorm),$(`Speed`,e.spdNorm)),r.append(c);let l=Z(`div`,`ls-details`);if(e.threats.length>0){let t=Z(`div`,`ls-detail-row`);t.innerHTML=`<span class="ls-detail-label">Threatens</span> ${e.threats.join(`, `)}`,l.append(t)}if(e.hardCounters.length>0){let t=Z(`div`,`ls-detail-row ls-warning`);t.innerHTML=`<span class="ls-detail-label">⚠ Hard counter</span> ${e.hardCounters.join(`, `)}`,l.append(t)}if(e.backPair&&n>=4){let t=Z(`div`,`ls-detail-row ls-back-row`),n=e.backPair.covers.length>0?` <span class="ls-covers">(covers ${e.backPair.covers.join(`, `)})</span>`:``;t.innerHTML=`<span class="ls-detail-label">Bring</span> ${e.backPair.monA} + ${e.backPair.monB}${n}`,l.append(t)}return r.append(l),r}export{et as a,We as c,Se as d,ee as f,l as h,lt as i,Be as l,u as m,q as n,$e as o,h as p,pt as r,qe as s,Et as t,Fe as u};