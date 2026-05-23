# K Calc + PokéBench CLI
### Competitive Pokémon Analysis Tools

Two tools for competitive Pokémon doubles analysis, built for the **Champions format** (32 EV cap):

| Tool | What it does |
|------|-------------|
| **K Calc** | Web app — analyze your full team vs. a threat list, with a live battle tracker |
| **PokéBench CLI** | Command-line tool — benchmark a single Pokémon against real Smogon metagame usage data |

Both use `@smogon/calc` for damage calculations, with Champions-format EV scaling (32 EVs = 252 standard EVs in stat contribution).

---

## K Calc (Web App)

**Live app:** https://khalilsg.github.io/damagecalc/

**Demo mode** (pre-loaded team, no setup required): https://khalilsg.github.io/damagecalc/demo/

### Analysis Tabs

| Tab | Description |
|-----|-------------|
| **My Offense** | Offensive calcs for every move vs. opponent defensive archetypes. When any Battle Tracker stage is active, switches to live-stage results. |
| **My Offense: Expanded** | Full ±6 stage grid per move. Live tracker stages highlight the matching cell. |
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

### Running Locally

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

### Team Format

Standard Pokémon Showdown export with optional tags on the first line:

- **Stat boost tags** — `[+1 SpA]`, `[+2 SpA]`, `[-1 Spe]` etc. Tests each as a separate scenario in My Offense.

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

Pre-loaded team presets live in the `teams/` folder as plain `.txt` files.

### Analysis Logic

Uses the **Champions format**: EVs are out of 32 (not 252). The tool scales them to standard equivalents before passing to `@smogon/calc` — 32 Champions EVs produce the same stat as 252 standard EVs.

**Offensive Archetypes** (opponent's possible defensive spreads)

| Label | Nature | EVs |
|-------|--------|-----|
| Max SpDef | Calm | 32 HP / 32 SpD |
| Max Def | Bold | 32 HP / 32 Def |
| Min Defense | Serious | 0 HP / 0 Def / 0 SpD |

Special moves are tested against Max SpDef + Min Defense. Physical moves are tested against Max Def + Min Defense.

**Defensive Archetypes** (opponent's possible offensive spreads)

| Label | Nature | EVs |
|-------|--------|-----|
| Max SpAtk | Modest | 32 SpA |
| Max Atk | Adamant | 32 Atk |
| Min Offense | Serious | 0 Atk / 0 SpA |

**Speed Scenarios**

| Label | Nature | EVs |
|-------|--------|-----|
| Max Speed | Jolly | 32 Spe |
| Max Speed (Neutral) | Serious | 32 Spe |
| Min Speed | Serious | 0 Spe |

Additional scenarios: +1/+2 speed stages, -1/-2 speed stages, Choice Scarf, Tailwind.

### Name Aliases

| Input | Resolves To |
|-------|-------------|
| Pokémon-H | Pokémon-Hisui |
| Pokémon-G | Pokémon-Galar |
| Tauros-P | Tauros-Paldea-Combat |
| Tauros-B | Tauros-Paldea-Blaze |
| Tauros-A | Tauros-Paldea-Aqua |
| Aegislash | Aegislash-Both |

Typos within edit distance 4 are automatically corrected. Item names are validated against the calc's item database; unrecognized names are dropped.

### Moves Skipped in Offense Calcs

Protect, Wide Guard, Quick Guard, Parting Shot, Taunt, Encore, Tailwind, After You, Follow Me, Helping Hand

Edit `MOVES_TO_SKIP` in `src/calcEngine.js` to change this list.

---

## PokéBench CLI

Benchmark a single Pokémon against real Smogon metagame usage data — offensive damage output, defensive survival rates, and speed comparisons against the top threats in your format.

### Usage

```
node pokebench/index.js [options]
```

Or via npm:

```
npm run pokebench -- [options]
```

### Example

```bash
node pokebench/index.js \
  --mon "Dragapult" \
  --nature "Timid" \
  --evs "0/0/0/32/0/32" \
  --item "Choice Specs" \
  --month "2026-04" \
  --prefix "gen9championsvgc2026regmabo3" \
  --top 20
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--mon` | Pokémon to benchmark | **Required** |
| `--month` | Smogon stats month (`YYYY-MM`) | **Required** |
| `--prefix` | Format prefix (see below) | **Required** |
| `--nature` | Nature | `Bashful` |
| `--evs` | EV spread: `HP/Atk/Def/SpA/SpD/Spe` (Champions cap: 32/stat) | `0/0/0/0/0/0` |
| `--item` | Held item | None |
| `--moves` | Comma-separated moves (defaults to the Pokémon's top meta moves) | Auto |
| `--top` | Number of opponents to test against | `20` |
| `--opponents` | Comma-separated list of specific Pokémon to test against; overrides `--top` | Off |
| `--test-items` | Comma-separated list of items to compare; overrides `--item` | Off |
| `--boosts` | Stat stage boosts, e.g. `"+2 SpA,-1 Spe"` | None |
| `--optimize` | Run EV optimization mode | Off |

### Finding the Right Prefix

Prefixes come from Smogon's stats server. If you use a wrong prefix, the tool prints the available options automatically:

```
Error: Prefix "gen9championsvgc2026regmabo" not found for 2026-04.

Available Champions formats for 2026-04:
  --prefix "gen9championsbssregma"
  --prefix "gen9championsvgc2026regma"
  --prefix "gen9championsvgc2026regmabo3"
  ...
```

You can also browse https://www.smogon.com/stats/{YYYY-MM}/chaos/ directly.

Common Champions prefixes:

| Format | Prefix |
|--------|--------|
| VGC 2026 Reg MA | `gen9championsvgc2026regma` |
| VGC 2026 Reg MA Bo3 | `gen9championsvgc2026regmabo3` |
| BSS Reg MA | `gen9championsbssregma` |

### Output

Three sections are printed for every run:

**Offensive Check** — your moves vs. each opponent's common defensive spreads (top 5) and items (top 3). Shows damage range across the full spread × item matrix and KO probability.

```
┌────────────┬───────┬────────┬─────────────┬──────────────┬──────────┐
│ Opponent   │ Usage │ Speed  │ Move        │ Damage Range │ KO?      │
├────────────┼───────┼────────┼─────────────┼──────────────┼──────────┤
│ Gholdengo  │ 22.3% │ Faster │ Shadow Ball │ 89.4–107.2%  │ OHKO ~   │
│            │       │        │ Dragon Darts│ 52.1–63.4%   │ 2HKO ✓   │
└────────────┴───────┴────────┴─────────────┴──────────────┴──────────┘
```

**Defensive Check** — each opponent's top 10 offensive moves vs. your spread. Shows the full incoming damage range and whether you survive the worst case.

```
┌────────────┬───────┬─────────────┬─────────────────┬──────────┐
│ Attacker   │ Usage │ Their Move  │ Incoming Damage │ Survive? │
├────────────┼───────┼─────────────┼─────────────────┼──────────┤
│ Great Tusk │ 35.1% │ Earthquake  │ 41.1–83.4%      │ ✓        │
│            │       │ Close Combat│ 95.2–113.6%     │ ✗ (114%) │
└────────────┴───────┴─────────────┴─────────────────┴──────────┘
```

**Speed Audit** — your speed vs. each opponent's range across their common spreads.

### Item Comparison

Test multiple items at once to see how your choice affects every matchup:

```bash
node pokebench/index.js --mon "Blastoise-Mega" \
  --nature "Modest" --evs "0/0/0/32/2/32" \
  --month "2026-04" --prefix "gen9championsvgc2026regmabo3" \
  --test-items "Blastoisinite,Choice Specs,Life Orb"
```

### Optimization Mode

The `--optimize` flag iterates EV investments and reports only the thresholds where KO status changes (offensive) or survival flips (defensive) — keeping output actionable rather than exhaustive.

```bash
node pokebench/index.js --mon "Dragapult" \
  --nature "Timid" --month "2026-04" \
  --prefix "gen9championsvgc2026regmabo3" \
  --optimize
```

**Offensive optimization:** tests all SpA/Atk values 0–32 × relevant natures (Serious + Modest/Adamant). Reports the first EV value that achieves each KO tier per matchup.

**Defensive optimization:** tests HP 0–32 × Def/SpD in multiples of 4 × relevant natures (Serious + Bold for physical, Serious + Calm for special). Reports the minimum investment needed to survive each threat.

Sample output:

```
═══ OPTIMIZATION: OFFENSE (SPA 0–32) ═══

┌──────────────────┬────────────┬─────────────┬─────────────┬──────────────────┐
│ Investment       │ Opponent   │ Move        │ Damage      │ KO tier          │
├──────────────────┼────────────┼─────────────┼─────────────┼──────────────────┤
│ Modest 12 SPA    │ Gholdengo  │ Shadow Ball │ 98.2–117.4% │ Chance OHKO      │
│ Modest 20 SPA    │ Gholdengo  │ Shadow Ball │ 104.1–124.5%│ Guaranteed OHKO  │
└──────────────────┴────────────┴─────────────┴─────────────┴──────────────────┘
```
