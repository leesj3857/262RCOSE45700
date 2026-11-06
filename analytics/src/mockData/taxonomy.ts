import type { AreaId, CauseId, EventTypeId, Operator, Vehicle, Zone } from "@/types/analytics";

export const EVENT_TYPES: { id: EventTypeId; label: string; reaction: string }[] = [
  { id: "hardBrake", label: "급정거", reaction: "급하게 멈췄어요" },
  { id: "hardAccel", label: "급가속", reaction: "순간적으로 가속이 붙었어요" },
  { id: "hardSteer", label: "급조향", reaction: "핸들이 급하게 꺾였어요" },
  { id: "contact", label: "접촉 사고", reaction: "살짝 접촉이 있었어요" },
  { id: "collision", label: "충돌 사고", reaction: "충돌이 있었어요" },
  { id: "other", label: "기타 개입", reaction: "수동으로 개입했어요" },
];

export const CAUSES: { id: CauseId; label: string }[] = [
  { id: "twoWheeler", label: "이륜차·킥보드 돌발" },
  { id: "pedestrian", label: "보행자 돌발" },
  { id: "vehicle", label: "차량 돌발" },
  { id: "signal", label: "신호·교차로 혼잡" },
  { id: "obstacle", label: "공사·장애물" },
  { id: "weather", label: "빗길·노면 상태" },
  { id: "unknown", label: "원인 미확인" },
];

export type CauseVariant = { noun: string; title: string; say: string };

export const CAUSE_VARIANTS: Record<CauseId, CauseVariant[]> = {
  twoWheeler: [
    { noun: "킥보드 돌발", title: "킥보드 돌발로", say: "킥보드가 갑자기 튀어나와서" },
    { noun: "자전거 돌발", title: "자전거 돌발로", say: "자전거가 옆에서 튀어나와서" },
    { noun: "오토바이 돌발", title: "오토바이 돌발로", say: "배달 오토바이가 튀어나와서" },
  ],
  pedestrian: [
    { noun: "무단횡단", title: "무단횡단으로", say: "보행자가 무단횡단을 해서" },
    { noun: "보행자 돌발", title: "보행자 돌발로", say: "사람이 갑자기 차도로 들어와서" },
  ],
  vehicle: [
    { noun: "차량 끼어들기", title: "차량 끼어들기로", say: "옆 차량이 갑자기 끼어들어서" },
    { noun: "앞차 급정거", title: "앞차 급정거로", say: "앞차가 급하게 서서" },
    { noun: "역주행 차량", title: "역주행 차량으로", say: "반대편에서 차량이 역주행해서" },
  ],
  signal: [
    { noun: "신호 변경", title: "신호 변경으로", say: "신호가 갑자기 바뀌어서" },
    { noun: "교차로 정체", title: "교차로 정체로", say: "교차로에 차가 엉켜 있어서" },
  ],
  obstacle: [
    { noun: "공사 구간", title: "공사 구간으로", say: "공사 구간 안내판이 도로 쪽에 나와 있어서" },
    { noun: "불법 주정차", title: "불법 주정차로", say: "불법 주정차 차량 때문에 차로가 좁아져서" },
  ],
  weather: [
    { noun: "빗길 미끄러움", title: "빗길 미끄러움으로", say: "비가 와서 노면이 미끄러워서" },
  ],
  unknown: [{ noun: "원인 미확인", title: "원인 미확인으로", say: "" }],
};

export const WEATHER_SAY = {
  맑음: "날씨는 맑았는데",
  흐림: "날씨가 흐렸는데",
  비: "비가 와서 노면이 젖었는데",
} as const;

export const AREAS: { id: AreaId; label: string }[] = [
  { id: "gangnam", label: "강남구" },
  { id: "seongbuk", label: "성북구" },
];

export const ZONES: Zone[] = [
  { id: "gn-1", area: "gangnam", name: "강남역 사거리", address: "서울특별시 강남구 강남대로 396", spot: "교차로", spoken: "강남역 사거리에서", x: 222, y: 150, weight: 3, biasCause: "vehicle" },
  { id: "gn-2", area: "gangnam", name: "강남대로 102길", address: "서울특별시 강남구 강남대로 102길", spot: "골목길", spoken: "강남대로 102길 골목에서", x: 128, y: 252, weight: 5, biasCause: "twoWheeler" },
  { id: "gn-3", area: "gangnam", name: "역삼로 17길", address: "서울특별시 강남구 역삼로 17길", spot: "이면도로", spoken: "역삼로 17길 이면도로에서", x: 236, y: 72, weight: 1.5, biasCause: "obstacle" },
  { id: "gn-4", area: "gangnam", name: "테헤란로 버스정류장", address: "서울특별시 강남구 테헤란로 152", spot: "버스정류장", spoken: "테헤란로 버스정류장 앞에서", x: 78, y: 172, weight: 2, biasCause: "pedestrian" },
  { id: "gn-5", area: "gangnam", name: "논현로 횡단보도", address: "서울특별시 강남구 논현로 508", spot: "횡단보도 앞", spoken: "논현로 횡단보도 앞에서", x: 212, y: 293, weight: 2, biasCause: "signal" },
  { id: "gn-6", area: "gangnam", name: "도산대로 12길", address: "서울특별시 강남구 도산대로 12길", spot: "일방통행로", spoken: "도산대로 12길 일방통행로에서", x: 292, y: 232, weight: 1, biasCause: "vehicle" },
  { id: "sb-1", area: "seongbuk", name: "안암오거리", address: "서울특별시 성북구 안암로 (안암오거리)", spot: "오거리", spoken: "안암오거리에서", x: 120, y: 232, weight: 5, biasCause: "twoWheeler" },
  { id: "sb-2", area: "seongbuk", name: "고려대학교 정문", address: "서울특별시 성북구 안암로 145", spot: "정문 앞", spoken: "고려대 정문 앞에서", x: 205, y: 227, weight: 3.5, biasCause: "pedestrian" },
  { id: "sb-3", area: "seongbuk", name: "종암로 94", address: "서울특별시 성북구 종암로 94", spot: "횡단보도 앞", spoken: "종암로 횡단보도 앞에서", x: 80, y: 122, weight: 2, biasCause: "pedestrian" },
  { id: "sb-4", area: "seongbuk", name: "성북천로 22", address: "서울특별시 성북구 성북천로 22", spot: "이면도로", spoken: "성북천로 이면도로에서", x: 160, y: 305, weight: 1.5, biasCause: "weather" },
  { id: "sb-5", area: "seongbuk", name: "삼선교 사거리", address: "서울특별시 성북구 삼선교로 (삼선교 사거리)", spot: "사거리", spoken: "삼선교 사거리에서", x: 271, y: 121, weight: 2, biasCause: "signal" },
  { id: "sb-6", area: "seongbuk", name: "보문로 34길", address: "서울특별시 성북구 보문로 34길", spot: "골목길", spoken: "보문로 34길 골목에서", x: 185, y: 112, weight: 1.5, biasCause: "twoWheeler" },
];

export const AREA_ROADS: Record<AreaId, { arterial: string[]; minor: string[]; water?: string; parks: { x: number; y: number; w: number; h: number }[] }> = {
  gangnam: {
    arterial: [
      "M-10 175 L370 150",
      "M175 -10 L200 410",
      "M-10 300 L370 285",
      "M300 -10 L280 410",
    ],
    minor: [
      "M-10 80 L370 60",
      "M-10 235 L370 222",
      "M90 -10 L110 410",
      "M240 -10 L245 410",
      "M-10 360 L370 350",
      "M-10 20 L370 10",
    ],
    parks: [
      { x: 20, y: 250, w: 60, h: 36 },
      { x: 250, y: 310, w: 70, h: 40 },
      { x: 118, y: 22, w: 46, h: 30 },
    ],
  },
  seongbuk: {
    arterial: [
      "M-10 250 L370 210",
      "M60 -10 L120 410",
      "M-10 100 L370 130",
      "M280 -10 L250 410",
    ],
    minor: [
      "M-10 175 L370 170",
      "M180 -10 L195 410",
      "M-10 360 L370 345",
      "M-10 30 L370 40",
      "M330 -10 L320 410",
    ],
    water: "M-10 335 Q 120 285 200 322 T 370 305",
    parks: [
      { x: 214, y: 252, w: 80, h: 44 },
      { x: 14, y: 140, w: 48, h: 34 },
      { x: 296, y: 20, w: 50, h: 34 },
    ],
  },
};

export const VEHICLES: Vehicle[] = [
  { id: "AD-01", name: "아이오닉 5 자율주행", plate: "서울 71바 1201", weeklyKm: 1480, weight: 1 },
  { id: "AD-02", name: "쏘나타 자율주행", plate: "서울 71바 1202", weeklyKm: 1210, weight: 1 },
];

export const OPERATORS: Operator[] = [
  { id: "op-1", name: "김도윤" },
  { id: "op-2", name: "박서연" },
  { id: "op-3", name: "최민준" },
  { id: "op-4", name: "정하은" },
  { id: "op-5", name: "오지훈" },
];

export const HOUR_MIN = 8;
export const HOUR_MAX = 21;

export const HOUR_WINDOWS: { id: string; label: string; from: number; to: number }[] = [
  { id: "morning", label: "출근 07–10시", from: 7, to: 10 },
  { id: "day", label: "낮 11–16시", from: 11, to: 16 },
  { id: "evening", label: "퇴근 17–20시", from: 17, to: 20 },
  { id: "night", label: "저녁 21시 이후", from: 21, to: 23 },
];

export const TYPE_COLORS: Record<EventTypeId, string> = {
  hardBrake: "#fee500",
  hardAccel: "#3478f6",
  hardSteer: "#7e8593",
  contact: "#f08c00",
  collision: "#e53935",
  other: "#d6d9dd",
};
