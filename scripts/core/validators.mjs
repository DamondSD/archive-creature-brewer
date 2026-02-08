export function validateBlueprint(blueprint) {
  const messages = [];
  if (!blueprint.identity?.name) {
    messages.push({
      level: "warn",
      key: "ACB.validation.missingName",
      sectionId: "basics",
    });
  }

  const hasActions = (blueprint.actions ?? []).length > 0;
  if (!hasActions) {
    messages.push({
      level: "warn",
      key: "ACB.validation.noActions",
      sectionId: "actions",
    });
  }

  if ((blueprint.notes?.publicDescription ?? "").length < 20) {
    messages.push({
      level: "info",
      key: "ACB.validation.shortDescription",
      sectionId: "notes",
    });
  }

  const rating = blueprint.stats?.challenge?.ratingText ?? "";
  const ac = blueprint.stats?.defenses?.acText ?? "";
  const hp = blueprint.stats?.defenses?.hpText ?? "";
  if (rating && (!ac || !hp)) {
    messages.push({
      level: "info",
      key: "ACB.validation.ratingWithoutDefense",
      sectionId: "stats",
    });
  }

  return messages;
}
