/**
 * Speed stat calculation using the standard Pokémon formula.
 * Formula: floor(floor((2 * base + iv + floor(ev / 4)) * level / 100 + 5) * natureModifier)
 */

const NATURE_SPEED_MODIFIERS = {
  Hardy: 1.0, Lonely: 1.0, Brave: 0.9, Adamant: 1.0, Naughty: 1.0,
  Bold: 1.0, Docile: 1.0, Relaxed: 0.9, Impish: 1.0, Lax: 1.0,
  Timid: 1.1, Hasty: 1.1, Serious: 1.0, Jolly: 1.1, Naive: 1.1,
  Modest: 1.0, Mild: 1.0, Quiet: 0.9, Bashful: 1.0, Rash: 1.0,
  Calm: 1.0, Gentle: 1.0, Sassy: 0.9, Careful: 1.0, Quirky: 1.0,
};

export function calcSpeed(base, iv = 31, ev = 0, level = 50, nature = 'Serious') {
  const natureMod = NATURE_SPEED_MODIFIERS[nature] ?? 1.0;
  return Math.floor(
    Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5) * natureMod
  );
}

export function applySpeedModifier(speed, modifier) {
  switch (modifier) {
    case 'scarf':    return Math.floor(speed * 1.5);
    case 'tailwind': return speed * 2;
    case '+1':       return Math.floor(speed * 1.5);
    case '+2':       return speed * 2;
    case '-1':       return Math.floor(speed * 2 / 3);
    case '-2':       return Math.floor(speed * 2 / 4);
    default:         return speed;
  }
}

/**
 * Speed scenarios for my pokemon.
 * Only includes base speed + any custom boosts specified in the set.
 */
export function getSpeedScenarios(baseSpeed, set) {
  const iv = set.ivs?.spe ?? 31;
  const ev = set.evs?.spe ?? 0;
  const nature = set.nature ?? 'Serious';
  const level = set.level ?? 50;

  const base = calcSpeed(baseSpeed, iv, ev, level, nature);
  const scenarios = [{ label: 'Base', speed: base }];

  for (const boost of (set.boosts ?? [])) {
    if (boost.stat.toLowerCase() === 'spe' || boost.stat.toLowerCase() === 'speed') {
      const modifier = boost.modifier > 0 ? `+${boost.modifier}` : `${boost.modifier}`;
      scenarios.push({
        label: `${modifier} Spe`,
        speed: applySpeedModifier(base, modifier),
      });
    }
  }

  return scenarios;
}

/**
 * Speed scenarios for opponent pokemon.
 * Tests min and max base speeds, plus scarf and tailwind variants of each.
 */
export function getOpponentSpeedScenarios(baseSpeed) {
  const min = calcSpeed(baseSpeed, 31,   0, 50, 'Serious');
  const max = calcSpeed(baseSpeed, 31, 252, 50, 'Jolly');

  return [
    { label: 'Min Speed',          speed: min },
    { label: 'Max Speed',          speed: max },
    { label: 'Min Speed + Scarf',  speed: applySpeedModifier(min, 'scarf') },
    { label: 'Max Speed + Scarf',  speed: applySpeedModifier(max, 'scarf') },
    { label: 'Min Speed + Tailwind', speed: applySpeedModifier(min, 'tailwind') },
    { label: 'Max Speed + Tailwind', speed: applySpeedModifier(max, 'tailwind') },
  ];
}
