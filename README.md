# K Calc
### Competitive Pokémon Analysis Engine

A web-based tool for analyzing matchups in competitive Pokémon doubles. Given your team and a list of opponent threats, it calculates offense, defense, and speed matchups across multiple scenarios simultaneously — solving the "hidden information" problem of not knowing your opponent's exact EV spreads.

Built on [@smogon/calc](https://github.com/smogon/damage-calc) using the **Champions format** (32 EV cap).

---

## Live App

https://khalilsg.github.io/damagecalc/

**Demo mode** (pre-loaded team, no setup required): https://khalilsg.github.io/damagecalc/demo/

---

## Features

### Analysis Tabs

| Tab | Description |
|-----|-------------|
| **My Offense** | Offensive calcs for every move vs. opponent defensive archetypes. Switches to live-stage results when any Battle Tracker stage is active. |
| **My Offense: Expanded** | Full ±6 stage grid per move. Reads live tracker stages and instantly highlights the matching cell. |
| **My Defense** | Incoming damage from opponent's common moves (sourced from Smogon usage stats). Logged moves appear first with a LIVE badge. |
| **My Defense: Expanded** | Full ±6 stage grid for incoming moves. Live-tracked moves also show their full stage grid. |
| **Matchup Lookup** | Select any pair (your Pokémon vs. one opponent) to instantly see offense + defense calcs at current live stages. |
| **Speed Ladder** | Visualizes your team vs. opponent speeds across min/max/scarf/tailwind scenarios. Reflects live Spe stage changes. |
| **Summary** | Key threats and opportunities grouped by Pokémon pair, with calc details indented beneath each pair. |

### Battle Tracker (Persistent Sidebar)

Real-time state tracking that updates all tabs without re-running the full analysis.

- **Stat stages:** ±1 adjustors for Atk, SpA, Def, SpD, Spe on every card (±6 range). Global reset per Pokémon.
- **Helping Hand:** Per-Pokémon toggle (highlights gold). Applies a 1.5× damage boost to that Pokémon's outgoing calcs.
- **KO / Remove (✕):** Removes a Pokémon from the tracker and strips it from all analysis tabs instantly.
- **Weather:** Mutually exclusive toggles for Sun, Rain, Sand, Snow. Triggers immediate re-analysis.
- **Screens:** Reflect and Light Screen for both your side and opponent's side.
- **Friend Guard:** Separate toggles for your side and the opponent's side. Halves all incoming damage to that side.
- **Opponent move log:** Type a move name to log it. Immediately calculates damage against your full team and displays it with a LIVE badge in the Defense tabs.

### Other

- Executive summary highlighting guaranteed OHKOs, chance OHKOs (>5%), and notable 2HKOs (>25%) grouped by matchup pair
- Smogon usage stats integration — opponent common moves fetched live, with bundled fallback
- Extended Smogon format with stat boost tags and pre-loaded team presets
- Searchable opponent dropdown with arrow-key navigation and Enter-to-autofill
- Item and Pokémon name normalization (fuzzy match within edit distance 4, alias table for regional forms)

---

## Usage

### Web UI

```
npm install
npm run dev
```

Then open http://localhost:5173.

To deploy to GitHub Pages:

```
npm run build
git add dist/
git commit -m "build"
git push origin main
```

---

## Team Format

Standard Pokémon Showdown export with optional tags on the first line:

- **Stat boost tags** — `[+1 SpA]`, `[+2 SpA]`, `[-1 Spe]` etc. The tool tests each as a separate scenario in My Offense.

Example:

```
Blastoise-Mega @ Blastoisinite [+2 SpA] [+2 Spe]
Ability: Mega Launcher
EVs: 32 SpA / 2 SpD / 32 Spe
Modest Nature
- Protect
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
```

Pokémon with no item can still have tags:

```
Liepard
Ability: Limber
EVs: 32 HP / 2 Def / 32 SpD
Calm Nature
- Protect
- Encore
- Foul Play
- Protect
```

Pre-loaded team presets live in the `teams/` folder as plain `.txt` files.

---

## Analysis Logic

Uses the **Champions format**: EVs are out of 32 (not 252).

### Offensive Archetypes (opponent's possible defensive spreads)

| Label | Nature | EVs |
|-------|--------|-----|
| Max SpDef | Calm | 32 HP / 32 SpD |
| Max Def | Bold | 32 HP / 32 Def |
| Min Defense | Serious | 0 HP / 0 Def / 0 SpD |

Special moves are tested against Max SpDef + Min Defense.
Physical moves are tested against Max Def + Min Defense.

### Defensive Archetypes (opponent's possible offensive spreads)

| Label | Nature | EVs |
|-------|--------|-----|
| Max SpAtk | Modest | 32 SpA |
| Max Atk | Adamant | 32 Atk |
| Min Offense | Serious | 0 Atk / 0 SpA |

### Speed Scenarios

| Label | Nature | EVs |
|-------|--------|-----|
| Max Speed | Jolly | 32 Spe |
| Max Speed (Neutral) | Serious | 32 Spe |
| Min Speed | Serious | 0 Spe |

Additional scenarios tested: +1/+2 speed stages, -1/-2 speed stages, Choice Scarf, Tailwind.

---

## Name Aliases

| Input | Resolves To |
|-------|-------------|
| Pokémon-H | Pokémon-Hisui |
| Pokémon-G | Pokémon-Galar |
| Tauros-P | Tauros-Paldea-Combat |
| Tauros-B | Tauros-Paldea-Blaze |
| Tauros-A | Tauros-Paldea-Aqua |
| Aegislash | Aegislash-Both |

Typos within edit distance 4 are automatically corrected.
Item names are validated against the calc's item database; unrecognized names are dropped rather than crashing the calc.

---

## Moves Skipped in Offense Calcs

Protect, Wide Guard, Quick Guard, Parting Shot, Taunt, Encore, Tailwind, After You, Follow Me, Helping Hand

Edit `MOVES_TO_SKIP` in `src/calcEngine.js` to change this list.
