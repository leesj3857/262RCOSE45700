import type { IssueEvent } from "@/types/analytics";

const W = 340;
const H = 168;
const PAD = { l: 34, r: 20, t: 22, b: 26 };
const T_MIN = -10;
const T_MAX = 30;
const THRESHOLD = 0.3;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function series(event: IssueEvent): { t: number; g: number }[] {
  let seed = hash(event.id);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const phase = rand() * 6;
  const out: { t: number; g: number }[] = [];
  for (let t = T_MIN; t <= T_MAX; t += 0.5) {
    const base = 0.035 * Math.sin(t * 0.9 + phase) + (rand() - 0.5) * 0.05;
    const spike = event.peakG * Math.exp(-(((t - 0.5) / 0.45) ** 2));
    const rebound = -event.peakG * 0.25 * Math.exp(-(((t - 1.8) / 0.6) ** 2));
    out.push({ t, g: base + spike + rebound });
  }
  return out;
}

export default function VehicleLogChart({ event }: { event: IssueEvent }) {
  const data = series(event);
  const yMax = Math.max(0.6, Math.ceil(Math.abs(event.peakG) * 12) / 10);
  const x = (t: number) => PAD.l + ((t - T_MIN) / (T_MAX - T_MIN)) * (W - PAD.l - PAD.r);
  const y = (g: number) => PAD.t + ((yMax - g) / (2 * yMax)) * (H - PAD.t - PAD.b);

  const path = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)} ${y(p.g).toFixed(1)}`).join(" ");
  const peak = data.reduce((a, b) => (Math.abs(b.g) > Math.abs(a.g) ? b : a));
  const speechX = x(event.speechDelaySec);
  const ticks = [-10, 0, 10, 20, 30];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="차량 가속도 로그 그래프">
        <rect x={PAD.l} y={y(-THRESHOLD)} width={W - PAD.l - PAD.r} height={y(THRESHOLD) - y(-THRESHOLD)} fill="#f5f6f8" />
        {[THRESHOLD, 0, -THRESHOLD].map((g) => (
          <g key={g}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(g)}
              y2={y(g)}
              stroke={g === 0 ? "#cfd3da" : "#e0b400"}
              strokeWidth={1}
              strokeDasharray={g === 0 ? undefined : "3 4"}
            />
            <text x={PAD.l - 6} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="#7e8593" className="num">
              {g > 0 ? `+${g}` : g}
            </text>
          </g>
        ))}

        <line x1={x(0)} x2={x(0)} y1={PAD.t - 6} y2={H - PAD.b} stroke="#1a2030" strokeWidth={1.5} />
        <text x={x(0) + 4} y={PAD.t - 9} fontSize="10" fontWeight={700} fill="#1a2030">
          사건
        </text>
        <line x1={speechX} x2={speechX} y1={PAD.t - 6} y2={H - PAD.b} stroke="#e0b400" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={speechX + 4} y={PAD.t - 9} fontSize="10" fontWeight={700} fill="#a37d00">
          발화
        </text>

        <path d={path} fill="none" stroke="#191919" strokeWidth={1.8} strokeLinejoin="round" />
        <circle cx={x(peak.t)} cy={y(peak.g)} r={4.5} fill="#fee500" stroke="#191919" strokeWidth={1.8} />

        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="10" fill="#7e8593" className="num">
            {t > 0 ? `+${t}s` : `${t}s`}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
        <span>
          최대 가속도 <b className="num font-extrabold text-ink">{event.peakG > 0 ? "+" : ""}{event.peakG.toFixed(2)}g</b>
        </span>
        <span>
          발화는 사건 <b className="num font-extrabold text-ink">+{event.speechDelaySec}초</b> 뒤에 시작
        </span>
      </figcaption>
    </figure>
  );
}
