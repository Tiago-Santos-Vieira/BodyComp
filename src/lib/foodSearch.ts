// Busca de alimentos: ignora acentos, aceita as palavras em qualquer ordem
// e põe primeiro os nomes que começam com o que foi digitado.

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em']);

export const normalizeText = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const tokenize = (text: string) =>
  normalizeText(text).split(/[^a-z0-9%]+/).filter(word => word && !STOPWORDS.has(word));

export type SearchableFood = { name: string; aliases?: string[] };
type PreparedFood = SearchableFood & { searchName: string; searchPhrases: string[]; searchWords: string[] };

export function prepareFoodForSearch<T extends SearchableFood>(food: T): T & PreparedFood {
  const names = [food.name, ...(food.aliases || [])];
  return {
    ...food,
    searchName: normalizeText(food.name),
    searchPhrases: names.map(name => tokenize(name).join(' ')),
    searchWords: tokenize(names.join(' ')),
  };
}

export function searchFoods<T extends PreparedFood>(foods: T[], query: string, limit = 40): T[] {
  const terms = tokenize(query);
  if (!terms.length) return foods.slice(0, limit);
  const phrase = terms.join(' ');

  const scored: { food: T; score: number }[] = [];
  for (const food of foods) {
    let score = 0;
    let matchesAll = true;
    for (const term of terms) {
      const position = food.searchWords.findIndex(word => word.startsWith(term));
      if (position === -1) { matchesAll = false; break; }
      score += position;
    }
    if (!matchesAll) continue;

    if (food.searchPhrases.some(name => name === phrase)) score -= 100;
    else if (food.searchPhrases.some(name => name.startsWith(phrase))) score -= 50;
    score += food.searchName.length / 100; // empate: nome mais curto primeiro
    scored.push({ food, score });
  }

  // Nada começando com o termo (ex.: pedaço do meio da palavra): cai para busca por trecho.
  if (!scored.length) {
    return foods.filter(food => food.searchName.includes(normalizeText(query))).slice(0, limit);
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map(entry => entry.food);
}
