import type {
  CauseId,
  DateRange,
  EventField,
  EventTypeId,
  FieldKey,
  IssueEvent,
  Severity,
  Status,
  Weather,
  Zone,
} from "@/types/analytics";
import { addDays } from "@/lib/dates";
import {
  CAUSES,
  CAUSE_VARIANTS,
  EVENT_TYPES,
  HOUR_MAX,
  HOUR_MIN,
  OPERATORS,
  VEHICLES,
  WEATHER_SAY,
  ZONES,
} from "./taxonomy";

export const DATA_START = "2026-09-07";
export const DATA_END = "2026-11-01";

export const WEEKS: DateRange[] = Array.from({ length: 8 }, (_, i) => ({
  start: addDays(DATA_START, i * 7),
  end: addDays(DATA_START, i * 7 + 6),
}));

export const THIS_WEEK = WEEKS[7];
export const PREV_WEEK = WEEKS[6];

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function weightedIndex(rng: Rng, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function expand<T extends string>(counts: Record<T, number>): T[] {
  return (Object.keys(counts) as T[]).flatMap((k) => Array<T>(counts[k]).fill(k));
}

function removeOne<T>(pool: T[], value: T) {
  const i = pool.indexOf(value);
  if (i >= 0) pool.splice(i, 1);
}

function distribute<K extends string>(total: number, shares: Record<K, number>, rng: Rng): Record<K, number> {
  const keys = Object.keys(shares) as K[];
  const raw = keys.map((k) => shares[k] * (0.85 + rng() * 0.3));
  const sum = raw.reduce((a, b) => a + b, 0);
  const exact = raw.map((r) => (r / sum) * total);
  const base = exact.map(Math.floor);
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) base[order[k].i] += 1;
  return Object.fromEntries(keys.map((k, i) => [k, base[i]])) as Record<K, number>;
}

const pad = (n: number) => String(n).padStart(2, "0");

type Curated = {
  day: number;
  time: string;
  zoneId: string;
  type: EventTypeId;
  cause: CauseId;
  variant?: number;
  weather?: Weather;
  mention?: boolean;
  vehicleIdx?: number;
  custom?: {
    transcript: string;
    situation: string;
    locationValue: string;
    evidence: Partial<Record<FieldKey, string | null>>;
  };
};

const DAY_WEIGHTS = [1.1, 1.1, 1.1, 1.1, 1.2, 0.7, 0.5];
const HOUR_WEIGHTS = [1.3, 1.6, 1.0, 0.8, 0.9, 1.0, 0.9, 0.9, 1.1, 1.5, 1.8, 1.5, 1.0, 0.7];

const TYPE_LABEL = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t.label])) as Record<EventTypeId, string>;
const TYPE_REACTION = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t.reaction])) as Record<EventTypeId, string>;
const CAUSE_LABEL = Object.fromEntries(CAUSES.map((c) => [c.id, c.label])) as Record<CauseId, string>;

const TYPE_SHARES: Record<EventTypeId, number> = { hardBrake: 0.43, hardAccel: 0.245, hardSteer: 0.135, contact: 0.03, collision: 0.015, other: 0.145 };
const CAUSE_SHARES: Record<CauseId, number> = { twoWheeler: 0.25, pedestrian: 0.2, vehicle: 0.17, signal: 0.15, obstacle: 0.1, weather: 0.08, unknown: 0.05 };

const ZONE_BOOST: Record<string, number[]> = {
  "gn-2": [0.4, 0.5, 0.65, 0.8, 1, 1.15, 1.3, 1.5],
  "sb-1": [0.8, 0.85, 0.9, 0.95, 1, 1, 1.05, 1.1],
  "gn-4": [1.3, 1.25, 1.2, 1.1, 1.05, 1, 0.9, 0.85],
  "sb-3": [0.7, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3],
};

function peakFor(type: EventTypeId, rng: Rng): number {
  const r = rng();
  switch (type) {
    case "hardBrake":
      return -Math.round((0.4 + r * 0.35) * 100) / 100;
    case "hardAccel":
      return Math.round((0.3 + r * 0.25) * 100) / 100;
    case "hardSteer":
      return Math.round((0.35 + r * 0.25) * 100) / 100;
    case "contact":
      return -Math.round((0.25 + r * 0.2) * 100) / 100;
    case "collision":
      return -Math.round((0.85 + r * 0.2) * 100) / 100;
    default:
      return Math.round((0.1 + r * 0.15) * 100) / 100;
  }
}

function severityFor(type: EventTypeId, cause: CauseId, peak: number): Severity {
  if (type === "collision" || type === "contact") return "high";
  if (Math.abs(peak) >= 0.55 || cause === "pedestrian") return "mid";
  return "low";
}

function statusFor(weekIdx: number, severity: Severity, rng: Rng): Status {
  const r = rng();
  if (weekIdx === 7) {
    if (severity === "high") return r < 0.5 ? "flagged" : "new";
    return r < 0.58 ? "new" : r < 0.94 ? "reviewed" : "flagged";
  }
  if (weekIdx === 6) return r < 0.12 ? "new" : r < 0.93 ? "reviewed" : "flagged";
  return r < 0.02 ? "new" : r < 0.94 ? "reviewed" : "flagged";
}

const conf = (rng: Rng, lowChance = 0.06) =>
  Math.round((rng() < lowChance ? 0.64 + rng() * 0.2 : 0.88 + rng() * 0.11) * 100) / 100;

function buildEvent(
  id: string,
  weekIdx: number,
  day: string,
  dayIdx: number,
  draft: Curated,
  zone: Zone,
  rng: Rng,
  fallbackWeather: Weather,
  fallbackMention: boolean,
): IssueEvent {
  const variants = CAUSE_VARIANTS[draft.cause];
  const variant = variants[draft.variant ?? Math.floor(rng() * variants.length)] ?? variants[0];
  const weather: Weather = draft.cause === "weather" ? "비" : draft.weather ?? fallbackWeather;
  const mention = draft.cause === "weather" ? true : draft.mention ?? (weather === "비" ? rng() < 0.9 : fallbackMention);
  const reaction = TYPE_REACTION[draft.type];
  const typeLabel = TYPE_LABEL[draft.type];
  const weatherSay = draft.cause !== "weather" && mention && weather ? WEATHER_SAY[weather] : "";

  const transcript = draft.custom?.transcript ?? `${[zone.spoken, weatherSay, variant.say, reaction].filter(Boolean).join(" ")}.`;

  const ev = draft.custom?.evidence ?? {};
  const pick = (key: FieldKey, fallback: string | null) => (key in ev ? (ev[key] ?? null) : fallback);

  const hasCause = draft.cause !== "unknown";
  const rainy = weather === "비";
  const lowChance = rainy ? 0.15 : 0.06;

  const field = (key: FieldKey, label: string, value: string, evidence: string | null): EventField => ({
    key,
    label,
    value,
    evidence,
    confidence: value && evidence ? conf(rng, lowChance) : null,
  });

  const fields: EventField[] = [
    field("location", "위치", draft.custom?.locationValue ?? zone.address, pick("location", zone.spoken)),
    field("event", "사건", typeLabel, pick("event", reaction)),
    field("cause", "원인", hasCause ? CAUSE_LABEL[draft.cause] : "", pick("cause", hasCause ? variant.say : null)),
    field("situation", "상황", draft.custom?.situation ?? (hasCause ? `${zone.spot} ${variant.noun}` : ""), pick("situation", hasCause ? variant.say : null)),
    field(
      "weather",
      "날씨",
      mention && weather ? weather : "",
      pick("weather", mention && weather ? (draft.cause === "weather" ? variant.say : weatherSay) : null),
    ),
  ];

  const peak = peakFor(draft.type, rng);
  const severity = severityFor(draft.type, draft.cause, peak);
  const vehicleIdx = draft.vehicleIdx ?? weightedIndex(rng, VEHICLES.map((v) => v.weight));

  return {
    id,
    occurredAt: `${day}T${draft.time}:00+09:00`,
    zoneId: zone.id,
    type: draft.type,
    cause: draft.cause,
    severity,
    status: statusFor(weekIdx, severity, rng),
    weather,
    title: `${zone.spot}에서 ${variant.title} 인한 ${typeLabel}`,
    transcript,
    fields,
    audioSec: 6 + Math.floor(rng() * 13),
    peakG: peak,
    speechDelaySec: 6 + Math.floor(rng() * 22),
    vehicleId: VEHICLES[vehicleIdx].id,
    operatorId: OPERATORS[(vehicleIdx + dayIdx) % OPERATORS.length].id,
    sttConfidence: Math.round((0.97 - (rainy ? 0.05 : 0) - rng() * 0.1) * 100) / 100,
    processing: {
      stt: 900 + Math.floor(rng() * 1300),
      structure: 600 + Math.floor(rng() * 900),
      verify: 80 + Math.floor(rng() * 160),
    },
    starred: false,
    note: "",
  };
}

function buildWeek(
  weekIdx: number,
  total: number,
  counts: { types?: Record<EventTypeId, number>; causes?: Record<CauseId, number> },
  curated: Curated[],
  seed: number,
): IssueEvent[] {
  const week = WEEKS[weekIdx];
  const rng = mulberry32(seed);
  const typeCounts = counts.types ?? distribute(total, TYPE_SHARES, rng);
  const causeCounts = counts.causes ?? distribute(total, CAUSE_SHARES, rng);
  const typePool = shuffle(rng, expand(typeCounts));
  const causePool = shuffle(rng, expand(causeCounts));
  curated.forEach((c) => {
    removeOne(typePool, c.type);
    removeOne(causePool, c.cause);
  });

  const drafts: Curated[] = [...curated];
  const zoneWeights = ZONES.map((z) => z.weight * (ZONE_BOOST[z.id]?.[weekIdx] ?? 1));

  while (typePool.length > 0) {
    const zone = ZONES[weightedIndex(rng, zoneWeights)];
    const type = typePool.pop() as EventTypeId;
    const preferred = rng() < 0.6 ? causePool.indexOf(zone.biasCause) : -1;
    const cause = causePool.splice(preferred >= 0 ? preferred : causePool.length - 1, 1)[0];
    const hour = HOUR_MIN + weightedIndex(rng, HOUR_WEIGHTS.slice(0, HOUR_MAX - HOUR_MIN + 1));
    drafts.push({
      day: weightedIndex(rng, DAY_WEIGHTS),
      time: `${pad(hour)}:${pad(Math.floor(rng() * 60))}`,
      zoneId: zone.id,
      type,
      cause,
    });
  }

  drafts.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

  return drafts.map((d, i) => {
    const zone = ZONES.find((z) => z.id === d.zoneId) as Zone;
    const wr = rng();
    const fallbackWeather: Weather = wr < 0.12 ? "비" : wr < 0.32 ? "흐림" : "맑음";
    return buildEvent(`w${37 + weekIdx}-${pad(i + 1)}`, weekIdx, addDays(week.start, d.day), d.day, d, zone, rng, fallbackWeather, rng() < 0.8);
  });
}

const thisWeekCurated: Curated[] = [
  {
    day: 4,
    time: "14:20",
    zoneId: "sb-5",
    type: "hardBrake",
    cause: "pedestrian",
    weather: "",
    mention: false,
    custom: {
      transcript: "삼거리에서 좌회전하는데 누가 무단 횡단을 하려고 해서 급하게 멈췄어. 다행히 부딪히진 않았어.",
      situation: "좌회전 중 보행자 횡단",
      locationValue: "서울특별시 성북구 삼거리",
      evidence: {
        location: "삼거리에서",
        event: "급하게 멈췄어",
        cause: "누가 무단 횡단을 하려고 해서",
        situation: "좌회전하는데 누가 무단 횡단",
        weather: null,
      },
    },
  },
  { day: 3, time: "19:05", zoneId: "sb-1", type: "hardBrake", cause: "twoWheeler", variant: 0, weather: "맑음", mention: true },
  { day: 2, time: "18:32", zoneId: "gn-2", type: "hardBrake", cause: "twoWheeler", variant: 2, weather: "비", mention: true },
  { day: 1, time: "10:14", zoneId: "sb-2", type: "contact", cause: "twoWheeler", variant: 0, weather: "흐림", mention: false },
  { day: 5, time: "11:40", zoneId: "gn-1", type: "collision", cause: "vehicle", variant: 0, weather: "맑음", mention: true },
  { day: 0, time: "09:12", zoneId: "gn-2", type: "hardBrake", cause: "twoWheeler", variant: 1, weather: "비", mention: true },
];

const WEEK_TOTALS = [102, 98, 105, 96, 94, 97, 91, 81];

export const EVENTS_BY_WEEK: IssueEvent[][] = WEEK_TOTALS.map((total, i) => {
  if (i === 7) {
    return buildWeek(
      7,
      total,
      {
        types: { hardBrake: 35, hardAccel: 20, hardSteer: 11, contact: 2, collision: 1, other: 12 },
        causes: { twoWheeler: 20, pedestrian: 16, vehicle: 15, signal: 12, obstacle: 8, weather: 6, unknown: 4 },
      },
      thisWeekCurated,
      4417,
    );
  }
  if (i === 6) {
    return buildWeek(
      6,
      total,
      {
        types: { hardBrake: 39, hardAccel: 22, hardSteer: 13, contact: 3, collision: 2, other: 12 },
        causes: { twoWheeler: 22, pedestrian: 17, vehicle: 14, signal: 14, obstacle: 9, weather: 8, unknown: 7 },
      },
      [],
      3091,
    );
  }
  return buildWeek(i, total, {}, [], 1700 + i * 211);
});

export const EVENTS_THIS_WEEK = EVENTS_BY_WEEK[7];
export const EVENTS_PREV_WEEK = EVENTS_BY_WEEK[6];
export const ALL_EVENTS: IssueEvent[] = EVENTS_BY_WEEK.flat();
