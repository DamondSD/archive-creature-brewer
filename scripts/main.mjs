import { registerSettings } from "./core/compendiums.mjs";
import { EntryApp } from "./apps/entry.mjs";
import { BrewerApp } from "./apps/brewer-app.mjs";
import { ensureRequiredCompendiums } from "./core/compendiums.mjs";
import { registerArchiveTabLauncher } from "./core/compendiums.mjs";
import { MODULE_ID } from "./core/blueprint.mjs";

Hooks.once("init", () => {
  registerSettings();
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
});

Hooks.once("ready", async () => {
  await ensureRequiredCompendiums();
  registerArchiveTabLauncher();
  registerActorsSidebarButton();
});

function registerActorsSidebarButton() {
  Hooks.on("renderActorDirectory", (app, html) => {
    if (!game.user?.isGM) return;
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("acb-launcher");
    button.innerHTML = `<i class="fas fa-dragon"></i>${game.i18n.localize("ACB.ui.launcherLabel")}`;
    button.addEventListener("click", () => game.modules.get(MODULE_ID).api.open());
    const footer = html[0]?.querySelector(".directory-footer");
    footer?.appendChild(button);
  });
}

Hooks.once("ready", () => {
  const api = {
    version: game.modules.get(MODULE_ID)?.version ?? "0.0.0",
    open: () => new EntryApp().render(true),
    openCreate: () => new BrewerApp({ mode: "create" }).render(true),
    openEdit: () => new EntryApp().openEdit(),
  };
  game.modules.get(MODULE_ID).api = api;
});
