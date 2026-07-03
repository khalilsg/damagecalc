# K Calc — Design Document

A specification detailed enough to re-create this project from scratch. Written for a developer or AI agent; it describes **what to build and why**, with the key algorithms, data contracts, and conventions spelled out. Where exact constants matter (EV scaling, archetype spreads, storage keys), they are given verbatim.

---

## 1. Product Overview

**K Calc** is a suite of browser tools (plus one CLI) for competitive Pokémon doubles analysis in the **Champions format** — the ruleset used by Pokémon Champions:

- Level 50 battles, Doubles
- EVs range **0–32 per stat** (not 0–252); 32 Champions EVs = 252 standard EVs in stat contribution
- A restricted species pool defined by the Champions mod on Pokémon Showdown (includes Mega Evolutions; only one Mega may be brought per match)
- IVs default to 31

The core loop the suite supports: **build a team → analyze it against expected opponents → track a live match → record the result.**

- Hosted on GitHub Pages at `https://<user>.github.io/damagecalc/`
- One repo, one Vite multi-page app, no backend — all persistence is `localStorage`, all data is fetched from public sources or bundled at build time

## 2. Tech Stack & Constraints

| Choice | Detail |
|---|---|
| Language | Vanilla JavaScript, ES modules. No framework, no TypeScript. |
| Build | Vite multi-page app. Every HTML entry point must be listed in `vite.config.js` → `build.rollupOptions.input`. `base: '/damagecalc/'`. |
| Damage engine | `@smogon/calc` (^0.11), `Generations.get(9)`. |
| Styling | Per-page inline `<style>` blocks in each HTML file. No shared CSS file; shared *look* is by convention (§10). The nav bar injects its own styles from JS. |
| Persistence | `localStorage` only (§9). |
| Deploy | GitHub Actions on push to `main`: checkout → setup-node (24) → `npm install` → `npm run build` → upload `dist/` → `actions/deploy-pages`. |
| Tests | `node --test tests/*.test.js` (EV scaling, terrain, lead selector). |
| Dev proxy | Vite proxies `/smogon-stats/*` → `https://www.smogon.com/stats/*` to dodge CORS in dev. |

## 3. Repository Layout

```
├── index.html            K Calc (main page)
├── hub.html              Tool directory landing page
├── teambuilder.html      Team Builder
├── compare.html          Compare
├── moveset.html          PokéFinder
├── ohko.html             OHKO Calc
├── history.html          Match History
├── demo/index.html       K Calc demo mode (pre-loaded team, auto-run)
├── pokebench/            PokéBench: index.html + index.js (CLI) + chaos/calc/optimize/render/simulate.js
├── src/
│   ├── main.js           K Calc page controller
│   ├── demo.js           Demo page controller
│   ├── calcEngine.js     THE core module: gen, archetypes, runAnalysis, OHKO thresholds
│   ├── parser.js         Showdown-paste parser (extended format)
│   ├── battleTracker.js  Live match state store (pub/sub)
│   ├── savedTeams.js     Shared saved-team localStorage store
│   ├── matchHistory.js   Match records + loss reasons + TSV export
│   ├── learnsets.js      Champions/Gen9 learnsets + PS Pokédex abilities
│   ├── smogonStats.js    Live chaos fetch (previous month) for common moves
│   ├── speedCalc.js      Speed scenario generation
│   ├── champions.js      Bundled SETDEX_CHAMPIONS fallback sets
│   ├── teams.js          Preset teams imported from teams/*.txt (?raw)
│   ├── moveEquivalencies.js  Groups of functionally identical moves
│   ├── siteHeader.js     Injected nav bar + version badge
│   ├── version.js        `export const VERSION = 'vX.Y.Z'`
│   ├── leadSelector/     chaos.js (trimmed-chaos loader), score.js (pair scoring)
│   └── ui/               One renderer per K Calc tab + sidebar + save-match modal
│       ├── offense.js / offenseExpanded.js / defense.js / defenseExpanded.js
│       ├── speedLadder.js / summary.js / matchupLookup.js / leadSelector.js
│       ├── sidebarTracker.js / saveMatchModal.js
│   ├── teamBuilderPage.js / comparePage.js / movesetPage.js / ohkoPage.js / historyPage.js
├── public/data/chaos/    Trimmed chaos JSON (one file per format prefix)
├── scripts/update-chaos.js   Monthly chaos refresh script
├── teams/*.txt           Preset team pastes
├── docs/                 lead-selector.md, DESIGN.md (this file)
├── tests/                node:test suites
└── .github/workflows/deploy.yml
```

Root-level `calc.js`, `calcLib.js`, `battlecalc.js`, `parser.js` are the original CLI prototypes, superseded by the web app; keep or drop freely.

## 4. Champions Format Conventions (used everywhere)

**EV scaling** — the single most important convention. User-facing EVs are 0–32. Before constructing any `@smogon/calc` `Pokemon`:

```js
scaled[stat] = Math.min(252, Math.round(ev * 252 / 32))   // 7.875 per point
```

**Level** — always 50. **Field** — always `new Field({ gameType: 'Doubles', ... })`.

**Opponent archetypes** — opponents' unknown spreads are approximated by fixed archetypes (Champions-scale EVs):

```
DEFENSE_ARCHETYPES (they defend):  Max SpDef = Calm  32 HP/32 SpD
                                   Max Def   = Bold  32 HP/32 Def
                                   Min Defense = Serious, 0 EVs
OFFENSE_ARCHETYPES (they attack):  Max SpAtk = Modest 32 SpA
                                   Max Atk   = Adamant 32 Atk
                                   Min Offense = Serious, 0 EVs
```

A physical move is tested vs Max Def + Min Defense; special vs Max SpDef + Min Defense (mirror logic for incoming damage). Every feature that shows "two bars per move" is showing these two archetypes.

**Name resolution** (`resolveSpeciesName`): apply aliases (`-H`→`-Hisui`, `-G`→`-Galar`, `Tauros-P/B/A`→Paldea forms, `Aegislash`→`Aegislash-Both`), then exact ID lookup (lowercase, strip `[-\s]`), then fuzzy match by edit distance (accept ≤ 4, else throw).

**Non-standard attacking stats**: `getOffensiveStat(moveName, category)` returns the stat a move's damage scales with — `'def'` for Body Press, else `spa`/`atk` by category. A `MOVE_OFFENSIVE_STAT` map holds the exceptions. **Every** stage-aware code path (grid builders and grid lookups) must use this helper, or moves like Body Press won't respond to the right boosts.

**KO classification** (`classifyKO` on `result.kochance().text`): `guaranteed OHKO` → `guaranteed-ohko`; contains `OHKO` → `chance-ohko`; `2HKO` if guaranteed or chance > 50% → `2hko`; else null. Calc rows carry `{ minPct, maxPct, classification, formattedDesc }` where pct = damage roll / defender max HP × 100.

## 5. Data Sources

| Source | Used for | Access |
|---|---|---|
| `raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/learnsets.ts` | Authoritative Champions species list + legal moves | Fetched at runtime, parsed by slicing the object literal and `new Function('return {...}')`. Species IDs = object keys. |
| `play.pokemonshowdown.com/data/pokedex.js` | Full ability lists (slots 0/1/H) and Mega form stats/types | Runtime fetch, executed into an `exports` shim. **Do not** use `@smogon/calc`'s `species.abilities` for ability lists — it only carries slot 0. |
| `play.pokemonshowdown.com/data/learnsets.js` | Full Gen 9 learnsets (fallback / Compare) | Same technique. |
| `smogon.com/stats/{prev-month}/chaos/gen9championsvgc-0.json` | Live "common moves" for K Calc defense tabs | Via Vite proxy in dev, direct in prod (may CORS-fail → fall back to bundled `SETDEX_CHAMPIONS`, then a hardcoded move pool). |
| `public/data/chaos/{prefix}.json` | Lead selector, Summary flags, OHKO "Top 50" | Bundled. Produced by `scripts/update-chaos.js --month YYYY-MM`, which trims full chaos to `{ usage, Moves(top 8), Spreads(top 5), Items(top 5) }` per species (~85% smaller). `KNOWN_FORMATS` in `src/leadSelector/chaos.js` lists label+prefix; **first entry = site default**. |
| Mega forms | Learnsets inherit from base species (strip suffixes `mega/megax/megay/...`); stats/types/abilities come from the PS Pokédex | `getChampionsMegaForms()` |

Champions species list for autocompletes = learnset keys + Mega forms, mapped to display names via `gen.species.get(id)?.name`, sorted.

## 6. Shared Module Contracts

**`parser.js` → `parseSets(text)`**: splits on blank lines; each block →

```js
{ name, gender, item, attackerType ('physical'|'special'|'both'),
  boosts: [{ modifier, stat }],          // from [+2 SpA]-style tags on line 1
  ability, level (default 50), evs {0–32}, ivs (default 31),
  nature (default 'Serious'), teraType, moves: string[] }
```

Line 1: `Name (M) @ Item [tags]`. Field lines: `Ability:`, `Level:`, `EVs:`, `IVs:`, `Tera Type:`, nature as **either** `Bold Nature` **or** `Nature: Bold`, moves as `- Move`.

**`calcEngine.js`** (everything level-50, doubles):
- `runAnalysis(playerSets, opponentNames, fieldOptions)` → `{ offense, offenseExpanded, defense, defenseExpanded, speed }`. Field options: `weather, terrain, myScreens{reflect,lightScreen}, opponentScreens, myFriendGuard, opponentFriendGuard, myHelpingHand{name:bool}`.
  - *offense*: per player × opponent × boost-scenario (Base + each paste boost tag), rows per move × defensive archetype.
  - *offenseExpanded*: per move, `grids: [{ archetype, grid }]` over all 13×13 stage pairs keyed `` `${myStage},${oppStage}` `` (my attacking stat stage × their matching defensive stage), plus legacy `grid` = the Min-archetype grid (used by Expanded tab and Matchup Lookup single-cell views).
  - *defense/defenseExpanded*: mirrors with OFFENSE_ARCHETYPES and key order `` `${oppStage},${myStage}` ``.
  - *speed*: per pair, comparisons across speed scenarios (base/min/max, ±1/±2 stages, Scarf, Tailwind) from `speedCalc.js`.
- `computeIncomingMove(move, oppName, playerSets, fieldOptions)` — one logged move vs whole team (LIVE badge rows).
- `computeDefenseExpGrid(move, oppName, playerSet, fieldOptions)` — 13×13 grid for a logged move.
- `computeOhkoThresholds(...)` — §7.6.
- `MOVES_TO_SKIP` — support moves excluded from offense calcs.

**`battleTracker.js`** — module-singleton store with `subscribe(fn)` / `getState()` / mutators (`adjustMyStage`, `setWeather`, `toggleMyHelpingHand`, `removeMyPokemon`, `addOpponentMove(name, calcs, defGrids)`, …). State:

```js
{ myStages: {name: {atk,spa,def,spd,spe}}, opponentStages, opponentMoves: {name: [{name, calcs, defGrids}]},
  weather, terrain, myScreens, opponentScreens, myFriendGuard, opponentFriendGuard, myHelpingHand }
```

Every mutation notifies subscribers; `main.js` re-renders all tabs from cached analysis data. If the *field* part of the state changed (compare a serialized `fieldKey`), re-run `runAnalysis` first with the new field options. Deleting a Pokémon's stage entry is what hides it (`filterByActive` keeps only names present in `myStages`/`opponentStages`) — display-only; snapshots keep full rosters.

**`savedTeams.js`** — key `kcalc_teams`, value `[{ name, text, savedAt }]` (most recent first). `saveTeam(name, text)` de-dupes by name. `teamNameFromSpecies(names)` → alphabetical ` / `-joined default team name (used by both save buttons and Save Match).

**`matchHistory.js`** — keys `kcalc_match_history`, `kcalc_reasons`. Record: `{ id, date, outcome 'W'|'L', myTeam {name, pokemon[]}, theirTeam, reasons[], note }`. `buildSnapshot(trackerState, playerSets, opponentNames)` uses the **full** roster lists, not the tracker's surviving keys. Default loss reasons: Lead choice, Bad math, Weather control, Speed control, Trick Room, Terrain control, Bad matchup, Bad roll.

**`siteHeader.js`** — imported first by every page module; injects a fixed dark nav (Hub, K Calc, Team Builder, Compare, PokéFinder, OHKO Calc, Match History, PokéBench) with active-link highlighting by pathname and the `VERSION` badge right-aligned. Pads `body` down by nav height.

**`moveEquivalencies.js`** — arrays of interchangeable moves (e.g. Acid Armor / Iron Defense / Shelter). PokéFinder collapses each group into one autocomplete entry labeled `A / B / C` that matches if the Pokémon learns *any* member.

## 7. Page Specifications

### 7.1 Hub (`hub.html`)
Static grid of tool cards (icon, name, description, "Open →"). Pure HTML/CSS + siteHeader.

### 7.2 K Calc (`index.html` + `src/main.js`)
Layout: team textarea + team management row; opponent-threat autocomplete with chip list; format `<select>` (from `KNOWN_FORMATS`); ANALYZE button; tab strip; fixed battle-tracker sidebar.

Flow on ANALYZE: `parseSets` → `runAnalysis` → lead-selector scoring (`loadChaosData(format)` → `scoreLeadPairs`, `buildThreatMatrix`) → prefetch full opponent ability lists (`getAbilitiesBatch`) for Summary flags → `initTracker(playerNames, opponentNames)` → subscribe re-render → switch to Summary tab.

Tab renderers receive `(dataSlice, container, trackerState)` and re-render on every tracker notify:
- **Summary**: alert flags (Abilities from prefetched PS ability lists; Moves from threat-matrix chaos movesets — chaos stores move *IDs* like `fakeout`, so normalize alert names before comparing), then threat-matrix cards, then grouped OHKO/2HKO/speed-tie lists.
- **My Offense / My Defense**: normal mode = two archetype bars per move; live mode (any nonzero stage) = same two bars read from the expanded `grids` at the current stages. Pick the stage axis with `getOffensiveStat`.
- **Expanded tabs**: single-cell view per move at current stages from legacy `grid`.
- **Matchup Lookup**: pick one of yours × one of theirs; offense + defense cells at live stages.
- **Speed Ladder**: sorted speed bars across scenarios, live Spe stages applied.
- **Lead Selector**: top 5 scored pairs (algorithm in `docs/lead-selector.md`; scoring weights offense .40 / defense .35 / speed .15, hard-counter penalty −.10, opponents weighted by lead-signal moves like Fake Out 2.0×, Tailwind/Trick Room 1.5×).

Sidebar (`sidebarTracker.js`): weather/terrain/screens/Friend-Guard toggles; per-Pokémon cards (`.tracker-card` with `.tracker-poke-name`) with ±stage rows, Reset, ✕ KO, Helping Hand; opponent cards add a move-log input (computes `computeIncomingMove` + `computeDefenseExpGrid` and stores on the tracker); Save Match button → modal (outcome, editable team names — defaults from `teamNameFromSpecies` — loss-reason chips on loss, note) → `addRecord`.

Handoffs: `?team=` URL param (base64 via `btoa(unescape(encodeURIComponent(text)))`) pre-fills the textarea; `kcalc_builder_team` localStorage key (set by Team Builder) is consumed-and-deleted on load.

### 7.3 Team Builder (`teambuilder.html` + `src/teamBuilderPage.js`)
Six slot cards. Each: species autocomplete (Champions list) → on pick, populate base-stat row (color tiers: <60 red, <80 orange, <100 grey, ≥100 green + BST) synchronously, then fetch abilities (PS Pokédex) + legal moves (Champions learnset) in parallel; item text input; ability select; nature select ordered by boosted-then-lowered stat (Spe→Atk→SpA→Def→SpD; 20 natures + Serious — the four redundant neutrals are omitted); six 0–32 EV number inputs; four move autocompletes limited to the species' legal moves, `showOnEmpty` so focusing lists everything.

`applySpecies(name, overrides)` is the single load path — used by manual picks and by import (overrides carry item/ability/nature/evs/moves). Import from Paste (collapsed `<details>`) parses, clears all slots, then applies up to 6 sets in parallel. My Teams bar shares `savedTeams.js` with K Calc. Export buttons build the paste (`Name @ Item` / `Ability:` / `EVs:` non-zero only / `Nature` / `- moves`).

Shared autocomplete helper (`initAC`): input + absolutely-positioned dropdown, substring filter, arrow-key navigation, Enter picks active-or-first, Escape closes, blur closes after 150 ms (so mousedown picks land), optional `showOnEmpty`/`openOnFocus`.

### 7.4 PokéBench (`pokebench/`)
CLI (`node pokebench/index.js`) and web page sharing modules. Inputs: `--mon --month --prefix` (+ nature/evs/item/moves/top/opponents/test-items/boosts/optimize). Fetches full Smogon chaos for the month/prefix, benchmarks the mon against the top-N usage opponents: offensive check (your moves vs their top 5 spreads × top 3 items), defensive check (their top moves vs you), speed audit. `--optimize` sweeps EVs and reports only threshold crossings (KO tier gained / survival flipped). Wrong prefix → prints the available Champions prefixes for that month. Web version accepts `?team=` (base64) from K Calc / Team Builder.

### 7.5 Compare (`compare.html`)
Two species pickers → butterfly (mirrored horizontal bar) chart of base stats + BST; below, Champions movepool diff in three columns (only A / shared / only B).

### 7.6 OHKO Calc (`ohko.html` + `src/ohkoPage.js`)
**Question answered:** "What raw Atk/SpA (or Def for Body Press) do I need for a *guaranteed* OHKO?"

Engine (`computeOhkoThresholds(attacker, opponentNames, options)` in calcEngine):
1. `statKey = getOffensiveStat(move, category)`; status moves throw.
2. **Probe trick**: to evaluate an arbitrary raw stat `X`, build the attacker with `overrides: { baseStats: { ...base, [statKey]: X - 20 } }` at level 50 / Serious / 0 EV / 31 IV — the resulting raw stat is exactly `X` (at L50, raw = base + 20). Item, ability, and `boosts` (my stage) go on the probe; opponent stage goes on the archetype defender.
3. **Binary search** the minimum `X` in `[21, 999]` where the *minimum* damage roll ≥ 100% of the defender's max HP. Guard rails first: no damage at 999 → `noDamage` (immunity); < 100% at 999 → impossible at any stat; ≥ 100% at 21 → threshold 21.
4. Per opponent, run against the category-matching Max archetype and Min Defense.
5. **Achievability**: species range = raw stat at Serious/0 EV (min) … +nature/32 EV (max), where +nature is Adamant/Modest/Bold per statKey. needed > max → flag impossible (still show the number). Otherwise find the **cheapest investment**: first (nature, ev) in Serious 0→32 then +nature 0→32 whose raw stat ≥ threshold.
6. Options: `myBoost, oppBoost (−6…+6), weather, terrain, helpingHand, oppReflect, oppLightScreen, oppFriendGuard` — folded into the probe/defender/Field.

UI: species/item/move inputs (move list = species' legal moves); ability select; two boost selects; weather/terrain selects; modifier toggle buttons; opponent chips + **Add Top 50** (top-50 by usage from `KNOWN_FORMATS[0]` bundled chaos, merged/deduped) + **Clear**. Results: summary bar (move, stat, species stat range, active-conditions caption) and a table — per opponent, per archetype: green `131 SpA` + cheapest spread, or `any spread`, or red `224 SpA — Impossible (max 167)`, or grey `No damage`. Yield with `setTimeout` (never `requestAnimationFrame` — it doesn't fire in hidden tabs) before the synchronous calc burst.

### 7.7 PokéFinder (`moveset.html` + `src/movesetPage.js`)
Move chips (with equivalency groups) + optional ability chip → filter all Champions species: every move group satisfied (ANY member in learnset) AND ability present. Results table: types (colored badges), HP/Atk/Def/SpA/SpD/Spe, BST, eBST (= BST − min(Atk, SpA)), TR (= HP+Atk+Def+SpA+SpD+(100−Spe)), Bulk (= 2·HP+Def+SpD), Lo Blk (= HP+min(Def, SpD)). Sortable headers with `title` tooltips explaining each formula. Row click → Serebii Champions dex page. "List all" button skips filtering.

### 7.8 Match History (`history.html` + `src/historyPage.js`)
Win/loss record with per-match cards (teams, reasons, note), loss-reason aggregation ("Loss patterns"), reason management, delete, and TSV export (date, outcome, team names, rosters, reasons, note).

### 7.9 Demo (`demo/index.html` + `src/demo.js`)
K Calc clone that pre-loads a preset team + fixed opponents and auto-runs the analysis — a zero-setup showcase.

## 8. Cross-Cutting Behaviors

- **Live-stage rendering rule**: build grids per archetype (`grids`), keep the Min-archetype `grid` for single-cell consumers; look up cells with the stage of `getOffensiveStat(move)` on the attacker side and the category-matching defensive stat on the other. This preserves the two-bar display under boosts and makes Body Press respond to Def stages everywhere.
- **Save Match remembers removed Pokémon**: snapshots are built from analysis-time rosters (`currentPlayerSets`, `currentOpponents`), never from the tracker's surviving keys.
- **Immunities**: `result.desc()` containing `'No damage'` → treat as null row / `noDamage` flag rather than 0%.

## 9. localStorage & URL Contracts

| Key / Param | Shape | Producers → Consumers |
|---|---|---|
| `kcalc_teams` | `[{name, text, savedAt}]` | K Calc ⇄ Team Builder |
| `kcalc_builder_team` | raw paste string | Team Builder → K Calc (consumed & removed on load) |
| `kcalc_match_history` | record array (§6) | Save Match modal → Match History page |
| `kcalc_reasons` | string array | Match History |
| `?team=` | base64(UTF-8 paste) | Share button / Team Builder → K Calc, PokéBench |

## 10. Visual Language

Light theme: page bg `#f4f4f2`, text `#1a1a1a`, white cards with `1px solid #e5e5e5`, radius 8, `'Segoe UI', system-ui` at 14px. Tiny bold uppercase labels (`0.65–0.68rem`, letter-spacing, `#555`/`#888`). Primary buttons: black `#111`, white bold uppercase text; secondary: white with `#ccc` border. Fixed dark nav (`#1a1a1a`, 40px) with uppercase links and a right-aligned monospace version badge. Damage bars: two-segment gradient (solid to min-roll, translucent to max-roll); offense palette green `#2a7a2a` ≥100% / amber `#b07000` ≥50% / grey; defense (incoming) palette red `#c00` / orange `#d6600a` / grey. KO chips: OHKO ✓ / OHKO ~ / 2HKO. Type badge colors follow standard type hex values. Base-stat tiers: red <60, orange <80, grey <100, green ≥100.

## 11. Development Conventions

- **Versioning** (`src/version.js`, shown in nav): same-day follow-up push → bump 3rd number; first push of the day (minor) → 2nd; new page/major → 1st. Docs/CI-only pushes don't bump.
- Monthly data refresh: `npm run update-chaos -- --month YYYY-MM`, commit `public/data/chaos/`, push (CI redeploys). Keep `KNOWN_FORMATS` (first = default) and the script's `DEFAULT_PREFIXES` in sync with available formats.
- Node ≥ 20 locally (CI uses 24). `npm run dev` serves everything at `http://localhost:5173/damagecalc/`.

## 12. Suggested Re-Creation Order

1. Scaffold Vite MPA (`base`, inputs, dev proxy) + `siteHeader.js` + `version.js` + hub.
2. `parser.js`, `calcEngine.js` core (EV scaling, archetypes, name resolution, `calcResult`/`classifyKO`) with tests.
3. K Calc static analysis: parse → `runAnalysis` → offense/defense/speed/summary tabs.
4. `battleTracker.js` + sidebar + reactive re-render + expanded grids + live-stage views (`getOffensiveStat` from day one).
5. Chaos pipeline (`scripts/update-chaos.js`, `leadSelector/chaos.js`) → lead selector + summary threat matrix/flags.
6. `learnsets.js` (Champions list, abilities, Megas) → Team Builder (+ `savedTeams.js`), Compare, PokéFinder.
7. OHKO Calc (probe + binary search engine, then UI).
8. Match History + Save Match modal; PokéBench CLI/web; demo page.
9. GitHub Actions deploy workflow.
