import { MODULE_ID, FLAG_SCOPE, BLUEPRINT_FLAG } from "./blueprint.mjs";

const CompendiumCollection = foundry.documents.collections.CompendiumCollection;

export const BLUEPRINT_PACK = "acb-blueprints";
export const CREATURE_PACK = "acb-creatures";

export function registerSettings() {
  game.settings.register(MODULE_ID, "sourcePacks", {
    scope: "world",
    config: true,
    type: Array,
    default: [],
    name: "ACB.settings.sourcePacks.name",
    hint: "ACB.settings.sourcePacks.hint",
  });

  game.settings.register(MODULE_ID, "defaultBlueprintPack", {
    scope: "world",
    config: true,
    type: String,
    default: `world.${BLUEPRINT_PACK}`,
    name: "ACB.settings.defaultBlueprintPack.name",
    hint: "ACB.settings.defaultBlueprintPack.hint",
  });

  game.settings.register(MODULE_ID, "defaultCreaturePack", {
    scope: "world",
    config: true,
    type: String,
    default: `world.${CREATURE_PACK}`,
    name: "ACB.settings.defaultCreaturePack.name",
    hint: "ACB.settings.defaultCreaturePack.hint",
  });

  game.settings.register(MODULE_ID, "showHelpText", {
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    name: "ACB.settings.showHelpText.name",
    hint: "ACB.settings.showHelpText.hint",
  });
}

function getWorldPackKey(name) {
  return `world.${name}`;
}

export async function ensureRequiredCompendiums() {
  if (!game.user?.isGM) return;

  const required = [
    {
      name: "acb-blueprints",
      labelKey: "ACB.packs.blueprintsLabel",
      type: "JournalEntry",
    },
    {
      name: "acb-creatures",
      labelKey: "ACB.packs.creaturesLabel",
      type: "Actor",
    },
  ];

  for (const packDef of required) {
    const key = getWorldPackKey(packDef.name);

    // ✅ Correct existence check
    const existing = game.packs.get(key);
    if (existing) continue;

    try {
      await CC.createCompendium({
        name: packDef.name,
        label: game.i18n.localize(packDef.labelKey),
        type: packDef.type,
        system: "world",
        private: true,
      });

      console.log(`ACB | Created compendium: ${key}`);
    } catch (err) {
      // ✅ If another call already created it (race), ignore that specific error
      const msg = String(err?.message ?? err);
      if (msg.includes("already exists")) {
        console.warn(`ACB | Compendium already exists: ${key}`);
        continue;
      }
      throw err;
    }
  }
}

export async function saveBlueprintToPack(blueprint, documentId = null) {
  const packKey = game.settings.get(MODULE_ID, "defaultBlueprintPack");
  const pack = game.packs.get(packKey);
  if (!pack) throw new Error(game.i18n.localize("ACB.errors.missingBlueprintPack"));

  const name = blueprint.identity.name || game.i18n.localize("ACB.ui.untitled");
  const content = `<p>${game.i18n.localize("ACB.ui.blueprintSummary")}</p>`;
  const data = {
    name,
    content,
    flags: {
      [FLAG_SCOPE]: {
        [BLUEPRINT_FLAG]: blueprint,
      },
    },
  };

  if (documentId) {
    await pack.updateDocument({ _id: documentId, ...data });
    return documentId;
  }
  const created = await pack.createDocument(data);
  return created.id;
}

export async function saveActorToPack(actorData, documentId = null) {
  const packKey = game.settings.get(MODULE_ID, "defaultCreaturePack");
  const pack = game.packs.get(packKey);
  if (!pack) throw new Error(game.i18n.localize("ACB.errors.missingCreaturePack"));
  if (documentId) {
    await pack.updateDocument({ _id: documentId, ...actorData });
    return documentId;
  }
  const created = await pack.createDocument(actorData);
  return created.id;
}

export function getBlueprintFromDocument(doc) {
  return doc?.getFlag(FLAG_SCOPE, BLUEPRINT_FLAG) ?? null;
}

export async function registerArchiveTabLauncher() {
  if (!game.modules.get("archive-tab")?.active) return;

  try {
    const { registerArchiveLauncher } = await import(
      "/modules/archive-tab/scripts/api/register-launcher.mjs"
    );

    registerArchiveLauncher({
      id: MODULE_ID,
      label: game.i18n.localize("ACB.ui.launcherLabel"),
      icon: "fa-solid fa-dragon",
      onClick: () => game.modules.get(MODULE_ID)?.api?.open?.(),
    });
  } catch (error) {
    console.warn(`${MODULE_ID} | Archive Tab integration failed`, error);
  }
}
