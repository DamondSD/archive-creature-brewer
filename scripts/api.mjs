import { EntryApp } from "./apps/entry.mjs";
import { BrewerApp } from "./apps/brewer-app.mjs";

export const api = {
  open: () => new EntryApp().render(true),
  openCreate: () => new BrewerApp({ mode: "create" }).render(true),
  openEdit: () => new EntryApp().openEdit(),
};
