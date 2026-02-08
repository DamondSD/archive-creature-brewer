import { Dnd5eAdapter } from "./dnd5e.mjs";

const adapters = [new Dnd5eAdapter()];

export function getActiveAdapter() {
  return adapters.find((adapter) => adapter.isActive()) ?? null;
}

export function getAllAdapters() {
  return [...adapters];
}
