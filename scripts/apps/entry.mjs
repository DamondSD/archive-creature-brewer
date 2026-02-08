import { BrewerApp } from "./brewer-app.mjs";
import { MODULE_ID } from "../core/blueprint.mjs";
import { ensureRequiredCompendiums, getBlueprintFromDocument } from "../core/compendiums.mjs";

export class EntryApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "acb-entry",
    tag: "form",
    window: {
      title: "ACB.ui.title",
    },
    classes: ["acb", "acb-entry"],
    position: { width: 420 },
  };

  static PARTS = {
    form: {
      template: "modules/archive-creature-brewer/templates/entry.hbs",
    },
  };

  async _prepareContext() {
    return {
      title: game.i18n.localize("ACB.ui.title"),
      helpStorage: game.i18n.localize("ACB.help.storageCompendiumOnly"),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[data-action=acb-create]")?.addEventListener("click", () => {
      new BrewerApp({ mode: "create" }).render(true);
      this.close();
    });
    this.element.querySelector("[data-action=acb-edit]")?.addEventListener("click", () => {
      this.openEdit();
    });
  }

  async openEdit() {
    await ensureRequiredCompendiums();
    const pack = game.packs.get(game.settings.get(MODULE_ID, "defaultBlueprintPack"));
    if (!pack) {
      ui.notifications.error(game.i18n.localize("ACB.errors.missingBlueprintPack"));
      return;
    }
    await pack.getIndex();
    const options = pack.index.contents.map((entry) => ({ value: entry._id, label: entry.name }));

    const content = document.createElement("div");
    content.classList.add("acb-pick");
    const label = document.createElement("label");
    label.textContent = game.i18n.localize("ACB.ui.selectBlueprint");
    const select = document.createElement("select");
    select.name = "blueprintId";
    for (const option of options) {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    }
    content.append(label, select);

    const dialog = new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize("ACB.ui.editTitle") },
      content,
      buttons: [
        {
          label: game.i18n.localize("ACB.ui.open"),
          action: "open",
          callback: async () => {
            const docId = select.value;
            if (!docId) return;
            const doc = await pack.getDocument(docId);
            const blueprint = getBlueprintFromDocument(doc);
            new BrewerApp({ mode: "edit", blueprint, blueprintId: docId }).render(true);
            this.close();
          },
        },
        {
          label: game.i18n.localize("ACB.ui.cancel"),
          action: "cancel",
        },
      ],
    });
    dialog.render(true);
  }
}
