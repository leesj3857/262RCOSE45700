import { useMemo } from "react";
import type { DateRange, IssueEvent } from "@/types/analytics";
import { inRange } from "@/lib/dates";
import { baselineOf, resolveRange, type Scope } from "@/lib/scope";
import { ZONE_BY_ID } from "@/lib/zones";
import { ALL_EVENTS } from "@/mockData/events";
import { applyOverlay, overlayStore, scopeStore } from "./userData";

export type ScopeData = {
  scope: Scope;
  range: DateRange;
  baselineRange: DateRange | null;
  all: IssueEvent[];
  scopedAll: IssueEvent[];
  events: IssueEvent[];
  baseline: IssueEvent[] | null;
};

function matches(e: IssueEvent, scope: Scope): boolean {
  if (scope.area !== "all" && ZONE_BY_ID[e.zoneId].area !== scope.area) return false;
  if (scope.vehicle !== "all" && e.vehicleId !== scope.vehicle) return false;
  return true;
}

export function filterByScope(all: IssueEvent[], scope: Scope): IssueEvent[] {
  const range = resolveRange(scope);
  return all.filter((e) => matches(e, scope) && inRange(e.occurredAt, range));
}

export function useAllEvents(): IssueEvent[] {
  const overlay = overlayStore.use();
  return useMemo(() => ALL_EVENTS.map((e) => applyOverlay(e, overlay[e.id])), [overlay]);
}

export function useScopeData(): ScopeData {
  const all = useAllEvents();
  const { scope } = scopeStore.use();
  return useMemo(() => {
    const range = resolveRange(scope);
    const baselineRange = baselineOf(range);
    const scoped = all.filter((e) => matches(e, scope));
    return {
      scope,
      range,
      baselineRange,
      all,
      scopedAll: scoped,
      events: scoped.filter((e) => inRange(e.occurredAt, range)),
      baseline: baselineRange ? scoped.filter((e) => inRange(e.occurredAt, baselineRange)) : null,
    };
  }, [all, scope]);
}
