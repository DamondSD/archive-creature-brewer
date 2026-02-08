import { MODULE_ID, FLAG_SCOPE, BLUEPRINT_FLAG } from "./blueprint.mjs";

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
    default: `${MODULE_ID}.${BLUEPRINT_PACK}`,
    name: "ACB.settings.defaultBlueprintPack.name",
    hint: "ACB.settings.defaultBlueprintPack.hint",
  });

  game.settings.register(MODULE_ID, "defaultCreaturePack", {
    scope: "world",
    config: true,
    type: String,
    default: `${MODULE_ID}.${CREATURE_PACK}`,
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

export async function ensureRequiredCompendiums() {
  const missing = [];
  if (!game.packs.get(`${MODULE_ID}.${BLUEPRINT_PACK}`)) missing.push("blueprints");
  if (!game.packs.get(`${MODULE_ID}.${CREATURE_PACK}`)) missing.push("creatures");

  if (!missing.length) return;
  if (!game.user?.isGM) {
    ui.notifications.error(game.i18n.localize("ACB.errors.missingCompendiums"));
    return;
  }

  const CompendiumClass = foundry.documents.collections.CompendiumCollection;
  if (missing.includes("blueprints") && !game.packs.get(`${MODULE_ID}.${BLUEPRINT_PACK}`)) {
    try {
      await CompendiumClass.createCompendium({
        label: game.i18n.localize("ACB.packs.blueprints"),
        name: BLUEPRINT_PACK,
        type: "JournalEntry",
        package: MODULE_ID,
      });
    } catch (error) {
      if (!game.packs.get(`${MODULE_ID}.${BLUEPRINT_PACK}`)) {
        console.warn(`${MODULE_ID} | ${error}`);
      }
    }
  }
  if (missing.includes("creatures") && !game.packs.get(`${MODULE_ID}.${CREATURE_PACK}`)) {
    try {
      await CompendiumClass.createCompendium({
        label: game.i18n.localize("ACB.packs.creatures"),
        name: CREATURE_PACK,
        type: "Actor",
        package: MODULE_ID,
      });
    } catch (error) {
      if (!game.packs.get(`${MODULE_ID}.${CREATURE_PACK}`)) {
        console.warn(`${MODULE_ID} | ${error}`);
      }
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

export function registerArchiveTabLauncher() {
  if (!game.modules.get("archive-tab")?.active) return;
  const launcherConfig = {
    id: MODULE_ID,
    label: game.i18n.localize("ACB.ui.launcherLabel"),
    icon: "fa-solid fa-dragon",
    onClick: () => game.modules.get(MODULE_ID).api.open(),
  };

  let registered = false;
  const registerWithApi = (api) => {
    if (!api) return false;
    if (registered) return true;
    const register =
      api.registerArchiveLauncher ??
      api.registerLauncher ??
      api.registerArchiveTabLauncher ??
      api.registerButton;
    if (typeof register !== "function") return false;
    register(launcherConfig);
    registered = true;
    return true;
  };

  const attemptRegister = async () => {
    if (registerWithApi(game.modules.get("archive-tab")?.api)) return;
    try {
      const module = await import("/modules/archive-tab/scripts/api.mjs");
      if (registerWithApi(module)) return;
      if (registerWithApi(module?.default)) return;
      registerWithApi(game.modules.get("archive-tab")?.api);
    } catch (error) {
      console.warn(`${MODULE_ID} | ${error}`);
    }
  };

  Hooks.once("archive-tab.ready", attemptRegister);
  Hooks.once("archive-tab:ready", attemptRegister);
  Hooks.once("archive-tab-ready", attemptRegister);
  attemptRegister();
}
