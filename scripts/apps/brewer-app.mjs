import { createBlueprint, updateBlueprintMeta, cloneBlueprint, MODULE_ID } from "../core/blueprint.mjs";
import { getActiveAdapter } from "../core/adapters/adapter-registry.mjs";
import { saveBlueprintToPack, saveActorToPack } from "../core/compendiums.mjs";
import { searchLibrary, getSelectedSourcePacks } from "../core/library-index.mjs";
import { validateBlueprint } from "../core/validators.mjs";

export class BrewerApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "acb-brewer",
    tag: "form",
    classes: ["acb", "acb-brewer"],
    window: {
      title: "ACB.ui.title",
    },
    position: { width: 1020, height: 780 },
    resizable: true,
  };

  static PARTS = {
    form: {
      template: "modules/archive-creature-brewer/templates/brewer-app.hbs",
    },
  };

  constructor(options = {}) {
    super(options);
    this.mode = options.mode ?? "create";
    this.blueprintId = options.blueprintId ?? null;
    this.exportedActorId = options.exportedActorId ?? null;
    this.adapter = getActiveAdapter();
    this.blueprint = options.blueprint ? cloneBlueprint(options.blueprint) : createBlueprint();
    this.dirty = false;
    this.libraryResults = [];
  }

  async _prepareContext() {
    const showHelp = game.settings.get(MODULE_ID, "showHelpText");
    const selectedPacks = getSelectedSourcePacks();
    const packOptions = game.packs.contents.map((pack) => ({
      key: pack.collection,
      label: pack.title ?? pack.collection,
      documentName: pack.documentName,
      selected: selectedPacks.includes(pack.collection),
    }));
    return {
      isGM: game.user?.isGM,
      showHelp,
      adapterId: this.adapter?.id ?? null,
      supportsExport: this.adapter?.supportsActorExport ?? false,
      exportedActorId: this.exportedActorId,
      blueprint: this.blueprint,
      tagsText: (this.blueprint.identity?.tags ?? []).join(", "),
      attachments: this.blueprint.attachments ?? [],
      actions: this.blueprint.actions ?? [],
      validationMessages: this._getValidationMessages(),
      library: {
        packOptions,
        selectedPacks,
        results: this.libraryResults,
      },
    };
  }

  _getValidationMessages() {
    const base = validateBlueprint(this.blueprint);
    const adapterMessages = this.adapter?.validate?.(this.blueprint) ?? [];
    return [...base, ...adapterMessages];
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._activateTabs();
    this._activateListeners();
  }

  _activateTabs() {
    const tabs = this.element.querySelector(".acb-tabs");
    if (!tabs) return;
    new foundry.applications.ux.Tabs({
      navSelector: ".acb-tabs",
      contentSelector: ".acb-sections",
      initial: "basics",
    });
  }

  _activateListeners() {
    this.element.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (event) => this._onActionClick(event));
    });
    this.element.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("input", (event) => this._onInputChange(event));
      el.addEventListener("change", (event) => this._onInputChange(event));
    });
    this.element.querySelector("[data-action=library-search]")?.addEventListener("click", () => this._runLibrarySearch());
  }

  async _onInputChange(event) {
    const target = event.currentTarget;
    const field = target.dataset.field;
    if (!field) return;
    const value = target.type === "checkbox" ? target.checked : target.value;
    if (field === "identity.tags") {
      const tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length);
      this._setFieldValue(field, tags);
    } else {
      this._setFieldValue(field, value);
    }
    this.dirty = true;
  }

  _setFieldValue(path, value) {
    const parts = path.split(".");
    let obj = this.blueprint;
    while (parts.length > 1) {
      const part = parts.shift();
      obj[part] = obj[part] ?? {};
      obj = obj[part];
    }
    obj[parts[0]] = value;
  }

  async _onActionClick(event) {
    const action = event.currentTarget.dataset.action;
    if (!action) return;

    if (action === "add-action") {
      this.blueprint.actions.push({ name: "", type: "trait", text: "", inlineRolls: [] });
      this.dirty = true;
      this.render();
    }

    if (action === "delete-action") {
      const index = Number(event.currentTarget.dataset.index ?? -1);
      if (index >= 0) {
        this.blueprint.actions.splice(index, 1);
        this.dirty = true;
        this.render();
      }
    }

    if (action === "move-action") {
      const index = Number(event.currentTarget.dataset.index ?? -1);
      const direction = event.currentTarget.dataset.direction;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= this.blueprint.actions.length) return;
      const [item] = this.blueprint.actions.splice(index, 1);
      this.blueprint.actions.splice(targetIndex, 0, item);
      this.dirty = true;
      this.render();
    }

    if (action === "save-blueprint") {
      await this._saveBlueprint();
    }

    if (action === "export-actor") {
      await this._exportActor();
    }

    if (action === "open-export") {
      const packKey = game.settings.get(MODULE_ID, "defaultCreaturePack");
      const pack = game.packs.get(packKey);
      if (!pack || !this.exportedActorId) return;
      const doc = await pack.getDocument(this.exportedActorId);
      doc?.sheet?.render(true);
    }

    if (action === "add-library") {
      const index = Number(event.currentTarget.dataset.index ?? -1);
      const item = this.libraryResults[index];
      if (!item) return;
      const doc = await fromUuid(item.uuid);
      if (!doc) return;
      if (this.adapter?.importLibraryDocumentToBlueprint) {
        this.blueprint = await this.adapter.importLibraryDocumentToBlueprint(doc, this.blueprint);
      } else {
        const attachments = this.blueprint.attachments ?? [];
        attachments.push({ uuid: doc.uuid, name: doc.name, pack: doc.pack, type: doc.documentName });
        this.blueprint.attachments = attachments;
      }
      this.dirty = true;
      this.render();
    }
  }

  async _runLibrarySearch() {
    const searchInput = this.element.querySelector("[data-library-search]");
    const query = searchInput?.value ?? "";
    const packKeys = this._getSelectedPackKeys();
    this.libraryResults = await searchLibrary({ searchText: query, packKeys });
    this.render();
  }

  _getSelectedPackKeys() {
    const options = this.element.querySelectorAll("[data-source-pack]");
    const selected = Array.from(options)
      .filter((option) => option.checked)
      .map((option) => option.value);
    game.settings.set(MODULE_ID, "sourcePacks", selected);
    return selected;
  }

  async _saveBlueprint() {
    if (!game.user?.isGM) {
      ui.notifications.error(game.i18n.localize("ACB.errors.gmOnly"));
      return;
    }
    this.blueprint = updateBlueprintMeta(this.blueprint);
    this.blueprintId = await saveBlueprintToPack(this.blueprint, this.blueprintId);
    ui.notifications.info(game.i18n.localize("ACB.notifications.blueprintSaved"));
    this.dirty = false;
    this.render();
  }

  async _exportActor() {
    if (!this.adapter?.supportsActorExport) return;
    if (!game.user?.isGM) {
      ui.notifications.error(game.i18n.localize("ACB.errors.gmOnly"));
      return;
    }
    const actorData = this.adapter.blueprintToActorData(this.blueprint);
    const attachmentItems = await this._collectAttachmentItems();
    if (attachmentItems.length) {
      actorData.items = attachmentItems;
    }
    this.exportedActorId = await saveActorToPack(actorData, this.exportedActorId);
    ui.notifications.info(game.i18n.localize("ACB.notifications.actorSaved"));
    this.dirty = false;
    this.render();
  }

  async _collectAttachmentItems() {
    const attachments = this.blueprint.attachments ?? [];
    const items = [];
    for (const attachment of attachments) {
      const doc = await fromUuid(attachment.uuid);
      if (!doc || doc.documentName !== "Item") continue;
      items.push(doc.toObject());
    }
    return items;
  }

  async close(options = {}) {
    if (this.dirty) {
      const result = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("ACB.ui.unsavedTitle") },
        content: game.i18n.localize("ACB.ui.unsavedText"),
      });
      if (!result) return;
    }
    return super.close(options);
  }
}
