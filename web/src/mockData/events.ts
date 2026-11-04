import type {
  CauseId,
  EventField,
  EventTypeId,
  FieldKey,
  IssueEvent,
  Severity,
  Weather,
  WeekRange,
  Zone,
} from "@/types/analytics";
import { CAUSES, CAUSE_VARIANTS, EVENT_TYPES, WEATHER_SAY, ZONES } from "./taxonomy";

export const THIS_WEEK: WeekRange = { start: "2026-10-26", end: "2026-11-01" };
export const PREV_WEEK: WeekRange = { start: "2026-10-19", end: "2026-10-25" };

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

function addDays(startIso: string, n: number): string {
  const [y, m, d] = startIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
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
  custom?: {
    transcript: string;
    situation: string;
    locationValue: string;
    evidence: Partial<Record<FieldKey, string | null>>;
  };
};

type Draft = Curated;

const DAY_WEIGHTS = [1.1, 1.1, 1.1, 1.1, 1.2, 0.7, 0.5];

const TYPE_LABEL = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t.label])) as Record<EventTypeId, string>;
const TYPE_REACTION = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t.reaction])) as Record<EventTypeId, string>;
const CAUSE_LABEL = Object.fromEntries(CAUSES.map((c) => [c.id, c.label])) as Record<CauseId, string>;

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

function buildEvent(id: string, date: string, draft: Draft, zone: Zone, rng: Rng, fallbackWeather: Weather, fallbackMention: boolean): IssueEvent {
  const variants = CAUSE_VARIANTS[draft.cause];
  const variant = variants[draft.variant ?? Math.floor(rng() * variants.length)] ?? variants[0];
  const weather: Weather = draft.cause === "weather" ? "비" : draft.weather ?? fallbackWeather;
  const mention = draft.cause === "weather" ? true : draft.mention ?? (weather === "비" ? rng() < 0.9 : fallbackMention);
  const reaction = TYPE_REACTION[draft.type];
  const typeLabel = TYPE_LABEL[draft.type];
  const weatherSay = draft.cause !== "weather" && mention && weather ? WEATHER_SAY[weather] : "";

  const transcript =
    draft.custom?.transcript ??
    `${[zone.spoken, weatherSay, variant.say, reaction].filter(Boolean).join(" ")}.`;

  const ev = draft.custom?.evidence ?? {};
  const pick = (key: FieldKey, fallback: string | null) => (key in ev ? (ev[key] ?? null) : fallback);

  const hasCause = draft.cause !== "unknown";
  const fields: EventField[] = [
    { key: "location", label: "위치", value: draft.custom?.locationValue ?? zone.address, evidence: pick("location", zone.spoken) },
    { key: "event", label: "사건", value: typeLabel, evidence: pick("event", reaction) },
    { key: "cause", label: "원인", value: hasCause ? CAUSE_LABEL[draft.cause] : "", evidence: pick("cause", hasCause ? variant.say : null) },
    { key: "situation", label: "상황", value: draft.custom?.situation ?? (hasCause ? `${zone.spot} ${variant.noun}` : ""), evidence: pick("situation", hasCause ? variant.say : null) },
    {
      key: "weather",
      label: "날씨",
      value: mention && weather ? weather : "",
      evidence: pick("weather", mention && weather ? (draft.cause === "weather" ? variant.say : weatherSay) : null),
    },
  ];

  const peak = peakFor(draft.type, rng);

  return {
    id,
    occurredAt: `${date}T${draft.time}:00+09:00`,
    zoneId: zone.id,
    type: draft.type,
    cause: draft.cause,
    severity: severityFor(draft.type, draft.cause, peak),
    weather,
    title: `${zone.spot}에서 ${variant.title} 인한 ${typeLabel}`,
    transcript,
    fields,
    audioSec: 6 + Math.floor(rng() * 13),
    peakG: peak,
    speechDelaySec: 6 + Math.floor(rng() * 22),
  };
}

function buildWeek(
  tag: string,
  week: WeekRange,
  typeCounts: Record<EventTypeId, number>,
  causeCounts: Record<CauseId, number>,
  curated: Curated[],
  seed: number,
): IssueEvent[] {
  const rng = mulberry32(seed);
  const typePool = shuffle(rng, expand(typeCounts));
  const causePool = shuffle(rng, expand(causeCounts));
  curated.forEach((c) => {
    removeOne(typePool, c.type);
    removeOne(causePool, c.cause);
  });

  const drafts: Draft[] = [...curated];
  const zoneWeights = ZONES.map((z) => z.weight);

  while (typePool.length > 0) {
    const zone = ZONES[weightedIndex(rng, zoneWeights)];
    const type = typePool.pop() as EventTypeId;
    const preferred = rng() < 0.6 ? causePool.indexOf(zone.biasCause) : -1;
    const cause = causePool.splice(preferred >= 0 ? preferred : causePool.length - 1, 1)[0];
    drafts.push({
      day: weightedIndex(rng, DAY_WEIGHTS),
      time: `${pad(8 + Math.floor(rng() * 14))}:${pad(Math.floor(rng() * 60))}`,
      zoneId: zone.id,
      type,
      cause,
    });
  }

  drafts.sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time));

  return drafts.map((d, i) => {
    const zone = ZONES.find((z) => z.id === d.zoneId) as Zone;
    const wr = rng();
    const fallbackWeather: Weather = wr < 0.12 ? "비" : wr < 0.32 ? "흐림" : "맑음";
    return buildEvent(`${tag}-${pad(i + 1)}`, addDays(week.start, d.day), d, zone, rng, fallbackWeather, rng() < 0.55);
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

export const EVENTS_THIS_WEEK: IssueEvent[] = buildWeek(
  "w44",
  THIS_WEEK,
  { hardBrake: 35, hardAccel: 20, hardSteer: 11, contact: 2, collision: 1, other: 12 },
  { twoWheeler: 20, pedestrian: 16, vehicle: 15, signal: 12, obstacle: 8, weather: 6, unknown: 4 },
  thisWeekCurated,
  4417,
);

export const EVENTS_PREV_WEEK: IssueEvent[] = buildWeek(
  "w43",
  PREV_WEEK,
  { hardBrake: 39, hardAccel: 22, hardSteer: 13, contact: 3, collision: 2, other: 12 },
  { twoWheeler: 22, pedestrian: 17, vehicle: 14, signal: 14, obstacle: 9, weather: 8, unknown: 7 },
  [],
  3091,
);

export const ALL_EVENTS: IssueEvent[] = [...EVENTS_THIS_WEEK, ...EVENTS_PREV_WEEK];
