# damagecalc

A command-line Pokémon damage calculator for doubles battles. Given a team file in Pokémon Showdown format and a list of opposing Pokémon, it runs damage calculations for every attacker and move in the file against every defender, with color-coded output and KO summaries.

Built on top of [@smogon/calc](https://github.com/smogon/damage-calc).

## Requirements

- Node.js (LTS recommended)
- npm

## Installation

    git clone https://github.com/khalilsg/damagecalc.git
    cd damagecalc
    npm install

## Usage

    node battlecalc.js <path-to-sets.txt> <defender1> <defender2> ...

Example:

    node battlecalc.js myteam.txt Garchomp Sylveon "Iron Hands" Amoonguss

## Team File Format

Sets use standard Pokémon Showdown export format, with one addition: a [physical], [special], or [both] tag after the item on the first line to indicate the attacker type.

    Alakazam-Mega @ Alakazite [special]
    Ability: Trace
    Level: 50
    EVs: 252 SpA / 4 SpD / 252 Spe
    Timid Nature
    - Dazzling Gleam
    - Focus Blast
    - Psychic
    - Protect

    Basculegion (M) @ Choice Specs [physical]
    Ability: Swift Swim
    Tera Type: Ghost
    EVs: 252 Atk / 4 SpD / 252 Spe
    Jolly Nature
    - Wave Crash
    - Flip Turn
    - Psychic Fangs
    - Last Respects

If the tag is omitted, the attacker is treated as "both".

Pokémon with no item can still have the tag:

    Liepard [physical]
    Ability: Limber
    ...

## Defender Variants

Each defender is tested against three EV/nature spreads:

| Label         | EVs                  | Nature  |
|---------------|----------------------|---------|
| Defensive SpD | 252 HP / 252 SpD     | Calm    |
| Defensive Def | 252 HP / 252 Def     | Bold    |
| Neutral       | 0 HP / 0 Def / 0 SpD | Serious |

If the attacker is [physical], the Defensive SpD variant is skipped. If [special], the Defensive Def variant is skipped.

## Name Aliases

The following shorthand names are supported:

| Input       | Resolves To           |
|-------------|-----------------------|
| Pokémon-H   | Pokémon-Hisui         |
| Pokémon-G   | Pokémon-Galar         |
| Tauros-P    | Tauros-Paldea-Combat  |
| Tauros-B    | Tauros-Paldea-Blaze   |
| Tauros-A    | Tauros-Paldea-Aqua    |
| Aegislash   | Aegislash-Both        |

Fuzzy name matching is also supported — typos within an edit distance of 4 are automatically corrected.

## Output

Results are grouped by matchup (attacker vs. defender), with all moves shown per matchup. Output is color-coded:

- Cyan — matchup headers
- Red — guaranteed OHKOs
- Orange — chance OHKOs
- Yellow — guaranteed or >50% chance 2HKOs

At the end, three summary sections are printed:

- >25% chance to 2HKO (yellow)
- Non-guaranteed OHKOs (orange)
- Guaranteed OHKOs (red)

## Moves to Skip

The following moves are skipped by default and produce no output:
:q
Protect, Wide Guard, Quick Guard, Parting Shot, Taunt, Encore, Tailwind

To add more, edit the MOVES_TO_SKIP array in battlecalc.js.
