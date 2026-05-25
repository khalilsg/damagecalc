# Lead Selector — Design Doc

## Overview

Given your 6 Pokémon and an opponent's 6 Pokémon (entered by species name at team preview), recommend the best lead pairs and which 4 to bring. Uses Smogon chaos data to fill in the opponent's likely sets — no Showdown export required.

---

## Inputs

| Input | Source | Notes |
|---|---|---|
| Your team | Existing team textarea | Same Showdown format already used by K Calc |
| Opponent's 6 species | New species picker (reuse existing defender search UI) | Names only — sets inferred from chaos data |
| Format / month | Dropdown or auto from last PokéBench run | Determines which chaos file to load |

---

## Data Sources

### Your team
Already parsed by `src/parser.js` and used in all existing calc tabs.

### Opponent sets
Pulled from Smogon chaos data (same JSON used by PokéBench CLI).

**CORS note:** Smogon's stats server returns no `Access-Control-Allow-Origin` header, so direct browser `fetch()` is blocked. Solution: bundle the chaos JSON for the active format as a static asset, updated monthly via a local script. See [Bundling](#chaos-data-bundling) below.

For each opponent species, we use:
- **Top 3 spreads** (nature + EVs by usage %) as the representative defensive profile
- **Top 5 moves** as their offensive threat set
- **Top 3 items** to determine damage modifiers

This is the same approach PokéBench uses for its offensive/defensive checks.

---

## Algorithm

### Step 1 — Build the raw matchup matrix

Run the existing calc engine for every (your mon, their mon) pair, both directions, using each opponent's top spread as a representative set. This produces:

```
matrix[yourMon][theirMon] = {
  bestDamageOut: number,     // max % damage you deal (best move, worst-case defense)
  bestDamageIn:  number,     // max % damage they deal (best move, typical spread)
  youOutspeed:   boolean,
  classification: 'OHKO' | '2HKO' | 'chunk' | 'tickle'
}
```

This reuses `calcEngine.js` logic — no new calc code needed.

### Step 2 — Estimate leadability weight per opponent mon

Not all 6 opponent Pokémon are equally likely to appear turn 1. Score each opponent mon by how "leadable" it appears, based on their top moves from chaos data:

| Signal | Weight multiplier |
|---|---|
| Has Fake Out | ×2.0 |
| Has Tailwind or Trick Room | ×1.5 |
| Has Parting Shot or U-turn | ×1.3 |
| Has Follow Me or Rage Powder | ×1.3 |
| No setup/support moves (pure attacker) | ×1.0 |
| Primarily a back-line threat (e.g. low Speed, no priority) | ×0.7 |

Weights are normalized so they sum to 1.0 across the 6 Pokémon. These serve as a probability distribution over the opponent's likely leads.

> **Revision note:** These multipliers are heuristic. Adjust based on real-world accuracy after testing.

### Step 3 — Score every lead pair from your team

C(6,2) = 15 possible pairs. For each pair (A, B):

#### 3a. Offensive threat score
```
For each opponent mon O_i:
  threat = max(damageOut(A, O_i), damageOut(B, O_i))
  if threat >= 100%: points = 3   // OHKO from at least one lead
  if threat >= 50%:  points = 1.5 // likely 2HKO
  if threat >= 30%:  points = 0.5 // meaningful chunk
  else:              points = 0

offensiveScore = Σ (points × leadWeight(O_i))
```

#### 3b. Defensive durability score
```
For each opponent mon O_i:
  inA = damageIn(O_i, A)   // damage O_i deals to A
  inB = damageIn(O_i, B)   // damage O_i deals to B

  if inA < 100 AND inB < 100: points = 2   // both survive
  if inA < 100 OR  inB < 100: points = 1   // one survives
  if inA >= 100 AND inB >= 100: points = -2 // hard counter — both faint

defenseScore = Σ (points × leadWeight(O_i))
```

The -2 penalty for a hard counter is intentionally disproportionate. A lead that gets completely shut down by a single likely opponent mon is much worse than a lead that merely loses the damage race.

#### 3c. Speed score
```
speedScore = count of opponent mons that A or B outspeeds
             (weighted by leadWeight)
```
Normalized to 0–1 range across all 15 pairs.

#### 3d. Coverage penalty
```
sharedWeaknesses = type weaknesses common to both A and B
coveragePenalty = count of opponent mons that hit a shared weakness super-effectively
```

#### 3e. Final score
```
score(A, B) = 0.40 × offensiveScore
            + 0.35 × defenseScore
            + 0.15 × speedScore
            - 0.10 × coveragePenalty
```

> **Weights are v1 defaults.** All four weights sum to 1.0 (ignoring the penalty sign).
> Expected revision: offensive weight may need to drop slightly once tested on real team previews.

### Step 4 — Choose the back pair

For the top-ranked lead pair (A, B), the best back pair from the remaining 4 is the pair that scores highest against the opponent mons that (A, B) performed worst against. Specifically:

1. Identify the 2 opponent Pokémon where (A, B) scored lowest
2. From the remaining 4 of your team, score all C(4,2) = 6 back pairs against those threats
3. Return the highest-scoring back pair as the recommended bring

---

## Output

Display top 3 lead pair recommendations, sorted by score. For each:

```
1. Blastoise-Mega + Incineroar                    Score: 82 / 100
   Offense   ████████░░  Threatens 5 of 6
   Defense   ███████░░░  Both survive 4 of 6
   Speed     █████░░░░░  Faster than 3 of 6
   Coverage  ✓ No shared weaknesses

   Recommended bring: + Rillaboom, Alakazam-Mega
   (covers Gholdengo and Flutter Mane)

   Hard counters: none
   Warnings: Urshifu-Rapid-Strike threatens both leads
```

---

## Chaos Data Bundling

Since browser `fetch()` to Smogon's stats server is blocked by missing CORS headers, chaos data is bundled as a static asset.

### File location
```
src/data/chaos/
  gen9championsvgc2026regmabo3.json   ← full chaos JSON, committed to repo
  gen9championsbssregma.json
  ...
```

### Update script
```
node scripts/update-chaos.js --prefix gen9championsvgc2026regmabo3 --month 2026-04
```

Fetches from Smogon via Node (bypasses CORS), writes to `src/data/chaos/`. Run locally once per month when new stats drop. Commit the updated JSON.

### Import in app
```js
import chaosData from '../data/chaos/gen9championsvgc2026regmabo3.json' assert { type: 'json' };
```

Or loaded dynamically based on which format the user selects.

---

## UI

The lead selector lives in a new tab: **Lead Selector**, added between Summary and My Offense.

### Inputs section (top of tab)
- Opponent species picker: reuse the existing defender-search + tag UI (already built), capped at 6 species
- Format selector: dropdown listing available bundled chaos files
- "Find Best Leads" button

### Results section
- Top 3 lead pair cards (see Output format above)
- Each card expandable to show per-matchup breakdown

### Relationship to Battle Tracker
The lead selector is pre-game only — it doesn't interact with the Battle Tracker. Once you've chosen leads and the game starts, you use the existing tabs as normal.

---

## Limitations (v1)

- **No team mode / win condition awareness.** The algorithm doesn't know if your team wants Trick Room or Tailwind. A TR setter might score poorly on speed but should still be prioritized as a lead. Fix: add role tags to the team format (e.g. `[TR]`, `[TW]`).

- **Opponent leadability is heuristic.** The move-based weighting is an approximation. Real lead rates vary by metagame. Fix: if Smogon ever publishes lead-rate data, use it directly.

- **No mind-game modeling.** Doesn't account for the opponent counter-teaming your leads. This is inherently unknowable from team preview alone.

- **Single-turn analysis only.** Scores are based on turn-1 damage/speed. Doesn't model turn-2 (e.g. a mon that's weak turn 1 but wins after a stat boost). Fix: future version could weight 2HKO scenarios for mons with setup moves.

---

## Implementation Phases

### Phase 1 — Data layer
- [ ] `scripts/update-chaos.js` — fetch and write chaos JSON locally
- [ ] Bundle initial chaos JSON for active format(s)
- [ ] `src/leadSelector/chaos.js` — load bundled chaos, parse opponent sets (reuse PokéBench chaos.js logic)

### Phase 2 — Algorithm
- [ ] `src/leadSelector/score.js` — Steps 2–4: leadability weights, pair scoring, back pair selection
- [ ] Unit tests for scoring logic

### Phase 3 — UI
- [ ] New "Lead Selector" tab in `index.html`
- [ ] Opponent species picker (reuse defender-search component)
- [ ] Results cards with score breakdown
- [ ] Wire up to calc engine and score.js

### Phase 4 — Tuning
- [ ] Test against real team previews from recorded matches
- [ ] Adjust scoring weights based on accuracy
- [ ] Add role tags (`[TR]`, `[TW]`) to team format if needed
