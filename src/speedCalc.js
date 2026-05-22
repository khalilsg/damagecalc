/**
 * Speed stat calculation — standard Pokémon formula.
 * Champions format: max EVs per stat = 32 (not 252).
 */

const NATURE_SPEED_MODIFIERS = {
  Hardy: 1.0, Lonely: 1.0, Brave: 0.9, Adamant: 1.0, Naughty: 1.0,
  Bold: 1.0, Docile: 1.0, Relaxed: 0.9, Impish: 1.0, Lax: 1.0,
  Timid: 1.1, Hasty: 1.1, Serious: 1.0, Jolly: 1.1, Naive: 1.1,
  Modest: 1.0, Mild: 1.0, Quiet: 0.9, Bashful: 1.0, Rash: 1.0,
  Calm: 1.0, Gentle: 1.0, Sassy: 0.9, Careful: 1.0, Quirky: 1.0,
};

export function calcSpeed(base, iv = 31, ev = 0, level = 50, nature = 'Serious') {
  const mod = NATURE_SPEED_MODIFIERS[nature] ?? 1.0;
  return Math.floor(Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5) * mod);
}

export function applySpeedStage(speed, stage) {
  if (stage === 0) return speed;
  if (stage > 0) return Math.floor(speed * (2 + stage) / 2);
  return Math.floor(speed * 2 / (2 - stage));
}

export function applySpeedModifier(speed, modifier) {
  switch (modifier) {
    case 'scarf':    return Math.floor(speed * 1.5);
    case 'tailwind': return speed * 2;
    default:         return speed;
  }
}

/**
 * Speed scenarios for the player's pokemon.
 * Basic: actual speed as built.
 * Extra: scarf, tailwind, -1/-2 stages, plus any set boosts.
 */
export function getPlayerSpeedScenarios(baseSpeed, set) {
  const iv     = set.ivs?.spe ?? 31;
  const ev     = set.evs?.spe ?? 0;
  const nature = set.nature ?? 'Serious';
  const level  = set.level ?? 50;
  const base   = calcSpeed(baseSpeed, iv, ev, level, nature);

  const basic = [{ label: 'Base', speed: base, isBasic: true }];

  // Set boosts (e.g. [+1 Spe], [+2 Spe])
  const setBoosts = [];
  for (const boost of (set.boosts ?? [])) {
    const s = boost.stat.toLowerCase();
    if (s === 'spe' || s === 'speed') {
      setBoosts.push({ label: `${boost.modifier > 0 ? '+' : ''}${boost.modifier} Spe`, speed: applySpeedStage(base, boost.modifier), isBasic: false });
    }
  }

  const full = [
    ...basic,
    ...setBoosts,
    { label: 'Tailwind', speed: applySpeedModifier(base, 'tailwind'), isBasic: false },
    { label: 'Scarf',    speed: applySpeedModifier(base, 'scarf'),    isBasic: false },
    { label: '-1 Spe',   speed: applySpeedStage(base, -1),            isBasic: false },
    { label: '-2 Spe',   speed: applySpeedStage(base, -2),            isBasic: false },
  ];

  return { basic, full };
}

/**
 * Speed scenarios for opponent pokemon.
 * Champions format EVs: max 32.
 * Basic: min (0 EVs, neutral), + (32 EVs, neutral), ++ (32 EVs, positive).
 * Full: adds +1/+2 stage, scarf, tailwind variants.
 */
export function getOpponentSpeedScenarios(baseSpeed) {
  const min      = calcSpeed(baseSpeed, 31,  0, 50, 'Serious');
  const maxNeu   = calcSpeed(baseSpeed, 31, 32, 50, 'Serious');
  const maxPos   = calcSpeed(baseSpeed, 31, 32, 50, 'Jolly');

  const basic = [
    { label: '',   speed: min,    isBasic: true },   // bare name
    { label: '+',  speed: maxNeu, isBasic: true },
    { label: '++', speed: maxPos, isBasic: true },
  ];

  const full = [
    ...basic,
    { label: '+1',       speed: applySpeedStage(min, 1),               isBasic: false },
    { label: '+ +1',     speed: applySpeedStage(maxNeu, 1),            isBasic: false },
    { label: '++ +1',    speed: applySpeedStage(maxPos, 1),            isBasic: false },
    { label: '+2',       speed: applySpeedStage(min, 2),               isBasic: false },
    { label: '++ +2',    speed: applySpeedStage(maxPos, 2),            isBasic: false },
    { label: 'Scarf',    speed: applySpeedModifier(min, 'scarf'),      isBasic: false },
    { label: '++Scarf',  speed: applySpeedModifier(maxPos, 'scarf'),   isBasic: false },
    { label: 'Tailwind', speed: applySpeedModifier(min, 'tailwind'),   isBasic: false },
    { label: '++Tailwind', speed: applySpeedModifier(maxPos, 'tailwind'), isBasic: false },
  ];

  return { basic, full };
}
