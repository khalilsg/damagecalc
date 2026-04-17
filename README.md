# Damance Calc
### Competitive Pokémon Analysis Engine

A web-based tool for analyzing matchups in competitive Pokémon doubles. Given your team and a list of opponent threats, it calculates offense, defense, and speed matchups across multiple scenarios simultaneously — solving the "hidden information" problem of not knowing your opponent's exact EV spreads.

Built on [@smogon/calc](https://github.com/smogon/damage-calc).

---

## Live App

https://khalilsg.github.io/damagecalc/

---

## Features

- Executive summary of key threats and opportunities
- Offensive damage calcs for every move on your team vs. opponent archetypes
- Defensive damage calcs using opponent's common moves from Smogon's dataset
- Speed ladder showing your team vs. opponent min/max speeds and boost scenarios
- Extended Smogon format with stat boost tags
- Searchable opponent dropdown with Enter-to-autofill and configurable exclusions

---

## Usage

### Web UI

    npm install
    npm run dev

Then open http://localhost:5173 in your browser.

To deploy to GitHub Pages:

    npm run build
    git add .
    git commit -m "your message"
    git push origin main

### Terminal Tool (v1)

    node battlecalc.js <path-to-sets.txt> <defender1> <defender2> ...

Example:

    node battlecalc.js myteam.txt Garchomp Sylveon "Iron Hands" Amoonguss

---

## Team Format

Uses standard Pokémon Showdown export format with this optional additions on the first line:

1. Optional stat boost tags: [+1 Atk], [+2 SpA], [-1 Spe], etc. Will test against all of these

Example:

    Alakazam-Mega @ Alakazite [+1 SpA] [+2 SpA]
    Ability: Trace
    Level: 50
    EVs: 252 SpA / 4 SpD / 252 Spe
    Timid Nature
    - Dazzling Gleam
    - Focus Blast
    - Psychic
    - Protect

    Basculegion (M) @ Choice Specs
    Ability: Swift Swim
    Tera Type: Ghost
    EVs: 252 Atk / 4 SpD / 252 Spe
    Jolly Nature
    - Wave Crash
    - Flip Turn
    - Psychic Fangs
    - Last Respects

Pokémon with no item can still have tags:

    Liepard
    Ability: Limber
    ...

---

## Analysis Logic

### Offensive Archetypes (opponent's possible defensive spreads)

| Label        | EVs                  | Nature  |
|--------------|----------------------|---------|
| Max SpDef    | 252 HP / 252 SpD     | Calm    |
| Max Def      | 252 HP / 252 Def     | Bold    |
| Min Defense  | 0 HP / 0 Def / 0 SpD | Serious |

Special moves are tested against Max SpDef and Min Defense.
Physical moves are tested against Max Def and Min Defense.

### Defensive Archetypes (opponent's possible offensive spreads)

| Label        | EVs      | Nature  |
|--------------|----------|---------|
| Max SpAtk    | 252 SpA  | Modest  |
| Max Atk      | 252 Atk  | Adamant |
| Min Offense  | 0 Atk    | Serious |

### Speed Scenarios

Your Pokémon: base speed only, plus any custom boost tags (e.g. [+2 Spe]).
Opponent: min speed (0 Spe / Serious), max speed (252 Spe / Jolly), plus scarf and tailwind variants of each.

---

## Name Aliases

| Input      | Resolves To          |
|------------|----------------------|
| Pokémon-H  | Pokémon-Hisui        |
| Pokémon-G  | Pokémon-Galar        |
| Tauros-P   | Tauros-Paldea-Combat |
| Tauros-B   | Tauros-Paldea-Blaze  |
| Tauros-A   | Tauros-Paldea-Aqua   |
| Aegislash  | Aegislash-Both       |

Typos within edit distance 4 are automatically corrected.

---

## Dropdown Exclusions

Add Pokémon names to src/exclusions.txt (one per line) to hide them from the opponent search dropdown.

---

## Terminal Tool (v1) Reference

### Defender Variants

| Label         | EVs                  | Nature  |
|---------------|----------------------|---------|
| Defensive SpD | 252 HP / 252 SpD     | Calm    |
| Defensive Def | 252 HP / 252 Def     | Bold    |
| Neutral       | 0 HP / 0 Def / 0 SpD | Serious |

### Moves Skipped by Default

Protect, Wide Guard, Quick Guard, Parting Shot, Taunt, Encore, Tailwind

Edit MOVES_TO_SKIP in battlecalc.js to change this list.

### Output Colors

- Red: guaranteed OHKO
- Orange: chance OHKO
- Yellow: guaranteed or >50% chance 2HKO
ENDOFFILE
