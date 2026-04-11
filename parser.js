import { readFileSync } from 'fs';

function parseEvs(evString) {
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const part of evString.split('/')) {
    const [amount, stat] = part.trim().split(' ');
    const statMap = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
    if (statMap[stat]) evs[statMap[stat]] = parseInt(amount);
  }
  return evs;
}

function parseFirstLine(line) {
  // Split off the [attacker type] tag first
  const typeMatch = line.match(/\[(\w+)\]$/);
  const attackerType = typeMatch ? typeMatch[1].toLowerCase() : 'both';
  const lineWithoutTag = line.replace(/\s*\[\w+\]$/, '').trim();

  const [namepart, item] = lineWithoutTag.split('@').map(s => s.trim());

  const genderMatch = namepart.match(/\s*\(([MF])\)$/);
  const name = genderMatch ? namepart.replace(/\s*\([MF]\)$/, '').trim() : namepart;
  const gender = genderMatch ? genderMatch[1] : undefined;

  return {
    name,
    gender,
    item: item ?? undefined,
    attackerType,
  };
}

export function parseSets(filePath) {
  const text = readFileSync(filePath, 'utf-8');
  const blocks = text.trim().split(/\n\s*\n/);

  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    const { name, gender, item, attackerType } = parseFirstLine(lines[0]);

    const set = {
      name,
      gender,
      item,
      attackerType,  // add this
      ability: undefined,
      level: 50,
      evs: {},
      nature: 'Serious',
      moves: [],
    };

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Ability:'))        set.ability = trimmed.replace('Ability:', '').trim();
      else if (trimmed.startsWith('Level:'))     set.level = parseInt(trimmed.replace('Level:', '').trim());
      else if (trimmed.startsWith('EVs:'))       set.evs = parseEvs(trimmed.replace('EVs:', '').trim());
      else if (trimmed.startsWith('Tera Type:')) set.teraType = trimmed.replace('Tera Type:', '').trim();
      else if (trimmed.includes('Nature'))       set.nature = trimmed.replace('Nature', '').trim();
      else if (trimmed.startsWith('-'))          set.moves.push(trimmed.replace(/^-\s*/, '').trim());
    }

    return set;
  });
}

