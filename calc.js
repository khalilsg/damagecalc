import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';

const gen = Generations.get(9);
const field = new Field({ gameType: 'Doubles' });

const EV_SPREADS = [
  { hp: 252, def: 252, spd: 252 },
  { hp: 0,   def: 0,   spd: 0   },
];

const NATURES = ['Serious', 'Calm', 'Bold'];

/**
 * Builds all combinations of EV spreads and natures for a given defender.
 *
 * @param {string} defenderName - The Pokémon species name
 * @returns {Pokemon[]} Array of Pokemon with each EV/nature combination
 */
function buildDefenderVariants(defenderName) {
  return EV_SPREADS.flatMap((evs) =>
    NATURES.map((nature) =>
      new Pokemon(gen, defenderName, {
        level: 50,
        evs: { hp: evs.hp, def: evs.def, spd: evs.spd },
        nature,
      })
    )
  );
}

/**
 * Runs damage calculation for one attacker against all variants of many defenders.
 *
 * @param {Pokemon} attacker - The attacking Pokémon
 * @param {Move} move - The move being used
 * @param {string[]} defenderNames - Array of defending Pokémon species names
 * @returns {Object[]} Array of results grouped by defender name and variant
 */
function calcAttackerVsAll(attacker, move, defenderNames) {
  return defenderNames.flatMap((defenderName) =>
    buildDefenderVariants(defenderName).map((defender) => {
      try {
        const result = calculate(gen, attacker, defender, move, field);
        return {
          defender: defenderName,
          nature: defender.nature,
          evs: defender.evs,
          desc: result.desc(),
          kochance: result.kochance(),
        };
      } catch (e) {
        return {
          defender: defenderName,
          nature: defender.nature,
          evs: defender.evs,
          desc: 'No damage (immune or non-damaging move)',
          kochance: 'N/A',
        };
      }
    })
  );
}

// --- Example Usage ---

const attacker = new Pokemon(gen, 'Garchomp', {
  level: 50,
  evs: { atk: 252 },
  nature: 'Jolly',
});

const move = new Move(gen, 'Earthquake');

const defenderNames = ['Blissey', 'Skarmory', 'Ferrothorn', 'Toxapex'];

const results = calcAttackerVsAll(attacker, move, defenderNames);

results.forEach(({ desc, kochance }) => {
  console.log(`${desc} — ${kochance}`);
});

