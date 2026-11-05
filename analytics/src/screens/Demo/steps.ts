import { EVENTS_THIS_WEEK } from "@/mockData/events";

export type Target = { sel: string; text?: string; starts?: boolean; within?: Target; up?: number };

export type Act =
  | { go: string }
  | { wait: number }
  | { scroll: number }
  | { show: Target; y: number }
  | { focus: Target; note?: string; pad?: number }
  | { blur: true }
  | { tap: Target; note?: string }
  | { type: Target; text: string; note?: string }
  | { submit: true }
  | { close: true }
  | { ensure: Target };

export type Step = { title: string; line: string; acts: Act[] };

const sample = EVENTS_THIS_WEEK.find((e) => e.transcript.startsWith("삼거리에서")) ?? EVENTS_THIS_WEEK[0];

const FIRST_REC: Target = { sel: 'section[aria-label="반복 패턴"] article' };
const ZONE_REC: Target = { sel: "article", text: "강남대로 102길" };
const MAP: Target = { sel: 'button[aria-label="확대"]', up: 2 };
const MODE = (text: string): Target => ({ sel: '[aria-label="지도 표시 방식"] [role="radio"]', text });
const DIALOG: Target = { sel: '[role="dialog"]' };

export const STEPS: Step[] = [
  {
    title: "요약",
    line: "이번 주 이벤트 현황과 지금 확인할 일을 한 화면에 모았어요.",
    acts: [
      { go: "/admin" },
      { wait: 500 },
      { focus: { sel: 'section[aria-label="기간 요약"]' }, note: "이번 주 이벤트 수" },
      { wait: 1400 },
      { focus: { sel: "span", text: "전주 대비", starts: true }, note: "지난주와 비교", pad: 6 },
      { wait: 1300 },
      { focus: { sel: 'section[aria-label="유형별"]' }, note: "유형별 건수" },
      { wait: 1500 },
      { focus: { sel: 'section[aria-label="지금 할 일"]' }, note: "남은 검토" },
      { wait: 1600 },
      { blur: true },
      { scroll: 0 },
      { wait: 300 },
    ],
  },
  {
    title: "반복 패턴",
    line: "같은 장소, 같은 원인으로 반복된 이슈를 근거와 함께 보여줘요.",
    acts: [
      { go: "/admin/analysis?s=recs" },
      { wait: 500 },
      { focus: FIRST_REC, note: "먼저 볼 패턴" },
      { wait: 1400 },
      { focus: { sel: "ul", within: FIRST_REC }, note: "판단 근거", pad: 6 },
      { wait: 1500 },
      { focus: ZONE_REC, note: "같은 곳에서 반복" },
      { wait: 1500 },
      { tap: { sel: "button", text: "지도에서 보기", within: ZONE_REC } },
      { wait: 1300 },
    ],
  },
  {
    title: "지도",
    line: "구간별 건수, 히트맵, 개별 이벤트로 바꿔 보며 위치를 확인해요.",
    acts: [
      { go: "/admin/map?zone=gn-2" },
      { ensure: MODE("건수") },
      { wait: 500 },
      { focus: MAP, note: "구간별 건수", pad: 4 },
      { wait: 1400 },
      { tap: MODE("히트맵") },
      { focus: MAP, note: "많이 생기는 곳", pad: 4 },
      { wait: 1700 },
      { tap: MODE("개별 이벤트") },
      { focus: MAP, note: "이벤트 하나하나", pad: 4 },
      { wait: 1700 },
      { tap: MODE("건수") },
      { wait: 500 },
      { blur: true },
    ],
  },
  {
    title: "이벤트 목록",
    line: "상태 칩과 필터로 볼 이벤트만 남겨요.",
    acts: [
      { go: "/admin/events" },
      { wait: 500 },
      { tap: { sel: '[aria-label="바로 보기"] button', text: "미검토", starts: true }, note: "검토 안 한 것만" },
      { wait: 1300 },
      { tap: { sel: "main button", text: "필터", starts: true }, note: "세부 조건" },
      { wait: 500 },
      { focus: DIALOG, note: "조건 여러 개 함께", pad: 0 },
      { wait: 1900 },
      { close: true },
      { wait: 400 },
    ],
  },
  {
    title: "말하듯이 검색",
    line: "문장으로 검색하면 조건으로 나눠서 찾아줘요.",
    acts: [
      { go: "/admin/events" },
      { wait: 400 },
      { type: { sel: 'input[aria-label="이벤트 검색"]' }, text: "비 오는 날 이륜차 급정거", note: "문장 그대로 입력" },
      { wait: 500 },
      { submit: true },
      { wait: 400 },
      { focus: { sel: 'section[aria-label="검색 해석"]' }, note: "문장을 조건으로" },
      { wait: 1800 },
      { focus: { sel: "main p", text: "검색 결과", starts: true }, note: "조건에 맞는 결과", pad: 6 },
      { wait: 1400 },
      { blur: true },
      { scroll: 260 },
      { wait: 900 },
    ],
  },
  {
    title: "이벤트 상세",
    line: "원본 음성, 전사, 정리된 항목을 한곳에서 확인하고 고쳐요.",
    acts: [
      { go: `/admin/events/${sample.id}` },
      { wait: 500 },
      { focus: { sel: 'section[aria-label="원본 음성"]' }, note: "녹음 그대로" },
      { wait: 1300 },
      { focus: { sel: 'section[aria-label="전사 (STT)"]' }, note: "음성을 글로" },
      { wait: 1300 },
      { focus: { sel: 'section[aria-label="구조화 결과"]' }, note: "자동으로 나눈 항목" },
      { wait: 1500 },
      { blur: true },
      { show: { sel: 'section[aria-label="전사 (STT)"]' }, y: 24 },
      { tap: { sel: 'section[aria-label="구조화 결과"] li button', text: "위치", starts: true } },
      { wait: 200 },
      { focus: { sel: 'section[aria-label="전사 (STT)"] mark' }, note: "위치의 근거", pad: 6 },
      { wait: 1800 },
      { tap: { sel: 'button[aria-label="날씨 수정"]' } },
      { wait: 500 },
      { focus: DIALOG, note: "말하지 않아 비워 둠", pad: 0 },
      { wait: 2000 },
      { close: true },
      { wait: 400 },
    ],
  },
];

export function estimate(a: Act): number {
  if ("wait" in a) return a.wait;
  if ("go" in a) return 700;
  if ("scroll" in a || "show" in a) return 800;
  if ("focus" in a) return 500;
  if ("tap" in a) return 1300;
  if ("type" in a) return 900 + a.text.length * 100;
  if ("close" in a) return 1200;
  if ("submit" in a) return 300;
  return 50;
}
