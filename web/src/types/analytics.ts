export type EventTypeId =
  | "hardBrake"
  | "hardAccel"
  | "hardSteer"
  | "contact"
  | "collision"
  | "other";

export type CauseId =
  | "twoWheeler"
  | "pedestrian"
  | "vehicle"
  | "signal"
  | "obstacle"
  | "weather"
  | "unknown";

export type AreaId = "gangnam" | "seongbuk";

export type Severity = "low" | "mid" | "high";

export type Weather = "맑음" | "흐림" | "비" | "";

export type Zone = {
  id: string;
  area: AreaId;
  name: string;
  address: string;
  spot: string;
  spoken: string;
  x: number;
  y: number;
  weight: number;
  biasCause: CauseId;
};

export type FieldKey = "location" | "event" | "cause" | "situation" | "weather";

export type EventField = {
  key: FieldKey;
  label: string;
  value: string;
  evidence: string | null;
};

export type IssueEvent = {
  id: string;
  occurredAt: string;
  zoneId: string;
  type: EventTypeId;
  cause: CauseId;
  severity: Severity;
  weather: Weather;
  title: string;
  transcript: string;
  fields: EventField[];
  audioSec: number;
  peakG: number;
  speechDelaySec: number;
};

export type WeekRange = {
  start: string;
  end: string;
};
