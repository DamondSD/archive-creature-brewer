import { FLAG_SCOPE, BLUEPRINT_FLAG } from "../blueprint.mjs";

export class Dnd5eAdapter {
  id = "dnd5e";
  supportsActorExport = true;

  isActive() {
    return game.system?.id === this.id;
  }

  blueprintToActorData(blueprint) {
    const name = blueprint.identity?.name || game.i18n.localize("ACB.ui.untitled");
    const img = blueprint.identity?.img || "icons/svg/mystery-man.svg";
    const description = [
      `<h2>${game.i18n.localize("ACB.ui.publicDescription")}</h2>`,
      `<p>${blueprint.notes?.publicDescription ?? ""}</p>`,
      `<h2>${game.i18n.localize("ACB.ui.actions")}</h2>`,
      ...((blueprint.actions ?? []).map((action) => `<p><strong>${action.name}</strong> ${action.text}</p>`)),
    ].join("\n");

    return {
      name,
      type: "npc",
      img,
      system: {
        details: {
          biography: {
            value: description,
          },
        },
      },
      flags: {
        [FLAG_SCOPE]: {
          [BLUEPRINT_FLAG]: blueprint,
        },
      },
    };
  }

  actorToBlueprint(actor) {
    return actor?.getFlag(FLAG_SCOPE, BLUEPRINT_FLAG) ?? null;
  }

  getLibraryPackSuggestions() {
    return [
      {
        labelKey: "ACB.library.suggestedItems",
        packType: "Item",
        documentName: "Item",
      },
    ];
  }

  async importLibraryDocumentToBlueprint(doc, blueprint) {
    const attachments = blueprint.attachments ?? [];
    const uuid = doc.uuid;
    if (!attachments.some((entry) => entry.uuid === uuid)) {
      attachments.push({
        uuid,
        name: doc.name,
        pack: doc.pack,
        type: doc.documentName,
      });
    }
    return {
      ...blueprint,
      attachments,
    };
  }

  validate(blueprint) {
    const results = [];
    if (!blueprint.identity?.name) {
      results.push({ level: "warn", key: "ACB.validation.missingName", sectionId: "basics" });
    }
    if ((blueprint.actions ?? []).length === 0) {
      results.push({ level: "warn", key: "ACB.validation.noActions", sectionId: "actions" });
    }
    if ((blueprint.notes?.publicDescription ?? "").length < 20) {
      results.push({ level: "info", key: "ACB.validation.shortDescription", sectionId: "notes" });
    }
    const rating = blueprint.stats?.challenge?.ratingText ?? "";
    const ac = blueprint.stats?.defenses?.acText ?? "";
    const hp = blueprint.stats?.defenses?.hpText ?? "";
    if (rating && (!ac || !hp)) {
      results.push({ level: "info", key: "ACB.validation.ratingWithoutDefense", sectionId: "stats" });
    }
    return results;
  }
}
