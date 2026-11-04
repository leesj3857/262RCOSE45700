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

export type Status = "new" | "reviewed" | "flagged";

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
  confidence: number | null;
  edited?: boolean;
};

export type IssueEvent = {
  id: string;
  occurredAt: string;
  zoneId: string;
  type: EventTypeId;
  cause: CauseId;
  severity: Severity;
  status: Status;
  weather: Weather;
  title: string;
  transcript: string;
  fields: EventField[];
  audioSec: number;
  peakG: number;
  speechDelaySec: number;
  vehicleId: string;
  operatorId: string;
  sttConfidence: number;
  processing: { stt: number; structure: number; verify: number };
  starred: boolean;
  note: string;
};

export type Overlay = {
  status?: Status;
  starred?: boolean;
  note?: string;
  edits?: Partial<Record<FieldKey, string>>;
};

export type Vehicle = {
  id: string;
  plate: string;
  weeklyKm: number;
  weight: number;
};

export type Operator = {
  id: string;
  name: string;
};

export type DateRange = {
  start: string;
  end: string;
};

export type WeekRange = DateRange;
