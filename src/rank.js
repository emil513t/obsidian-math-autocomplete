import { DICTIONARY } from "./dictionary.js";

// Builds the ranked suggestion list for a partially typed `\query`.
// stats:  { cmds: Map<name, count>, atoms: Map<atom, count> } from the vault
// boosts: { [insertText]: timesPicked } learned from the popup itself
export function rankSuggestions(query, stats, boosts = {}, limit = 20) {
  const q = query.toLowerCase();
  const items = new Map(); // insert text -> item

  const add = (name, insert, kind, uses) => {
    let score;
    if (name.startsWith(query)) score = 3;
    else if (name.toLowerCase().startsWith(q)) score = 2;
    else return;
    const prev = items.get(insert);
    const picked = boosts[insert] || 0;
    const item = { name, insert, kind, uses, picked, score };
    if (!prev || prev.uses < uses) items.set(insert, item);
  };

  for (const d of DICTIONARY.values()) {
    add(d.name, d.template, "builtin", stats.cmds.get(d.name) || 0);
  }
  for (const [name, count] of stats.cmds) {
    if (!DICTIONARY.has(name)) add(name, "\\" + name, "vault", count);
  }
  for (const [atom, count] of stats.atoms) {
    if (count < 2) continue;
    add(atom.match(/^\\([a-zA-Z]+)/)[1], atom, "atom", count);
  }

  const dictRank = (it) => DICTIONARY.get(it.name)?.rank ?? 9999;
  return [...items.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        // Exact name match first, so `\in` doesn't bury \in under \int.
        (b.name === query) - (a.name === query) ||
        b.picked * 5 + b.uses - (a.picked * 5 + a.uses) ||
        (a.kind === "atom") - (b.kind === "atom") ||
        dictRank(a) - dictRank(b) ||
        a.insert.length - b.insert.length,
    )
    .slice(0, limit);
}
