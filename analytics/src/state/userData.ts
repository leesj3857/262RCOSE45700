import type { CauseId, EventTypeId, FieldKey, IssueEvent, Overlay, Status, Weather } from "@/types/analytics";
import { CAUSES, EVENT_TYPES } from "@/mockData/taxonomy";
import { DEFAULT_SCOPE, type Scope } from "@/lib/scope";
import { createStore } from "./store";

export const overlayStore = createStore<Record<string, Overlay>>("kmi.overlay.v1", {});

export const scopeStore = createStore<{ scope: Scope }>(null, { scope: DEFAULT_SCOPE });

export type Prefs = {
  dismissedRecs: string[];
  recentSearches: string[];
  savedSearches: string[];
};

export const prefsStore = createStore<Prefs>("kmi.prefs.v1", {
  dismissedRecs: [],
  recentSearches: [],
  savedSearches: [],
});

export function resetUserData() {
  overlayStore.reset();
  prefsStore.reset();
  scopeStore.reset();
}

export function patchOverlay(id: string, patch: Overlay) {
  overlayStore.set((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
}

export function patchOverlayMany(ids: string[], patch: Overlay) {
  overlayStore.set((s) => {
    const next = { ...s };
    ids.forEach((id) => {
      next[id] = { ...next[id], ...patch };
    });
    return next;
  });
}

export function snapshotOverlay(ids: string[]): Record<string, Overlay | undefined> {
  const s = overlayStore.get();
  return Object.fromEntries(ids.map((id) => [id, s[id]]));
}

export function restoreOverlay(snap: Record<string, Overlay | undefined>) {
  overlayStore.set((s) => {
    const next = { ...s };
    Object.entries(snap).forEach(([id, o]) => {
      if (o) next[id] = o;
      else delete next[id];
    });
    return next;
  });
}

export function setScope(patch: Partial<Scope>) {
  scopeStore.set((s) => ({ scope: { ...s.scope, ...patch } }));
}

export function resetScope() {
  scopeStore.set((s) => ({ scope: { ...DEFAULT_SCOPE, vehicle: s.scope.vehicle } }));
}

export function setStatus(ids: string[], status: Status) {
  patchOverlayMany(ids, { status });
}

export function dismissRec(id: string) {
  prefsStore.set((p) => (p.dismissedRecs.includes(id) ? p : { ...p, dismissedRecs: [...p.dismissedRecs, id] }));
}

export function restoreRec(id: string) {
  prefsStore.set((p) => ({ ...p, dismissedRecs: p.dismissedRecs.filter((r) => r !== id) }));
}

export function rememberSearch(q: string) {
  const text = q.trim();
  if (!text) return;
  prefsStore.set((p) => ({ ...p, recentSearches: [text, ...p.recentSearches.filter((r) => r !== text)].slice(0, 6) }));
}

export function forgetSearch(q: string) {
  prefsStore.set((p) => ({ ...p, recentSearches: p.recentSearches.filter((r) => r !== q) }));
}

export function toggleSavedSearch(q: string) {
  const text = q.trim();
  if (!text) return;
  prefsStore.set((p) => ({
    ...p,
    savedSearches: p.savedSearches.includes(text) ? p.savedSearches.filter((s) => s !== text) : [text, ...p.savedSearches].slice(0, 8),
  }));
}

const TYPE_BY_LABEL = Object.fromEntries(EVENT_TYPES.map((t) => [t.label, t.id])) as Record<string, EventTypeId>;
const CAUSE_BY_LABEL = Object.fromEntries(CAUSES.map((c) => [c.label, c.id])) as Record<string, CauseId>;
const WEATHERS: Weather[] = ["맑음", "흐림", "비"];

export function applyOverlay(event: IssueEvent, o: Overlay | undefined): IssueEvent {
  if (!o) return event;
  const edits = o.edits ?? {};
  const fields = event.fields.map((f) =>
    f.key in edits ? { ...f, value: edits[f.key as FieldKey] ?? "", edited: true } : f,
  );
  const typeEdit = edits.event ? TYPE_BY_LABEL[edits.event] : undefined;
  const causeEdit = edits.cause ? CAUSE_BY_LABEL[edits.cause] : undefined;
  const weatherEdit = edits.weather !== undefined ? (WEATHERS.find((w) => w === edits.weather) ?? "") : undefined;
  return {
    ...event,
    fields,
    type: typeEdit ?? event.type,
    cause: causeEdit ?? event.cause,
    weather: weatherEdit ?? event.weather,
    status: o.status ?? event.status,
    starred: o.starred ?? event.starred,
    note: o.note ?? event.note,
  };
}
