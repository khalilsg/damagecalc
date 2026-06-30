# K Calc — Champions Format Toolsuite
### Competitive Pokémon Analysis Tools

A collection of web tools and a CLI for competitive Pokémon doubles analysis, built for the **Champions format** (32 EV cap per stat).

**Live app:** https://khalilsg.github.io/damagecalc/

All tools use `@smogon/calc` for damage calculations. Champions-format EVs (0–32) are scaled to standard equivalents before passing to the calc engine — 32 Champions EVs produce the same stat as 252 standard EVs.

---

## Tools

| Tool | What it does |
|------|-------------|
| **K Calc** | Paste your team and pick opponents — see all offensive/defensive matchups, speed tiers, and lead recommendations, updated live as field conditions change |
| **Team Builder** | Visual slot-by-slot team editor; exports a Showdown paste or loads directly into K Calc |
| **PokéBench** | Web and CLI tool — benchmark a Pokémon against real Smogon usage data |
| **Compare** | Side-by-side base stat butterfly chart + full Champions movepools for any two Pokémon |
| **PokéFinder** | Filter every Champions-legal Pokémon by moves and/or ability; sort results by any stat |
| **Match History** | Log and review matches with per-game results, team snapshots, and TSV export |

---

## K Calc (Web App)

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

## Team Builder

Visual team editor for Champions-legal teams. Select up to 6 Pokémon slot by slot, then load the result directly into K Calc or copy it as a Showdown paste.

### Slot cards

Each slot card includes:

- **Pokémon autocomplete** — searches the full Champions-legal species list including Mega forms
- **Base stats display** — shown automatically after selecting a species; HP/Atk/Def/SpA/SpD/Spe with color tiers (red < 60, orange < 80, grey < 100, green ≥ 100) and a BST total
- **Item** — free-text input
- **Ability** — dropdown populated with the selected Pokémon's legal abilities
- **Nature** — dropdown sorted by boosted stat then lowered stat; 20 stat-affecting natures + Serious (neutral)
- **EVs** — 6 inputs (0–32 each), one per stat
- **Moves** — 4 autocomplete inputs; shows the full Champions-legal moveset on focus without requiring any text

### Import from Paste

A collapsible section at the top accepts a Showdown-format paste and pre-fills all 6 slots, including item, ability, nature, EVs, and moves. After import the panel auto-closes.

### Export

- **LOAD INTO K CALC** — writes the paste to `localStorage` and navigates to K Calc, which picks it up automatically
- **COPY TEAM** — copies the full Showdown paste to clipboard
- **OPEN IN POKÉBENCH** — opens the team in PokéBench web

---

## PokéBench

Benchmark a Pokémon against real Smogon metagame usage data. Available as a web app and as a CLI.

**Web app:** https://khalilsg.github.io/damagecalc/pokebench/

### CLI Usage

```bash
node pokebench/index.js [options]
# or
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
| `--nature` | Nature | `Serious` |
| `--evs` | EV spread: `HP/Atk/Def/SpA/SpD/Spe` (Champions cap: 32/stat) | `0/0/0/0/0/0` |
| `--item` | Held item | None |
| `--moves` | Comma-separated moves (defaults to the Pokémon's top meta moves) | Auto |
| `--top` | Number of opponents to test against | `20` |
| `--opponents` | Comma-separated list of specific Pokémon; overrides `--top` | Off |
| `--test-items` | Comma-separated items to compare; overrides `--item` | Off |
| `--boosts` | Stat stage boosts, e.g. `"+2 SpA,-1 Spe"` | None |
| `--optimize` | Run EV optimization mode | Off |

### Finding the Right Prefix

If you use a wrong prefix, the tool prints the available options automatically. You can also browse `https://www.smogon.com/stats/{YYYY-MM}/chaos/` directly.

Common Champions prefixes:

| Format | Prefix |
|--------|--------|
| VGC 2026 Reg MA | `gen9championsvgc2026regma` |
| VGC 2026 Reg MA Bo3 | `gen9championsvgc2026regmabo3` |
| BSS Reg MA | `gen9championsbssregma` |

### Output

**Offensive Check** — your moves vs. each opponent's common defensive spreads and items. Shows damage range and KO probability.

**Defensive Check** — each opponent's top offensive moves vs. your spread. Shows incoming damage and whether you survive.

**Speed Audit** — your speed vs. each opponent's range across their common spreads.

### Item Comparison

```bash
node pokebench/index.js --mon "Blastoise-Mega" \
  --nature "Modest" --evs "0/0/0/32/2/32" \
  --month "2026-04" --prefix "gen9championsvgc2026regmabo3" \
  --test-items "Blastoisinite,Choice Specs,Life Orb"
```

### Optimization Mode

`--optimize` iterates EV investments and reports only the thresholds where KO status or survival flips — keeping output actionable rather than exhaustive.

**Offensive optimization:** tests all SpA/Atk values 0–32 × relevant natures. Reports the first EV value that achieves each KO tier per matchup.

**Defensive optimization:** tests HP × Def/SpD values × relevant natures. Reports the minimum investment needed to survive each threat.

---

## Compare

Pick any two Champions-legal Pokémon to compare them side by side:

- **Butterfly chart** — base stats for both Pokémon on a shared axis; visually highlights where each one wins
- **Champions movepool diff** — three columns: moves only A can learn, moves both share, moves only B can learn

---

## PokéFinder

Filter every Champions-legal Pokémon by the moves and/or ability they can learn. Useful for finding coverage options or scouting what can fill a specific role.

### How it works

1. Add one or more moves (with move-equivalency grouping for functionally identical moves, e.g. Acid Armor / Iron Defense / Shelter)
2. Optionally add an ability filter
3. Click **FIND POKÉMON** — results show every Pokémon that satisfies all filters
4. Click any row to open that Pokémon's Serebii Champions page

### Result columns

| Column | What it shows |
|--------|--------------|
| HP / Atk / Def / SpA / SpD / Spe | Base stats |
| BST | Base Stat Total |
| eBST | Effective BST — BST minus the weaker offensive stat (min of Atk, SpA) |
| TR | Trick Room value — HP + Atk + Def + SpA + SpD + (100 − Spe) |
| Bulk | Full bulk — 2×HP + Def + SpD |
| Lo Blk | Low bulk — HP + min(Def, SpD) |

All columns are sortable. Hover any column header to see its formula.

---

## Match History

Log match results and review them later.

- Per-game win/loss/tie tracking with opponent team snapshots
- Loss reason tagging for pattern analysis
- TSV export for spreadsheet analysis

---

## Running Locally

```
npm install
npm run dev
```

Open http://localhost:5173. All pages (K Calc, Team Builder, Compare, PokéFinder, Match History) are served from the same dev server.

To deploy to GitHub Pages:

```
npm run build
git add dist/
git commit -m "build"
git push origin main
```
