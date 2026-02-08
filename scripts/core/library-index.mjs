import { MODULE_ID } from "./blueprint.mjs";

export async function searchLibrary({ searchText, packKeys }) {
  const results = [];
  const query = (searchText ?? "").trim().toLowerCase();

  for (const key of packKeys) {
    const pack = game.packs.get(key);
    if (!pack) continue;
    const index = await pack.getIndex();
    for (const entry of index) {
      const name = entry.name ?? "";
      if (query && !name.toLowerCase().includes(query)) continue;
      results.push({
        uuid: `${pack.collection}.${entry._id}`,
        name,
        pack: pack.collection,
        type: pack.documentName,
      });
    }
  }

  return results;
}

export function getSelectedSourcePacks() {
  return game.settings.get(MODULE_ID, "sourcePacks") ?? [];
}
