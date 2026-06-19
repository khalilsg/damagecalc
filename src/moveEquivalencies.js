// Each sub-array is a group of moves treated as interchangeable for search.
// The autocomplete shows them as a single entry: "Move A / Move B / Move C".
// A Pokémon matches the filter if it learns ANY move in the group.
export const MOVE_EQUIVALENCIES = [
  ['Stockpile', 'Cosmic Power'],
  ['Acid Armor', 'Iron Defense', 'Shelter'],
  ['Rock Polish', 'Agility'],
  ['Thief', 'Switcheroo'],
];
