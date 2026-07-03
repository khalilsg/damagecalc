/**
 * Parser for extended Smogon format.
 * Handles:
 * - Standard Smogon export fields
 * - [physical] / [special] / [both] attacker type tag
 * - Stat boost tags like [+1 Atk] [+1 Def] [-1 Spe] on the first line
 * - Gender markers (M) / (F)
 * - Regional aliases (-H, -G, Tauros-P/B/A, Aegislash)
 */

function parseEvs(evString) {
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const part of evString.split('/')) {
    const [amount, stat] = part.trim().split(' ');
    const statMap = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
    if (statMap[stat]) evs[statMap[stat]] = parseInt(amount);
  }
  return evs;
}

function parseIvs(ivString) {
  const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  for (const part of ivString.split('/')) {
    const [amount, stat] = part.trim().split(' ');
    const statMap = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
    if (statMap[stat]) ivs[statMap[stat]] = parseInt(amount);
  }
  return ivs;
}

function parseFirstLine(line) {
  // Extract all bracket tags
  const bracketTags = [...line.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
  const lineWithoutTags = line.replace(/\s*\[[^\]]+\]/g, '').trim();

  // Attacker type
  const typeTag = bracketTags.find(t => ['physical', 'special', 'both'].includes(t.toLowerCase()));
  const attackerType = typeTag ? typeTag.toLowerCase() : 'both';

  // Stat boosts e.g. "+1 Atk", "-1 Spe"
  const boostTags = bracketTags.filter(t => /^[+-]\d+\s+\w+$/.test(t));
  const boosts = boostTags.map(t => {
    const [modifier, stat] = t.split(/\s+/);
    return { modifier: parseInt(modifier), stat };
  });

  // Name and item
  const [namepart, item] = lineWithoutTags.split('@').map(s => s.trim());

  // Gender
  const genderMatch = namepart.match(/\s*\(([MF])\)$/);
  const name = genderMatch ? namepart.replace(/\s*\([MF]\)$/, '').trim() : namepart;
  const gender = genderMatch ? genderMatch[1] : undefined;

  return { name, gender, item: item ?? undefined, attackerType, boosts };
}

export function parseSets(text) {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks.filter(b => b.trim()).map((block) => {
    const lines = block.trim().split('\n');
    const { name, gender, item, attackerType, boosts } = parseFirstLine(lines[0]);

    const set = {
      name,
      gender,
      item,
      attackerType,
      boosts,       // array of { modifier, stat } e.g. [{ modifier: 1, stat: 'Atk' }]
      ability: undefined,
      level: 50,
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      nature: 'Serious',
      teraType: undefined,
      moves: [],
    };

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Ability:'))        set.ability = trimmed.replace('Ability:', '').trim();
      else if (trimmed.startsWith('Level:'))     set.level = parseInt(trimmed.replace('Level:', '').trim());
      else if (trimmed.startsWith('EVs:'))       set.evs = parseEvs(trimmed.replace('EVs:', '').trim());
      else if (trimmed.startsWith('IVs:'))       set.ivs = parseIvs(trimmed.replace('IVs:', '').trim());
      else if (trimmed.startsWith('Tera Type:')) set.teraType = trimmed.replace('Tera Type:', '').trim();
      else if (trimmed.startsWith('Nature:'))    set.nature = trimmed.replace('Nature:', '').trim();  // "Nature: Bold"
      else if (trimmed.includes('Nature'))       set.nature = trimmed.replace('Nature', '').trim();   // "Bold Nature"
      else if (trimmed.startsWith('-'))          set.moves.push(trimmed.replace(/^-\s*/, '').trim());
    }

    return set;
  });
}
