import type { Zone } from "@/types/analytics";
import { ZONES } from "@/mockData/taxonomy";

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<string, Zone>;
