# Lead Selector — Design Doc

## Overview

Given your 6 Pokémon and an opponent's 6 Pokémon (entered by species name at team preview), recommend the best lead pairs and which 4 to bring. Uses Smogon chaos data to fill in the opponent's likely sets — no Showdown export required.

---

## Inputs

| Input | Source | Notes |
|---|---|---|
| Your team | Existing team textarea | Same Showdown format already used by K Calc |
| Opponent's 6 species | Self-contained species picker inside the Lead Selector tab | Names only — sets inferred from chaos data |
| Format | Dropdown in the Lead Selector tab | Selects which bundled chaos file to load |

---

## Data Sources

### Your team
Parsed on demand from the team textarea via `parseSets()`. No prior analysis run required — the Lead Selector reads the textarea directly when "Find Best Leads" is clicked.

### Opponent sets
Pulled from Smogon chaos data (same JSON used by PokéBench CLI).

**CORS:** Confirmed — Smogon's stats server returns no `Access-Control-Allow-Origin` header, so direct browser `fetch()` is blocked. Solution: bundle trimmed chaos JSON as static assets served from the same origin (GitHub Pages), updated monthly via a local script.

For each opponent species, we use:
- **Top 8 moves** by usage % — offensive threat assessment and leadability signals
- **Top 5 spreads** (nature + EVs) — representative defensive profile
- **Top 5 items** — damage modifiers

---

## Format Rule: Mega Constraint

In the Champions format, **at most 1 Mega Pokémon may be brought per match** (a team of 6 may have multiple, but only 1 can be in the bring of 4).

Detection: a species is considered Mega if its resolved name contains `-Mega` (e.g. `Blastoise-Mega`, `Alakazam-Mega`).

This constraint is enforced in two places:

1. **Lead pair filtering** — lead pairs where both mons are Mega are removed entirely from results. They can never form a valid bring.

2. **Back pair filtering** — when choosing the back pair:
   - If 1 lead is Mega → back pair candidates are filtered to 0 Megas
   - If 0 leads are Mega → back pair may contain at most 1 Mega
   - If no valid back pair exists after filtering (e.g. all remaining mons are Mega) → `backPair: null`

---

## Algorithm

### Step 1 — Build the raw matchup matrix

For every (your mon, their mon) pair, compute both directions using `@smogon/calc` directly:

```
matchups[yourMonIdx][oppIdx] = {
  damageOut:   number,   // max % damage you deal (best move, max roll)
  damageIn:    number,   // max % damage they deal (best move, max roll)
  youOutspeed: boolean
}
```

Multi-hit moves (Dragon Darts, Population Bomb) are handled by summing max damage across hits. Status/support moves are skipped via `SKIP_MOVES`.

Opponent Pokémon are built from their most-used chaos spread + item. Your Pokémon are built from the parsed team set, with Champions EV scaling applied (32 EVs → 252 standard).

### Step 2 — Estimate leadability weight per opponent mon

Not all 6 opponent Pokémon are equally likely to appear turn 1. Each opponent is scored by the highest-priority lead signal in their top moves:

| Signal move | Weight |
|---|---|
| Fake Out | ×2.0 |
| Tailwind, Trick Room | ×1.5 |
| Follow Me, Rage Powder, Parting Shot | ×1.3 |
| U-turn, Encore | ×1.2 |
| (no signal) | ×1.0 |

Weights are normalized to sum to 1.0 across the opponent's 6 mons. These serve as a probability distribution over likely leads.

> **Note:** The ×0.7 "back-line threat" signal from the original design was dropped — it required move heuristics that weren't reliable. The minimum weight is 1.0 (uniform).

> **Revision note:** Multipliers are heuristic. Adjust based on real-world accuracy after testing.

### Step 3 — Score every valid lead pair

Up to C(6,2) = 15 possible pairs, minus any filtered by the Mega constraint. For each pair (A, B):

#### 3a. Offensive threat score
```
For each opponent mon O_i:
  threat = max(damageOut(A, O_i), damageOut(B, O_i))
  points = 3    if threat >= 100%   // OHKO from at least one lead
         = 1.5  if threat >= 50%    // strong chunk / likely 2HKO
         = 0.5  if threat >= 30%    // meaningful damage
         = 0    otherwise

offensiveScore = Σ (points × leadWeight(O_i))
```

#### 3b. Defensive durability score
```
For each opponent mon O_i:
  inA = damageIn(O_i, A)
  inB = damageIn(O_i, B)

  points = 2   if inA < 100 AND inB < 100   // both survive
         = 1   if inA < 100 OR  inB < 100   // one survives
         = -2  if inA >= 100 AND inB >= 100  // hard counter — both faint

defenseScore = Σ (points × leadWeight(O_i))
```

The -2 hard counter penalty is intentionally disproportionate. A lead that gets completely shut down by a single likely opponent is much worse than one that merely loses the damage race.

#### 3c. Speed score
```
speedScore = Σ leadWeight(O_i)  for each O_i where A or B outspeeds O_i
```
(weighted fraction of opponents outrun; range 0–1)

#### 3d. Hard counter penalty
```
hardCounterPenalty = (count of opponents that OHKO both leads) / 6 × 100
```

> **Implementation note:** The original design called for a type-chart-based "coverage penalty" (shared type weaknesses). This was replaced with the damage-based hard counter penalty — it's equivalent in practice and requires no type chart lookup.

#### 3e. Final score
```
score(A, B) = 0.40 × offenseNorm
            + 0.35 × defenseNorm
            + 0.15 × speedNorm
            - 0.10 × hardCounterPenalty
```

Where each component is normalized to 0–100:
- `offenseNorm  = offensiveScore / 3.0 × 100`
- `defenseNorm  = (defenseScore + 2.0) / 4.0 × 100`  (raw range [−2, +2])
- `speedNorm    = speedScore × 100`

> **Weights:** The four absolute values sum to 1.0 (0.40 + 0.35 + 0.15 + 0.10 = 1.0). Expected revision: offensive weight may need to drop slightly once tested on real team previews.

### Step 4 — Choose the back pair

For each lead pair, select the back pair from the remaining Pokémon that best covers uncovered threats:

1. Identify "uncovered" opponents: those where neither lead deals ≥50% damage
2. From remaining mons (respecting Mega constraint), score all valid back pair combinations:
   - Reward threatening each uncovered mon (`offensePoints()`)
   - Bonus for surviving the uncovered mon's best move
3. Return the highest-scoring valid back pair with a `covers` list

Returns `null` when no valid back pair exists (Mega constraint makes all remaining mons ineligible).

---

## Output

Top 5 lead pair results shown as cards, sorted by score. For each:

```
[1]  Blastoise-Mega + Incineroar                          [82]
     Offense  ████████████████████░░░░  75
     Defense  ██████████████░░░░░░░░░░  60
     Speed    ████████░░░░░░░░░░░░░░░░  45

     Threatens   Gholdengo, Rillaboom, Incineroar
     ⚠ Hard counter  Kyogre
     Bring       Garchomp + Togekiss  (covers Flutter Mane, Urshifu)
```

Score chip and bar colors: green ≥65, amber 40–64, red <40.

---

## Chaos Data Bundling

### Why bundled
Smogon's stats server returns no CORS headers → browser `fetch()` blocked. Files are bundled as static assets in `public/data/chaos/` and served from the same origin (GitHub Pages). No CORS issue.

### File location
```
public/data/chaos/
  gen9championsvgc2026regmabo3.json   ← trimmed, ~103 KB
  gen9championsvgc2026regma.json      ← trimmed, ~110 KB
  gen9championsbssregma.json          ← trimmed, ~106 KB
```

Vite copies `public/` to `dist/` unchanged on build.

### Trimming
The raw chaos JSON is ~4.5 MB per format. The update script trims each species entry to:
- Top 8 moves, top 5 spreads, top 5 items, usage %

Result: ~98% size reduction (4.5 MB → ~103 KB).

### Update script
```
npm run update-chaos -- --month YYYY-MM
# or for a specific format:
npm run update-chaos -- --month 2026-04 --prefix gen9championsvgc2026regmabo3
```

Run locally once per month when new Smogon stats drop. Commit the updated files in `public/data/chaos/`.

### Fetching in the app
```js
// import.meta.env.BASE_URL resolves to '/' in dev, '/damagecalc/' on GitHub Pages
const res = await fetch(`${import.meta.env.BASE_URL}data/chaos/${prefix}.json`);
```

> **Gotcha:** Using an absolute path (`/data/chaos/...`) ignores the Vite `base` config and breaks on GitHub Pages. Always use `import.meta.env.BASE_URL` as the prefix.

---

## File Structure

```
src/leadSelector/
  chaos.js      — loadChaosData(prefix), getOpponentRep(), parseSpread()
  score.js      — scoreLeadPairs(), isMega(), bestDamage(), offensePoints(),
                  defensePoints(), leadWeight(), SKIP_MOVES, LEAD_SIGNAL_WEIGHTS,
                  SCORE_WEIGHTS

src/ui/
  leadSelector.js — initLeadSelectorTab(container, getYourSets)
                    Self-contained: owns opponent search, format selector,
                    result cards. Does NOT reuse the main defender-search.

public/data/chaos/
  *.json        — trimmed chaos data, committed to repo

scripts/
  update-chaos.js — fetch + trim + write chaos files

tests/
  lead-selector.test.js — 91 tests covering scoring primitives,
                           chaos parsing, integration, Mega constraint
```

---

## UI

The Lead Selector is a self-contained tab between Summary and My Offense. It owns its own opponent search (separate from the main defender-search — same UX, independent state).

### Inputs
- **Format dropdown** — VGC 2026 Reg MA Bo3, VGC 2026 Reg MA, BSS Reg MA
- **Opponent species search** — same typeahead UX as defender search; capped at 6; tags with × to remove
- **Find Best Leads button** — reads the team textarea directly (no prior analysis needed)

### Results
- Up to 5 lead pair cards
- Score chip color-coded: green ≥65, amber 40–64, red <40
- Offense/Defense/Speed bars (0–100)
- Threats list (opponents at least one lead deals ≥50% to)
- Hard counter warning (opponent OHKOs both leads)
- Back pair recommendation with covered threats listed
- `null` back pair shown as no recommendation when Mega constraint makes any bring invalid

### Relationship to Battle Tracker
Pre-game only. The Lead Selector doesn't interact with the Battle Tracker. Once leads are chosen and the game starts, use the existing tabs as normal.

---

## Limitations (v1)

- **No team mode / win condition awareness.** The algorithm doesn't know if your team wants Trick Room or Tailwind. A TR setter might score poorly on speed but should still be prioritized as a lead. Fix: add role tags to the team format (e.g. `[TR]`, `[TW]`).

- **Opponent leadability is heuristic.** The move-based weighting is an approximation. Real lead rates vary by metagame. Fix: if Smogon ever publishes lead-rate data, use it directly.

- **No mind-game modeling.** Doesn't account for the opponent counter-teaming your leads. This is inherently unknowable from team preview alone.

- **Single-turn analysis only.** Scores are based on turn-1 damage/speed. Doesn't model turn-2 (e.g. a mon that's weak turn 1 but wins after a stat boost). Fix: future version could weight 2HKO scenarios for mons with setup moves.

- **Single representative spread per opponent.** Only the most-used chaos spread is used for each opponent mon. A mon with a bimodal spread distribution (e.g. both TR and fast variants common) is represented by only one.

---

## Implementation Phases

### Phase 1 — Data layer ✅
- [x] `scripts/update-chaos.js` — fetch, trim, and write chaos JSON locally
- [x] Bundle initial chaos JSON for 3 Champions formats in `public/data/chaos/`
- [x] `src/leadSelector/chaos.js` — `loadChaosData()`, `getOpponentRep()`, `parseSpread()`

### Phase 2 — Algorithm ✅
- [x] `src/leadSelector/score.js` — leadability weights, pair scoring, back pair selection
- [x] Mega constraint: filter invalid lead pairs + constrain back pair candidates
- [x] Unit + integration tests (91 tests total)

### Phase 3 — UI ✅
- [x] New "Lead Selector" tab in `index.html`
- [x] Self-contained opponent species picker with typeahead and tags
- [x] Score cards with bar charts, threat lists, hard counter warnings, back pair
- [x] Wired to `getYourSets()` callback — reads team textarea on demand

### Phase 4 — Tuning
- [ ] Test against real team previews from recorded matches
- [ ] Adjust scoring weights based on accuracy
- [ ] Add role tags (`[TR]`, `[TW]`) to team format if needed
- [ ] Consider multi-spread analysis (test top 3 spreads per opponent, not just top 1)
