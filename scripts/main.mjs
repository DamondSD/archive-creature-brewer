import { registerSettings } from "./core/compendiums.mjs";
import { EntryApp } from "./apps/entry.mjs";
import { BrewerApp } from "./apps/brewer-app.mjs";
import { ensureRequiredCompendiums } from "./core/compendiums.mjs";
import { registerArchiveTabLauncher } from "./core/compendiums.mjs";
import { MODULE_ID } from "./core/blueprint.mjs";

Hooks.once("init", async () => {
  registerSettings();
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
  if (game.modules.get("archive-tab")) {
    const { registerArchiveLauncher } = await import(
      "/modules/archive-tab/scripts/api/register-launcher.mjs"
    );

    registerArchiveLauncher({
      id: MODULE_ID,
      label: game.i18n.localize("ACB.ui.launcherLabel"),
      icon: "fa-solid fa-dragon",
      onClick: () => game.modules.get(MODULE_ID)?.api?.open?.(),
    });
  }
});

Hooks.once("ready", async () => {

  // ✅ Create API FIRST
  const api = {
    version: game.modules.get(MODULE_ID)?.version ?? "0.0.0",
    open: () => new EntryApp().render(true),
    openCreate: () => new BrewerApp({ mode: "create" }).render(true),
    openEdit: () => new EntryApp().openEdit(),
  };

  game.modules.get(MODULE_ID).api = api;

  // THEN do setup
  await ensureRequiredCompendiums();

  await registerArchiveTabLauncher();

  if (!game.modules.get("archive-tab")?.active) {
    registerActorsSidebarButton();
  }
});