import{a as e,d as t,n,o as r,s as i,u as a}from"./chaos-ObK4J6ou.js";function o(e){let t={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};for(let n of e.split(`/`)){let[e,r]=n.trim().split(` `),i={HP:`hp`,Atk:`atk`,Def:`def`,SpA:`spa`,SpD:`spd`,Spe:`spe`};i[r]&&(t[i[r]]=parseInt(e))}return t}function s(e){let t={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};for(let n of e.split(`/`)){let[e,r]=n.trim().split(` `),i={HP:`hp`,Atk:`atk`,Def:`def`,SpA:`spa`,SpD:`spd`,Spe:`spe`};i[r]&&(t[i[r]]=parseInt(e))}return t}function c(e){let t=[...e.matchAll(/\[([^\]]+)\]/g)].map(e=>e[1]),n=e.replace(/\s*\[[^\]]+\]/g,``).trim(),r=t.find(e=>[`physical`,`special`,`both`].includes(e.toLowerCase())),i=r?r.toLowerCase():`both`,a=t.filter(e=>/^[+-]\d+\s+\w+$/.test(e)).map(e=>{let[t,n]=e.split(/\s+/);return{modifier:parseInt(t),stat:n}}),[o,s]=n.split(`@`).map(e=>e.trim()),c=o.match(/\s*\(([MF])\)$/);return{name:c?o.replace(/\s*\([MF]\)$/,``).trim():o,gender:c?c[1]:void 0,item:s??void 0,attackerType:i,boosts:a}}function l(e){return e.trim().split(/\n\s*\n/).filter(e=>e.trim()).map(e=>{let t=e.trim().split(`
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
`}],d=t(),f=()=>({atk:0,spa:0,def:0,spd:0,spe:0}),p={myStages:{},opponentStages:{},opponentMoves:{},weather:null,terrain:null,myScreens:{reflect:!1,lightScreen:!1},opponentScreens:{reflect:!1,lightScreen:!1},myFriendGuard:!1,opponentFriendGuard:!1,myHelpingHand:{}},m=new Set;function h(e){return m.add(e),()=>m.delete(e)}function g(){m.forEach(e=>e(p))}function ee(e,t){p.myStages=Object.fromEntries(e.map(e=>[e,f()])),p.opponentStages=Object.fromEntries(t.map(e=>[e,f()])),p.opponentMoves=Object.fromEntries(t.map(e=>[e,[]])),p.weather=null,p.terrain=null,p.myScreens={reflect:!1,lightScreen:!1},p.opponentScreens={reflect:!1,lightScreen:!1},p.myFriendGuard=!1,p.opponentFriendGuard=!1,p.myHelpingHand=Object.fromEntries(e.map(e=>[e,!1])),g()}function _(e,t,n){p.myStages[e]&&(p.myStages[e][t]=me(p.myStages[e][t]+n),g())}function v(e,t,n){p.opponentStages[e]&&(p.opponentStages[e][t]=me(p.opponentStages[e][t]+n),g())}function te(e){p.myStages[e]&&(p.myStages[e]=f(),g())}function ne(e){p.opponentStages[e]&&(p.opponentStages[e]=f(),g())}function re(e,t,n,r=[]){p.opponentMoves[e]&&(p.opponentMoves[e].find(e=>e.name.toLowerCase()===t.toLowerCase())||(p.opponentMoves[e].push({name:t,calcs:n,defGrids:r}),g()))}function ie(e,t){p.opponentMoves[e]&&(p.opponentMoves[e]=p.opponentMoves[e].filter(e=>e.name!==t),g())}function ae(e){p.weather=p.weather===e?null:e,g()}function oe(e){p.terrain=p.terrain===e?null:e,g()}function se(e,t){p.myScreens[e]=t,g()}function ce(e,t){p.opponentScreens[e]=t,g()}function le(e){p.myFriendGuard=e,g()}function ue(e){p.opponentFriendGuard=e,g()}function de(e){e in p.myHelpingHand&&(p.myHelpingHand[e]=!p.myHelpingHand[e],g())}function fe(e){delete p.myStages[e],delete p.myHelpingHand[e],g()}function pe(e){delete p.opponentStages[e],delete p.opponentMoves[e],g()}function me(e){return Math.max(-6,Math.min(6,e))}function he(e){return Math.max(-6,Math.min(6,e??0))}function ge(e){return e>=100?`#2a7a2a`:e>=50?`#b07000`:`#888`}function _e(e){return e>=100?`rgba(42,122,42,0.28)`:e>=50?`rgba(176,112,0,0.28)`:`rgba(136,136,136,0.28)`}function ve(e,t,n){let r=Math.min(100,t??0),i=Math.min(100,n??0),a=ge(n),o=_e(n);i<=0||(e.style.backgroundImage=r>=1&&r<i-.5?`linear-gradient(to right, ${a} ${r}%, ${o} ${r}%, ${o} ${i}%, transparent ${i}%)`:`linear-gradient(to right, ${a} ${i}%, transparent ${i}%)`)}function y(e,t){let n=Math.round(e??t??0),r=Math.round(t??0);return n===r?`${r}%`:`${n}–${r}%`}function ye(e,t){return e===`Max SpDef`?`Max SpD`:e===`Max Def`?`Max Def`:e===`Min Defense`?t.includes(`Max SpDef`)?`Min SpD`:`Min Def`:e}var be=[`guaranteed-ohko`,`chance-ohko`,`2hko`,``];function xe(e,t){return be.indexOf(e??``)<=be.indexOf(t??``)?e??``:t??``}function Se(e){let t=new Map;for(let n of e){t.has(n.move)||t.set(n.move,{move:n.move,archs:new Map});let e=t.get(n.move),r=n.archetype??``;if(!e.archs.has(r))e.archs.set(r,{archetype:r,minPct:n.minPct??0,maxPct:n.maxPct??0,classification:n.classification??``});else{let t=e.archs.get(r);t.minPct=Math.min(t.minPct,n.minPct??0),t.maxPct=Math.max(t.maxPct,n.maxPct??0),t.classification=xe(t.classification,n.classification??``)}}return[...t.values()].map(e=>({move:e.move,archs:[...e.archs.values()]}))}function Ce(e){if(!e)return null;let t=b(`span`,`mv-ko-tag`);if(e===`guaranteed-ohko`)t.className=`mv-ko-tag mv-ko-ohko`,t.textContent=`OHKO ✓`;else if(e===`chance-ohko`)t.className=`mv-ko-tag mv-ko-chance`,t.textContent=`OHKO ~`;else if(e===`2hko`)t.className=`mv-ko-tag mv-ko-2hko`,t.textContent=`2HKO`;else return null;return t}function we(e,t){let n=b(`div`,`mv-visual-row`),r=b(`div`,`mv-name-row`),i=b(`span`,`mv-name`);i.textContent=e,r.appendChild(i),n.appendChild(r);let a=t.map(e=>e.archetype);for(let{archetype:e,classification:r,minPct:i,maxPct:o}of t){let t=b(`div`,`mv-arch-row`),s=b(`span`,`mv-arch-label`);s.textContent=ye(e,a),t.appendChild(s);let c=b(`div`,`mv-track`);ve(c,i,o),t.appendChild(c);let l=b(`span`,`mv-pct`);l.textContent=y(i,o),t.appendChild(l);let u=Ce(r);u&&t.appendChild(u),n.appendChild(t)}return n}function Te(e,t,n,r){let i=b(`div`,`mv-visual-row`),a=b(`div`,`mv-visual-top`),o=b(`span`,`mv-name`);o.textContent=e,a.appendChild(o);let s=Ce(t);if(s&&a.appendChild(s),i.appendChild(a),(r??0)>0){let e=b(`div`,`mv-visual-bot`),t=b(`div`,`mv-track`);ve(t,n,r),e.appendChild(t);let a=b(`span`,`mv-pct`);a.textContent=y(n,r),e.appendChild(a),i.appendChild(e)}return i}function Ee(e,t,n,r){n.innerHTML=``;for(let{playerName:i,matchups:a}of e){let e=r?.myStages?.[i]??{},o=t?.find(e=>e.playerName===i),s=b(`div`,`player-section`);s.appendChild(De(`▸ ${i}`));let c=b(`div`,`matchup-cards`);for(let{opponentName:t,scenarios:n}of a){let i=b(`div`,`matchup-card`);i.appendChild(Oe(`vs. ${t}`));let a=r?.opponentStages?.[t]??{};if((Object.values(e).some(e=>e!==0)||Object.values(a).some(e=>e!==0))&&o){let n=o.matchups.find(e=>e.opponentName===t);if(n){let t=!1;for(let{moveName:r,category:o,grid:s}of n.moveCalcs){let n=o===`special`?`spa`:`atk`,c=o===`special`?`spd`:`def`,l=s[`${he(e[n]??0)},${he(a[c]??0)}`];l&&(t=!0,i.appendChild(Te(r,l.classification,l.minPct,l.maxPct)))}t||i.appendChild(Ae(`No data at current stages.`))}}else for(let{label:e,rows:t}of n){e!==`Base`&&i.appendChild(ke(e));for(let{move:e,archs:n}of Se(t))i.appendChild(we(e,n))}c.appendChild(i)}s.appendChild(c),n.appendChild(s)}}function b(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function De(e){let t=b(`div`,`section-header`);return t.textContent=e,t}function Oe(e){let t=b(`div`,`card-header`);return t.textContent=e,t}function ke(e){let t=b(`div`,`scenario-label`);return t.textContent=e,t}function Ae(e){let t=b(`div`,`moves-empty`);return t.textContent=e,t}function x(e){return Math.max(-6,Math.min(6,e??0))}function je(e){return e>=100?`#c00`:e>=50?`#d6600a`:`#888`}function Me(e){return e>=100?`rgba(200,0,0,0.2)`:e>=50?`rgba(214,96,10,0.2)`:`rgba(136,136,136,0.2)`}function S(e,t,n){let r=Math.min(100,t??0),i=Math.min(100,n??0),a=je(n),o=Me(n);i<=0||(e.style.backgroundImage=r>=1&&r<i-.5?`linear-gradient(to right, ${a} ${r}%, ${o} ${r}%, ${o} ${i}%, transparent ${i}%)`:`linear-gradient(to right, ${a} ${i}%, transparent ${i}%)`)}function C(e,t){let n=Math.round(e??t??0),r=Math.round(t??0);return n===r?`${r}%`:`${n}–${r}%`}var Ne={"Max SpAtk":`Max SpA`,"Max Atk":`Max Atk`,"Min Offense":`Min Atk`},w=[`guaranteed-ohko`,`chance-ohko`,`2hko`,``];function Pe(e,t){return w.indexOf(e??``)<=w.indexOf(t??``)?e??``:t??``}function T(e){let t=new Map;for(let n of e){t.has(n.move)||t.set(n.move,{move:n.move,archs:new Map});let e=t.get(n.move),r=n.archetype??``;if(!e.archs.has(r))e.archs.set(r,{archetype:r,minPct:n.minPct??0,maxPct:n.maxPct??0,classification:n.classification??``});else{let t=e.archs.get(r);t.minPct=Math.min(t.minPct,n.minPct??0),t.maxPct=Math.max(t.maxPct,n.maxPct??0),t.classification=Pe(t.classification,n.classification??``)}}return[...t.values()].map(e=>({move:e.move,archs:[...e.archs.values()]}))}function E(e,t){let n=O(`span`,`mv-ko-tag`);if(e===`guaranteed-ohko`)n.className=`mv-ko-tag mv-def-danger`,n.textContent=`OHKO ✗`;else if(e===`chance-ohko`)n.className=`mv-ko-tag mv-def-warn`,n.textContent=`OHKO ~`;else if(e===`2hko`)n.className=`mv-ko-tag mv-def-2hko`,n.textContent=`2HKO`;else if(t<50)n.className=`mv-ko-tag mv-def-ok`,n.textContent=`Survives`;else return null;return n}function D(e,t,n=!1){let r=O(`div`,n?`mv-visual-row mv-live-row`:`mv-visual-row`),i=O(`div`,`mv-name-row`);if(n){let e=O(`span`,`in-battle-badge`);e.textContent=`LIVE`,i.appendChild(e)}let a=O(`span`,`mv-name`);a.textContent=e,i.appendChild(a),r.appendChild(i);for(let{archetype:e,classification:n,minPct:i,maxPct:a}of t){let t=O(`div`,`mv-arch-row`),o=O(`span`,`mv-arch-label`);o.textContent=Ne[e]??e,t.appendChild(o);let s=O(`div`,`mv-track`);S(s,i,a),t.appendChild(s);let c=O(`span`,`mv-pct`);c.textContent=C(i,a),t.appendChild(c);let l=E(n,a);l&&t.appendChild(l),r.appendChild(t)}return r}function Fe(e,t,n,r){let i=O(`div`,`mv-visual-row`),a=O(`div`,`mv-visual-top`),o=O(`span`,`mv-name`);o.textContent=e,a.appendChild(o);let s=E(t,r);if(s&&a.appendChild(s),i.appendChild(a),(r??0)>0){let e=O(`div`,`mv-visual-bot`),t=O(`div`,`mv-track`);S(t,n,r),e.appendChild(t);let a=O(`span`,`mv-pct`);a.textContent=C(n,r),e.appendChild(a),i.appendChild(e)}return i}function Ie(e,t,n,r){n.innerHTML=``;for(let{playerName:i,matchups:a}of e){let e=t?.find(e=>e.playerName===i),o=O(`div`,`player-section`);o.appendChild(Le(`▸ ${i} (incoming)`));let s=O(`div`,`matchup-cards`);for(let{opponentName:t,scenarios:n}of a){if(n.length===0)continue;let a=O(`div`,`matchup-card`);a.appendChild(Re(`${t} attacking`));let o=r?.myStages?.[i]??{},c=r?.opponentStages?.[t]??{},l=Object.values(o).some(e=>e!==0)||Object.values(c).some(e=>e!==0),u=r?.opponentMoves?.[t]??[];for(let{name:e,calcs:t}of u){let n=(t??[]).find(e=>e.playerName===i);if(!(!n||n.rows.length===0))for(let{move:t,archs:r}of T(n.rows))a.appendChild(D(t??e,r,!0))}if(l&&e){let n=e.matchups.find(e=>e.opponentName===t);if(n){let e=!1;for(let{moveName:t,category:r,grid:i}of n.moveCalcs){let n=r===`special`?`spa`:`atk`,s=r===`special`?`spd`:`def`,l=i[`${x(c[n]??0)},${x(o[s]??0)}`];l&&(e=!0,a.appendChild(Fe(t,l.classification,l.minPct,l.maxPct)))}!e&&u.length===0&&a.appendChild(Be(`No data at current stages.`))}}else{let e=new Map;for(let{label:t,rows:r}of n)e.has(t)||e.set(t,[]),e.get(t).push(...r);for(let[t,n]of e){t!==`Base`&&a.appendChild(ze(`My ${t}`));for(let{move:e,archs:t}of T(n))a.appendChild(D(e,t))}}s.appendChild(a)}o.appendChild(s),n.appendChild(o)}}function O(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Le(e){let t=O(`div`,`section-header`);return t.textContent=e,t}function Re(e){let t=O(`div`,`card-header`);return t.textContent=e,t}function ze(e){let t=O(`div`,`scenario-label`);return t.textContent=e,t}function Be(e){let t=O(`div`,`moves-empty`);return t.textContent=e,t}function k(e){return Math.max(-6,Math.min(6,e??0))}function Ve(e,t,n){t.innerHTML=``;for(let{playerName:r,matchups:i}of e){let e=A(`div`,`player-section`);e.appendChild(He(`▸ ${r}`));let a=A(`div`,`matchup-cards`);for(let{opponentName:e,moveCalcs:t}of i){if(t.length===0)continue;let i=A(`div`,`matchup-card`);i.appendChild(Ue(`vs. ${e}`));let o=!1;for(let{moveName:a,category:s,grid:c}of t){let t=c[`${k(s===`special`?n?.myStages?.[r]?.spa:n?.myStages?.[r]?.atk)},${k(s===`special`?n?.opponentStages?.[e]?.spd:n?.opponentStages?.[e]?.def)}`];if(!t)continue;o=!0;let l=A(`div`,`scenario-label`);l.textContent=a,i.appendChild(l);let u=A(`div`,`calc-row ${We(t.classification)}`);u.textContent=t.formattedDesc,i.appendChild(u)}o&&a.appendChild(i)}e.appendChild(a),t.appendChild(e)}}function A(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function He(e){let t=A(`div`,`section-header`);return t.textContent=e,t}function Ue(e){let t=A(`div`,`card-header`);return t.textContent=e,t}function We(e){return e===`guaranteed-ohko`?`ko-guaranteed`:e===`chance-ohko`?`ko-chance`:e===`2hko`?`ko-2hko`:``}function j(e){return Math.max(-6,Math.min(6,e??0))}function Ge(e,t,n){t.innerHTML=``;for(let{playerName:r,matchups:i}of e){let e=M(`div`,`player-section`);e.appendChild(Ke(`▸ ${r} (incoming)`));let a=M(`div`,`matchup-cards`);for(let{opponentName:e,moveCalcs:t}of i){let i=M(`div`,`matchup-card`);i.appendChild(qe(`${e} attacking`));let o=!1,s=n?.opponentMoves?.[e]??[];for(let{name:t,defGrids:a}of s){let s=(a??[]).find(e=>e.playerName===r);if(!s)continue;let{category:c,grid:l}=s,u=l[`${j(c===`special`?n?.opponentStages?.[e]?.spa:n?.opponentStages?.[e]?.atk)},${j(c===`special`?n?.myStages?.[r]?.spd:n?.myStages?.[r]?.def)}`];if(!u)continue;o=!0;let d=M(`div`,`scenario-label in-battle-label`);d.textContent=`★ ${t}`,i.appendChild(d);let f=M(`div`,`calc-row ${N(u.classification)} in-battle-row`),p=M(`span`,`in-battle-badge`);p.textContent=`LIVE`,f.appendChild(p),f.appendChild(document.createTextNode(` `+u.formattedDesc)),i.appendChild(f)}for(let{moveName:a,category:s,grid:c}of t){let t=c[`${j(s===`special`?n?.opponentStages?.[e]?.spa:n?.opponentStages?.[e]?.atk)},${j(s===`special`?n?.myStages?.[r]?.spd:n?.myStages?.[r]?.def)}`];if(!t)continue;o=!0;let l=M(`div`,`scenario-label`);l.textContent=a,i.appendChild(l);let u=M(`div`,`calc-row ${N(t.classification)}`);u.textContent=t.formattedDesc,i.appendChild(u)}o&&a.appendChild(i)}e.appendChild(a),t.appendChild(e)}}function M(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Ke(e){let t=M(`div`,`section-header`);return t.textContent=e,t}function qe(e){let t=M(`div`,`card-header`);return t.textContent=e,t}function N(e){return e===`guaranteed-ohko`?`ko-guaranteed`:e===`chance-ohko`?`ko-chance`:e===`2hko`?`ko-2hko`:``}function Je(e,t,n){t.innerHTML=``;let r=[],i=[],o=new Set,s=new Set;for(let{playerName:t,opponentName:c,basicComparisons:l,fullComparisons:u}of e){let e=n?.myStages?.[t]?.spe??0,d=n?.opponentStages?.[c]?.spe??0;for(let n of l){let i=a(n.playerSpeed,e),s=`player-${t}-${n.playerLabel}-${i}`;o.has(s)||(o.add(s),r.push({displayName:t,speed:i,isPlayer:!0}));let l=a(n.opponentSpeed,d),u=`opp-${c}-${n.opponentLabel}-${l}`;o.has(u)||(o.add(u),r.push({displayName:`${c}${n.opponentLabel}`,speed:l,isPlayer:!1}))}for(let n of u){let r=a(n.playerSpeed,e),o=`player-${t}-${n.playerLabel}-${r}`;if(!s.has(o)){s.add(o);let e=n.playerLabel===`Base`?``:` (${n.playerLabel})`;i.push({displayName:`${t}${e}`,speed:r,isPlayer:!0})}let l=a(n.opponentSpeed,d),u=`opp-${c}-${n.opponentLabel}-${l}`;if(!s.has(u)){s.add(u);let e=n.opponentLabel?` ${n.opponentLabel}`:``;i.push({displayName:`${c}${e}`,speed:l,isPlayer:!1})}}}r.sort((e,t)=>t.speed-e.speed),i.sort((e,t)=>t.speed-e.speed);let c=document.createElement(`div`);c.style.cssText=`display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start;`,c.appendChild(P(`Basic`,r)),c.appendChild(P(`Full Scenarios`,i)),t.appendChild(c)}function P(e,t){let n=document.createElement(`div`);n.style.cssText=`flex: 1; min-width: 280px;`;let r=document.createElement(`div`);r.className=`ladder-header`,r.textContent=e,n.appendChild(r);let i=document.createElement(`div`);i.className=`speed-ladder`;for(let{displayName:e,speed:n,isPlayer:r}of t){let t=document.createElement(`div`);t.className=`speed-entry ${r?`speed-player`:`speed-opponent`}`;let a=document.createElement(`span`);a.className=`speed-name`,a.textContent=e;let o=document.createElement(`span`);o.className=`speed-value`,o.textContent=n,t.appendChild(a),t.appendChild(o),i.appendChild(t)}return n.appendChild(i),n}var F=d.Generations.get(9),Ye=new d.Field({gameType:`Doubles`}),Xe=252/32,I=new Set([`Protect`,`Wide Guard`,`Quick Guard`,`Detect`,`Kings Shield`,`Tailwind`,`Trick Room`,`Helping Hand`,`Follow Me`,`Rage Powder`,`Parting Shot`,`Taunt`,`Encore`,`After You`,`Fake Out`,`Thunder Wave`,`Will-O-Wisp`,`Spore`,`Sleep Powder`,`Recover`,`Roost`,`Heal Pulse`,`Instruct`]),Ze={"Fake Out":2,Tailwind:1.5,"Trick Room":1.5,"Follow Me":1.3,"Rage Powder":1.3,"Parting Shot":1.3,"U-turn":1.2,Encore:1.2};function L(e){return e.includes(`-Mega`)}var R={offense:.4,defense:.35,speed:.15,hardCounter:-.1};function z(e){let t={};for(let[n,r]of Object.entries(e??{}))t[n]=Math.min(252,Math.round((r??0)*Xe));return t}function B(e){if(e)return F.items.get(e.toLowerCase().replace(/[-\s]/g,``))?.name??void 0}function Qe(e,t){return new d.Pokemon(F,t,{level:e.level??50,evs:z(e.evs),ivs:e.ivs,nature:e.nature,ability:e.ability,item:B(e.item)})}function $e(e){return new d.Pokemon(F,e.name,{level:50,evs:z(e.spread.evs),nature:e.spread.nature,item:B(e.item)})}function V(e,t,n){let r={pct:0,minPct:0,moveName:null};for(let i of n)if(!I.has(i))try{let n=new d.Move(F,i);if((n.bp??0)===0)continue;let a=(0,d.calculate)(F,e,t,n,Ye);if(a.desc().includes(`No damage`))continue;let o=a.damage,s=t.stats.hp,c,l;if(Array.isArray(o)&&Array.isArray(o[0]))c=o.reduce((e,t)=>e+t[t.length-1],0),l=o.reduce((e,t)=>e+t[0],0);else{let e=Array.isArray(o)?o:[o];c=e[e.length-1],l=e[0]}let u=c/s*100,f=l/s*100;u>r.pct&&(r={pct:u,minPct:f,moveName:i})}catch{}return r}function et(e){return e>=100?3:e>=50?1.5:e>=30?.5:0}function tt(e,t){let n=e>=100,r=t>=100;return!n&&!r?2:!n||!r?1:-2}function nt(e){let t=1;for(let n of e.moves??[]){let e=Ze[n];e&&e>t&&(t=e)}return t}function rt(e){let t=[];for(let n=0;n<e.length;n++)for(let r=n+1;r<e.length;r++)t.push([e[n],e[r]]);return t}function it(e,t,r){let a=e.map(e=>{let t=i(e.name);return{set:e,resolvedName:t,pokemon:Qe(e,t),moves:(e.moves??[]).filter(e=>e)}}),o=t.map(e=>{let t=n(r,e)??{name:e,spread:{nature:`Serious`,evs:{}},moves:[],item:null,usage:0};return{...t,pokemon:$e(t)}}),s=o.map(nt),c=s.reduce((e,t)=>e+t,0),l=s.map(e=>e/c),u=a.map(({pokemon:e,moves:t})=>o.map(n=>({damageOut:V(e,n.pokemon,t).pct,damageIn:V(n.pokemon,e,n.moves).pct,youOutspeed:e.stats.spe>n.pokemon.stats.spe}))),d=rt(a.map((e,t)=>t)).map(([e,t])=>{let n=0,r=0,i=0,s=[];for(let a=0;a<o.length;a++){let c=l[a],d=u[e][a],f=u[t][a];n+=et(Math.max(d.damageOut,f.damageOut))*c,r+=tt(d.damageIn,f.damageIn)*c,(d.youOutspeed||f.youOutspeed)&&(i+=c),d.damageIn>=100&&f.damageIn>=100&&s.push(o[a].name)}let c=n/3*100,d=(r+2)/4*100,f=i*100,p=s.length/o.length*100,m=Math.max(0,Math.round(R.offense*c+R.defense*d+R.speed*f+R.hardCounter*p)),h=o.filter((n,r)=>Math.max(u[e][r].damageOut,u[t][r].damageOut)>=50).map(e=>e.name);return{score:m,monA:a[e].resolvedName,monB:a[t].resolvedName,offNorm:Math.round(c),defNorm:Math.round(d),spdNorm:Math.round(f),threats:h,hardCounters:s,_idxA:e,_idxB:t}}).filter(e=>!(L(e.monA)&&L(e.monB)));return d.sort((e,t)=>t.score-e.score),d.map(e=>({...e,backPair:ot(e,a,u,o)}))}function at(e,t,r){let a=e.map(e=>{let t=i(e.name);return{resolvedName:t,pokemon:Qe(e,t),moves:(e.moves??[]).filter(e=>e)}});return t.map(e=>{let t=n(r,e),i=t??{name:e,spread:{nature:`Serious`,evs:{}},moves:[],item:null,usage:0},o=$e(i),s=i.moves.filter(e=>!I.has(e)).map(e=>({move:e,targets:a.map(({resolvedName:t,pokemon:n})=>{let{pct:r,minPct:i}=V(o,n,[e]);return{mon:t,pct:r,minPct:i}}).filter(e=>e.pct>=30).sort((e,t)=>t.pct-e.pct)})).filter(({targets:e})=>e.length>0),c=a.map(({resolvedName:e,pokemon:t,moves:n})=>{let{moveName:r,pct:i,minPct:a}=V(t,o,n);return{mon:e,move:r,pct:i,minPct:a}});return{name:i.name,spread:i.spread,moves:i.moves,item:i.item,usage:i.usage,inChaos:t!==null,threatsOut:s,answers:c}})}function ot(e,t,n,r){let{_idxA:i,_idxB:a}=e,o=t.map((e,t)=>t).filter(e=>e!==i&&e!==a);if(o.length<2)return null;let s=1-[i,a].filter(e=>L(t[e].resolvedName)).length,c=r.map((e,t)=>t).filter(e=>Math.max(n[i][e].damageOut,n[a][e].damageOut)<50),l=rt(o).filter(([e,n])=>[e,n].filter(e=>L(t[e].resolvedName)).length<=s);if(l.length===0)return null;let u=l,d=u[0],f=-1/0;for(let[e,t]of u){let r=0;for(let i of c)r+=et(Math.max(n[e][i].damageOut,n[t][i].damageOut)),n[e][i].damageIn<100&&(r+=.5),n[t][i].damageIn<100&&(r+=.5);r>f&&(f=r,d=[e,t])}return{monA:t[d[0]].resolvedName,monB:t[d[1]].resolvedName,covers:c.map(e=>r[e].name)}}var st={hp:`HP`,atk:`Atk`,def:`Def`,spa:`SpA`,spd:`SpD`,spe:`Spe`};function ct(e){return e?Object.entries(e).filter(([,e])=>e>0).map(([e,t])=>`${t} ${st[e]??e}`).join(` / `):``}function lt(e){return e>=100?`#2a7a2a`:e>=50?`#b07000`:`#888`}function ut(e){return e>=100?`rgba(42,122,42,0.28)`:e>=50?`rgba(176,112,0,0.28)`:`rgba(136,136,136,0.28)`}function dt(e,t,n){let r=Math.min(100,t??0),i=Math.min(100,n),a=lt(n),o=ut(n);i<=0||(e.style.backgroundImage=r>=1&&r<i-.5?`linear-gradient(to right, ${a} ${r}%, ${o} ${r}%, ${o} ${i}%, transparent ${i}%)`:`linear-gradient(to right, ${a} ${i}%, transparent ${i}%)`)}function ft(e,t){let n=Math.round(e??t),r=Math.round(t);return n===r?`${r}%`:`${n}–${r}%`}function pt(e){let t=U(`div`,`matchup-card`),n=U(`div`,`card-header`);if(n.textContent=e.item?`${e.name} — ${e.item}`:e.name,t.appendChild(n),!e.inChaos){let e=U(`div`,`tm-no-data`);return e.textContent=`No chaos data — set unknown`,t.appendChild(e),t}let r=ct(e.spread.evs),i=U(`div`,`tm-set-info`);if(i.textContent=e.spread.nature+(r?` · ${r}`:``),t.appendChild(i),e.moves.length>0){let n=U(`div`,`tm-moves-row`);for(let t of e.moves){let e=U(`span`,`tm-move-chip`+(I.has(t)?` tm-skip`:``));e.textContent=t,n.appendChild(e)}t.appendChild(n)}let a=U(`div`,`tm-section-head`);if(a.textContent=`Their Threats`,t.appendChild(a),e.threatsOut.length===0){let e=U(`div`,`tm-no-threats`);e.textContent=`No significant threats to your team`,t.appendChild(e)}else{let n=U(`div`,`tm-threats`);for(let{move:t,targets:r}of e.threatsOut){let e=U(`div`,`tm-threat-row`),i=U(`span`,`tm-threat-move`);i.textContent=t,e.appendChild(i);let a=U(`span`,`tm-targets`);for(let{mon:e,pct:t,minPct:n}of r){let r=U(`span`,t>=100?`tm-target tm-ohko`:t>=50?`tm-target tm-warn`:`tm-target tm-chip`);r.textContent=`${e} ${ft(n,t)}`,a.appendChild(r)}e.appendChild(a),n.appendChild(e)}t.appendChild(n)}let o=U(`div`,`tm-section-head`);o.textContent=`Your Coverage`,t.appendChild(o);let s=U(`div`,`tm-answers`);for(let{mon:t,move:n,pct:r,minPct:i}of e.answers){let e=U(`div`,`tm-answer-row`),a=U(`div`,`tm-answer-top`),o=U(`span`,`tm-answer-mon`);o.textContent=t,a.appendChild(o);let c=U(`span`,n?`tm-answer-move`:`tm-answer-move tm-no-move`);c.textContent=n??`—`,a.appendChild(c),e.appendChild(a);let l=U(`div`,`tm-answer-bot`);if(n){let e=U(`div`,`tm-answer-track`);dt(e,i,r),l.appendChild(e);let t=U(`span`,`tm-answer-pct`);t.textContent=ft(i,r),l.appendChild(t)}else{let e=U(`span`,`tm-answer-pct`);e.textContent=`—`,l.appendChild(e)}e.appendChild(l),s.appendChild(e)}return t.appendChild(s),t}function mt(e,t,n=null){if(t.innerHTML=``,n&&n.length>0){let e=U(`div`,`player-section`),r=U(`div`,`section-header`);r.textContent=`Opponent Sets & Threats`,e.appendChild(r);let i=U(`div`,`matchup-cards threat-cards`);for(let e of n)i.appendChild(pt(e));e.appendChild(i),t.appendChild(e)}if(!e)return;let{offense:r,defense:i,speed:a}=e,o=[],s=[],c=[],l=[],u=[],d=[];for(let{playerName:e,matchups:t}of r)for(let{opponentName:n,scenarios:r}of t)for(let{label:t,rows:i}of r)if(t===`Base`)for(let{formattedBase:t,kochanceText:r,classification:a}of i){let i={playerName:e,opponentName:n,desc:t,kochance:r};if(a===`guaranteed-ohko`)o.push(i);else if(a===`chance-ohko`)s.push(i);else if(a===`2hko`){let e=r?.match(/([\d.]+)%/);(r?.includes(`guaranteed`)||e&&parseFloat(e[1])>25)&&c.push(i)}}for(let{playerName:e,matchups:t}of i)for(let{opponentName:n,scenarios:r}of t)for(let{label:t,rows:i}of r)if(t===`Base`)for(let{formattedBase:t,kochanceText:r,classification:a,isInBattle:o}of i){if(o)continue;let i={playerName:e,opponentName:n,desc:t,kochance:r};if(a===`guaranteed-ohko`)l.push(i);else if(a===`chance-ohko`)u.push(i);else if(a===`2hko`){let e=r?.match(/([\d.]+)%/);(r?.includes(`guaranteed`)||e&&parseFloat(e[1])>25)&&d.push(i)}}let f=[],p=[],m=new Set,h=new Set;for(let{playerName:e,opponentName:t,basicComparisons:n}of a){for(let{playerLabel:r,playerSpeed:i,opponentLabel:a,tie:o}of n)if(o){let n=`${e}-${r}-${t}-${a}-${i}`;m.has(n)||(m.add(n),f.push({playerName:e,playerLabel:r,opponentName:t,opponentLabel:a,speed:i}))}let r=n.find(e=>e.playerLabel===`Base`&&e.opponentLabel===``),i=n.find(e=>e.playerLabel===`Base`&&e.opponentLabel===`+`);if(r&&i&&!r.playerFaster&&i.playerFaster){let n=`${e}-${t}`;h.has(n)||(h.add(n),p.push({playerName:e,opponentName:t,note:`Outsped by opponent+ but faster than opponent`}))}}H(t,`Guaranteed OHKOs I Can Deal`,o,`summary-red`,e=>`${e.playerName} → ${e.opponentName}`,e=>e.desc),H(t,`Chance OHKOs I Can Deal (>5%)`,s,`summary-orange`,e=>`${e.playerName} → ${e.opponentName}`,e=>`${e.desc} — ${e.kochance}`),H(t,`Notable 2HKOs I Can Deal (>25%)`,c,`summary-yellow`,e=>`${e.playerName} → ${e.opponentName}`,e=>`${e.desc} — ${e.kochance}`),H(t,`Guaranteed OHKOs Against My Team`,l,`summary-red`,e=>`${e.opponentName} → ${e.playerName}`,e=>e.desc),H(t,`Chance OHKOs Against My Team`,u,`summary-orange`,e=>`${e.opponentName} → ${e.playerName}`,e=>`${e.desc} — ${e.kochance}`),H(t,`Notable 2HKOs Against My Team (>25%)`,d,`summary-yellow`,e=>`${e.opponentName} → ${e.playerName}`,e=>`${e.desc} — ${e.kochance}`),ht(t,`Speed Ties`,f.map(e=>`${e.playerName} (${e.playerLabel||`Base`}) ties ${e.opponentName} (${e.opponentLabel||`min`}) at ${e.speed}`),`summary-cyan`),ht(t,`Critical Speed Matchups`,p.map(e=>`${e.playerName} vs ${e.opponentName}: ${e.note}`),`summary-cyan`)}function H(e,t,n,r,i,a){if(n.length===0)return;let o=new Map;for(let e of n){let t=i(e),n=a(e);o.has(t)||o.set(t,new Set),o.get(t).add(n)}let s=U(`div`,`summary-block`),c=U(`div`,`summary-block-header ${r}`);c.textContent=t,s.appendChild(c);for(let[e,t]of o){let n=U(`div`,`summary-pair-header ${r}`);n.textContent=e,s.appendChild(n);for(let e of t){let t=U(`div`,`summary-detail-row`);t.textContent=e,s.appendChild(t)}}e.appendChild(s)}function ht(e,t,n,r){if(n.length===0)return;let i=U(`div`,`summary-block`),a=U(`div`,`summary-block-header ${r}`);a.textContent=t,i.appendChild(a);let o=new Set;for(let e of n){if(o.has(e))continue;o.add(e);let t=U(`div`,`summary-row ${r}`);t.textContent=e,i.appendChild(t)}e.appendChild(i)}function U(e,t){let n=document.createElement(e);return t&&(n.className=t),n}var gt=[{label:`Atk`,key:`atk`},{label:`SpA`,key:`spa`},{label:`Def`,key:`def`},{label:`SpD`,key:`spd`},{label:`Spe`,key:`spe`}],_t=[{label:`Sun`,value:`Sun`},{label:`Rain`,value:`Rain`},{label:`Sand`,value:`Sand`},{label:`Snow`,value:`Snow`}],vt=[{label:`Electric`,value:`Electric`},{label:`Grassy`,value:`Grassy`},{label:`Misty`,value:`Misty`},{label:`Psychic`,value:`Psychic`}];function yt(e,t,n){e.innerHTML=``;let r=Object.keys(t.myStages).length>0;if(r&&e.appendChild(bt(t)),!r){let t=G(`p`,`tracker-placeholder`);t.textContent=`Run an analysis to start tracking.`,e.appendChild(t);return}W(e,`My Team`);for(let[n,r]of Object.entries(t.myStages))e.appendChild(St(n,r,t.myHelpingHand?.[n]??!1));W(e,`Opponents`);for(let[r,i]of Object.entries(t.opponentStages))e.appendChild(Ct(r,i,t.opponentMoves[r]??[],n,t))}function bt(e){let t=G(`div`,`field-controls`),n=G(`div`,`field-row-label`);n.textContent=`Weather`,t.appendChild(n);let r=G(`div`,`field-btn-row`);for(let{label:t,value:n}of _t){let i=G(`button`,`field-btn${e.weather===n?` active`:``}`);i.textContent=t,i.addEventListener(`click`,()=>ae(n)),r.appendChild(i)}t.appendChild(r);let i=G(`div`,`field-row-label`);i.textContent=`Terrain`,t.appendChild(i);let a=G(`div`,`field-btn-row`);for(let{label:t,value:n}of vt){let r=G(`button`,`field-btn terrain-btn terrain-${n.toLowerCase()}${e.terrain===n?` active`:``}`);r.textContent=t,r.addEventListener(`click`,()=>oe(n)),a.appendChild(r)}t.appendChild(a);let o=G(`div`,`field-row-label`);o.textContent=`My Screens`,t.appendChild(o),t.appendChild(xt(e.myScreens,(e,t)=>se(e,t)));let s=G(`div`,`field-row-label`);s.textContent=`Opp Screens`,t.appendChild(s),t.appendChild(xt(e.opponentScreens,(e,t)=>ce(e,t)));let c=G(`div`,`field-row-label`);c.textContent=`My Side`,t.appendChild(c);let l=G(`div`,`field-btn-row`),u=G(`button`,`field-btn${e.myFriendGuard?` active`:``}`);u.textContent=`Friend Guard`,u.title=`Partner has Friend Guard — halves damage I take`,u.addEventListener(`click`,()=>le(!e.myFriendGuard)),l.appendChild(u),t.appendChild(l);let d=G(`div`,`field-row-label`);d.textContent=`Opp Side`,t.appendChild(d);let f=G(`div`,`field-btn-row`),p=G(`button`,`field-btn${e.opponentFriendGuard?` active`:``}`);return p.textContent=`Friend Guard`,p.title=`Opponent partner has Friend Guard — halves damage they take`,p.addEventListener(`click`,()=>ue(!e.opponentFriendGuard)),f.appendChild(p),t.appendChild(f),t}function xt(e,t){let n=G(`div`,`field-btn-row`);for(let[r,i]of[[`reflect`,`Reflect`],[`lightScreen`,`Light Screen`]]){let a=G(`button`,`field-btn${e[r]?` active`:``}`);a.textContent=i,a.addEventListener(`click`,()=>t(r,!e[r])),n.appendChild(a)}return n}function W(e,t){let n=G(`div`,`tracker-section-label`);n.textContent=t,e.appendChild(n)}function St(e,t,n){let r=G(`div`,`tracker-card`);r.appendChild(wt(e,()=>te(e),()=>fe(e)));for(let{label:n,key:i}of gt)r.appendChild(Tt(n,t[i]??0,()=>_(e,i,-1),()=>_(e,i,1)));let i=G(`div`,`card-footer-row`),a=G(`button`,`hh-btn${n?` active`:``}`);return a.textContent=`Helping Hand`,a.title=n?`Helping Hand active (+50% damage) — click to remove`:`Toggle Helping Hand for this turn`,a.addEventListener(`click`,()=>de(e)),i.appendChild(a),r.appendChild(i),r}function Ct(t,n,i,a,o){let s=G(`div`,`tracker-card`);s.appendChild(wt(t,()=>ne(t),()=>pe(t)));for(let{label:e,key:r}of gt)s.appendChild(Tt(e,n[r]??0,()=>v(t,r,-1),()=>v(t,r,1)));let c=G(`div`,`moves-section-label`);if(c.textContent=`Moves used:`,s.appendChild(c),i.length===0){let e=G(`div`,`moves-empty`);e.textContent=`None logged`,s.appendChild(e)}else for(let{name:e}of i){let n=G(`div`,`move-tag`),r=G(`span`);r.textContent=e;let i=G(`button`,`move-remove-btn`);i.textContent=`×`,i.title=`Remove`,i.addEventListener(`click`,()=>ie(t,e)),n.appendChild(r),n.appendChild(i),s.appendChild(n)}let l=G(`div`,`move-input-row`),u=G(`input`,`move-input`);u.type=`text`,u.placeholder=`e.g. Shadow Ball`;let d=G(`button`,`move-log-btn`);d.textContent=`Log`;let f=async()=>{let n=u.value.trim();if(n){d.textContent=`…`,d.disabled=!0;try{let i={weather:o.weather,terrain:o.terrain,myScreens:o.myScreens,opponentScreens:o.opponentScreens,myFriendGuard:o.myFriendGuard};re(t,n,await r(n,t,a,i),(a??[]).flatMap(r=>{let a=e(n,t,r,i);return a?[a]:[]})),u.value=``}catch(e){console.warn(`Could not log move:`,e.message)}finally{d.textContent=`Log`,d.disabled=!1}}};return d.addEventListener(`click`,f),u.addEventListener(`keydown`,e=>{e.key===`Enter`&&f()}),l.appendChild(u),l.appendChild(d),s.appendChild(l),s}function wt(e,t,n){let r=G(`div`,`tracker-card-header`),i=G(`span`,`tracker-poke-name`);i.textContent=e;let a=G(`button`,`tracker-reset-btn`);a.textContent=`Reset`,a.addEventListener(`click`,t);let o=G(`button`,`ko-btn`);return o.textContent=`✕`,o.title=`KO — remove from tracker`,o.addEventListener(`click`,n),r.appendChild(i),r.appendChild(a),r.appendChild(o),r}function Tt(e,t,n,r){let i=G(`div`,`stat-row`),a=G(`span`,`stat-label`);a.textContent=e;let o=G(`button`,`stage-sm-btn`);o.textContent=`−`,o.addEventListener(`click`,n);let s=G(`span`,t>0?`stage-val pos`:t<0?`stage-val neg`:`stage-val`);s.textContent=t>0?`+${t}`:`${t}`;let c=G(`button`,`stage-sm-btn`);return c.textContent=`+`,c.addEventListener(`click`,r),i.appendChild(a),i.appendChild(o),i.appendChild(s),i.appendChild(c),i}function G(e,t){let n=document.createElement(e);return t&&(n.className=t),n}var K=null,q=null;function J(e,t,n){if(!e){t.innerHTML=``;let e=Z(`p`,`matchup-placeholder`);e.textContent=`Run an analysis first.`,t.appendChild(e);return}let r=e.offenseExpanded.map(e=>e.playerName),i=e.offenseExpanded[0]?.matchups.map(e=>e.opponentName)??[];K&&!r.includes(K)&&(K=null),q&&!i.includes(q)&&(q=null),t.innerHTML=``;let a=Z(`div`,`matchup-selector-row`),o=kt(`— My Pokémon —`,r,K);o.addEventListener(`change`,()=>{K=o.value||null,J(e,t,n)});let s=Z(`span`,`matchup-vs`);s.textContent=`vs.`;let c=kt(`— Opponent —`,i,q);if(c.addEventListener(`change`,()=>{q=c.value||null,J(e,t,n)}),a.appendChild(o),a.appendChild(s),a.appendChild(c),t.appendChild(a),!K||!q){let e=Z(`p`,`matchup-placeholder`);e.textContent=`Select a Pokémon from each side to see the matchup.`,t.appendChild(e);return}let l=n?.myStages?.[K]??{},u=n?.opponentStages?.[q]??{},d=n?.myHelpingHand?.[K]??!1,f=Et(l,u,K,q);f&&t.appendChild(f),t.appendChild(Dt(`${K} → ${q}`,d,e.offenseExpanded,`offense`,K,q,l,u)),t.appendChild(Dt(`${K} defending vs ${q}`,!1,e.defenseExpanded,`defense`,K,q,l,u));let p=n?.opponentMoves?.[q]??[];p.length>0&&t.appendChild(Ot(`Live — ${q}'s moves vs ${K}`,p,K,u,l))}function Et(e,t,n,r){let i=Object.entries(e).filter(([,e])=>e!==0),a=Object.entries(t).filter(([,e])=>e!==0);if(i.length===0&&a.length===0)return null;let o=Z(`div`,`matchup-stages`);if(i.length>0){let e=Z(`span`,`matchup-stage-entry my-stage`);e.textContent=n+`: `+i.map(([e,t])=>`${e} ${t>0?`+`:``}${t}`).join(`, `),o.appendChild(e)}if(a.length>0){let e=Z(`span`,`matchup-stage-entry opp-stage`);e.textContent=r+`: `+a.map(([e,t])=>`${e} ${t>0?`+`:``}${t}`).join(`, `),o.appendChild(e)}return o}function Dt(e,t,n,r,i,a,o,s){let c=Z(`div`,`matchup-card`),l=Z(`div`,`card-header`);if(l.textContent=e,t){let e=Z(`span`,`in-battle-badge`);e.textContent=`HH`,e.title=`Helping Hand active (+50%)`,e.style.marginLeft=`6px`,l.appendChild(e)}c.appendChild(l);let u=n.find(e=>e.playerName===i)?.matchups.find(e=>e.opponentName===a);if(!u||u.moveCalcs.length===0)return c.appendChild(Y(`No data.`)),c;let d=!1;for(let{moveName:e,category:t,grid:n}of u.moveCalcs){let i=t===`special`?`spa`:`atk`,a=t===`special`?`spd`:`def`,l=r===`offense`?n[`${X(o[i]??0)},${X(s[a]??0)}`]:n[`${X(s[i]??0)},${X(o[a]??0)}`];if(!l)continue;d=!0;let u=Z(`div`,`scenario-label`);u.textContent=e,c.appendChild(u);let f=Z(`div`,`calc-row ${At(l.classification)}`);f.textContent=l.formattedDesc??``,c.appendChild(f)}return d||c.appendChild(Y(`No data at current stages.`)),c}function Ot(e,t,n,r,i){let a=Z(`div`,`matchup-card`),o=Z(`div`,`card-header`);o.textContent=e,a.appendChild(o);let s=!1;for(let{name:e,defGrids:o}of t){let t=(o??[]).find(e=>e.playerName===n);if(!t)continue;let{category:c,grid:l}=t,u=c===`special`?`spa`:`atk`,d=c===`special`?`spd`:`def`,f=l[`${X(r[u]??0)},${X(i[d]??0)}`];if(!f)continue;s=!0;let p=Z(`div`,`scenario-label in-battle-label`);p.textContent=`★ ${e}`,a.appendChild(p);let m=Z(`div`,`calc-row ${At(f.classification)} in-battle-row`),h=Z(`span`,`in-battle-badge`);h.textContent=`LIVE`,m.appendChild(h),m.appendChild(document.createTextNode(` `+f.formattedDesc)),a.appendChild(m)}return s||a.appendChild(Y(`No tracked move data for this matchup.`)),a}function kt(e,t,n){let r=Z(`select`,`matchup-select`),i=document.createElement(`option`);i.value=``,i.textContent=e,r.appendChild(i);for(let e of t){let t=document.createElement(`option`);t.value=e,t.textContent=e,e===n&&(t.selected=!0),r.appendChild(t)}return r}function Y(e){let t=Z(`div`,`moves-empty`);return t.textContent=e,t}function X(e){return Math.max(-6,Math.min(6,e??0))}function At(e){return e===`guaranteed-ohko`?`ko-guaranteed`:e===`chance-ohko`?`ko-chance`:e===`2hko`?`ko-2hko`:``}function Z(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function Q(e,t,n){let r=document.createElement(e);return t&&(r.className=t),n&&(r.textContent=n),r}function jt(e){return e>=65?`#2a7a2a`:e>=40?`#b07000`:`#a02020`}function $(e,t){let n=Q(`div`,`ls-sub-row`),r=Q(`span`,`ls-sub-label`,e),i=Q(`div`,`ls-bar-track`),a=Q(`div`,`ls-bar-fill`),o=Q(`span`,`ls-sub-num`,String(t));return a.style.width=`${Math.min(100,t)}%`,a.style.backgroundColor=jt(t),i.appendChild(a),n.append(r,i,o),n}function Mt(e){e.innerHTML=``;let t=Q(`div`,`ls-wrap`);e.append(t);let n=Q(`div`,`ls-status`,`Run ANALYZE MATCHUP to generate lead recommendations.`);t.append(n);let r=Q(`div`,`ls-results`);return t.append(r),{render(e,t){n.style.display=`none`,Nt(r,e,t)},showMessage(e){n.textContent=e,n.style.display=``,r.innerHTML=``}}}function Nt(e,t,n){if(e.innerHTML=``,t.length===0){e.append(Q(`p`,`ls-empty`,`No results.`));return}let r=Q(`div`,`ls-results-heading`,`Top ${t.length} Lead Pairs`);e.append(r);let i=Q(`div`,`ls-cards-grid`);e.append(i),t.forEach((e,t)=>{i.append(Pt(e,t+1,n))})}function Pt(e,t,n){let r=Q(`div`,`ls-card`),i=Q(`div`,`ls-card-header`),a=Q(`span`,`ls-rank`,String(t)),o=Q(`span`,`ls-names`,`${e.monA} + ${e.monB}`),s=Q(`span`,`ls-score-chip`,String(e.score));s.style.backgroundColor=jt(e.score),i.append(a,o,s),r.append(i);let c=Q(`div`,`ls-bars`);c.append($(`Offense`,e.offNorm),$(`Defense`,e.defNorm),$(`Speed`,e.spdNorm)),r.append(c);let l=Q(`div`,`ls-details`);if(e.threats.length>0){let t=Q(`div`,`ls-detail-row`);t.innerHTML=`<span class="ls-detail-label">Threatens</span> ${e.threats.join(`, `)}`,l.append(t)}if(e.hardCounters.length>0){let t=Q(`div`,`ls-detail-row ls-warning`);t.innerHTML=`<span class="ls-detail-label">⚠ Hard counter</span> ${e.hardCounters.join(`, `)}`,l.append(t)}if(e.backPair&&n>=4){let t=Q(`div`,`ls-detail-row ls-back-row`),n=e.backPair.covers.length>0?` <span class="ls-covers">(covers ${e.backPair.covers.join(`, `)})</span>`:``;t.innerHTML=`<span class="ls-detail-label">Bring</span> ${e.backPair.monA} + ${e.backPair.monB}${n}`,l.append(t)}return r.append(l),r}export{at as a,Ge as c,Ee as d,ee as f,l as h,mt as i,Ve as l,u as m,J as n,it as o,h as p,yt as r,Je as s,Mt as t,Ie as u};