import { EVENTS_THIS_WEEK } from "@/mockData/events";

export type Target = { sel: string; text?: string; starts?: boolean };

export type Act =
  | { go: string }
  | { wait: number }
  | { tap: Target }
  | { scroll: number }
  | { type: { into: Target; text: string } }
  | { enter: true }
  | { esc: true };

export type Step = { title: string; line: string; acts: Act[] };

const sample = EVENTS_THIS_WEEK.find((e) => e.transcript.startsWith("삼거리에서")) ?? EVENTS_THIS_WEEK[0];

const PERIOD: Target = { sel: 'button[aria-label^="보기 기간"]' };
const VEHICLE: Target = { sel: 'button[aria-label^="현재 차량"]' };

export const STEPS: Step[] = [
  {
    title: "요약",
    line: "이번 주 이벤트 현황과 확인할 일을 한눈에 봐요.",
    acts: [{ go: "/admin" }, { wait: 900 }, { scroll: 420 }, { wait: 1100 }, { scroll: 1000 }, { wait: 1100 }, { scroll: 0 }, { wait: 500 }],
  },
  {
    title: "기간과 차량",
    line: "여기서 바꾸면 모든 화면에 똑같이 적용돼요.",
    acts: [
      { go: "/admin" },
      { wait: 800 },
      { tap: PERIOD },
      { wait: 700 },
      { tap: { sel: "button", text: "최근 4주" } },
      { wait: 900 },
      { esc: true },
      { wait: 600 },
      { tap: VEHICLE },
      { wait: 1100 },
      { esc: true },
      { wait: 400 },
    ],
  },
  {
    title: "반복 패턴",
    line: "같은 장소와 원인으로 반복된 이슈를 근거와 함께 보여줘요.",
    acts: [
      { go: "/admin/analysis?s=recs" },
      { wait: 900 },
      { scroll: 380 },
      { wait: 1100 },
      { scroll: 800 },
      { wait: 900 },
      { tap: { sel: "a", text: "지도에서 보기" } },
      { wait: 1200 },
    ],
  },
  {
    title: "지도",
    line: "건수, 히트맵, 개별 이벤트로 바꿔 보면서 어디서 많이 생기는지 확인해요.",
    acts: [
      { go: "/admin/map?zone=gn-2" },
      { wait: 1000 },
      { tap: { sel: '[role="radio"]', text: "히트맵" } },
      { wait: 1300 },
      { tap: { sel: '[role="radio"]', text: "개별 이벤트" } },
      { wait: 1300 },
      { tap: { sel: '[role="radio"]', text: "건수" } },
      { wait: 600 },
    ],
  },
  {
    title: "이벤트 목록",
    line: "상태 칩과 필터로 원하는 이벤트만 골라 봐요.",
    acts: [
      { go: "/admin/events" },
      { wait: 900 },
      { tap: { sel: "button", text: "미검토", starts: true } },
      { wait: 1100 },
      { tap: { sel: "button", text: "필터", starts: true } },
      { wait: 1400 },
      { esc: true },
      { wait: 500 },
    ],
  },
  {
    title: "말하듯이 검색",
    line: "문장으로 쓰면 조건으로 바꿔서 찾아줘요.",
    acts: [
      { go: "/admin/events" },
      { wait: 800 },
      { type: { into: { sel: 'input[aria-label="이벤트 검색"]' }, text: "비 오는 날 이륜차 급정거" } },
      { enter: true },
      { wait: 1500 },
      { scroll: 160 },
      { wait: 800 },
    ],
  },
  {
    title: "이벤트 상세",
    line: "원본 음성, 전사, 정리된 항목을 한곳에서 확인하고 고쳐요. 말하지 않은 항목은 비워 둬요.",
    acts: [
      { go: `/admin/events/${sample.id}` },
      { wait: 1000 },
      { scroll: 560 },
      { wait: 900 },
      { tap: { sel: "main button", text: "위치", starts: true } },
      { wait: 1200 },
      { tap: { sel: 'button[aria-label="날씨 수정"]' } },
      { wait: 1400 },
      { esc: true },
      { wait: 400 },
    ],
  },
];
