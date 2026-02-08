export const MODULE_ID = "archive-creature-brewer";
export const FLAG_SCOPE = MODULE_ID;
export const BLUEPRINT_FLAG = "blueprint";

export function createBlueprint() {
  const now = new Date().toISOString();
  return {
    meta: {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      sourceSystemId: game.system?.id ?? null,
    },
    identity: {
      name: "",
      img: "",
      size: "",
      type: "",
      tags: [],
    },
    notes: {
      publicDescription: "",
      gmNotes: "",
    },
    stats: {
      challenge: { ratingText: "", levelText: "" },
      defenses: {
        acText: "",
        hpText: "",
        resistancesText: "",
        immunitiesText: "",
        vulnerabilitiesText: "",
      },
      movement: { speedsText: "" },
      senses: { sensesText: "", languagesText: "" },
    },
    actions: [],
    attachments: [],
  };
}

export function updateBlueprintMeta(blueprint) {
  return {
    ...blueprint,
    meta: {
      ...blueprint.meta,
      updatedAt: new Date().toISOString(),
      sourceSystemId: blueprint.meta.sourceSystemId ?? game.system?.id ?? null,
    },
  };
}

export function cloneBlueprint(blueprint) {
  return structuredClone(blueprint);
}
